import { Alert } from "react-native";
import { ref, set, get, remove } from "firebase/database";
import { db } from "../services/firebase";
import { encryptFields, decryptFields } from "./encryption";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";

// Plaid configuration - you'll need to get these from your Plaid dashboard
export const PLAID_CONFIG = {
  clientName: "VectorFi",
  products: ["transactions", "auth", "identity"],
  countryCodes: ["US"],
  language: "en",
  // Replace with your actual Plaid public key from your Plaid dashboard
  publicKey: "7a951d0a678269f8605176340bf071", // Copy your Sandbox public key here
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

  // Set user ID for Firebase operations
  setUserId(userId: string) {
    this.userId = userId;
  }

  // Initialize Plaid Link
  async initializePlaidLink(): Promise<string> {
    try {
      if (!this.userId) {
        throw new Error("User ID not set");
      }

      // Ensure user is authenticated
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      console.log("Initializing Plaid Link for user:", this.userId);

      // Call Firebase Cloud Function to create link token
      const createLinkToken = httpsCallable(this.functions, "createLinkToken");
      const result = await createLinkToken();

      const { linkToken } = result.data as { linkToken: string };
      console.log("Link token created:", linkToken);

      return linkToken;
    } catch (error) {
      console.error("Error initializing Plaid Link:", error);
      throw error;
    }
  }

  // Handle successful link
  async handlePlaidSuccess(publicToken: string, metadata: any): Promise<void> {
    try {
      if (!this.userId) {
        throw new Error("User ID not set");
      }

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

      Alert.alert(
        "Success!",
        `Successfully connected to ${metadata.institution.name}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error handling Plaid success:", error);
      Alert.alert("Error", "Failed to connect bank account");
    }
  }

  // Handle Plaid exit
  handlePlaidExit(error: any, metadata: any): void {
    if (error) {
      console.error("Plaid exit with error:", error);
      Alert.alert("Error", "Failed to connect bank account");
    } else {
      console.log("Plaid exit without error:", metadata);
    }
  }

  // Get accounts from Plaid
  async getAccounts(): Promise<PlaidAccount[]> {
    if (!this.accessToken) {
      throw new Error("No access token available");
    }

    console.log("🔍 Attempting to fetch accounts with:");
    console.log("  - Access Token:", this.accessToken.substring(0, 20) + "...");

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
      // Return mock data for development/testing
      console.log("🔄 Returning mock account data due to error");
      return [
        {
          id: "mock_account_1",
          name: "Demo Checking Account",
          mask: "1234",
          type: "depository",
          subtype: "checking",
          balances: {
            available: 5000,
            current: 5000,
          },
        },
        {
          id: "mock_account_2",
          name: "Demo Savings Account",
          mask: "5678",
          type: "depository",
          subtype: "savings",
          balances: {
            available: 15000,
            current: 15000,
          },
        },
      ];
    }
  }

  // Get transactions from Plaid
  async getTransactions(
    startDate: string,
    endDate: string
  ): Promise<PlaidTransaction[]> {
    if (!this.accessToken) {
      throw new Error("No access token available");
    }

    console.log("🔍 Attempting to fetch transactions with:");
    console.log("  - Access Token:", this.accessToken.substring(0, 20) + "...");
    console.log("  - Start Date:", startDate);
    console.log("  - End Date:", endDate);

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
      console.log("🔄 Returning mock transaction data due to error");
      return [
        {
          id: "mock_transaction_1",
          account_id: "mock_account_1",
          amount: -85.5,
          date: new Date().toISOString().split("T")[0],
          name: "Grocery Store",
          merchant_name: "Whole Foods Market",
          category: ["Food and Drink", "Restaurants"],
          pending: false,
        },
        {
          id: "mock_transaction_2",
          account_id: "mock_account_1",
          amount: 2500.0,
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          name: "Salary Deposit",
          category: ["Transfer", "Payroll"],
          pending: false,
        },
        {
          id: "mock_transaction_3",
          account_id: "mock_account_1",
          amount: -45.0,
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          name: "Gas Station",
          merchant_name: "Shell",
          category: ["Transportation", "Gas"],
          pending: false,
        },
        {
          id: "mock_transaction_4",
          account_id: "mock_account_2",
          amount: -120.0,
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          name: "Online Shopping",
          merchant_name: "Amazon",
          category: ["Shopping", "Retail"],
          pending: false,
        },
      ];
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

        console.log(
          "Loaded access token:",
          this.accessToken ? "Present" : "Missing"
        );
        return plaidData.status === "connected";
      }

      return false;
    } catch (error) {
      console.error("Error checking bank connection:", error);
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

  // Disconnect bank
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

      Alert.alert("Success", "Bank account disconnected");
    } catch (error) {
      console.error("Error disconnecting bank:", error);
      Alert.alert("Error", "Failed to disconnect bank account");
    }
  }
}

export const plaidService = new PlaidService();
