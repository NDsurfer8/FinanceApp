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
  private readonly CACHE_DURATION = 30000; // 30 seconds

  // Set user ID for Firebase operations
  setUserId(userId: string) {
    this.userId = userId;
  }

  // Generate cache key for requests
  private getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}_${JSON.stringify(params)}`;
  }

  // Check if cached data is still valid
  private isCacheValid(cacheKey: string): boolean {
    const cached = this.requestCache.get(cacheKey);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.CACHE_DURATION;
  }

  // Register callback for when bank is connected
  onBankConnected(callback: () => void) {
    this.onBankConnectedCallbacks.push(callback);
  }

  // Trigger bank connected callbacks
  private triggerBankConnectedCallbacks() {
    console.log("PlaidService: Triggering bank connected callbacks");
    this.onBankConnectedCallbacks.forEach((callback) => callback());
  }

  async initializePlaidLink(): Promise<string> {
    if (!this.userId) throw new Error("User ID not set");
    if (!this.auth.currentUser) throw new Error("User not authenticated");

    console.log("Initializing Plaid Link for user:", this.userId);

    // Typed callable
    type Resp = { link_token: string; expiration?: string };
    const callable = httpsCallable<unknown, Resp>(
      this.functions,
      "createLinkToken"
    );

    const res = await callable(); // Optionally pass { platform: Platform.OS }
    const linkToken = res?.data?.link_token; // <- snake_case

    if (typeof linkToken !== "string" || !linkToken.length) {
      console.error("Bad createLinkToken response:", res?.data);
      throw new Error("createLinkToken did not return link_token");
    }

    return linkToken;
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
          console.log("Plaid Link success:", success);
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

  // Complete Plaid Link flow with modern pattern
  async startPlaidLinkFlow(
    onSuccess: (success: LinkSuccess) => void,
    onExit: (exit: LinkExit) => void
  ): Promise<void> {
    try {
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
      console.log("Plaid link successful:", { publicToken, metadata });

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
      const exchangeResult = await exchangePublicToken({ publicToken });

      const { accessToken, itemId } = exchangeResult.data as {
        accessToken: string;
        itemId: string;
      };

      // Get accounts using the access token
      const getAccounts = httpsCallable(this.functions, "getAccounts");
      const accountsResult = await getAccounts({ accessToken });

      const { accounts } = accountsResult.data as { accounts: any[] };

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

      // Clear cache to ensure fresh data
      this.requestCache.clear();
      this.pendingTransactionsRequest = null;
      this.pendingAccountsRequest = null;

      // Trigger callbacks to notify that bank is connected
      this.triggerBankConnectedCallbacks();

      Alert.alert(
        "Success!",
        `Successfully connected to ${metadata.institution.name}`,
        [{ text: "OK" }]
      );
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
    } else {
      console.log("Plaid exit without error:", metadata);
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

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      console.log("📦 Returning cached accounts data");
      return this.requestCache.get(cacheKey)!.data;
    }

    // Check if there's already a pending request
    if (this.pendingAccountsRequest) {
      console.log("🔄 Reusing existing accounts request");
      return this.pendingAccountsRequest;
    }

    console.log("🔍 Attempting to fetch accounts with:");
    console.log("  - Access Token:", this.accessToken.substring(0, 20) + "...");

    // Create the request promise
    this.pendingAccountsRequest = this._fetchAccounts();

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
      console.log("📞 Calling Firebase Function: getAccounts");

      const result = await getAccounts({ accessToken: this.accessToken });

      console.log("✅ Firebase Function returned:", result.data);
      const { accounts } = result.data as { accounts: any[] };

      console.log("📊 Found", accounts?.length || 0, "accounts");

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
      console.log("Access token being used:", this.accessToken);
      throw error; // Re-throw the error instead of returning mock data
    }
  }

  // Retry configuration for PRODUCT_NOT_READY errors
  private readonly MAX_RETRIES = 10; // Increased from 3 to 10 for more persistence
  private readonly RETRY_DELAYS = [
    5000, 10000, 15000, 20000, 30000, 45000, 60000, 90000, 120000, 180000,
  ]; // Progressive delays up to 3 minutes

  // Get transactions from Plaid
  async getTransactions(
    startDate: string,
    endDate: string
  ): Promise<PlaidTransaction[]> {
    if (!this.accessToken) {
      throw new Error("No access token available");
    }

    const cacheKey = this.getCacheKey("transactions", { startDate, endDate });

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      console.log("📦 Returning cached transactions data");
      return this.requestCache.get(cacheKey)!.data;
    }

    // Check if there's already a pending request
    if (this.pendingTransactionsRequest) {
      console.log("🔄 Reusing existing transactions request");
      return this.pendingTransactionsRequest;
    }

    console.log("🔍 Attempting to fetch transactions with:");
    console.log("  - Access Token:", this.accessToken.substring(0, 20) + "...");
    console.log("  - Start Date:", startDate);
    console.log("  - End Date:", endDate);

    // Create the request promise with retry logic
    this.pendingTransactionsRequest = this._fetchTransactionsWithRetry(
      startDate,
      endDate
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

          console.log(
            `📊 Transaction date range: ${dateRangeInDays.toFixed(1)} days (${
              transactions.length
            } transactions)`
          );

          // If we have at least 60 days of data or we're not requesting a full 3-month range, return the data
          if (
            dateRangeInDays >= 60 ||
            !this._isRequestingFullRange(startDate, endDate)
          ) {
            console.log(
              `✅ Sufficient transaction data found (${dateRangeInDays.toFixed(
                1
              )} days)`
            );
            return transactions;
          } else {
            console.log(
              `⚠️ Insufficient transaction data (${dateRangeInDays.toFixed(
                1
              )} days), continuing to retry...`
            );
            // Continue retrying to get more data
          }
        }

        return transactions;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        console.log(
          `🔄 Retry attempt ${attempt + 1}: Error message: "${errorMessage}"`
        );

        // If it's a PRODUCT_NOT_READY error and we haven't exceeded retries
        if (
          (errorMessage.includes("400") ||
            errorMessage.includes("PRODUCT_NOT_READY") ||
            errorMessage.includes("not yet ready") ||
            errorMessage.includes("product_not_ready")) &&
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

        // For other errors or max retries reached, throw the error
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

  // Private method to actually fetch transactions
  private async _fetchTransactions(
    startDate: string,
    endDate: string
  ): Promise<PlaidTransaction[]> {
    try {
      const getTransactions = httpsCallable(this.functions, "getTransactions");
      console.log("📞 Calling Firebase Function: getTransactions");

      const result = await getTransactions({
        accessToken: this.accessToken,
        startDate,
        endDate,
      });

      console.log("✅ Firebase Function returned:", result.data);
      const { transactions } = result.data as { transactions: any[] };

      console.log("📊 Found", transactions?.length || 0, "transactions");

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

      // Check if it's a rate limit error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429") ||
        errorMessage.includes("too many requests")
      ) {
        console.warn("⚠️ Rate limit detected, suggesting retry after delay");
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
      console.log("PlaidService: No user ID set");
      return false;
    }

    try {
      console.log(
        "PlaidService: Checking bank connection for user:",
        this.userId
      );
      // Check Firebase for existing connection
      const plaidRef = ref(db, `users/${this.userId}/plaid`);
      const snapshot = await get(plaidRef);

      if (snapshot.exists()) {
        const encryptedPlaidData = snapshot.val();
        console.log("PlaidService: Found Plaid data in Firebase");

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

        console.log(
          "PlaidService: Loaded access token:",
          this.accessToken ? "Present" : "Missing"
        );
        console.log("PlaidService: Plaid status:", plaidData.status);
        return plaidData.status === "connected";
      }

      console.log("PlaidService: No Plaid data found in Firebase");
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
        console.log("PlaidService: No user ID set");
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
        console.log("PlaidService: Rate limited, skipping update check");
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
      console.log("PlaidService: Starting bank reconnection...");

      // Create a new link token for reconnection
      const linkToken = await this.initializePlaidLink();

      // Create Plaid Link session
      await this.createPlaidLinkSession(linkToken);

      // Open Plaid Link for reconnection
      await this.openPlaidLink(
        () => console.log("PlaidService: Reconnection successful"),
        () => console.log("PlaidService: Reconnection cancelled")
      );

      console.log("PlaidService: Bank reconnection initiated");
    } catch (error) {
      console.error("PlaidService: Error reconnecting bank:", error);
      throw error;
    }
  }

  // Handle new accounts for update mode
  async addNewAccounts(newAccounts: any[]): Promise<void> {
    try {
      console.log("PlaidService: Adding new accounts:", newAccounts);

      // Create a new link token with account selection enabled
      const linkToken = await this.initializePlaidLink();

      // Create Plaid Link session
      await this.createPlaidLinkSession(linkToken);

      // Open Plaid Link for account selection
      await this.openPlaidLink(
        () => console.log("PlaidService: New accounts added successfully"),
        () => console.log("PlaidService: New accounts selection cancelled")
      );

      console.log("PlaidService: New account selection initiated");
    } catch (error) {
      console.error("PlaidService: Error adding new accounts:", error);
      throw error;
    }
  }

  // Clear update mode flags after user action
  async clearUpdateModeFlags(): Promise<void> {
    try {
      if (!this.userId) {
        console.log("PlaidService: No user ID set for clearing flags");
        return;
      }

      console.log("PlaidService: Clearing update mode flags...");

      const plaidDataRef = ref(db, `users/${this.userId}/plaid`);
      await update(plaidDataRef, {
        hasNewAccounts: false,
        newAccounts: null,
        newAccountsAvailableAt: null,
        expirationWarning: false,
        disconnectWarning: false,
        lastUpdated: Date.now(),
      });

      console.log("PlaidService: Update mode flags cleared");
    } catch (error) {
      console.error("PlaidService: Error clearing update mode flags:", error);
    }
  }

  // Enhanced logout handling
  async handleLogout(): Promise<void> {
    try {
      console.log("PlaidService: Handling logout...");

      // Clear local state
      this.accessToken = null;
      this.itemId = null;
      this.userId = null;

      // Clear cache and pending requests
      this.requestCache.clear();
      this.pendingTransactionsRequest = null;
      this.pendingAccountsRequest = null;

      console.log("PlaidService: Logout handled successfully");
    } catch (error) {
      console.error("PlaidService: Error handling logout:", error);
    }
  }

  // Enhanced disconnect with cleanup
  async disconnectBank(): Promise<void> {
    try {
      if (!this.userId) {
        throw new Error("User ID not set");
      }

      console.log("PlaidService: Disconnecting bank for user:", this.userId);

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

      console.log("PlaidService: Bank disconnected successfully");
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

      console.log(
        "PlaidService: Silently disconnecting bank for user:",
        this.userId
      );

      // Remove from Firebase
      const plaidRef = ref(db, `users/${this.userId}/plaid`);
      await remove(plaidRef);

      // Clear local state
      this.accessToken = null;
      this.itemId = null;

      console.log("PlaidService: Bank disconnected silently");
    } catch (error) {
      console.error("PlaidService: Error silently disconnecting bank:", error);
      // Don't throw for silent disconnection
    }
  }
}

export const plaidService = new PlaidService();
