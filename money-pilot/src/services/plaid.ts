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

    try {
      // This would make an API call to Plaid's /accounts/get endpoint
      // For now, return mock data
      return [
        {
          id: "account_1",
          name: "Checking Account",
          mask: "1234",
          type: "depository",
          subtype: "checking",
          balances: {
            available: 5000,
            current: 5000,
          },
        },
        {
          id: "account_2",
          name: "Savings Account",
          mask: "5678",
          type: "depository",
          subtype: "savings",
          balances: {
            available: 15000,
            current: 15000,
          },
        },
      ];
    } catch (error) {
      console.error("Error getting accounts:", error);
      throw error;
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

    try {
      // This would make an API call to Plaid's /transactions/get endpoint
      // For now, return mock data
      return [
        {
          id: "transaction_1",
          account_id: "account_1",
          amount: -50.0,
          date: "2024-01-15",
          name: "Grocery Store",
          merchant_name: "Whole Foods Market",
          category: ["Food and Drink", "Restaurants"],
          pending: false,
        },
        {
          id: "transaction_2",
          account_id: "account_1",
          amount: 2000.0,
          date: "2024-01-14",
          name: "Salary Deposit",
          category: ["Transfer", "Payroll"],
          pending: false,
        },
      ];
    } catch (error) {
      console.error("Error getting transactions:", error);
      throw error;
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
        ];

        const plaidData = await decryptFields(
          encryptedPlaidData,
          fieldsToDecrypt
        );

        this.accessToken = plaidData.accessToken || null;
        this.itemId = plaidData.itemId || null;
        return plaidData.status === "connected";
      }

      return false;
    } catch (error) {
      console.error("Error checking bank connection:", error);
      return false;
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
