import { ref, set, get, push, update, remove } from "firebase/database";
import { db, auth } from "./firebase";

/**
 * Cleans data by removing undefined values before writing to Firebase
 * Firebase doesn't allow undefined values - they must be null or removed
 */
const cleanDataForFirebase = <T>(data: T): T => {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .map((item) => cleanDataForFirebase(item))
      .filter((item) => item !== undefined) as T;
  }

  if (typeof data === "object") {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanDataForFirebase(value);
      }
    }
    return cleaned;
  }

  return data;
};

export interface DataSharingSettings {
  shareNetWorth: boolean;
  shareMonthlyIncome: boolean;
  shareMonthlyExpenses: boolean;
  shareTransactions: boolean;
  shareRecurringTransactions: boolean;
  shareAssets: boolean;
  shareDebts: boolean;
  shareGoals: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
  dataSharingSettings?: DataSharingSettings;
}

export interface Transaction {
  id?: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  description: string;
  date: number;
  userId: string;
  recurringTransactionId?: string; // Reference to the recurring transaction that created this
  createdAt?: number;
  updatedAt?: number;
  // Flag to distinguish actual vs projected transactions
  isProjected?: boolean;
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

export interface FinancialGoal {
  id?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  targetDate: string;
  category: string;
  priority: "high" | "medium" | "low";
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface EmergencyFund {
  id?: string;
  currentBalance: number;
  targetMonths: number;
  monthlyContribution: number;
  userId: string;
  updatedAt: number;
}

export interface BudgetSettings {
  id?: string;
  savingsPercentage: number;
  debtPayoffPercentage: number;
  userId: string;
  updatedAt: number;
}

export interface RecurringTransaction {
  id?: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  startDate: number;
  endDate?: number; // Optional end date
  isActive: boolean;
  skippedMonths?: string[]; // Array of "YYYY-MM" strings for skipped months
  monthOverrides?: {
    [monthKey: string]: { amount: number; category?: string; name?: string };
  }; // Month-specific overrides
  userId: string;
  createdAt: number;
  updatedAt: number;
  // New fields for smart recurring system
  lastGeneratedDate?: number; // Last time a transaction was generated
  nextDueDate?: number; // Next expected occurrence
  totalOccurrences?: number; // Count of times generated
}

// ===== SHARED FINANCE INTERFACES =====

export interface SharedGroup {
  id?: string;
  name: string;
  description?: string;
  type: "couple" | "family" | "business" | "investment";
  ownerId: string;
  members: SharedGroupMember[];
  settings: SharedGroupSettings;
  createdAt: number;
  updatedAt: number;
}

export interface SharedGroupMember {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: "owner" | "member" | "viewer";
  joinedAt: number;
  permissions: {
    canAddTransactions: boolean;
    canEditTransactions: boolean;
    canAddAssets: boolean;
    canEditAssets: boolean;
    canAddDebts: boolean;
    canEditDebts: boolean;
    canAddGoals: boolean;
    canEditGoals: boolean;
    canInviteMembers: boolean;
    canRemoveMembers: boolean;
    canViewAllData: boolean;
  };
}

export interface SharedGroupSettings {
  shareTransactions: boolean;
  shareAssets: boolean;
  shareDebts: boolean;
  shareGoals: boolean;
  shareBudgetSettings: boolean;
  allowMemberInvites: boolean;
  requireApprovalForJoining: boolean;
}

export interface FinancialPlan {
  id?: string;
  userId: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  planData: any;
  csvData: string;
}

export interface SharedInvitation {
  id?: string;
  groupId: string;
  groupName: string;
  inviterId: string;
  inviterName: string;
  inviteeEmail: string;
  role: "member" | "viewer";
  status: "pending" | "accepted" | "declined" | "expired";
  expiresAt: number;
  createdAt: number;
}

export interface NetWorthEntry {
  id?: string;
  userId: string;
  netWorth: number;
  assets: number;
  debts: number;
  date: number; // timestamp
  createdAt: number;
  updatedAt: number;
}

// Create or update user profile
export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
  try {
    const userRef = ref(db, `users/${profile.uid}/profile`);
    await set(userRef, {
      ...profile,
      updatedAt: Date.now(),
    });
    console.log("User profile saved successfully to database");
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

// Save net worth entry
export const saveNetWorthEntry = async (
  entry: NetWorthEntry
): Promise<string> => {
  try {
    const { encryptNetWorthEntry } = await import("./encryption");
    const encryptedEntry = await encryptNetWorthEntry(entry);

    const netWorthRef = ref(db, `users/${entry.userId}/netWorth`);
    const newEntryRef = push(netWorthRef);
    const entryId = newEntryRef.key;

    if (!entryId) {
      throw new Error("Failed to generate net worth entry ID");
    }

    await set(newEntryRef, {
      ...encryptedEntry,
      id: entryId,
    });

    console.log("Net worth entry saved successfully");
    return entryId;
  } catch (error) {
    console.error("Error saving net worth entry:", error);
    throw error;
  }
};

// Get user net worth entries
export const getUserNetWorthEntries = async (
  userId: string
): Promise<NetWorthEntry[]> => {
  try {
    const { decryptNetWorthEntries } = await import("./encryption");
    const netWorthRef = ref(db, `users/${userId}/netWorth`);
    const snapshot = await get(netWorthRef);

    if (snapshot.exists()) {
      const entries: NetWorthEntry[] = [];
      snapshot.forEach((childSnapshot) => {
        entries.push(childSnapshot.val());
      });

      // Decrypt all entries
      const decryptedEntries = await decryptNetWorthEntries(entries);
      return decryptedEntries.sort(
        (a: NetWorthEntry, b: NetWorthEntry) => b.date - a.date
      );
    }
    return [];
  } catch (error) {
    console.error("Error getting user net worth entries:", error);
    throw error;
  }
};

// Debounce mechanism to prevent multiple simultaneous calls
const updateNetWorthCallbacks: { [userId: string]: NodeJS.Timeout } = {};

// Update net worth from current assets and debts
export const updateNetWorthFromAssetsAndDebts = async (
  userId: string
): Promise<void> => {
  console.log("updateNetWorthFromAssetsAndDebts called for user:", userId);

  // Clear any existing timeout for this user
  if (updateNetWorthCallbacks[userId]) {
    clearTimeout(updateNetWorthCallbacks[userId]);
  }

  // Set a new timeout to debounce the call
  updateNetWorthCallbacks[userId] = setTimeout(async () => {
    console.log("updateNetWorthFromAssetsAndDebts executing for user:", userId);
    try {
      // Get current assets and debts
      const [assets, debts] = await Promise.all([
        getUserAssets(userId),
        getUserDebts(userId),
      ]);

      // Calculate totals
      const totalAssets = assets.reduce(
        (sum: number, asset: any) => sum + asset.balance,
        0
      );
      const totalDebts = debts.reduce(
        (sum: number, debt: any) => sum + debt.balance,
        0
      );
      const netWorth = totalAssets - totalDebts;

      // Get existing net worth entries
      const entries = await getUserNetWorthEntries(userId);

      // Check if there's already an entry for current month
      const currentDate = new Date();
      const currentMonthEntry = entries.find((entry) => {
        const entryDate = new Date(entry.date);
        return (
          entryDate.getMonth() === currentDate.getMonth() &&
          entryDate.getFullYear() === currentDate.getFullYear()
        );
      });

      if (currentMonthEntry) {
        // Update existing entry
        const { encryptNetWorthEntry } = await import("./encryption");
        const updatedEntry = {
          ...currentMonthEntry,
          netWorth,
          assets: totalAssets,
          debts: totalDebts,
          updatedAt: Date.now(),
        };
        const encryptedEntry = await encryptNetWorthEntry(updatedEntry);

        const entryRef = ref(
          db,
          `users/${userId}/netWorth/${currentMonthEntry.id}`
        );
        await set(entryRef, encryptedEntry);
        console.log("Current month net worth updated successfully");
      } else {
        // Create new entry for current month
        const currentMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        console.log("Creating new net worth entry for month:", currentMonth);
        const newEntry: NetWorthEntry = {
          userId,
          netWorth,
          assets: totalAssets,
          debts: totalDebts,
          date: currentMonth.getTime(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await saveNetWorthEntry(newEntry);
        console.log("New net worth entry created for current month");
      }

      // Maintain only last 6 entries
      await maintainNetWorthHistory(userId);
    } catch (error) {
      console.error("Error updating net worth from assets and debts:", error);
      throw error;
    }
  }, 100); // 100ms debounce delay
};

// Maintain only last 6 net worth entries
export const maintainNetWorthHistory = async (
  userId: string
): Promise<void> => {
  try {
    const entries = await getUserNetWorthEntries(userId);

    if (entries.length > 6) {
      // Sort by date (newest first) and keep only the last 6
      const sortedEntries = entries.sort((a, b) => b.date - a.date);
      const entriesToKeep = sortedEntries.slice(0, 6);
      const entriesToDelete = sortedEntries.slice(6);

      // Delete old entries
      for (const entry of entriesToDelete) {
        if (entry.id) {
          const entryRef = ref(db, `users/${userId}/netWorth/${entry.id}`);
          await remove(entryRef);
        }
      }
      console.log(`Deleted ${entriesToDelete.length} old net worth entries`);
    }
  } catch (error) {
    console.error("Error maintaining net worth history:", error);
    throw error;
  }
};

// Save transaction
export const saveTransaction = async (
  transaction: Transaction
): Promise<string> => {
  try {
    const { encryptTransaction } = await import("./encryption");
    const encryptedTransaction = await encryptTransaction(transaction);

    const transactionsRef = ref(db, `users/${transaction.userId}/transactions`);
    const newTransactionRef = push(transactionsRef);
    const transactionId = newTransactionRef.key;

    if (!transactionId) {
      throw new Error("Failed to generate transaction ID");
    }

    await set(newTransactionRef, {
      ...encryptedTransaction,
      id: transactionId,
    });

    // Auto-update shared groups
    await updateSharedGroupsForUser(transaction.userId);

    // Schedule bill reminders for the new transaction
    try {
      const { billReminderService } = await import("./billReminders");
      await billReminderService.scheduleAllBillReminders(transaction.userId);
    } catch (error) {
      console.error("Error updating bill reminders:", error);
    }

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
    const { decryptTransactions } = await import("./encryption");
    const transactionsRef = ref(db, `users/${userId}/transactions`);
    const snapshot = await get(transactionsRef);

    if (snapshot.exists()) {
      const transactions: Transaction[] = [];
      snapshot.forEach((childSnapshot) => {
        transactions.push(childSnapshot.val());
      });

      // Decrypt all transactions
      const decryptedTransactions = await decryptTransactions(transactions);
      return decryptedTransactions.sort((a, b) => b.date - a.date);
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
    const { encryptAsset } = await import("./encryption");
    const encryptedAsset = await encryptAsset(asset);

    const assetsRef = ref(db, `users/${asset.userId}/assets`);
    const newAssetRef = push(assetsRef);
    const assetId = newAssetRef.key;

    if (!assetId) {
      throw new Error("Failed to generate asset ID");
    }

    await set(newAssetRef, {
      ...encryptedAsset,
      id: assetId,
    });

    console.log("Asset saved successfully");

    // Auto-update shared groups
    await updateSharedGroupsForUser(asset.userId);

    // Auto-update net worth
    await updateNetWorthFromAssetsAndDebts(asset.userId);

    return assetId;
  } catch (error) {
    console.error("Error saving asset:", error);
    throw error;
  }
};

// Get user assets
export const getUserAssets = async (userId: string): Promise<Asset[]> => {
  try {
    const { decryptAssets } = await import("./encryption");
    const { migrateAssetsToTypes } = await import("../utils/assetMigration");
    const assetsRef = ref(db, `users/${userId}/assets`);
    const snapshot = await get(assetsRef);

    if (snapshot.exists()) {
      const assets: Asset[] = [];
      snapshot.forEach((childSnapshot) => {
        assets.push(childSnapshot.val());
      });

      // Decrypt all assets
      const decryptedAssets = await decryptAssets(assets);

      // Migrate assets to have proper types if needed
      const migratedAssets = migrateAssetsToTypes(decryptedAssets);

      return migratedAssets;
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
    const { encryptDebt } = await import("./encryption");
    const encryptedDebt = await encryptDebt(debt);

    const debtsRef = ref(db, `users/${debt.userId}/debts`);
    const newDebtRef = push(debtsRef);
    const debtId = newDebtRef.key;

    if (!debtId) {
      throw new Error("Failed to generate debt ID");
    }

    await set(newDebtRef, {
      ...encryptedDebt,
      id: debtId,
    });

    console.log("Debt saved successfully");

    // Auto-update shared groups
    await updateSharedGroupsForUser(debt.userId);

    // Auto-update net worth
    await updateNetWorthFromAssetsAndDebts(debt.userId);

    return debtId;
  } catch (error) {
    console.error("Error saving debt:", error);
    throw error;
  }
};

// Get user debts
export const getUserDebts = async (userId: string): Promise<Debt[]> => {
  try {
    const { decryptDebts } = await import("./encryption");
    const debtsRef = ref(db, `users/${userId}/debts`);
    const snapshot = await get(debtsRef);

    if (snapshot.exists()) {
      const debts: Debt[] = [];
      snapshot.forEach((childSnapshot) => {
        debts.push(childSnapshot.val());
      });

      // Decrypt all debts
      const decryptedDebts = await decryptDebts(debts);
      return decryptedDebts;
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

    // Auto-update shared groups
    await updateSharedGroupsForUser(userId);

    // Schedule bill reminders after removing transaction
    try {
      const { billReminderService } = await import("./billReminders");
      await billReminderService.scheduleAllBillReminders(userId);
    } catch (error) {
      console.error("Error updating bill reminders:", error);
    }
  } catch (error) {
    console.error("Error removing transaction:", error);
    throw error;
  }
};

// Update transaction
export const updateTransaction = async (
  transaction: Transaction
): Promise<void> => {
  try {
    const { encryptTransaction } = await import("./encryption");
    const encryptedTransaction = await encryptTransaction(transaction);

    const transactionRef = ref(
      db,
      `users/${transaction.userId}/transactions/${transaction.id}`
    );
    await set(transactionRef, {
      ...encryptedTransaction,
      updatedAt: Date.now(),
    });

    // Auto-update shared groups
    await updateSharedGroupsForUser(transaction.userId);

    // Schedule bill reminders for the updated transaction
    try {
      const { billReminderService } = await import("./billReminders");
      await billReminderService.scheduleAllBillReminders(transaction.userId);
    } catch (error) {
      console.error("Error updating bill reminders:", error);
    }
  } catch (error) {
    console.error("Error updating transaction:", error);
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

    // Auto-update shared groups
    await updateSharedGroupsForUser(userId);

    // Auto-update net worth
    await updateNetWorthFromAssetsAndDebts(userId);
  } catch (error) {
    console.error("Error removing asset:", error);
    throw error;
  }
};

// Update asset
export const updateAsset = async (asset: Asset): Promise<void> => {
  try {
    const { encryptAsset } = await import("./encryption");
    const encryptedAsset = await encryptAsset(asset);

    const assetRef = ref(db, `users/${asset.userId}/assets/${asset.id}`);
    await update(assetRef, {
      ...encryptedAsset,
      updatedAt: Date.now(),
    });

    // Auto-update shared groups
    await updateSharedGroupsForUser(asset.userId);

    // Auto-update net worth
    await updateNetWorthFromAssetsAndDebts(asset.userId);
  } catch (error) {
    console.error("Error updating asset:", error);
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

    // Auto-update shared groups
    await updateSharedGroupsForUser(userId);

    // Auto-update net worth
    await updateNetWorthFromAssetsAndDebts(userId);
  } catch (error) {
    console.error("Error removing debt:", error);
    throw error;
  }
};

// Update debt
export const updateDebt = async (debt: Debt): Promise<void> => {
  try {
    const { encryptDebt } = await import("./encryption");
    const encryptedDebt = await encryptDebt(debt);

    const debtRef = ref(db, `users/${debt.userId}/debts/${debt.id}`);
    await update(debtRef, {
      ...encryptedDebt,
      updatedAt: Date.now(),
    });
    console.log("Debt updated successfully");

    // Auto-update shared groups
    await updateSharedGroupsForUser(debt.userId);

    // Auto-update net worth
    await updateNetWorthFromAssetsAndDebts(debt.userId);
  } catch (error) {
    console.error("Error updating debt:", error);
    throw error;
  }
};

// ===== GOALS CRUD OPERATIONS =====

// Save goal
export const saveGoal = async (goal: FinancialGoal): Promise<string> => {
  try {
    const { encryptGoal } = await import("./encryption");
    const encryptedGoal = await encryptGoal(goal);

    const goalsRef = ref(db, `users/${goal.userId}/goals`);
    const newGoalRef = push(goalsRef);
    const goalId = newGoalRef.key;

    if (!goalId) {
      throw new Error("Failed to generate goal ID");
    }

    await set(newGoalRef, {
      ...encryptedGoal,
      id: goalId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("Goal saved successfully");

    // Auto-update shared groups
    await updateSharedGroupsForUser(goal.userId);

    return goalId;
  } catch (error) {
    console.error("Error saving goal:", error);
    throw error;
  }
};

// Get user goals
export const getUserGoals = async (
  userId: string
): Promise<FinancialGoal[]> => {
  try {
    const { decryptGoals } = await import("./encryption");
    const goalsRef = ref(db, `users/${userId}/goals`);
    const snapshot = await get(goalsRef);

    if (snapshot.exists()) {
      const goals: FinancialGoal[] = [];
      snapshot.forEach((childSnapshot) => {
        goals.push(childSnapshot.val());
      });

      // Decrypt all goals
      const decryptedGoals = await decryptGoals(goals);
      return decryptedGoals.sort((a, b) => b.createdAt - a.createdAt);
    }
    return [];
  } catch (error) {
    console.error("Error getting user goals:", error);
    throw error;
  }
};

// Update goal
export const updateGoal = async (goal: FinancialGoal): Promise<void> => {
  try {
    const { encryptGoal } = await import("./encryption");
    const encryptedGoal = await encryptGoal(goal);

    const goalRef = ref(db, `users/${goal.userId}/goals/${goal.id}`);
    await update(goalRef, {
      ...encryptedGoal,
      updatedAt: Date.now(),
    });
    console.log("Goal updated successfully");

    // Auto-update shared groups
    await updateSharedGroupsForUser(goal.userId);
  } catch (error) {
    console.error("Error updating goal:", error);
    throw error;
  }
};

// Remove goal
export const removeGoal = async (
  userId: string,
  goalId: string
): Promise<void> => {
  try {
    const goalRef = ref(db, `users/${userId}/goals/${goalId}`);
    await remove(goalRef);
    console.log("Goal removed successfully");

    // Auto-update shared groups
    await updateSharedGroupsForUser(userId);
  } catch (error) {
    console.error("Error removing goal:", error);
    throw error;
  }
};

// ===== EMERGENCY FUND CRUD OPERATIONS =====

// Save emergency fund
export const saveEmergencyFund = async (
  emergencyFund: EmergencyFund
): Promise<string> => {
  try {
    const { encryptEmergencyFund } = await import("./encryption");
    const encryptedFund = await encryptEmergencyFund(emergencyFund);

    const emergencyFundRef = ref(
      db,
      `users/${emergencyFund.userId}/emergencyFund`
    );
    const newEmergencyFundRef = push(emergencyFundRef);
    const emergencyFundId = newEmergencyFundRef.key;

    if (!emergencyFundId) {
      throw new Error("Failed to generate emergency fund ID");
    }

    await set(newEmergencyFundRef, {
      ...encryptedFund,
      id: emergencyFundId,
      updatedAt: Date.now(),
    });

    console.log("Emergency fund saved successfully");
    return emergencyFundId;
  } catch (error) {
    console.error("Error saving emergency fund:", error);
    throw error;
  }
};

// Get user emergency fund
export const getUserEmergencyFund = async (
  userId: string
): Promise<EmergencyFund | null> => {
  try {
    const { decryptEmergencyFund } = await import("./encryption");
    const emergencyFundRef = ref(db, `users/${userId}/emergencyFund`);
    const snapshot = await get(emergencyFundRef);

    if (snapshot.exists()) {
      const emergencyFunds: EmergencyFund[] = [];
      snapshot.forEach((childSnapshot) => {
        emergencyFunds.push(childSnapshot.val());
      });

      // Decrypt the most recent emergency fund entry
      const mostRecent = emergencyFunds.sort(
        (a, b) => b.updatedAt - a.updatedAt
      )[0];
      if (mostRecent) {
        const decryptedFund = await decryptEmergencyFund(mostRecent);
        return decryptedFund;
      }
      return null;
    }
    return null;
  } catch (error) {
    console.error("Error getting user emergency fund:", error);
    throw error;
  }
};

// Update emergency fund
export const updateEmergencyFund = async (
  emergencyFund: EmergencyFund
): Promise<void> => {
  try {
    const { encryptEmergencyFund } = await import("./encryption");
    const encryptedFund = await encryptEmergencyFund(emergencyFund);

    const emergencyFundRef = ref(
      db,
      `users/${emergencyFund.userId}/emergencyFund/${emergencyFund.id}`
    );
    await update(emergencyFundRef, {
      ...encryptedFund,
      updatedAt: Date.now(),
    });
    console.log("Emergency fund updated successfully");
  } catch (error) {
    console.error("Error updating emergency fund:", error);
    throw error;
  }
};

// ===== BUDGET SETTINGS CRUD OPERATIONS =====

// Save budget settings
export const saveBudgetSettings = async (
  budgetSettings: BudgetSettings
): Promise<string> => {
  try {
    const { encryptBudgetSettings } = await import("./encryption");
    const encryptedSettings = await encryptBudgetSettings(budgetSettings);

    const budgetSettingsRef = ref(
      db,
      `users/${budgetSettings.userId}/budgetSettings`
    );
    const newBudgetSettingsRef = push(budgetSettingsRef);
    const budgetSettingsId = newBudgetSettingsRef.key;

    if (!budgetSettingsId) {
      throw new Error("Failed to generate budget settings ID");
    }

    await set(newBudgetSettingsRef, {
      ...encryptedSettings,
      id: budgetSettingsId,
      updatedAt: Date.now(),
    });

    console.log("Budget settings saved successfully");
    return budgetSettingsId;
  } catch (error) {
    console.error("Error saving budget settings:", error);
    throw error;
  }
};

// Get user budget settings
export const getUserBudgetSettings = async (
  userId: string
): Promise<BudgetSettings | null> => {
  try {
    const { decryptBudgetSettings } = await import("./encryption");
    const budgetSettingsRef = ref(db, `users/${userId}/budgetSettings`);
    const snapshot = await get(budgetSettingsRef);

    if (snapshot.exists()) {
      const budgetSettings: BudgetSettings[] = [];
      snapshot.forEach((childSnapshot) => {
        budgetSettings.push(childSnapshot.val());
      });

      // Decrypt the most recent budget settings entry
      const mostRecent = budgetSettings.sort(
        (a, b) => b.updatedAt - a.updatedAt
      )[0];
      if (mostRecent) {
        const decryptedSettings = await decryptBudgetSettings(mostRecent);
        return decryptedSettings;
      }
      return null;
    }
    return null;
  } catch (error) {
    console.error("Error getting user budget settings:", error);
    throw error;
  }
};

// Update budget settings
export const updateBudgetSettings = async (
  budgetSettings: BudgetSettings
): Promise<void> => {
  try {
    const { encryptBudgetSettings } = await import("./encryption");
    const encryptedSettings = await encryptBudgetSettings(budgetSettings);

    const budgetSettingsRef = ref(
      db,
      `users/${budgetSettings.userId}/budgetSettings/${budgetSettings.id}`
    );
    await update(budgetSettingsRef, {
      ...encryptedSettings,
      updatedAt: Date.now(),
    });
    console.log("Budget settings updated successfully");
  } catch (error) {
    console.error("Error updating budget settings:", error);
    throw error;
  }
};

// ===== FINANCIAL PLAN FUNCTIONS =====

export const saveFinancialPlan = async (
  plan: FinancialPlan
): Promise<string> => {
  try {
    const { encryptFinancialPlan } = await import("./encryption");
    const encryptedPlan = await encryptFinancialPlan(plan);

    const plansRef = ref(db, `users/${plan.userId}/financialPlans`);
    const newPlanRef = push(plansRef);
    const planId = newPlanRef.key;

    if (!planId) {
      throw new Error("Failed to generate plan ID");
    }

    await set(newPlanRef, {
      ...encryptedPlan,
      id: planId,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    });

    console.log("Financial plan saved successfully");
    return planId;
  } catch (error) {
    console.error("Error saving financial plan:", error);
    throw error;
  }
};

export const getFinancialPlans = async (
  userId: string
): Promise<FinancialPlan[]> => {
  try {
    const { decryptFinancialPlan } = await import("./encryption");
    const plansRef = ref(db, `users/${userId}/financialPlans`);
    const snapshot = await get(plansRef);

    if (!snapshot.exists()) {
      return [];
    }

    const plans: FinancialPlan[] = [];
    snapshot.forEach((childSnapshot) => {
      plans.push(childSnapshot.val());
    });

    const decryptedPlans = await Promise.all(
      plans.map((plan) => decryptFinancialPlan(plan))
    );

    return decryptedPlans.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("Error getting financial plans:", error);
    throw error;
  }
};

export const deleteFinancialPlan = async (
  userId: string,
  planId: string
): Promise<void> => {
  try {
    const planRef = ref(db, `users/${userId}/financialPlans/${planId}`);
    await remove(planRef);
    console.log("Financial plan deleted successfully");
  } catch (error) {
    console.error("Error deleting financial plan:", error);
    throw error;
  }
};

// ===== SHARED FINANCE CRUD OPERATIONS =====

// Create shared group
export const createSharedGroup = async (
  group: SharedGroup
): Promise<string> => {
  try {
    const groupsRef = ref(db, `sharedGroups`);
    const newGroupRef = push(groupsRef);
    const groupId = newGroupRef.key;

    if (!groupId) {
      throw new Error("Failed to generate group ID");
    }

    await set(newGroupRef, {
      ...group,
      id: groupId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("Shared group created successfully");
    return groupId;
  } catch (error) {
    console.error("Error creating shared group:", error);
    throw error;
  }
};

// Get user's shared groups
export const getUserSharedGroups = async (
  userId: string
): Promise<SharedGroup[]> => {
  try {
    const groupsRef = ref(db, `sharedGroups`);
    const snapshot = await get(groupsRef);

    if (snapshot.exists()) {
      const groups: SharedGroup[] = [];
      snapshot.forEach((childSnapshot) => {
        const group = childSnapshot.val();
        // Check if user is a member of this group
        const isMember = group.members.some(
          (member: SharedGroupMember) => member.userId === userId
        );
        if (isMember) {
          groups.push(group);
        }
      });
      return groups.sort((a, b) => b.createdAt - a.createdAt);
    }
    return [];
  } catch (error) {
    console.error("Error getting user shared groups:", error);
    throw error;
  }
};

// Get shared group by ID
export const getSharedGroup = async (
  groupId: string
): Promise<SharedGroup | null> => {
  try {
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    const snapshot = await get(groupRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error getting shared group:", error);
    throw error;
  }
};

// Update shared group
export const updateSharedGroup = async (group: SharedGroup): Promise<void> => {
  try {
    const groupRef = ref(db, `sharedGroups/${group.id}`);
    await update(groupRef, {
      ...group,
      updatedAt: Date.now(),
    });
    console.log("Shared group updated successfully");
  } catch (error) {
    console.error("Error updating shared group:", error);
    throw error;
  }
};

// Add member to shared group
export const addGroupMember = async (
  groupId: string,
  member: SharedGroupMember
): Promise<void> => {
  try {
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    const snapshot = await get(groupRef);

    if (!snapshot.exists()) {
      throw new Error("Group not found");
    }

    const group = snapshot.val();
    const updatedMembers = [...group.members, member];

    await update(groupRef, {
      members: updatedMembers,
      updatedAt: Date.now(),
    });
    console.log("Member added to group successfully");
  } catch (error) {
    console.error("Error adding member to group:", error);
    throw error;
  }
};

// Remove member from shared group
export const removeGroupMember = async (
  groupId: string,
  memberId: string
): Promise<void> => {
  try {
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    const snapshot = await get(groupRef);

    if (!snapshot.exists()) {
      throw new Error("Group not found");
    }

    const group = snapshot.val();
    const updatedMembers = group.members.filter(
      (member: SharedGroupMember) => member.id !== memberId
    );

    await update(groupRef, {
      members: updatedMembers,
      updatedAt: Date.now(),
    });

    // Remove group from the removed member's user profile
    const userGroupsRef = ref(db, `users/${memberId}/sharedGroups/${groupId}`);
    await remove(userGroupsRef);

    // Remove the member's shared finance data from the group
    const sharedFinanceDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${memberId}`
    );
    await remove(sharedFinanceDataRef);

    console.log("✅ Member removed from group successfully");
    console.log("✅ Member's shared finance data cleaned up");
  } catch (error) {
    console.error("Error removing member from group:", error);
    throw error;
  }
};

// Delete shared group
export const deleteSharedGroup = async (
  groupId: string,
  userId: string
): Promise<void> => {
  try {
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    const snapshot = await get(groupRef);

    if (!snapshot.exists()) {
      throw new Error("Group not found");
    }

    const group = snapshot.val();

    // Check if user is the owner of the group
    const isOwner = group.members.some(
      (member: SharedGroupMember) =>
        member.id === userId && member.role === "owner"
    );

    if (!isOwner) {
      throw new Error("Only group owners can delete groups");
    }

    // Delete all shared financial data for this group
    const sharedFinanceDataRef = ref(db, `sharedFinanceData/${groupId}`);
    await remove(sharedFinanceDataRef);
    console.log("✅ Shared financial data deleted for group:", groupId);

    // Delete all invitations for this group
    const invitationsRef = ref(db, `invitations`);
    const invitationsSnapshot = await get(invitationsRef);
    if (invitationsSnapshot.exists()) {
      const invitations = invitationsSnapshot.val();
      const invitationsToDelete: string[] = [];

      // Find all invitations for this group
      Object.keys(invitations).forEach((invitationId) => {
        if (invitations[invitationId].groupId === groupId) {
          invitationsToDelete.push(invitationId);
        }
      });

      // Delete each invitation
      for (const invitationId of invitationsToDelete) {
        const invitationRef = ref(db, `invitations/${invitationId}`);
        await remove(invitationRef);
      }
      console.log(
        "✅ Deleted",
        invitationsToDelete.length,
        "invitations for group:",
        groupId
      );
    }

    // Remove group from all members' user profiles
    if (group.members) {
      for (const member of group.members) {
        try {
          const userGroupsRef = ref(
            db,
            `users/${member.userId}/sharedGroups/${groupId}`
          );
          await remove(userGroupsRef);
        } catch (error) {
          console.error(
            `Error removing group from user ${member.userId}:`,
            error
          );
          // Continue with other members even if one fails
        }
      }
      console.log("✅ Removed group references from all member profiles");
    }

    // Delete the group itself
    await remove(groupRef);
    console.log("✅ Shared group deleted successfully");

    console.log("✅ Complete cleanup completed for group:", groupId);
  } catch (error) {
    console.error("Error deleting shared group:", error);
    throw error;
  }
};

/**
 * Clean up orphaned shared finance data for groups that no longer exist
 * This is a utility function to maintain data integrity
 */
export const cleanupOrphanedSharedData = async (): Promise<void> => {
  try {
    console.log("🧹 Starting cleanup of orphaned shared finance data...");

    const sharedFinanceDataRef = ref(db, `sharedFinanceData`);
    const sharedDataSnapshot = await get(sharedFinanceDataRef);

    if (!sharedDataSnapshot.exists()) {
      console.log("✅ No shared finance data to clean up");
      return;
    }

    const sharedData = sharedDataSnapshot.val();
    const groupsRef = ref(db, `sharedGroups`);
    const groupsSnapshot = await get(groupsRef);

    if (!groupsSnapshot.exists()) {
      console.log("⚠️ No shared groups found, cleaning up all shared data");
      await remove(sharedFinanceDataRef);
      console.log("✅ All shared finance data cleaned up");
      return;
    }

    const groups = groupsSnapshot.val();
    let cleanedCount = 0;

    // Check each shared finance data entry
    for (const groupId of Object.keys(sharedData)) {
      if (!groups[groupId]) {
        // Group doesn't exist, clean up this data
        const orphanedDataRef = ref(db, `sharedFinanceData/${groupId}`);
        await remove(orphanedDataRef);
        cleanedCount++;
        console.log(`🗑️ Cleaned up orphaned data for group: ${groupId}`);
      }
    }

    if (cleanedCount > 0) {
      console.log(
        `✅ Cleanup completed. Removed ${cleanedCount} orphaned shared data entries.`
      );
    } else {
      console.log("✅ No orphaned data found");
    }
  } catch (error) {
    console.error("❌ Error during cleanup of orphaned shared data:", error);
  }
};

// Create invitation
export const createInvitation = async (
  invitation: SharedInvitation
): Promise<string> => {
  try {
    const invitationsRef = ref(db, `invitations`);
    const newInvitationRef = push(invitationsRef);
    const invitationId = newInvitationRef.key;

    if (!invitationId) {
      throw new Error("Failed to generate invitation ID");
    }

    const invitationData = {
      ...invitation,
      id: invitationId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    console.log("Creating invitation with data:", invitationData);
    await set(newInvitationRef, invitationData);

    console.log("Invitation created successfully with ID:", invitationId);
    return invitationId;
  } catch (error) {
    console.error("Error creating invitation:", error);
    throw error;
  }
};

// Get user's invitations
export const getUserInvitations = async (
  email: string
): Promise<SharedInvitation[]> => {
  try {
    const invitationsRef = ref(db, `invitations`);
    const snapshot = await get(invitationsRef);

    if (snapshot.exists()) {
      const invitations: SharedInvitation[] = [];

      snapshot.forEach((childSnapshot) => {
        const invitation = childSnapshot.val();
        console.log("Found invitation:", invitation);
        if (
          invitation.inviteeEmail === email &&
          invitation.status === "pending"
        ) {
          console.log("Match found! Adding invitation");
          invitations.push(invitation);
        }
      });
      console.log("Total invitations found:", invitations.length);
      return invitations.sort((a, b) => b.createdAt - a.createdAt);
    }
    return [];
  } catch (error) {
    console.error("Error getting user invitations:", error);
    throw error;
  }
};

// Update invitation status
export const updateInvitationStatus = async (
  invitationId: string,
  status: "accepted" | "declined" | "expired"
): Promise<void> => {
  try {
    const invitationRef = ref(db, `invitations/${invitationId}`);
    await update(invitationRef, { status });
    console.log("Invitation status updated successfully");
  } catch (error) {
    console.error("Error updating invitation status:", error);
    throw error;
  }
};

// Add user's data to shared group
export const addUserDataToGroup = async (
  groupId: string,
  userId: string
): Promise<void> => {
  try {
    const groupRef = ref(db, `sharedGroups/${groupId}/sharedData/${userId}`);

    // Get user's data
    const [assets, debts, transactions, goals] = await Promise.all([
      getUserAssets(userId),
      getUserDebts(userId),
      getUserTransactions(userId),
      getUserGoals(userId),
    ]);

    // Store in group's shared data
    const userData = {
      assets,
      debts,
      transactions,
      goals,
      lastUpdated: Date.now(),
    };

    // Clean the data before writing to Firebase
    const cleanUserData = cleanDataForFirebase(userData);

    await set(groupRef, cleanUserData);

    console.log("User data added to shared group successfully");
  } catch (error) {
    console.error("Error adding user data to group:", error);
    throw error;
  }
};

// Add selective user data to shared group
export const addSelectiveUserDataToGroup = async (
  groupId: string,
  userId: string,
  selectedData: {
    goals?: string[]; // Array of goal IDs to sync
    assets?: string[]; // Array of asset IDs to sync
    debts?: string[]; // Array of debt IDs to sync
    transactions?: boolean; // Whether to sync all transactions
  }
): Promise<void> => {
  try {
    const groupRef = ref(db, `sharedGroups/${groupId}/sharedData/${userId}`);

    // Get all user's data
    const [allAssets, allDebts, allTransactions, allGoals] = await Promise.all([
      getUserAssets(userId),
      getUserDebts(userId),
      getUserTransactions(userId),
      getUserGoals(userId),
    ]);

    // Filter data based on selection
    const filteredAssets = selectedData.assets
      ? allAssets.filter((asset) => selectedData.assets!.includes(asset.id!))
      : allAssets;

    const filteredDebts = selectedData.debts
      ? allDebts.filter((debt) => selectedData.debts!.includes(debt.id!))
      : allDebts;

    const filteredTransactions = selectedData.transactions
      ? allTransactions
      : [];

    const filteredGoals = selectedData.goals
      ? allGoals.filter((goal) => selectedData.goals!.includes(goal.id!))
      : allGoals;

    // Store filtered data in group's shared data
    const selectiveUserData = {
      assets: filteredAssets,
      debts: filteredDebts,
      transactions: filteredTransactions,
      goals: filteredGoals,
      lastUpdated: Date.now(),
      syncSettings: selectedData, // Store sync settings for future reference
    };

    // Clean the data before writing to Firebase
    const cleanSelectiveUserData = cleanDataForFirebase(selectiveUserData);

    await set(groupRef, cleanSelectiveUserData);

    console.log("Selective user data added to shared group successfully");
  } catch (error) {
    console.error("Error adding selective user data to group:", error);
    throw error;
  }
};

// Get user's sync settings for a specific group
export const getUserGroupSyncSettings = async (
  groupId: string,
  userId: string
): Promise<{
  goals?: string[];
  assets?: string[];
  debts?: string[];
  transactions?: boolean;
} | null> => {
  try {
    const groupRef = ref(db, `sharedGroups/${groupId}/sharedData/${userId}`);
    const snapshot = await get(groupRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      return data.syncSettings || null;
    }
    return null;
  } catch (error) {
    console.error("Error getting user group sync settings:", error);
    return null;
  }
};

// Get user's group memberships
export const getUserGroupMemberships = async (
  userId: string
): Promise<string[]> => {
  try {
    const groupsRef = ref(db, `sharedGroups`);
    const snapshot = await get(groupsRef);

    if (snapshot.exists()) {
      const groupIds: string[] = [];
      snapshot.forEach((childSnapshot) => {
        const group = childSnapshot.val();
        const isMember = group.members.some(
          (member: SharedGroupMember) => member.userId === userId
        );
        if (isMember) {
          groupIds.push(group.id);
        }
      });
      return groupIds;
    }
    return [];
  } catch (error) {
    console.error("Error getting user group memberships:", error);
    throw error;
  }
};

// Auto-update shared groups for a user
export const updateSharedGroupsForUser = async (
  userId: string
): Promise<void> => {
  try {
    const groupIds = await getUserGroupMemberships(userId);

    // Update each group the user is a member of
    for (const groupId of groupIds) {
      // Get current sync settings for this group
      const syncSettings = await getUserGroupSyncSettings(groupId, userId);

      if (syncSettings) {
        // Use selective sync with current settings
        await addSelectiveUserDataToGroup(groupId, userId, syncSettings);
      } else {
        // If no sync settings exist, use the old method (backward compatibility)
        await addUserDataToGroup(groupId, userId);
      }
    }

    console.log(
      `Updated shared data for user ${userId} in ${groupIds.length} groups`
    );
  } catch (error) {
    console.error("Error updating shared groups for user:", error);
    // Don't throw error to avoid breaking the main save operation
  }
};

// Get shared data for a group
export const getGroupSharedData = async (
  groupId: string
): Promise<{
  assets: Asset[];
  debts: Debt[];
  transactions: Transaction[];
  goals: FinancialGoal[];
}> => {
  try {
    const sharedDataRef = ref(db, `sharedGroups/${groupId}/sharedData`);
    const snapshot = await get(sharedDataRef);

    let allAssets: Asset[] = [];
    let allDebts: Debt[] = [];
    let allTransactions: Transaction[] = [];
    let allGoals: FinancialGoal[] = [];

    if (snapshot.exists()) {
      snapshot.forEach((userSnapshot) => {
        const userData = userSnapshot.val();

        // Only include data that the user has explicitly shared
        // If no syncSettings exist, include all data (backward compatibility)
        if (userData.syncSettings) {
          // Respect selective sync settings
          if (userData.syncSettings.assets && userData.assets) {
            const selectedAssets = userData.assets.filter((asset: Asset) =>
              userData.syncSettings.assets.includes(asset.id)
            );
            allAssets.push(...selectedAssets);
          } else if (!userData.syncSettings.assets && userData.assets) {
            // If assets not specified in syncSettings, include all (backward compatibility)
            allAssets.push(...userData.assets);
          }

          if (userData.syncSettings.debts && userData.debts) {
            const selectedDebts = userData.debts.filter((debt: Debt) =>
              userData.syncSettings.debts.includes(debt.id)
            );
            allDebts.push(...selectedDebts);
          } else if (!userData.syncSettings.debts && userData.debts) {
            // If debts not specified in syncSettings, include all (backward compatibility)
            allDebts.push(...userData.debts);
          }

          if (userData.syncSettings.transactions && userData.transactions) {
            allTransactions.push(...userData.transactions);
          }

          if (userData.syncSettings.goals && userData.goals) {
            const selectedGoals = userData.goals.filter((goal: FinancialGoal) =>
              userData.syncSettings.goals.includes(goal.id)
            );
            allGoals.push(...selectedGoals);
          } else if (!userData.syncSettings.goals && userData.goals) {
            // If goals not specified in syncSettings, include all (backward compatibility)
            allGoals.push(...userData.goals);
          }
        } else {
          // Backward compatibility: if no syncSettings, include all data
          if (userData.assets) allAssets.push(...userData.assets);
          if (userData.debts) allDebts.push(...userData.debts);
          if (userData.transactions)
            allTransactions.push(...userData.transactions);
          if (userData.goals) allGoals.push(...userData.goals);
        }
      });
    }

    return {
      assets: allAssets,
      debts: allDebts,
      transactions: allTransactions,
      goals: allGoals,
    };
  } catch (error) {
    console.error("Error getting group shared data:", error);
    throw error;
  }
};

// Get aggregated group data
export const getGroupAggregatedData = async (
  groupId: string
): Promise<{
  totalAssets: number;
  totalDebts: number;
  netWorth: number;
  totalIncome: number;
  totalExpenses: number;
  totalGoals: number;
  totalGoalProgress: number;
}> => {
  try {
    const group = await getSharedGroup(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    let totalAssets = 0;
    let totalDebts = 0;
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalGoals = 0;
    let totalGoalProgress = 0;

    // Get shared data from the group
    const sharedData = await getGroupSharedData(groupId);

    // Calculate from shared assets
    totalAssets = sharedData.assets.reduce(
      (sum, asset) => sum + asset.balance,
      0
    );

    // Calculate from shared debts
    totalDebts = sharedData.debts.reduce((sum, debt) => sum + debt.balance, 0);

    // Calculate from shared transactions (current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const currentMonthTransactions = sharedData.transactions.filter(
      (transaction) => {
        const transactionDate = new Date(transaction.date);
        return (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      }
    );

    totalIncome = currentMonthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    totalExpenses = currentMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate from shared goals
    totalGoals = sharedData.goals.length;
    totalGoalProgress = sharedData.goals.reduce(
      (sum, goal) => sum + goal.currentAmount,
      0
    );

    return {
      totalAssets,
      totalDebts,
      netWorth: totalAssets - totalDebts,
      totalIncome,
      totalExpenses,
      totalGoals,
      totalGoalProgress,
    };
  } catch (error) {
    console.error("Error getting group aggregated data:", error);
    throw error;
  }
};

// ===== ACCOUNT MANAGEMENT =====

export const deleteUserAccount = async (userId: string): Promise<void> => {
  try {
    console.log(`Starting account deletion for user: ${userId}`);

    // 1. Delete user's transactions
    const transactionsRef = ref(db, `users/${userId}/transactions`);
    await remove(transactionsRef);
    console.log("Deleted user transactions");

    // 2. Delete user's assets
    const assetsRef = ref(db, `users/${userId}/assets`);
    await remove(assetsRef);
    console.log("Deleted user assets");

    // 3. Delete user's debts
    const debtsRef = ref(db, `users/${userId}/debts`);
    await remove(debtsRef);
    console.log("Deleted user debts");

    // 4. Delete user's goals
    const goalsRef = ref(db, `users/${userId}/goals`);
    await remove(goalsRef);
    console.log("Deleted user goals");

    // 5. Delete user's emergency fund
    const emergencyFundRef = ref(db, `users/${userId}/emergencyFund`);
    await remove(emergencyFundRef);
    console.log("Deleted user emergency fund");

    // 6. Delete user's budget settings
    const budgetSettingsRef = ref(db, `users/${userId}/budgetSettings`);
    await remove(budgetSettingsRef);
    console.log("Deleted user budget settings");

    // 7. Delete user's profile
    const profileRef = ref(db, `users/${userId}/profile`);
    await remove(profileRef);
    console.log("Deleted user profile");

    // 8. Delete the entire user node
    const userRef = ref(db, `users/${userId}`);
    await remove(userRef);
    console.log("Deleted entire user node");

    // 9. Handle shared groups - remove user from all groups they're a member of
    try {
      const sharedGroupsRef = ref(db, "sharedGroups");
      const sharedGroupsSnapshot = await get(sharedGroupsRef);

      if (sharedGroupsSnapshot.exists()) {
        const groups = sharedGroupsSnapshot.val();
        const groupIds = Object.keys(groups);

        for (const groupId of groupIds) {
          try {
            const group = groups[groupId];
            const updatedMembers = group.members.filter(
              (member: any) => member.userId !== userId
            );

            if (updatedMembers.length === 0) {
              // If no members left, delete the entire group
              await remove(ref(db, `sharedGroups/${groupId}`));
              console.log(`Deleted empty shared group: ${groupId}`);
            } else {
              // Update group with remaining members
              await update(ref(db, `sharedGroups/${groupId}`), {
                members: updatedMembers,
              });
              console.log(`Removed user from shared group: ${groupId}`);
            }
          } catch (groupError) {
            console.log(
              `Could not update shared group ${groupId}:`,
              groupError
            );
            // Continue with other groups even if one fails
          }
        }
      }
    } catch (sharedGroupsError) {
      console.log("Could not access shared groups:", sharedGroupsError);
      // Continue with account deletion even if shared groups fail
    }

    // 10. Delete shared data contributions
    try {
      const sharedDataRef = ref(db, "sharedData");
      const sharedDataSnapshot = await get(sharedDataRef);

      if (sharedDataSnapshot.exists()) {
        const sharedData = sharedDataSnapshot.val();
        const groupIds = Object.keys(sharedData);

        for (const groupId of groupIds) {
          try {
            const groupData = sharedData[groupId];
            if (groupData[userId]) {
              await remove(ref(db, `sharedData/${groupId}/${userId}`));
              console.log(`Deleted shared data for user in group: ${groupId}`);
            }
          } catch (sharedDataError) {
            console.log(
              `Could not delete shared data for group ${groupId}:`,
              sharedDataError
            );
            // Continue with other groups
          }
        }
      }
    } catch (sharedDataError) {
      console.log("Could not access shared data:", sharedDataError);
      // Continue with account deletion
    }

    // 11. Delete user's invitations
    try {
      const invitationsRef = ref(db, "invitations");
      const invitationsSnapshot = await get(invitationsRef);

      if (invitationsSnapshot.exists()) {
        const invitations = invitationsSnapshot.val();
        const invitationIds = Object.keys(invitations);

        for (const invitationId of invitationIds) {
          try {
            const invitation = invitations[invitationId];
            if (
              invitation.userId === userId ||
              invitation.invitedUserId === userId
            ) {
              await remove(ref(db, `invitations/${invitationId}`));
              console.log(`Deleted invitation: ${invitationId}`);
            }
          } catch (invitationError) {
            console.log(
              `Could not delete invitation ${invitationId}:`,
              invitationError
            );
            // Continue with other invitations
          }
        }
      }
    } catch (invitationsError) {
      console.log("Could not access invitations:", invitationsError);
      // Continue with account deletion
    }

    console.log(`Account deletion completed for user: ${userId}`);
  } catch (error) {
    console.error("Error deleting user account:", error);
    throw new Error("Failed to delete user account and associated data");
  }
};

// ===== RECURRING TRANSACTIONS =====

export const saveRecurringTransaction = async (
  recurringTransaction: RecurringTransaction
): Promise<string> => {
  try {
    const { encryptRecurringTransaction } = await import("./encryption");
    const encryptedTransaction = await encryptRecurringTransaction(
      recurringTransaction
    );

    // Save under the user's collection for proper data isolation
    const recurringTransactionRef = ref(
      db,
      `users/${recurringTransaction.userId}/recurringTransactions`
    );
    const newRecurringTransactionRef = push(recurringTransactionRef);
    const transactionId = newRecurringTransactionRef.key;

    if (!transactionId) {
      throw new Error("Failed to generate recurring transaction ID");
    }

    // Remove undefined values before saving to Firebase
    const transactionToSave = { ...encryptedTransaction };
    if (transactionToSave.endDate === undefined) {
      delete transactionToSave.endDate;
    }

    await set(newRecurringTransactionRef, {
      ...transactionToSave,
      id: transactionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log(
      "Recurring transaction saved successfully under user collection"
    );

    return transactionId;
  } catch (error) {
    console.error("Error saving recurring transaction:", error);
    throw new Error("Failed to save recurring transaction");
  }
};

export const getUserRecurringTransactions = async (
  userId: string
): Promise<RecurringTransaction[]> => {
  try {
    const { decryptRecurringTransactions } = await import("./encryption");
    // Get from user's collection for proper data isolation
    const recurringTransactionsRef = ref(
      db,
      `users/${userId}/recurringTransactions`
    );
    const snapshot = await get(recurringTransactionsRef);

    if (snapshot.exists()) {
      const recurringTransactions = snapshot.val();
      const userTransactions = Object.values(
        recurringTransactions
      ) as RecurringTransaction[];

      // Decrypt all recurring transactions
      const decryptedTransactions = await decryptRecurringTransactions(
        userTransactions
      );
      return decryptedTransactions;
    }

    return [];
  } catch (error) {
    console.error("Error getting recurring transactions:", error);
    throw new Error("Failed to get recurring transactions");
  }
};

export const updateRecurringTransaction = async (
  recurringTransaction: RecurringTransaction
): Promise<void> => {
  try {
    const { encryptRecurringTransaction } = await import("./encryption");
    const encryptedTransaction = await encryptRecurringTransaction(
      recurringTransaction
    );

    if (!recurringTransaction.id) {
      throw new Error("Recurring transaction ID is required for update");
    }

    // Update under the user's collection for proper data isolation
    const recurringTransactionRef = ref(
      db,
      `users/${recurringTransaction.userId}/recurringTransactions/${recurringTransaction.id}`
    );

    // Remove undefined values before updating Firebase
    const transactionToUpdate = { ...encryptedTransaction };
    if (transactionToUpdate.endDate === undefined) {
      delete transactionToUpdate.endDate;
    }

    await update(recurringTransactionRef, {
      ...transactionToUpdate,
      updatedAt: Date.now(),
    });

    console.log(
      "Recurring transaction updated successfully under user collection"
    );
  } catch (error) {
    console.error("Error updating recurring transaction:", error);
    throw new Error("Failed to update recurring transaction");
  }
};

export const deleteRecurringTransaction = async (
  recurringTransactionId: string,
  userId: string
): Promise<void> => {
  try {
    // Delete the recurring transaction from the user's collection
    const recurringTransactionRef = ref(
      db,
      `users/${userId}/recurringTransactions/${recurringTransactionId}`
    );

    // First check if it exists
    const snapshot = await get(recurringTransactionRef);
    if (!snapshot.exists()) {
      throw new Error("Recurring transaction not found");
    }

    // Delete the recurring transaction
    await remove(recurringTransactionRef);
    console.log(
      "Recurring transaction deleted successfully from user collection"
    );

    // Optionally clean up any actual transactions that reference this recurring transaction
    // This is optional - you might want to keep historical data
    try {
      const transactionsRef = ref(db, `users/${userId}/transactions`);
      const transactionsSnapshot = await get(transactionsRef);

      if (transactionsSnapshot.exists()) {
        const transactions = transactionsSnapshot.val();
        const transactionIdsToUpdate: string[] = [];

        // Find transactions that reference this recurring transaction
        Object.keys(transactions).forEach((transactionId) => {
          const transaction = transactions[transactionId];
          if (transaction.recurringTransactionId === recurringTransactionId) {
            transactionIdsToUpdate.push(transactionId);
          }
        });

        // Remove the recurring transaction reference (but keep the actual transaction)
        for (const transactionId of transactionIdsToUpdate) {
          const transactionRef = ref(
            db,
            `users/${userId}/transactions/${transactionId}`
          );
          await update(transactionRef, {
            recurringTransactionId: null,
          });
        }

        if (transactionIdsToUpdate.length > 0) {
          console.log(
            `Updated ${transactionIdsToUpdate.length} transactions to remove recurring reference`
          );
        }
      }
    } catch (cleanupError) {
      console.warn(
        "Warning: Could not clean up transaction references:",
        cleanupError
      );
      // Don't fail the main deletion if cleanup fails
    }
  } catch (error) {
    console.error("Error deleting recurring transaction:", error);
    throw new Error("Failed to delete recurring transaction");
  }
};

export const skipRecurringTransactionForMonth = async (
  recurringTransactionId: string,
  monthKey: string,
  userId: string
): Promise<void> => {
  try {
    // Get the recurring transaction from the user's collection
    const recurringTransactionRef = ref(
      db,
      `users/${userId}/recurringTransactions/${recurringTransactionId}`
    );

    const snapshot = await get(recurringTransactionRef);
    if (!snapshot.exists()) {
      throw new Error("Recurring transaction not found");
    }

    const recurringTransaction = snapshot.val();
    const skippedMonths = recurringTransaction.skippedMonths || [];

    // Add the month to skipped months if not already there
    if (!skippedMonths.includes(monthKey)) {
      skippedMonths.push(monthKey);
    }

    // Update the recurring transaction in the user's collection
    await update(recurringTransactionRef, {
      skippedMonths,
      updatedAt: Date.now(),
    });

    console.log(
      `Skipped recurring transaction for month: ${monthKey} in user collection`
    );
  } catch (error) {
    console.error("Error skipping recurring transaction for month:", error);
    throw new Error("Failed to skip recurring transaction for month");
  }
};

export const generateRecurringTransactions = async (
  userId: string,
  targetMonth: Date
): Promise<void> => {
  try {
    const recurringTransactions = await getUserRecurringTransactions(userId);
    const targetMonthStart = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      1
    );
    const targetMonthEnd = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0
    );

    for (const recurringTransaction of recurringTransactions) {
      if (!recurringTransaction.isActive) continue;

      // Check if transaction should occur in target month
      const shouldGenerate = checkIfTransactionShouldOccur(
        recurringTransaction,
        targetMonthStart,
        targetMonthEnd
      );

      if (shouldGenerate) {
        // Check if transaction already exists for this month
        const existingTransactions = await getUserTransactions(userId);
        const transactionExists = existingTransactions.some(
          (transaction: any) => {
            const transactionDate = new Date(transaction.date);
            return (
              transaction.description === recurringTransaction.name &&
              transaction.amount === recurringTransaction.amount &&
              transaction.type === recurringTransaction.type &&
              transactionDate.getMonth() === targetMonth.getMonth() &&
              transactionDate.getFullYear() === targetMonth.getFullYear()
            );
          }
        );

        if (!transactionExists) {
          // Generate the transaction
          const transactionDate = getNextOccurrenceDate(
            recurringTransaction,
            targetMonthStart
          );

          const newTransaction: Transaction = {
            amount: recurringTransaction.amount,
            type: recurringTransaction.type,
            category: recurringTransaction.category,
            description: recurringTransaction.name,
            date: transactionDate.getTime(),
            userId: userId,
          };

          await saveTransaction(newTransaction);
          console.log(
            `Generated recurring transaction: ${recurringTransaction.name}`
          );
        }
      }
    }
  } catch (error) {
    console.error("Error generating recurring transactions:", error);
    throw new Error("Failed to generate recurring transactions");
  }
};

export const getProjectedRecurringTransactionsForMonth = async (
  userId: string,
  targetMonth: Date
): Promise<Transaction[]> => {
  try {
    const recurringTransactions = await getUserRecurringTransactions(userId);
    const targetMonthStart = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      1
    );
    const targetMonthEnd = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0
    );

    const projectedTransactions: Transaction[] = [];

    for (const recurringTransaction of recurringTransactions) {
      if (!recurringTransaction.isActive) continue;

      // Check if transaction should occur in target month
      const shouldGenerate = checkIfTransactionShouldOccur(
        recurringTransaction,
        targetMonthStart,
        targetMonthEnd
      );

      if (shouldGenerate) {
        // Check if transaction already exists for this month
        const existingTransactions = await getUserTransactions(userId);
        const transactionExists = existingTransactions.some(
          (transaction: any) => {
            const transactionDate = new Date(transaction.date);
            return (
              transaction.description === recurringTransaction.name &&
              transaction.amount === recurringTransaction.amount &&
              transaction.type === recurringTransaction.type &&
              transactionDate.getMonth() === targetMonth.getMonth() &&
              transactionDate.getFullYear() === targetMonth.getFullYear()
            );
          }
        );

        if (!transactionExists) {
          // Generate the projected transaction (not saved to database)
          const transactionDate = getNextOccurrenceDate(
            recurringTransaction,
            targetMonthStart
          );

          const projectedTransaction: Transaction = {
            id: `projected-${recurringTransaction.id}-${targetMonth.getTime()}`,
            amount: recurringTransaction.amount,
            type: recurringTransaction.type,
            category: recurringTransaction.category,
            description: recurringTransaction.name,
            date: transactionDate.getTime(),
            userId: userId,
          };

          projectedTransactions.push(projectedTransaction);
        }
      }
    }

    return projectedTransactions;
  } catch (error) {
    console.error("Error getting projected recurring transactions:", error);
    throw new Error("Failed to get projected recurring transactions");
  }
};

const checkIfTransactionShouldOccur = (
  recurringTransaction: RecurringTransaction,
  monthStart: Date,
  monthEnd: Date
): boolean => {
  const startDate = new Date(recurringTransaction.startDate);

  if (startDate > monthEnd) return false;

  if (
    recurringTransaction.endDate &&
    new Date(recurringTransaction.endDate) < monthStart
  ) {
    return false;
  }

  // Check if this month is in the skipped months list
  const monthKey = `${monthStart.getFullYear()}-${String(
    monthStart.getMonth() + 1
  ).padStart(2, "0")}`;
  if (
    recurringTransaction.skippedMonths &&
    recurringTransaction.skippedMonths.includes(monthKey)
  ) {
    return false;
  }

  switch (recurringTransaction.frequency) {
    case "weekly":
      // Weekly transactions occur every week, so they should occur in any month
      // that starts after the start date
      return monthStart >= startDate;
    case "biweekly":
      // Biweekly transactions occur every 2 weeks
      const weeksSinceStart = Math.floor(
        (monthStart.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      return weeksSinceStart >= 0 && weeksSinceStart % 2 === 0;
    case "monthly":
      // Monthly transactions occur every month
      const monthsSinceStart =
        (monthStart.getFullYear() - startDate.getFullYear()) * 12 +
        (monthStart.getMonth() - startDate.getMonth());
      return monthsSinceStart >= 0;
    case "quarterly":
      // Quarterly transactions occur every 3 months
      const quarterlyMonthsSinceStart =
        (monthStart.getFullYear() - startDate.getFullYear()) * 12 +
        (monthStart.getMonth() - startDate.getMonth());
      return (
        quarterlyMonthsSinceStart >= 0 && quarterlyMonthsSinceStart % 3 === 0
      );
    case "yearly":
      // Yearly transactions occur every year
      const yearsSinceStart =
        monthStart.getFullYear() - startDate.getFullYear();
      return yearsSinceStart >= 0;
    default:
      return false;
  }
};

const getNextOccurrenceDate = (
  recurringTransaction: RecurringTransaction,
  monthStart: Date
): Date => {
  const startDate = new Date(recurringTransaction.startDate);

  switch (recurringTransaction.frequency) {
    case "weekly":
      // For weekly, use the first day of the month plus some days
      return new Date(monthStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "biweekly":
      // For biweekly, use the first day of the month plus 14 days
      return new Date(monthStart.getTime() + 14 * 24 * 60 * 60 * 1000);
    case "monthly":
      // For monthly, use the same day of the month as the start date
      const dayOfMonth = startDate.getDate();
      const lastDayOfMonth = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
        0
      ).getDate();
      const actualDay = Math.min(dayOfMonth, lastDayOfMonth); // Handle months with fewer days
      return new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        actualDay
      );
    case "quarterly":
      // For quarterly, use the same day of the month as the start date
      const quarterDayOfMonth = startDate.getDate();
      const quarterLastDayOfMonth = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
        0
      ).getDate();
      const quarterActualDay = Math.min(
        quarterDayOfMonth,
        quarterLastDayOfMonth
      );
      return new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        quarterActualDay
      );
    case "yearly":
      // For yearly, use the same month and day as the start date
      const yearlyDayOfMonth = startDate.getDate();
      const yearlyLastDayOfMonth = new Date(
        monthStart.getFullYear(),
        startDate.getMonth() + 1,
        0
      ).getDate();
      const yearlyActualDay = Math.min(yearlyDayOfMonth, yearlyLastDayOfMonth);
      return new Date(
        monthStart.getFullYear(),
        startDate.getMonth(),
        yearlyActualDay
      );
    default:
      return monthStart;
  }
};

// ===== DATA SHARING FUNCTIONS =====

export const updateUserDataSharingSettings = async (
  userId: string,
  settings: DataSharingSettings
): Promise<void> => {
  try {
    const userRef = ref(db, `users/${userId}/profile`);
    const userSnapshot = await get(userRef);

    if (userSnapshot.exists()) {
      const currentProfile = userSnapshot.val();
      await update(userRef, {
        ...currentProfile,
        dataSharingSettings: settings,
        updatedAt: Date.now(),
      });
    } else {
      // Create profile if it doesn't exist
      await set(userRef, {
        uid: userId,
        dataSharingSettings: settings,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  } catch (error) {
    console.error("Error updating data sharing settings:", error);
    throw error;
  }
};

export const getUserDataSharingSettings = async (
  userId: string
): Promise<DataSharingSettings | null> => {
  try {
    const userRef = ref(db, `users/${userId}/profile`);
    const userSnapshot = await get(userRef);

    if (userSnapshot.exists()) {
      const profile = userSnapshot.val();
      return profile.dataSharingSettings || null;
    }
    return null;
  } catch (error) {
    console.error("Error getting data sharing settings:", error);
    throw error;
  }
};

// Transfer group ownership
export const transferGroupOwnership = async (
  groupId: string,
  currentOwnerId: string,
  newOwnerId: string
): Promise<void> => {
  try {
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    const snapshot = await get(groupRef);

    if (!snapshot.exists()) {
      throw new Error("Group not found");
    }

    const group = snapshot.val();

    // Check if current user is the owner
    const isOwner = group.members.some(
      (member: SharedGroupMember) =>
        member.id === currentOwnerId && member.role === "owner"
    );

    if (!isOwner) {
      throw new Error("Only group owners can transfer ownership");
    }

    // Check if new owner is a member of the group
    const newOwnerExists = group.members.some(
      (member: SharedGroupMember) => member.id === newOwnerId
    );

    if (!newOwnerExists) {
      throw new Error("New owner must be a member of the group");
    }

    // Update member roles
    const updatedMembers = group.members.map((member: SharedGroupMember) => {
      if (member.id === currentOwnerId) {
        return { ...member, role: "member" };
      }
      if (member.id === newOwnerId) {
        return { ...member, role: "owner" };
      }
      return member;
    });

    await update(groupRef, {
      members: updatedMembers,
      ownerId: newOwnerId,
      updatedAt: Date.now(),
    });

    console.log("Group ownership transferred successfully");
  } catch (error) {
    console.error("Error transferring group ownership:", error);
    throw error;
  }
};

// User leaves a group (self-removal)
export const leaveGroup = async (
  groupId: string,
  userId: string
): Promise<void> => {
  try {
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    const snapshot = await get(groupRef);

    if (!snapshot.exists()) {
      throw new Error("Group not found");
    }

    const group = snapshot.val();

    // Check if user is the owner
    const isOwner = group.members.some(
      (member: SharedGroupMember) =>
        member.id === userId && member.role === "owner"
    );

    if (isOwner) {
      throw new Error(
        "Group owners cannot leave their own group. Transfer ownership or delete the group instead."
      );
    }

    // Remove user from group members
    const updatedMembers = group.members.filter(
      (member: SharedGroupMember) => member.id !== userId
    );

    await update(groupRef, {
      members: updatedMembers,
      updatedAt: Date.now(),
    });

    // Remove group from user's groups list
    const userGroupsRef = ref(db, `users/${userId}/sharedGroups/${groupId}`);
    await remove(userGroupsRef);

    // Remove user's shared finance data from the group
    const sharedFinanceDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}`
    );
    await remove(sharedFinanceDataRef);

    console.log("✅ User left group successfully");
    console.log("✅ User's shared finance data cleaned up");
  } catch (error) {
    console.error("Error leaving group:", error);
    throw error;
  }
};
