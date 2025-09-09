import { Alert } from "react-native";
import { ref, set, get, remove, update } from "firebase/database";
import { db } from "../services/firebase";
import { encryptFields, decryptFields } from "./encryption";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import {
  create,
  open,
  destroy,
  LinkSuccess,
  LinkExit,
  LinkLogLevel,
  LinkIOSPresentationStyle,
} from "react-native-plaid-link-sdk";

// Plaid configuration - you'll need to get these from your Plaid dashboard
export const PLAID_CONFIG = {
  clientName: "VectorFi",
  products: ["transactions"],
  countryCodes: ["US"],
  language: "en",
};

export interface PlaidAccount {
  id: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  balances: {
    available: number;
    current: number;
    limit?: number;
  };
  institution?: string; // Bank name
  itemId?: string; // Plaid item ID
}

export interface PlaidTransaction {
  id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name?: string;
  category?: string[];
  pending: boolean;
  institution?: string; // Bank name
  itemId?: string; // Plaid item ID
}

export interface PlaidLinkResult {
  publicToken: string;
  metadata: {
    institution: {
      name: string;
      institution_id: string;
    };
    accounts: PlaidAccount[];
  };
}

export interface PlaidConnection {
  itemId: string;
  accessToken: string;
  institution: {
    name: string;
    institution_id: string;
  };
  accounts: PlaidAccount[];
  connectedAt: number;
  status: "connected" | "disconnected" | "error";
  lastUpdated?: number;
}

class PlaidService {
  private connections: Map<string, PlaidConnection> = new Map(); // itemId -> PlaidConnection
  private userId: string | null = null;
  private functions = getFunctions();
  private auth = getAuth();
  private isLinkInitialized = false;
  private onBankConnectedCallbacks: (() => void)[] = [];
  private pendingTransactionsRequest: Promise<PlaidTransaction[]> | null = null;
  private pendingAccountsRequest: Promise<PlaidAccount[]> | null = null;
  private requestCache: Map<string, { data: any; timestamp: number }> =
    new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute (increased from 30 seconds)
  private readonly ACCOUNTS_CACHE_DURATION = 600000; // 10 minutes for accounts (increased from 5 minutes)
  private readonly TRANSACTIONS_CACHE_DURATION = 300000; // 5 minutes for transactions (increased from 1 minute)

  // Request queue to prevent concurrent API calls
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  // Global rate limiting across all connections
  private lastGlobalRequestTime = 0;
  private readonly GLOBAL_RATE_LIMIT_MS = 1000; // 1 second between any requests

  // Set user ID for Firebase operations
  setUserId(userId: string) {
    this.userId = userId;
  }

  // Clear all PlaidService state (useful when user logs out or account is deleted)
  clearState() {
    this.connections.clear();
    this.userId = null;
    this.requestCache.clear();
    this.onBankConnectedCallbacks = [];
  }

  // Memory management for large datasets
  private optimizeMemoryUsage(): void {
    // Clear old cache entries to prevent memory buildup
    const now = Date.now();
    const maxCacheAge = Math.max(
      this.CACHE_DURATION,
      this.ACCOUNTS_CACHE_DURATION,
      this.TRANSACTIONS_CACHE_DURATION
    );

    const entries = Array.from(this.requestCache.entries());
    for (const [key, value] of entries) {
      if (now - value.timestamp > maxCacheAge) {
        this.requestCache.delete(key);
      }
    }

    // Limit cache size to prevent memory issues
    const maxCacheSize = 50; // Maximum number of cached requests
    if (this.requestCache.size > maxCacheSize) {
      const entries = Array.from(this.requestCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest entries
      const toRemove = entries.slice(0, this.requestCache.size - maxCacheSize);
      toRemove.forEach(([key]) => this.requestCache.delete(key));
    }
  }

  // Clean up callbacks to prevent memory leaks
  removeBankConnectedCallback(callback: () => void) {
    const index = this.onBankConnectedCallbacks.indexOf(callback);
    if (index > -1) {
      this.onBankConnectedCallbacks.splice(index, 1);
    }
  }

  // Get all connected banks
  getConnectedBanks(): PlaidConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.status === "connected"
    );
  }

  // Get connection by item ID
  getConnection(itemId: string): PlaidConnection | null {
    return this.connections.get(itemId) || null;
  }

  // Get all connections (including disconnected ones)
  getAllConnections(): PlaidConnection[] {
    return Array.from(this.connections.values());
  }

  // Check if any bank is connected
  hasAnyBankConnected(): boolean {
    return this.getConnectedBanks().length > 0;
  }

  // Get total number of connected banks
  getConnectedBanksCount(): number {
    return this.getConnectedBanks().length;
  }

  // Generate cache key for requests
  private getCacheKey(endpoint: string, params: any): string {
    const connectionCount = this.connections.size;
    const connectionIds = Array.from(this.connections.keys()).sort().join(",");
    return `${endpoint}_${connectionCount}_${connectionIds}_${JSON.stringify(
      params
    )}`;
  }

  // Apply global rate limiting across all connections
  private async applyGlobalRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastGlobalRequestTime;

    if (timeSinceLastRequest < this.GLOBAL_RATE_LIMIT_MS) {
      const waitTime = this.GLOBAL_RATE_LIMIT_MS - timeSinceLastRequest;
      console.log(
        `🕐 Global rate limit: waiting ${waitTime}ms before next request`
      );
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastGlobalRequestTime = Date.now();
  }

  // Queue Plaid API requests to prevent concurrent calls with timeout
  private async queueRequest<T>(
    request: () => Promise<T>,
    timeoutMs: number = 30000
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.requestQueue.push(async () => {
        try {
          // Apply global rate limiting
          await this.applyGlobalRateLimit();

          const result = await request();
          clearTimeout(timeoutId);
          resolve(result);
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  // Process the request queue sequentially
  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error("Error processing queued request:", error);
        }
        // Add delay between requests to prevent rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500)); // Reduced from 1000ms to 500ms
      }
    }

    this.isProcessingQueue = false;
  }

  // Check if cached data is still valid
  private isCacheValid(cacheKey: string, customDuration?: number): boolean {
    const cached = this.requestCache.get(cacheKey);
    if (!cached) return false;
    const duration = customDuration || this.CACHE_DURATION;
    return Date.now() - cached.timestamp < duration;
  }

  // Register callback for when bank is connected
  onBankConnected(callback: () => void) {
    this.onBankConnectedCallbacks.push(callback);
  }

  // Trigger bank connected callbacks
  private triggerBankConnectedCallbacks() {
    this.onBankConnectedCallbacks.forEach((callback) => callback());
  }

  // Enhanced debouncing for link token creation to prevent rate limiting
  private lastLinkTokenCall = 0;
  private readonly LINK_TOKEN_DEBOUNCE = 2000; // Reduced to 2 seconds for better UX
  private readonly MAX_LINK_ATTEMPTS = 5; // Increased to 5 attempts for better UX
  private linkAttemptCount = 0;
  private readonly LINK_ATTEMPT_RESET_TIME = 60000; // 1 minute
  private readonly GRACEFUL_DEGRADATION_TIME = 30000; // 30 seconds for graceful degradation

  // Rate limiting for Plaid Link success flow
  private lastSuccessFlowCall = 0;
  private readonly SUCCESS_FLOW_DEBOUNCE = 3000; // 3 seconds between success flows
  private successFlowAttemptCount = 0;
  private readonly MAX_SUCCESS_FLOW_ATTEMPTS = 3; // 3 attempts per minute for success flow

  // Enhanced rate limiting for Link-level rate limiting
  private lastLinkFlowCall = 0;
  private readonly LINK_FLOW_DEBOUNCE = 5000; // 5 seconds between Link flows
  private linkFlowAttemptCount = 0;
  private readonly MAX_LINK_FLOW_ATTEMPTS = 3; // 3 Link attempts per 2 minutes
  private readonly LINK_FLOW_RESET_TIME = 120000; // 2 minutes

  // Exponential backoff for RATE_LIMIT errors
  private rateLimitBackoffTime = 30000; // Start with 30 seconds
  private readonly MAX_BACKOFF_TIME = 300000; // Max 5 minutes
  private rateLimitAttempts = 0;

  async initializePlaidLink(): Promise<string> {
    if (!this.userId) throw new Error("User ID not set");
    if (!this.auth.currentUser) throw new Error("User not authenticated");

    // Initializing Plaid Link for user

    // Enhanced rate limiting: prevent rapid successive calls and track attempts
    const now = Date.now();
    const timeSinceLastCall = now - this.lastLinkTokenCall;

    // Reset attempt count if enough time has passed
    if (timeSinceLastCall > this.LINK_ATTEMPT_RESET_TIME) {
      this.linkAttemptCount = 0;
    }

    // Check if we've exceeded maximum attempts with graceful degradation
    if (this.linkAttemptCount >= this.MAX_LINK_ATTEMPTS) {
      const timeSinceFirstAttempt =
        now -
        (this.lastLinkTokenCall -
          (this.MAX_LINK_ATTEMPTS - 1) * this.LINK_TOKEN_DEBOUNCE);

      // If it's been more than 30 seconds since first attempt, allow one more try
      if (timeSinceFirstAttempt > this.GRACEFUL_DEGRADATION_TIME) {
        console.log(
          `🔄 Graceful degradation: Allowing additional attempt after ${Math.ceil(
            timeSinceFirstAttempt / 1000
          )}s`
        );
        this.linkAttemptCount = Math.max(0, this.linkAttemptCount - 2); // Reset some attempts
      } else {
        const waitTime = Math.ceil(this.LINK_ATTEMPT_RESET_TIME / 1000);
        console.log(
          `🚨 Too many link attempts (${this.linkAttemptCount}/${this.MAX_LINK_ATTEMPTS}). Please wait ${waitTime} seconds.`
        );
        throw new Error(
          `Too many connection attempts. Please wait ${waitTime} seconds and try again.`
        );
      }
    }

    // Check debouncing
    if (timeSinceLastCall < this.LINK_TOKEN_DEBOUNCE) {
      const waitTime = Math.ceil(
        (this.LINK_TOKEN_DEBOUNCE - timeSinceLastCall) / 1000
      );
      console.log(
        `⏳ Rate limited: Please wait ${waitTime} seconds before trying again`
      );
      throw new Error(`Please wait ${waitTime} seconds before trying again`);
    }

    // Update last call time and increment attempt count
    this.lastLinkTokenCall = now;
    this.linkAttemptCount++;

    // For Apple App Store review, we'll provide a way to use test mode
    // This can be controlled at runtime without rebuilding
    const isTestMode = this.shouldUseTestMode();

    if (isTestMode) {
      // For test mode, we'll bypass Plaid Link entirely and simulate a successful connection
      console.log(
        "PlaidService: Test mode detected - bypassing Plaid Link for App Store review"
      );
      // Return a special marker that indicates test mode
      return "TEST_MODE_BYPASS";
    }

    // Typed callable
    type Resp = { link_token: string; expiration?: string };
    const callable = httpsCallable<unknown, Resp>(
      this.functions,
      "createLinkToken"
    );

    try {
      const res = await callable(); // Optionally pass { platform: Platform.OS }
      const linkToken = res?.data?.link_token; // <- snake_case

      if (typeof linkToken !== "string" || !linkToken.length) {
        console.error("Bad createLinkToken response:", res?.data);
        throw new Error("createLinkToken did not return link_token");
      }

      return linkToken;
    } catch (error: any) {
      console.error("Error creating link token:", error);

      // Check for Plaid API rate limit errors from Firebase function
      if (error.message && error.message.includes("RATE_LIMIT")) {
        console.warn("⚠️ Plaid API rate limit detected from Firebase function");
        throw new Error(
          "Connection service is busy. Please try again in a moment."
        );
      }

      // Check for other Plaid API errors
      if (error.message && error.message.includes("Plaid API")) {
        console.warn("⚠️ Plaid API error detected from Firebase function");
        throw new Error(
          "Bank connection service is temporarily unavailable. Please try again."
        );
      }

      // Handle Firebase Functions rate limiting errors
      if (
        error instanceof Error &&
        error.message.includes("Plaid API rate limit exceeded")
      ) {
        throw new Error(error.message);
      }

      // Handle other Firebase function errors
      if (
        error instanceof Error &&
        error.message.includes("Failed to create link token")
      ) {
        throw new Error(error.message);
      }

      throw error;
    }
  }

  // Create Plaid Link session (preloads Link for better performance)
  async createPlaidLinkSession(linkToken: string): Promise<void> {
    try {
      // Destroy any existing session first (Android only)
      try {
        await destroy();
      } catch (error) {
        // Ignore errors if no session exists
        console.log("No existing session to destroy");
      }

      // Create new Link session
      await create({
        token: linkToken,
        noLoadingState: false,
        logLevel: LinkLogLevel.INFO,
      });

      this.isLinkInitialized = true;
      console.log("Plaid Link session created successfully");
    } catch (error) {
      console.error("Error creating Plaid Link session:", error);
      throw error;
    }
  }

  // Open Plaid Link with enhanced error handling
  async openPlaidLink(
    onSuccess: (success: LinkSuccess) => void,
    onExit: (exit: LinkExit) => void
  ): Promise<void> {
    try {
      if (!this.isLinkInitialized) {
        throw new Error(
          "Plaid Link session not initialized. Call createPlaidLinkSession first."
        );
      }

      console.log("Opening Plaid Link...");

      await open({
        onSuccess: (success: LinkSuccess) => {
          onSuccess(success);
        },
        onExit: (exit: LinkExit) => {
          console.log("Plaid Link exit:", exit);

          // Enhanced error handling
          if (exit.error) {
            console.error("Plaid Link error:", exit.error);

            // Handle specific error types
            if (exit.error.errorCode) {
              console.error("Error code:", exit.error.errorCode);
              console.error("Error message:", exit.error.errorMessage);
            }
          }

          onExit(exit);
        },
        iOSPresentationStyle: LinkIOSPresentationStyle.MODAL,
        logLevel: LinkLogLevel.INFO,
      });
    } catch (error) {
      console.error("Error opening Plaid Link:", error);
      throw error;
    }
  }

  // Complete Plaid Link flow with modern pattern and enhanced rate limiting
  async startPlaidLinkFlow(
    onSuccess: (success: LinkSuccess) => void,
    onExit: (exit: LinkExit) => void
  ): Promise<void> {
    try {
      // Enhanced rate limiting for Link flow
      const now = Date.now();
      const timeSinceLastLinkFlow = now - this.lastLinkFlowCall;

      // Reset attempt count if enough time has passed
      if (timeSinceLastLinkFlow > this.LINK_FLOW_RESET_TIME) {
        this.linkFlowAttemptCount = 0;
      }

      // Check if we've exceeded maximum Link flow attempts
      if (this.linkFlowAttemptCount >= this.MAX_LINK_FLOW_ATTEMPTS) {
        const waitTime = Math.ceil(this.LINK_FLOW_RESET_TIME / 1000);
        console.log(
          `🚨 Too many Link flow attempts (${this.linkFlowAttemptCount}/${this.MAX_LINK_FLOW_ATTEMPTS}). Please wait ${waitTime} seconds.`
        );
        throw new Error(
          `Too many connection attempts. Please wait ${waitTime} seconds and try again.`
        );
      }

      // Check debouncing for Link flow
      if (timeSinceLastLinkFlow < this.LINK_FLOW_DEBOUNCE) {
        const waitTime = Math.ceil(
          (this.LINK_FLOW_DEBOUNCE - timeSinceLastLinkFlow) / 1000
        );
        console.log(
          `⏳ Link flow rate limited: Please wait ${waitTime} seconds before trying again`
        );
        throw new Error(`Please wait ${waitTime} seconds before trying again`);
      }

      // Update last Link flow call time and increment attempt count
      this.lastLinkFlowCall = now;
      this.linkFlowAttemptCount++;

      // Starting Link flow attempt

      // Get link token
      const linkToken = await this.initializePlaidLink();

      // Check if we're in test mode and should bypass Plaid Link
      if (linkToken === "TEST_MODE_BYPASS") {
        console.log(
          "PlaidService: Test mode - simulating successful bank connection"
        );

        // Simulate a successful Plaid Link result
        const mockSuccess: LinkSuccess = {
          publicToken: "test_public_token",
          metadata: {
            linkSessionId: "test_link_session_123",
            institution: {
              id: "test_institution_123",
              name: "Test Bank",
            },
            accounts: [
              {
                id: "test_account_1",
                name: "Test Checking Account",
                mask: "1234",
                type: "depository" as any,
                subtype: "checking",
              },
              {
                id: "test_account_2",
                name: "Test Savings Account",
                mask: "5678",
                type: "depository" as any,
                subtype: "savings",
              },
            ],
          },
        };

        // Call the success callback with mock data
        onSuccess(mockSuccess);
        return;
      }

      // Create Link session
      await this.createPlaidLinkSession(linkToken);

      // Open Link
      await this.openPlaidLink(onSuccess, onExit);
    } catch (error) {
      console.error("Error in Plaid Link flow:", error);
      throw error;
    }
  }

  // Handle successful link with enhanced error handling
  async handlePlaidSuccess(publicToken: string, metadata: any): Promise<void> {
    try {
      // Rate limiting for Plaid Link success flow
      const now = Date.now();
      const timeSinceLastSuccessFlow = now - this.lastSuccessFlowCall;

      // Reset attempt count if enough time has passed
      if (timeSinceLastSuccessFlow > this.LINK_ATTEMPT_RESET_TIME) {
        this.successFlowAttemptCount = 0;
      }

      // Check if we've exceeded maximum attempts for success flow
      if (this.successFlowAttemptCount >= this.MAX_SUCCESS_FLOW_ATTEMPTS) {
        const waitTime = Math.ceil(this.LINK_ATTEMPT_RESET_TIME / 1000);
        console.log(
          `🚨 Too many success flow attempts (${this.successFlowAttemptCount}/${this.MAX_SUCCESS_FLOW_ATTEMPTS}). Please wait ${waitTime} seconds.`
        );
        throw new Error(
          `Too many connection attempts. Please wait ${waitTime} seconds and try again.`
        );
      }

      // Check debouncing for success flow
      if (timeSinceLastSuccessFlow < this.SUCCESS_FLOW_DEBOUNCE) {
        const waitTime = Math.ceil(
          (this.SUCCESS_FLOW_DEBOUNCE - timeSinceLastSuccessFlow) / 1000
        );
        console.log(
          `⏳ Success flow rate limited: Please wait ${waitTime} seconds before trying again`
        );
        throw new Error(`Please wait ${waitTime} seconds before trying again`);
      }

      // Update last call time and increment attempt count
      this.lastSuccessFlowCall = now;
      this.successFlowAttemptCount++;

      // Ensure user is authenticated
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Check if this is a test token for Apple App Store review
      let accessToken: string;
      let itemId: string;

      if (publicToken === "test_public_token") {
        // Use test tokens for Apple App Store review
        console.log(
          "PlaidService: Test mode detected - using test tokens for App Store review"
        );
        accessToken = "test_access_token_12345";
        itemId = "test_item_id_67890";
      } else {
        // Exchange public token for access token using Firebase Cloud Function
        const exchangePublicToken = httpsCallable(
          this.functions,
          "exchangePublicToken"
        );

        try {
          const exchangeResult = await exchangePublicToken({ publicToken });

          const result = exchangeResult.data as {
            accessToken: string;
            itemId: string;
          };
          accessToken = result.accessToken;
          itemId = result.itemId;
        } catch (exchangeError: any) {
          console.error("❌ Error exchanging public token:", exchangeError);

          // Check for Plaid API rate limit errors
          if (
            exchangeError.message &&
            exchangeError.message.includes("RATE_LIMIT")
          ) {
            throw new Error(
              "Connection service is busy. Please try again in a moment."
            );
          }

          // Check for other Plaid API errors
          if (
            exchangeError.message &&
            exchangeError.message.includes("Plaid API")
          ) {
            throw new Error(
              "Bank connection service is temporarily unavailable. Please try again."
            );
          }

          throw new Error("Failed to connect bank account. Please try again.");
        }
      }

      // Add delay between sequential API calls to prevent rate limiting

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get accounts using the access token
      const getAccounts = httpsCallable(this.functions, "getAccounts");

      let accounts: any[];
      try {
        const accountsResult = await getAccounts({ accessToken });
        accounts = (accountsResult.data as { accounts: any[] }).accounts;
      } catch (accountsError: any) {
        console.error("❌ Error retrieving accounts:", accountsError);

        // Check for Plaid API rate limit errors
        if (
          accountsError.message &&
          accountsError.message.includes("RATE_LIMIT")
        ) {
          throw new Error(
            "Connection service is busy. Please try again in a moment."
          );
        }

        // Check for other Plaid API errors
        if (
          accountsError.message &&
          accountsError.message.includes("Plaid API")
        ) {
          throw new Error(
            "Bank connection service is temporarily unavailable. Please try again."
          );
        }

        throw new Error("Failed to retrieve bank accounts. Please try again.");
      }

      // Create new connection object
      const connection: PlaidConnection = {
        itemId,
        accessToken,
        institution: metadata.institution || { name: "Unknown Bank" },
        accounts: accounts || [],
        connectedAt: Date.now(),
        status: "connected",
        lastUpdated: Date.now(),
      };

      // Save connection to Firebase
      await this.saveConnectionToFirebase(connection);

      // Store locally for immediate use
      this.connections.set(itemId, connection);

      // Reset Link session state
      this.isLinkInitialized = false;

      // Reset rate limiting counters on successful connection
      this.linkAttemptCount = 0;
      this.lastLinkTokenCall = 0;

      // Clear cache to ensure fresh data
      this.requestCache.clear();
      this.pendingTransactionsRequest = null;
      this.pendingAccountsRequest = null;

      // Trigger callbacks to notify that bank is connected
      this.triggerBankConnectedCallbacks();

      // Note: Removed success alert to prevent blocking UI flow
      // The green "Bank Connected" button provides sufficient feedback
    } catch (error) {
      console.error("Error handling Plaid success:", error);

      // Reset Link session state on error
      this.isLinkInitialized = false;

      Alert.alert("Error", "Failed to connect bank account");
      throw error;
    }
  }

  // Handle Plaid exit with enhanced logging
  handlePlaidExit(error: any, metadata: any): void {
    // Reset Link session state
    this.isLinkInitialized = false;

    if (error) {
      console.error("Plaid exit with error:", error);
      Alert.alert("Error", "Failed to connect bank account");
    }
  }

  // Test method to verify Link pattern implementation
  async testPlaidLinkFlow(): Promise<boolean> {
    try {
      console.log("Testing Plaid Link flow...");

      // Test link token creation
      const linkToken = await this.initializePlaidLink();
      console.log("✅ Link token created successfully");

      // Test session creation
      await this.createPlaidLinkSession(linkToken);
      console.log("✅ Link session created successfully");

      // Reset session state
      this.isLinkInitialized = false;

      console.log("✅ Plaid Link flow test completed successfully");
      return true;
    } catch (error) {
      console.error("❌ Plaid Link flow test failed:", error);
      return false;
    }
  }

  // Get accounts from all connected banks
  async getAccounts(): Promise<PlaidAccount[]> {
    const connectedBanks = this.getConnectedBanks();
    if (connectedBanks.length === 0) {
      throw new Error("No bank connections available");
    }

    const cacheKey = this.getCacheKey("all_accounts", {
      connectionCount: connectedBanks.length,
    });

    // Check cache first with extended duration for accounts
    if (this.isCacheValid(cacheKey, this.ACCOUNTS_CACHE_DURATION)) {
      return this.requestCache.get(cacheKey)!.data;
    }

    // Check if there's already a pending request
    if (this.pendingAccountsRequest) {
      return this.pendingAccountsRequest;
    }

    // Create the request promise with queuing
    this.pendingAccountsRequest = this.queueRequest(() =>
      this._fetchAllAccounts()
    );

    try {
      const result = await this.pendingAccountsRequest;

      // Cache the result
      this.requestCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } finally {
      // Clear the pending request after completion
      this.pendingAccountsRequest = null;
    }
  }

  // Private method to fetch accounts from all connected banks
  private async _fetchAllAccounts(): Promise<PlaidAccount[]> {
    const connectedBanks = this.getConnectedBanks();
    const allAccounts: PlaidAccount[] = [];
    const failedBanks: string[] = [];
    const successfulBanks: string[] = [];

    try {
      const getAccounts = httpsCallable(this.functions, "getAccounts");

      // Fetch accounts from each connected bank
      for (const connection of connectedBanks) {
        try {
          const startTime = Date.now();
          const result = await getAccounts({
            accessToken: connection.accessToken,
          });
          const duration = Date.now() - startTime;
          const { accounts } = result.data as { accounts: any[] };

          const bankAccounts = accounts.map((account) => ({
            id: account.account_id,
            name: account.name,
            mask: account.mask,
            type: account.type,
            subtype: account.subtype,
            balances: {
              available: account.balances.available || 0,
              current: account.balances.current || 0,
              limit: account.balances.limit,
            },
            // Add bank information to each account
            institution: connection.institution.name,
            itemId: connection.itemId,
          }));

          allAccounts.push(...bankAccounts);
          successfulBanks.push(connection.institution.name);
        } catch (error: any) {
          console.error(
            `❌ Error getting accounts from ${connection.institution.name}:`,
            error
          );
          failedBanks.push(connection.institution.name);

          // Check for token errors and attempt to refresh for this specific connection
          const tokenRefreshed = await this.handleTokenErrorForConnection(
            error,
            connection
          );
          if (tokenRefreshed) {
            console.log(
              `🔄 Token refreshed for ${connection.institution.name}, retrying accounts request`
            );
            // Retry this specific bank's accounts
            try {
              const result = await getAccounts({
                accessToken: connection.accessToken,
              });
              const { accounts } = result.data as { accounts: any[] };
              const bankAccounts = accounts.map((account) => ({
                id: account.account_id,
                name: account.name,
                mask: account.mask,
                type: account.type,
                subtype: account.subtype,
                balances: {
                  available: account.balances.available || 0,
                  current: account.balances.current || 0,
                  limit: account.balances.limit,
                },
                institution: connection.institution.name,
                itemId: connection.itemId,
              }));
              allAccounts.push(...bankAccounts);
            } catch (retryError) {
              console.error(
                `❌ Retry failed for ${connection.institution.name}:`,
                retryError
              );
            }
          }
          // Continue with other banks even if one fails
        }
      }

      // Log summary of results
      if (successfulBanks.length > 0) {
        console.log(
          `✅ Successfully fetched accounts from: ${successfulBanks.join(", ")}`
        );
      }
      if (failedBanks.length > 0) {
        console.warn(
          `⚠️ Failed to fetch accounts from: ${failedBanks.join(", ")}`
        );
      }

      // Optimize memory usage after data fetching
      this.optimizeMemoryUsage();

      return allAccounts;
    } catch (error) {
      console.error("❌ Error fetching all accounts:", error);
      throw error;
    }
  }

  // Handle token error for a specific connection
  private async handleTokenErrorForConnection(
    error: any,
    connection: PlaidConnection
  ): Promise<boolean> {
    try {
      // Check if this is a token-related error
      if (
        error?.message?.includes("INVALID_ACCESS_TOKEN") ||
        error?.message?.includes("access_token_invalid") ||
        error?.message?.includes("connection expired")
      ) {
        console.log(
          `🔄 Token error detected for ${connection.institution.name}, marking as disconnected`
        );

        // Mark this connection as disconnected
        connection.status = "disconnected";
        await this.saveConnectionToFirebase(connection);

        return false; // Don't retry, connection is invalid
      }

      return false; // Not a token error
    } catch (refreshError) {
      console.error(
        `Error handling token error for ${connection.institution.name}:`,
        refreshError
      );
      return false;
    }
  }

  // Retry configuration for PRODUCT_NOT_READY errors
  private readonly MAX_RETRIES = 5; // Reduced from 10 to 5 to prevent rate limiting
  private readonly RETRY_DELAYS = [10000, 30000, 60000, 120000, 300000]; // Longer delays to be more conservative

  // Get transactions from all connected banks
  async getTransactions(
    startDate: string,
    endDate: string
  ): Promise<PlaidTransaction[]> {
    const connectedBanks = this.getConnectedBanks();
    if (connectedBanks.length === 0) {
      throw new Error("No bank connections available");
    }

    const cacheKey = this.getCacheKey("all_transactions", {
      startDate,
      endDate,
      connectionCount: connectedBanks.length,
    });

    // Check cache first with extended duration for transactions
    if (this.isCacheValid(cacheKey, this.TRANSACTIONS_CACHE_DURATION)) {
      return this.requestCache.get(cacheKey)!.data;
    }

    // Check if there's already a pending request
    if (this.pendingTransactionsRequest) {
      return this.pendingTransactionsRequest;
    }

    // Create the request promise with retry logic and queuing
    this.pendingTransactionsRequest = this.queueRequest(() =>
      this._fetchAllTransactionsWithRetry(startDate, endDate)
    );

    try {
      const result = await this.pendingTransactionsRequest;

      // Cache the result
      this.requestCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } finally {
      // Clear the pending request after completion
      this.pendingTransactionsRequest = null;
    }
  }

  // Private method to fetch transactions from all connected banks with retry logic
  private async _fetchAllTransactionsWithRetry(
    startDate: string,
    endDate: string
  ): Promise<PlaidTransaction[]> {
    const connectedBanks = this.getConnectedBanks();
    const allTransactions: PlaidTransaction[] = [];

    // Fetch transactions from each connected bank
    for (const connection of connectedBanks) {
      try {
        const bankTransactions = await this._fetchTransactionsForConnection(
          connection,
          startDate,
          endDate
        );
        allTransactions.push(...bankTransactions);
      } catch (error: any) {
        console.error(
          `❌ Error fetching transactions from ${connection.institution.name}:`,
          error
        );

        // Check for token errors and attempt to refresh for this specific connection
        const tokenRefreshed = await this.handleTokenErrorForConnection(
          error,
          connection
        );
        if (tokenRefreshed) {
          console.log(
            `🔄 Token refreshed for ${connection.institution.name}, retrying transactions request`
          );
          try {
            const bankTransactions = await this._fetchTransactionsForConnection(
              connection,
              startDate,
              endDate
            );
            allTransactions.push(...bankTransactions);
          } catch (retryError) {
            console.error(
              `❌ Retry failed for ${connection.institution.name}:`,
              retryError
            );
          }
        }
        // Continue with other banks even if one fails
      }
    }

    // Sort all transactions by date (newest first)
    return allTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  // Fetch transactions for a specific connection with retry logic
  private async _fetchTransactionsForConnection(
    connection: PlaidConnection,
    startDate: string,
    endDate: string
  ): Promise<PlaidTransaction[]> {
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const transactions = await this._fetchTransactions(
          connection.accessToken,
          startDate,
          endDate
        );

        // Add bank information to each transaction
        const bankTransactions = transactions.map((transaction) => ({
          ...transaction,
          institution: connection.institution.name,
          itemId: connection.itemId,
        }));

        return bankTransactions;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.log(
          `🔄 Retry attempt ${attempt + 1} for ${
            connection.institution.name
          }: Error message: "${errorMessage}"`
        );

        // Check for rate limit errors
        if (
          errorMessage.includes("RATE_LIMIT") ||
          errorMessage.includes("rate limit")
        ) {
          console.log(
            `🚨 Rate limit detected for ${connection.institution.name}, implementing exponential backoff`
          );
          const backoffTime = Math.min(30000 * Math.pow(2, attempt), 300000); // Max 5 minutes
          console.log(
            `🔄 Rate limit backoff: waiting ${backoffTime}ms (attempt ${
              attempt + 1
            }/${this.MAX_RETRIES})`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffTime));
          continue;
        }

        // If it's a PRODUCT_NOT_READY error and we haven't exceeded retries
        if (
          (errorMessage.includes("400") ||
            errorMessage.includes("PRODUCT_NOT_READY") ||
            errorMessage.includes("not yet ready") ||
            errorMessage.includes("product_not_ready") ||
            errorMessage.includes("Product not ready") ||
            errorMessage.includes("product not ready")) &&
          attempt < this.MAX_RETRIES
        ) {
          const delay =
            this.RETRY_DELAYS[attempt] ||
            this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
          console.log(
            `🔄 Product not ready for ${
              connection.institution.name
            }, retrying in ${delay}ms (attempt ${attempt + 1}/${
              this.MAX_RETRIES
            })`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Only throw user-facing errors when retries are exhausted
        if (
          (errorMessage.includes("400") ||
            errorMessage.includes("PRODUCT_NOT_READY") ||
            errorMessage.includes("not yet ready") ||
            errorMessage.includes("product_not_ready") ||
            errorMessage.includes("Product not ready") ||
            errorMessage.includes("product not ready")) &&
          attempt >= this.MAX_RETRIES
        ) {
          throw new Error(
            `Bank data for ${connection.institution.name} is still being processed. Please try refreshing in a few minutes.`
          );
        }

        // For other errors, throw the original error
        throw error;
      }
    }

    throw new Error(
      `Max retries exceeded for transaction fetch from ${connection.institution.name}`
    );
  }

  // Helper method to check if we're requesting a full 3-month range
  private _isRequestingFullRange(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff >= 80; // Consider it a full range if requesting 80+ days
  }

  // Private method to actually fetch transactions using /transactions/sync
  private async _fetchTransactions(
    accessToken: string,
    startDate: string,
    endDate: string
  ): Promise<PlaidTransaction[]> {
    try {
      const getTransactions = httpsCallable(this.functions, "getTransactions");

      const result = await getTransactions({
        accessToken: accessToken,
        cursor: null, // Start with null cursor for initial fetch
        // Note: /transactions/sync doesn't use date parameters
        // It fetches all available transactions and uses cursor-based pagination
      });

      const { transactions } = result.data as { transactions: any[] };

      console.log(
        `📊 Plaid API: Received ${transactions.length} transactions from Firebase function`
      );

      return transactions.map((transaction) => ({
        id: transaction.transaction_id,
        account_id: transaction.account_id,
        amount: transaction.amount,
        date: transaction.date,
        name: transaction.name,
        merchant_name: transaction.merchant_name,
        category: transaction.category,
        personal_finance_category: transaction.personal_finance_category,
        pending: transaction.pending,
      }));
    } catch (error) {
      console.error("❌ Error getting transactions:", error);

      // Check if it's a rate limit error (based on Plaid's official error codes)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429") ||
        errorMessage.includes("too many requests") ||
        errorMessage.includes("RATE_LIMIT") ||
        errorMessage.includes("RATE_LIMIT_EXCEEDED")
      ) {
        console.warn(
          "⚠️ Plaid rate limit detected, suggesting retry after delay"
        );
        throw new Error(
          "Rate limit exceeded. Please try again in a few minutes."
        );
      }

      // Check if it's a PRODUCT_NOT_READY error
      if (
        errorMessage.includes("400") ||
        errorMessage.includes("PRODUCT_NOT_READY") ||
        errorMessage.includes("not yet ready")
      ) {
        console.warn("⚠️ Product not ready, suggesting retry later");
        throw new Error(
          "Transaction data is still being processed. Please try again in a few minutes."
        );
      }

      throw error; // Re-throw the error instead of returning mock data
    }
  }

  // Check if bank is connected
  async isBankConnected(): Promise<boolean> {
    if (!this.userId) {
      return false;
    }

    try {
      // First check if user still exists in Firebase
      const userRef = ref(db, `users/${this.userId}`);
      const userSnapshot = await get(userRef);

      if (!userSnapshot.exists()) {
        // User account has been deleted, clear local state and return false
        this.connections.clear();
        return false;
      }

      // Load connections from Firebase
      await this.loadConnectionsFromFirebase();
      return this.hasAnyBankConnected();
    } catch (error: any) {
      // Handle permission denied errors (user account deleted)
      if (
        error?.code === "PERMISSION_DENIED" ||
        error?.message?.includes("Permission denied")
      ) {
        console.log(
          "PlaidService: User account no longer exists, clearing bank connection state"
        );
        this.connections.clear();
        return false;
      }

      console.error("PlaidService: Error checking bank connection:", error);
      return false;
    }
  }

  // Load all connections from Firebase
  private async loadConnectionsFromFirebase(): Promise<void> {
    if (!this.userId) {
      return;
    }

    try {
      // First try new format
      const plaidRef = ref(db, `users/${this.userId}/plaid_connections`);
      const snapshot = await get(plaidRef);

      if (snapshot.exists()) {
        const connectionsData = snapshot.val();
        if (connectionsData) {
          // Decrypt and load all connections
          for (const [itemId, connectionData] of Object.entries(
            connectionsData
          )) {
            try {
              const decryptedData = await decryptFields(connectionData as any, [
                "accessToken",
                "institution",
                "accounts",
              ]);

              const connection: PlaidConnection = {
                itemId,
                accessToken: decryptedData.accessToken,
                institution: decryptedData.institution,
                accounts: decryptedData.accounts || [],
                connectedAt: (connectionData as any).connectedAt,
                status: (connectionData as any).status || "connected",
                lastUpdated: (connectionData as any).lastUpdated,
              };

              this.connections.set(itemId, connection);
            } catch (decryptError) {
              console.error(
                `Error decrypting connection ${itemId}:`,
                decryptError
              );
            }
          }
          return;
        }
      }

      // If new format doesn't exist, try to migrate legacy format
      await this.migrateLegacyConnection();
    } catch (error) {
      console.error("Error loading connections from Firebase:", error);
    }
  }

  // Migrate legacy single connection to new format
  private async migrateLegacyConnection(): Promise<void> {
    if (!this.userId) {
      return;
    }

    try {
      const legacyRef = ref(db, `users/${this.userId}/plaid`);
      const snapshot = await get(legacyRef);

      if (!snapshot.exists()) {
        return;
      }

      const legacyData = snapshot.val();
      if (!legacyData || !legacyData.accessToken || !legacyData.itemId) {
        return;
      }

      // Decrypt legacy data
      const decryptedData = await decryptFields(legacyData, [
        "accessToken",
        "itemId",
        "institution",
        "accounts",
      ]);

      // Create new connection format
      const connection: PlaidConnection = {
        itemId: decryptedData.itemId,
        accessToken: decryptedData.accessToken,
        institution: decryptedData.institution,
        accounts: decryptedData.accounts || [],
        connectedAt: legacyData.connectedAt || Date.now(),
        status: "connected",
        lastUpdated: Date.now(),
      };

      // Save to new format
      await this.saveConnectionToFirebase(connection);

      // Store in memory
      this.connections.set(connection.itemId, connection);

      // Remove legacy data
      await remove(legacyRef);

      console.log("✅ Migrated legacy Plaid connection to new format");
    } catch (error) {
      console.error("Error migrating legacy connection:", error);
    }
  }

  // Save a single connection to Firebase
  private async saveConnectionToFirebase(
    connection: PlaidConnection
  ): Promise<void> {
    if (!this.userId) {
      throw new Error("User ID not set");
    }

    try {
      // Encrypt sensitive data
      const fieldsToEncrypt = ["accessToken", "institution", "accounts"];

      const encryptedConnection = await encryptFields(
        connection,
        fieldsToEncrypt
      );

      // Save to Firebase
      const connectionRef = ref(
        db,
        `users/${this.userId}/plaid_connections/${connection.itemId}`
      );
      await set(connectionRef, {
        ...encryptedConnection,
        connectedAt: connection.connectedAt,
        status: connection.status,
        lastUpdated: connection.lastUpdated || Date.now(),
      });
    } catch (error: any) {
      console.error("Error saving connection to Firebase:", error);

      // Check for Firebase database rules violations
      if (
        error?.code === "PERMISSION_DENIED" ||
        error?.message?.includes("Permission denied")
      ) {
        throw new Error("Permission denied. Please contact support.");
      }

      // Check for validation errors
      if (error?.message?.includes("validation")) {
        throw new Error(
          "Invalid data format. Please try reconnecting your bank."
        );
      }

      throw error;
    }
  }

  // Get all connected bank information
  async getConnectedBankInfo(): Promise<
    {
      name: string;
      accounts: PlaidAccount[];
      itemId: string;
    }[]
  > {
    if (!this.userId) {
      return [];
    }

    try {
      // Load connections from Firebase
      await this.loadConnectionsFromFirebase();

      const connectedBanks = this.getConnectedBanks();
      return connectedBanks.map((connection) => ({
        name: connection.institution.name,
        accounts: connection.accounts,
        itemId: connection.itemId,
      }));
    } catch (error) {
      console.error("Error getting connected bank info:", error);
      return [];
    }
  }

  // Rate limiting for update mode checks
  private lastUpdateCheck = 0;
  private readonly UPDATE_CHECK_COOLDOWN = 5000; // 5 seconds

  // Update mode methods for handling webhook events (updated for multiple connections)
  async checkUpdateModeStatus(): Promise<{
    needsReauth: boolean;
    hasNewAccounts: boolean;
    credentialsExpiring: boolean;
    isDisconnecting: boolean;
    lastWebhook?: any;
    connectionStatuses?: { [itemId: string]: string };
  }> {
    try {
      if (!this.userId) {
        return {
          needsReauth: false,
          hasNewAccounts: false,
          credentialsExpiring: false,
          isDisconnecting: false,
        };
      }

      // Rate limiting: prevent excessive calls
      const now = Date.now();
      if (now - this.lastUpdateCheck < this.UPDATE_CHECK_COOLDOWN) {
        return {
          needsReauth: false,
          hasNewAccounts: false,
          credentialsExpiring: false,
          isDisconnecting: false,
        };
      }
      this.lastUpdateCheck = now;

      // Load connections from Firebase to check their statuses
      await this.loadConnectionsFromFirebase();
      const connections = this.getAllConnections();

      let needsReauth = false;
      let hasNewAccounts = false;
      let credentialsExpiring = false;
      let isDisconnecting = false;
      const connectionStatuses: { [itemId: string]: string } = {};

      // Check each connection's status
      for (const connection of connections) {
        connectionStatuses[connection.itemId] = connection.status;

        if (connection.status === "error") {
          needsReauth = true;
        }
        // Note: For multiple connections, we'd need to implement per-connection
        // webhook status tracking. For now, we'll use the legacy approach
        // but this should be enhanced to track status per connection.
      }

      // Also check legacy webhook data for backward compatibility
      const plaidDataRef = ref(db, `users/${this.userId}/plaid`);
      const snapshot = await get(plaidDataRef);
      const plaidData = snapshot.val();

      if (plaidData) {
        needsReauth = needsReauth || plaidData.status === "ITEM_LOGIN_REQUIRED";
        hasNewAccounts = hasNewAccounts || plaidData.hasNewAccounts === true;
        credentialsExpiring =
          credentialsExpiring || plaidData.status === "PENDING_EXPIRATION";
        isDisconnecting =
          isDisconnecting || plaidData.status === "PENDING_DISCONNECT";
      }

      return {
        needsReauth,
        hasNewAccounts,
        credentialsExpiring,
        isDisconnecting,
        lastWebhook: plaidData?.lastWebhook,
        connectionStatuses,
      };
    } catch (error) {
      console.error("PlaidService: Error checking update mode status:", error);
      return {
        needsReauth: false,
        hasNewAccounts: false,
        credentialsExpiring: false,
        isDisconnecting: false,
      };
    }
  }

  // Handle reconnection for update mode
  async reconnectBank(): Promise<void> {
    try {
      // Create a new link token for reconnection
      const linkToken = await this.initializePlaidLink();

      // Create Plaid Link session
      await this.createPlaidLinkSession(linkToken);

      // Open Plaid Link for reconnection
      await this.openPlaidLink(
        () => {},
        () => {}
      );
    } catch (error) {
      console.error("PlaidService: Error reconnecting bank:", error);
      throw error;
    }
  }

  // Handle new accounts for update mode
  async addNewAccounts(newAccounts: any[]): Promise<void> {
    try {
      // Create a new link token with account selection enabled
      const linkToken = await this.initializePlaidLink();

      // Create Plaid Link session
      await this.createPlaidLinkSession(linkToken);

      // Open Plaid Link for account selection
      await this.openPlaidLink(
        () => {},
        () => {}
      );
    } catch (error) {
      console.error("PlaidService: Error adding new accounts:", error);
      throw error;
    }
  }

  // Clear update mode flags after user action
  async clearUpdateModeFlags(): Promise<void> {
    try {
      if (!this.userId) {
        return;
      }

      const plaidDataRef = ref(db, `users/${this.userId}/plaid`);
      await update(plaidDataRef, {
        hasNewAccounts: false,
        newAccounts: null,
        newAccountsAvailableAt: null,
        expirationWarning: false,
        disconnectWarning: false,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      console.error("PlaidService: Error clearing update mode flags:", error);
    }
  }

  // Enhanced logout handling
  async handleLogout(): Promise<void> {
    try {
      // Clear local state
      this.connections.clear();
      this.userId = null;

      // Clear debounce timer and rate limiting counters
      this.lastLinkTokenCall = 0;
      this.linkAttemptCount = 0;
      this.lastSuccessFlowCall = 0;
      this.successFlowAttemptCount = 0;

      // Clear cache and pending requests
      this.requestCache.clear();
      this.pendingTransactionsRequest = null;
      this.pendingAccountsRequest = null;
    } catch (error) {
      console.error("PlaidService: Error handling logout:", error);
    }
  }

  // Method to reset rate limiting counters (for debugging or manual reset)
  resetRateLimiting(): void {
    this.lastLinkTokenCall = 0;
    this.linkAttemptCount = 0;
    this.lastSuccessFlowCall = 0;
    this.successFlowAttemptCount = 0;
    this.lastLinkFlowCall = 0;
    this.linkFlowAttemptCount = 0;
    this.rateLimitBackoffTime = 30000; // Reset backoff
    this.rateLimitAttempts = 0; // Reset attempts
  }

  // Handle RATE_LIMIT backoff
  private async handleRateLimitBackoff(): Promise<void> {
    this.rateLimitAttempts++;

    if (this.rateLimitAttempts > 3) {
      console.log("🚨 Maximum RATE_LIMIT retry attempts reached. Stopping.");
      throw new Error("Too many rate limit errors. Please try again later.");
    }

    console.log(
      `🔄 RATE_LIMIT backoff: waiting ${
        this.rateLimitBackoffTime / 1000
      }s (attempt ${this.rateLimitAttempts}/3)`
    );
    await new Promise((resolve) =>
      setTimeout(resolve, this.rateLimitBackoffTime)
    );

    // Exponential backoff: double the wait time, but cap at MAX_BACKOFF_TIME
    this.rateLimitBackoffTime = Math.min(
      this.rateLimitBackoffTime * 2,
      this.MAX_BACKOFF_TIME
    );
  }

  // Disconnect a specific bank by item ID
  async disconnectBank(itemId?: string): Promise<void> {
    try {
      if (!this.userId) {
        throw new Error("User ID not set");
      }

      // Clear any pending status updates
      if (this.statusUpdateTimer) {
        clearTimeout(this.statusUpdateTimer);
        this.statusUpdateTimer = null;
      }
      this.pendingStatusUpdates = {};

      if (itemId) {
        // Disconnect specific bank
        const connection = this.connections.get(itemId);
        if (connection) {
          // Remove from Firebase
          const connectionRef = ref(
            db,
            `users/${this.userId}/plaid_connections/${itemId}`
          );
          await remove(connectionRef);

          // Remove from local state
          this.connections.delete(itemId);
          console.log(`✅ Disconnected bank: ${connection.institution.name}`);
        }
      } else {
        // Disconnect all banks
        const connectedBanks = this.getConnectedBanks();
        for (const connection of connectedBanks) {
          const connectionRef = ref(
            db,
            `users/${this.userId}/plaid_connections/${connection.itemId}`
          );
          await remove(connectionRef);
          console.log(`✅ Disconnected bank: ${connection.institution.name}`);
        }

        // Clear all local state
        this.connections.clear();
      }

      // Clear cache and pending requests
      this.requestCache.clear();
      this.pendingTransactionsRequest = null;
      this.pendingAccountsRequest = null;
    } catch (error) {
      console.error("PlaidService: Error disconnecting bank:", error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  // Handle token errors and attempt to refresh connection
  private async handleTokenError(error: any): Promise<boolean> {
    const errorMessage = error?.message || String(error);

    // Check for common Plaid token errors
    const isTokenError =
      errorMessage.includes("INVALID_ACCESS_TOKEN") ||
      errorMessage.includes("ITEM_LOGIN_REQUIRED") ||
      errorMessage.includes("ITEM_ERROR") ||
      errorMessage.includes("access token") ||
      errorMessage.includes("401") ||
      errorMessage.includes("403");

    if (isTokenError) {
      console.warn(
        "🔑 Plaid token error detected, attempting to refresh connection"
      );

      try {
        // Try to reload connection data from Firebase
        await this.isBankConnected();

        // If we successfully loaded connections, return true to retry the operation
        if (this.hasAnyBankConnected()) {
          console.log("✅ Successfully refreshed Plaid connections");
          return true;
        } else {
          console.log("❌ No valid connections found, user needs to reconnect");
          return false;
        }
      } catch (refreshError) {
        console.error("❌ Failed to refresh Plaid connection:", refreshError);
        return false;
      }
    }

    return false; // Not a token error, don't retry
  }

  // Disconnect all banks silently (for logout scenarios)
  async disconnectBankSilently(): Promise<void> {
    try {
      if (!this.userId) {
        return; // No user ID, nothing to disconnect
      }

      // Clear any pending status updates
      if (this.statusUpdateTimer) {
        clearTimeout(this.statusUpdateTimer);
        this.statusUpdateTimer = null;
      }
      this.pendingStatusUpdates = {};

      // Remove all connections from Firebase
      const plaidConnectionsRef = ref(
        db,
        `users/${this.userId}/plaid_connections`
      );
      await remove(plaidConnectionsRef);

      // Also remove legacy single connection if it exists
      const legacyPlaidRef = ref(db, `users/${this.userId}/plaid`);
      await remove(legacyPlaidRef);

      // Clear local state
      this.connections.clear();
    } catch (error) {
      console.error("PlaidService: Error silently disconnecting banks:", error);
      // Don't throw for silent disconnection
    }
  }

  // Clear all connections for account deletion (more thorough than disconnectBankSilently)
  async clearAllConnectionsForAccountDeletion(): Promise<void> {
    try {
      if (!this.userId) {
        return;
      }

      // Clear any pending status updates
      if (this.statusUpdateTimer) {
        clearTimeout(this.statusUpdateTimer);
        this.statusUpdateTimer = null;
      }
      this.pendingStatusUpdates = {};

      // Remove all connections from Firebase
      const plaidConnectionsRef = ref(
        db,
        `users/${this.userId}/plaid_connections`
      );
      await remove(plaidConnectionsRef);

      // Also remove legacy single connection if it exists
      const legacyPlaidRef = ref(db, `users/${this.userId}/plaid`);
      await remove(legacyPlaidRef);

      // Clear all local state
      this.connections.clear();
      this.onBankConnectedCallbacks = [];
      this.pendingTransactionsRequest = null;
      this.pendingAccountsRequest = null;
      this.requestCache.clear();
      this.requestQueue = [];
      this.isProcessingQueue = false;
      this.isLinkInitialized = false;
      this.userId = null;

      console.log("✅ All Plaid connections cleared for account deletion");
    } catch (error) {
      console.error("Error clearing connections for account deletion:", error);
      // Don't throw - this is for cleanup scenarios
    }
  }

  // Update Plaid status in Firebase (for webhook monitoring)
  async updatePlaidStatus(updates: any): Promise<void> {
    try {
      if (!this.userId) {
        throw new Error("User ID not set");
      }

      // Only update if we have actual changes
      if (!updates || Object.keys(updates).length === 0) {
        console.log(
          "PlaidService: No updates to apply, skipping Firebase write"
        );
        return;
      }

      const plaidRef = ref(db, `users/${this.userId}/plaid`);
      await update(plaidRef, updates);
      console.log("PlaidService: Updated Plaid status:", updates);
    } catch (error) {
      console.error("PlaidService: Error updating Plaid status:", error);
      throw error;
    }
  }

  // Batch update Plaid status to reduce Firebase writes
  private pendingStatusUpdates: any = {};
  private statusUpdateTimer: NodeJS.Timeout | null = null;

  async queuePlaidStatusUpdate(updates: any): Promise<void> {
    // Merge updates with pending ones
    this.pendingStatusUpdates = { ...this.pendingStatusUpdates, ...updates };

    // Clear existing timer
    if (this.statusUpdateTimer) {
      clearTimeout(this.statusUpdateTimer);
    }

    // Set timer to batch update after 1 second
    this.statusUpdateTimer = setTimeout(async () => {
      if (Object.keys(this.pendingStatusUpdates).length > 0) {
        try {
          await this.updatePlaidStatus(this.pendingStatusUpdates);
          this.pendingStatusUpdates = {}; // Clear pending updates
        } catch (error) {
          console.error("PlaidService: Failed to batch update status:", error);
        }
      }
    }, 1000);
  }

  // Method to determine if we should use test mode
  private shouldUseTestMode(): boolean {
    // Check for special test mode trigger
    // This can be activated by Apple reviewers without rebuilding
    // IMPORTANT: These patterns must be VERY specific to avoid affecting production users

    const currentUser = this.auth.currentUser;
    if (!currentUser?.email) {
      return false; // No email = no test mode
    }

    const email = currentUser.email.toLowerCase();

    // Method 1: Apple's official test accounts (very specific)
    if (email.includes("@apple.com")) {
      return true;
    }

    // Method 2: Very specific Apple reviewer patterns (exact matches only)
    if (
      email === "apple.reviewer@test.com" ||
      email === "reviewer@apple.com" ||
      email === "test@apple.com" ||
      email === "user@test.com"
    ) {
      return true;
    }

    // Method 3: Check for specific user ID pattern (very specific)
    if (currentUser.uid && currentUser.uid.includes("apple_reviewer_")) {
      return true;
    }

    // Method 4: Check for specific test account patterns (exact domain matches)
    if (
      email.endsWith("@apple.reviewer") ||
      email.endsWith("@appstore.test") ||
      email.endsWith("@apple.test")
    ) {
      return true;
    }

    // Method 5: Check for very specific test patterns (must be exact)
    if (
      email === "test@apple.reviewer" ||
      email === "demo@apple.reviewer" ||
      email === "reviewer@apple.reviewer"
    ) {
      return true;
    }

    return false;
  }

  // Method to enable test mode for Apple App Store review
  enableTestMode() {
    console.log("PlaidService: Test mode enabled for App Store review");
    // Test mode is automatically detected based on user patterns
  }

  // Method to check if we're in test mode
  isTestMode(): boolean {
    return this.shouldUseTestMode();
  }
}

export const plaidService = new PlaidService();
