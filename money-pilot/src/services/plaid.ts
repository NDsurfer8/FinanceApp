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

class PlaidService {
  private accessToken: string | null = null;
  private itemId: string | null = null;
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

  // Set user ID for Firebase operations
  setUserId(userId: string) {
    this.userId = userId;
  }

  // Generate cache key for requests
  private getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}_${JSON.stringify(params)}`;
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

    console.log(
      `[${new Date().toISOString()}] Initializing Plaid Link for user:`,
      this.userId
    );

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

      console.log("✅ Link token created successfully");
      return linkToken;
    } catch (firebaseError: any) {
      console.error("Firebase function error:", firebaseError);

      // Check for Plaid API rate limit errors from Firebase function
      if (
        firebaseError.message &&
        firebaseError.message.includes("RATE_LIMIT")
      ) {
        console.warn("⚠️ Plaid API rate limit detected from Firebase function");
        throw new Error(
          "Connection service is busy. Please try again in a moment."
        );
      }

      // Check for other Plaid API errors
      if (
        firebaseError.message &&
        firebaseError.message.includes("Plaid API")
      ) {
        console.warn("⚠️ Plaid API error detected from Firebase function");
        throw new Error(
          "Bank connection service is temporarily unavailable. Please try again."
        );
      }

      // Re-throw the original error
      throw firebaseError;
    }
  }
  catch(error: any) {
    console.error("Error creating link token:", error);

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

  // Create Plaid Link session (preloads Link for better performance)
  async createPlaidLinkSession(linkToken: string): Promise<void> {
    try {
      console.log("Creating Plaid Link session...");

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

      console.log(
        `🔄 Starting Link flow attempt ${this.linkFlowAttemptCount}/${this.MAX_LINK_FLOW_ATTEMPTS}`
      );

      // Get link token
      const linkToken = await this.initializePlaidLink();

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

      // Exchange public token for access token using Firebase Cloud Function
      const exchangePublicToken = httpsCallable(
        this.functions,
        "exchangePublicToken"
      );

      let accessToken: string;
      let itemId: string;

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

      // Store Plaid connection data in Firebase
      const plaidData = {
        publicToken,
        itemId,
        accessToken,
        institution: metadata.institution || { name: "Unknown Bank" },
        accounts: accounts || [],
        connectedAt: Date.now(),
        status: "connected",
      };

      // Encrypt sensitive Plaid data before saving to Firebase
      const fieldsToEncrypt = [
        "publicToken",
        "itemId",
        "accessToken",
        "institution",
        "accounts",
      ];

      const encryptedPlaidData = await encryptFields(
        plaidData,
        fieldsToEncrypt
      );

      // Save encrypted data to Firebase
      const plaidRef = ref(db, `users/${this.userId}/plaid`);
      await set(plaidRef, encryptedPlaidData);

      // Store locally for immediate use
      this.accessToken = accessToken;
      this.itemId = itemId;

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

  // Get accounts from Plaid
  async getAccounts(): Promise<PlaidAccount[]> {
    if (!this.accessToken) {
      throw new Error("No access token available");
    }

    const cacheKey = this.getCacheKey("accounts", {
      accessToken: this.accessToken,
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
      this._fetchAccounts()
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

  // Private method to actually fetch accounts
  private async _fetchAccounts(): Promise<PlaidAccount[]> {
    try {
      const getAccounts = httpsCallable(this.functions, "getAccounts");
      const startTime = Date.now();
      const result = await getAccounts({ accessToken: this.accessToken });
      const duration = Date.now() - startTime;
      const { accounts } = result.data as { accounts: any[] };

      return accounts.map((account) => ({
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
      }));
    } catch (error) {
      console.error("❌ Error getting accounts:", error);

      throw error; // Re-throw the error instead of returning mock data
    }
  }

  // Retry configuration for PRODUCT_NOT_READY errors
  private readonly MAX_RETRIES = 5; // Reduced from 10 to 5 to prevent rate limiting
  private readonly RETRY_DELAYS = [10000, 30000, 60000, 120000, 300000]; // Longer delays to be more conservative

  // Get transactions from Plaid
  async getTransactions(
    startDate: string,
    endDate: string
  ): Promise<PlaidTransaction[]> {
    if (!this.accessToken) {
      throw new Error("No access token available");
    }

    const cacheKey = this.getCacheKey("transactions", { startDate, endDate });

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
      this._fetchTransactionsWithRetry(startDate, endDate)
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

  // Private method to fetch transactions with retry logic
  private async _fetchTransactionsWithRetry(
    startDate: string,
    endDate: string
  ): Promise<PlaidTransaction[]> {
    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const transactions = await this._fetchTransactions(startDate, endDate);

        // If we got transactions, check if we have enough data for 3 months
        if (transactions.length > 0) {
          const transactionDates = transactions.map((t) => new Date(t.date));
          const earliestDate = new Date(
            Math.min(...transactionDates.map((d) => d.getTime()))
          );
          const latestDate = new Date(
            Math.max(...transactionDates.map((d) => d.getTime()))
          );
          const dateRangeInDays =
            (latestDate.getTime() - earliestDate.getTime()) /
            (1000 * 60 * 60 * 24);

          // If we have at least 60 days of data or we're not requesting a full 3-month range, return the data
          if (
            dateRangeInDays >= 60 ||
            !this._isRequestingFullRange(startDate, endDate)
          ) {
            return transactions;
          }
        }

        return transactions;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.log(
          `🔄 Retry attempt ${attempt + 1}: Error message: "${errorMessage}"`
        );
        console.log(`🔍 Full error object:`, error);

        // Check for rate limit errors first
        if (
          errorMessage.includes("RATE_LIMIT") ||
          errorMessage.includes("rate limit")
        ) {
          console.log(
            `🚨 Rate limit detected, implementing exponential backoff`
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
            errorMessage.includes("product not ready") ||
            errorMessage.includes("PRODUCT_NOT_READY")) &&
          attempt < this.MAX_RETRIES
        ) {
          const delay =
            this.RETRY_DELAYS[attempt] ||
            this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
          console.log(
            `🔄 Product not ready, retrying in ${delay}ms (attempt ${
              attempt + 1
            }/${this.MAX_RETRIES})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else {
          console.log(
            `❌ Not retrying - error doesn't match retry criteria or max retries reached`
          );
        }

        // Only throw user-facing errors when retries are exhausted
        // For PRODUCT_NOT_READY after max retries, provide a user-friendly message
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
            "Bank data is still being processed. Please try refreshing in a few minutes."
          );
        }

        // For other errors, throw the original error
        throw error;
      }
    }

    throw new Error("Max retries exceeded for transaction fetch");
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
    startDate: string,
    endDate: string
  ): Promise<PlaidTransaction[]> {
    try {
      const getTransactions = httpsCallable(this.functions, "getTransactions");
      console.log(
        `[${new Date().toISOString()}] Plaid API: getTransactions (sync) for user: ${
          this.userId
        }`
      );
      console.log("📞 Calling Firebase Function: getTransactions (sync)");

      const startTime = Date.now();
      const result = await getTransactions({
        accessToken: this.accessToken,
        cursor: null, // Start with null cursor for initial fetch
        // Note: /transactions/sync doesn't use date parameters
        // It fetches all available transactions and uses cursor-based pagination
      });
      const duration = Date.now() - startTime;

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
      // Check Firebase for existing connection
      const plaidRef = ref(db, `users/${this.userId}/plaid`);
      const snapshot = await get(plaidRef);

      if (snapshot.exists()) {
        const encryptedPlaidData = snapshot.val();

        // Decrypt the Plaid data
        const fieldsToDecrypt = [
          "publicToken",
          "itemId",
          "institution",
          "accounts",
          "accessToken",
        ];

        const plaidData = await decryptFields(
          encryptedPlaidData,
          fieldsToDecrypt
        );

        this.accessToken = plaidData.accessToken || null;
        this.itemId = plaidData.itemId || null;

        // More flexible connection check - if we have access token and item ID, consider it connected
        const hasAccessToken = !!plaidData.accessToken;
        const hasItemId = !!plaidData.itemId;
        const statusConnected = plaidData.status === "connected";

        const isConnected = statusConnected || (hasAccessToken && hasItemId);

        return isConnected;
      }

      return false;
    } catch (error) {
      console.error("PlaidService: Error checking bank connection:", error);
      return false;
    }
  }

  // Get connected bank information
  async getConnectedBankInfo(): Promise<{
    name: string;
    accounts: PlaidAccount[];
  } | null> {
    if (!this.userId) {
      return null;
    }

    try {
      // Check Firebase for existing connection
      const plaidRef = ref(db, `users/${this.userId}/plaid`);
      const snapshot = await get(plaidRef);

      if (snapshot.exists()) {
        const encryptedPlaidData = snapshot.val();

        // Decrypt the Plaid data
        const fieldsToDecrypt = [
          "publicToken",
          "itemId",
          "institution",
          "accounts",
          "accessToken",
        ];

        const plaidData = await decryptFields(
          encryptedPlaidData,
          fieldsToDecrypt
        );

        if (plaidData.status === "connected" && plaidData.institution) {
          return {
            name: plaidData.institution.name || "Unknown Bank",
            accounts: plaidData.accounts || [],
          };
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting connected bank info:", error);
      return null;
    }
  }

  // Rate limiting for update mode checks
  private lastUpdateCheck = 0;
  private readonly UPDATE_CHECK_COOLDOWN = 5000; // 5 seconds

  // Update mode methods for handling webhook events
  async checkUpdateModeStatus(): Promise<{
    needsReauth: boolean;
    hasNewAccounts: boolean;
    credentialsExpiring: boolean;
    isDisconnecting: boolean;
    lastWebhook?: any;
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

      const plaidDataRef = ref(db, `users/${this.userId}/plaid`);
      const snapshot = await get(plaidDataRef);
      const plaidData = snapshot.val();

      if (plaidData) {
        return {
          needsReauth: plaidData.status === "ITEM_LOGIN_REQUIRED",
          hasNewAccounts: plaidData.hasNewAccounts === true,
          credentialsExpiring: plaidData.status === "PENDING_EXPIRATION",
          isDisconnecting: plaidData.status === "PENDING_DISCONNECT",
          lastWebhook: plaidData.lastWebhook,
        };
      }

      return {
        needsReauth: false,
        hasNewAccounts: false,
        credentialsExpiring: false,
        isDisconnecting: false,
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
      this.accessToken = null;
      this.itemId = null;
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

  // Enhanced disconnect with cleanup
  async disconnectBank(): Promise<void> {
    try {
      if (!this.userId) {
        throw new Error("User ID not set");
      }

      // Remove from Firebase
      const plaidRef = ref(db, `users/${this.userId}/plaid`);
      await remove(plaidRef);

      // Clear local state
      this.accessToken = null;
      this.itemId = null;

      // Clear cache and pending requests
      this.requestCache.clear();
      this.pendingTransactionsRequest = null;
      this.pendingAccountsRequest = null;
    } catch (error) {
      console.error("PlaidService: Error disconnecting bank:", error);
      throw error; // Re-throw to allow caller to handle
    }
  }

  // Disconnect bank silently (for logout scenarios)
  async disconnectBankSilently(): Promise<void> {
    try {
      if (!this.userId) {
        return; // No user ID, nothing to disconnect
      }

      // Remove from Firebase
      const plaidRef = ref(db, `users/${this.userId}/plaid`);
      await remove(plaidRef);

      // Clear local state
      this.accessToken = null;
      this.itemId = null;
    } catch (error) {
      console.error("PlaidService: Error silently disconnecting bank:", error);
      // Don't throw for silent disconnection
    }
  }
}

export const plaidService = new PlaidService();
