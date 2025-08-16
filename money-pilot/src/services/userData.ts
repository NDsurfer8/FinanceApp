import { ref, set, get, push, update, remove } from "firebase/database";
import { db } from "./firebase";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
  id?: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: number;
  userId: string;
}

export interface Asset {
  id?: string;
  name: string;
  balance: number;
  type: string;
  userId: string;
}

export interface Debt {
  id?: string;
  name: string;
  balance: number;
  rate: number;
  payment: number;
  userId: string;
}

// Create or update user profile
export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    const userRef = ref(db, `users/${profile.uid}/profile`);
    await set(userRef, {
      ...profile,
      updatedAt: Date.now(),
    });
    console.log("User profile saved successfully");
  } catch (error) {
    console.error("Error saving user profile:", error);
    throw error;
  }
};

// Get user profile
export const getUserProfile = async (
  uid: string
): Promise<UserProfile | null> => {
  try {
    const userRef = ref(db, `users/${uid}/profile`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

// Save transaction
export const saveTransaction = async (
  transaction: Transaction
): Promise<string> => {
  try {
    const transactionsRef = ref(db, `users/${transaction.userId}/transactions`);
    const newTransactionRef = push(transactionsRef);
    const transactionId = newTransactionRef.key;

    if (!transactionId) {
      throw new Error("Failed to generate transaction ID");
    }

    await set(newTransactionRef, {
      ...transaction,
      id: transactionId,
    });

    console.log("Transaction saved successfully");
    return transactionId;
  } catch (error) {
    console.error("Error saving transaction:", error);
    throw error;
  }
};

// Get user transactions
export const getUserTransactions = async (
  userId: string
): Promise<Transaction[]> => {
  try {
    const transactionsRef = ref(db, `users/${userId}/transactions`);
    const snapshot = await get(transactionsRef);

    if (snapshot.exists()) {
      const transactions: Transaction[] = [];
      snapshot.forEach((childSnapshot) => {
        transactions.push(childSnapshot.val());
      });
      return transactions.sort((a, b) => b.date - a.date);
    }
    return [];
  } catch (error) {
    console.error("Error getting user transactions:", error);
    throw error;
  }
};

// Save asset
export const saveAsset = async (asset: Asset): Promise<string> => {
  try {
    const assetsRef = ref(db, `users/${asset.userId}/assets`);
    const newAssetRef = push(assetsRef);
    const assetId = newAssetRef.key;

    if (!assetId) {
      throw new Error("Failed to generate asset ID");
    }

    await set(newAssetRef, {
      ...asset,
      id: assetId,
    });

    console.log("Asset saved successfully");
    return assetId;
  } catch (error) {
    console.error("Error saving asset:", error);
    throw error;
  }
};

// Get user assets
export const getUserAssets = async (userId: string): Promise<Asset[]> => {
  try {
    const assetsRef = ref(db, `users/${userId}/assets`);
    const snapshot = await get(assetsRef);

    if (snapshot.exists()) {
      const assets: Asset[] = [];
      snapshot.forEach((childSnapshot) => {
        assets.push(childSnapshot.val());
      });
      return assets;
    }
    return [];
  } catch (error) {
    console.error("Error getting user assets:", error);
    throw error;
  }
};

// Save debt
export const saveDebt = async (debt: Debt): Promise<string> => {
  try {
    const debtsRef = ref(db, `users/${debt.userId}/debts`);
    const newDebtRef = push(debtsRef);
    const debtId = newDebtRef.key;

    if (!debtId) {
      throw new Error("Failed to generate debt ID");
    }

    await set(newDebtRef, {
      ...debt,
      id: debtId,
    });

    console.log("Debt saved successfully");
    return debtId;
  } catch (error) {
    console.error("Error saving debt:", error);
    throw error;
  }
};

// Get user debts
export const getUserDebts = async (userId: string): Promise<Debt[]> => {
  try {
    const debtsRef = ref(db, `users/${userId}/debts`);
    const snapshot = await get(debtsRef);

    if (snapshot.exists()) {
      const debts: Debt[] = [];
      snapshot.forEach((childSnapshot) => {
        debts.push(childSnapshot.val());
      });
      return debts;
    }
    return [];
  } catch (error) {
    console.error("Error getting user debts:", error);
    throw error;
  }
};

// Remove transaction
export const removeTransaction = async (
  userId: string,
  transactionId: string
): Promise<void> => {
  try {
    const transactionRef = ref(
      db,
      `users/${userId}/transactions/${transactionId}`
    );
    await remove(transactionRef);
    console.log("Transaction removed successfully");
  } catch (error) {
    console.error("Error removing transaction:", error);
    throw error;
  }
};

// Remove asset
export const removeAsset = async (
  userId: string,
  assetId: string
): Promise<void> => {
  try {
    const assetRef = ref(db, `users/${userId}/assets/${assetId}`);
    await remove(assetRef);
    console.log("Asset removed successfully");
  } catch (error) {
    console.error("Error removing asset:", error);
    throw error;
  }
};

// Remove debt
export const removeDebt = async (
  userId: string,
  debtId: string
): Promise<void> => {
  try {
    const debtRef = ref(db, `users/${userId}/debts/${debtId}`);
    await remove(debtRef);
    console.log("Debt removed successfully");
  } catch (error) {
    console.error("Error removing debt:", error);
    throw error;
  }
};
