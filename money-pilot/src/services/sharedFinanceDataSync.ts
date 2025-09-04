import { ref, set, get, update, remove } from "firebase/database";
import { db } from "./firebase";
import {
  DataSharingSettings,
  SharedGroup,
  NetWorthEntry,
  Transaction,
  RecurringTransaction,
  Asset,
  Debt,
  FinancialGoal,
  getUserProfile,
} from "./userData";

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

export interface SharedFinanceData {
  userId: string;
  displayName: string;
  lastSynced: number;
  sharingSettings: DataSharingSettings;
  netWorth?: {
    current: number;
    history: NetWorthEntry[];
  };
  monthlyIncome?: number;
  monthlyExpenses?: number;
  transactions?: Transaction[];
  recurringTransactions?: RecurringTransaction[];
  assets?: Asset[];
  debts?: Debt[];
  goals?: FinancialGoal[];
}

export interface GroupSharedData {
  groupId: string;
  members: {
    [userId: string]: SharedFinanceData;
  };
  lastUpdated: number;
}

/**
 * Simple function to sync user's financial data to a shared group
 * Only syncs data that the user has explicitly chosen to share
 */
export const syncUserDataToGroup = async (
  userId: string,
  groupId: string,
  userSettings: DataSharingSettings,
  userData: {
    transactions: Transaction[];
    assets: Asset[];
    debts: Debt[];
    goals: FinancialGoal[];
    recurringTransactions: RecurringTransaction[];
  }
): Promise<void> => {
  try {
    console.log(
      "🔄 Starting manual sync for user:",
      userId,
      "to group:",
      groupId
    );

    // Get user's profile to get their display name
    const userProfile = await getUserProfile(userId);
    const displayName = userProfile?.displayName || "User";

    // Build shared data object based on user's privacy settings
    const sharedData: SharedFinanceData = {
      userId,
      displayName,
      lastSynced: Date.now(),
      sharingSettings: userSettings,
    };

    // Only include data that the user has chosen to share
    if (userSettings.shareNetWorth) {
      const totalAssets = userData.assets.reduce(
        (sum, asset) => sum + (asset.balance || 0),
        0
      );
      const totalDebts = userData.debts.reduce(
        (sum, debt) => sum + (debt.balance || 0),
        0
      );
      const netWorth = totalAssets - totalDebts;

      sharedData.netWorth = {
        current: netWorth,
        history: [
          {
            id: `sync-${Date.now()}`,
            userId,
            netWorth,
            assets: totalAssets,
            debts: totalDebts,
            date: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ],
      };
      console.log("✅ Net worth synced:", netWorth);
    }

    if (userSettings.shareMonthlyIncome || userSettings.shareMonthlyExpenses) {
      // Calculate monthly income and expenses from current month
      const currentMonth = new Date();
      const monthStart = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        1
      ).getTime();
      const monthEnd = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0
      ).getTime();

      const monthlyTransactions = userData.transactions.filter(
        (t) => t.date >= monthStart && t.date <= monthEnd
      );

      if (userSettings.shareMonthlyIncome) {
        const monthlyIncome = monthlyTransactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        // Add recurring income for the month
        const recurringIncome = userData.recurringTransactions
          .filter((rt) => rt.isActive && rt.type === "income")
          .reduce((sum, rt) => sum + (rt.amount || 0), 0);

        sharedData.monthlyIncome = monthlyIncome + recurringIncome;
        console.log("✅ Monthly income synced:", sharedData.monthlyIncome);
      }

      if (userSettings.shareMonthlyExpenses) {
        const monthlyExpenses = monthlyTransactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        // Add recurring expenses for the month
        const recurringExpenses = userData.recurringTransactions
          .filter((rt) => rt.isActive && rt.type === "expense")
          .reduce((sum, rt) => sum + (rt.amount || 0), 0);

        sharedData.monthlyExpenses = monthlyExpenses + recurringExpenses;
        console.log("✅ Monthly expenses synced:", sharedData.monthlyExpenses);
      }
    }

    if (userSettings.shareTransactions && userData.transactions.length > 0) {
      sharedData.transactions = userData.transactions;
      console.log("✅ Transactions synced:", userData.transactions.length);
    }

    if (
      userSettings.shareRecurringTransactions &&
      userData.recurringTransactions.length > 0
    ) {
      sharedData.recurringTransactions = userData.recurringTransactions;
      console.log(
        "✅ Recurring transactions synced:",
        userData.recurringTransactions.length
      );
    }

    if (userSettings.shareAssets && userData.assets.length > 0) {
      sharedData.assets = userData.assets;
      console.log("✅ Assets synced:", userData.assets.length);
    }

    if (userSettings.shareDebts && userData.debts.length > 0) {
      sharedData.debts = userData.debts;
      console.log("✅ Debts synced:", userData.debts.length);
    }

    if (userSettings.shareGoals && userData.goals.length > 0) {
      sharedData.goals = userData.goals;
      console.log("✅ Goals synced:", userData.goals.length);
    }

    // Clean the data and write to Firebase
    const cleanData = cleanDataForFirebase(sharedData);

    const sharedDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}`
    );
    await set(sharedDataRef, cleanData);

    console.log(
      "✅ Manual sync completed successfully for user:",
      userId,
      "in group:",
      groupId
    );
  } catch (error) {
    console.error("❌ Error during manual sync:", error);
    throw error;
  }
};

/**
 * Gets the combined shared finance data for a group
 */
export const getGroupSharedData = async (
  groupId: string
): Promise<GroupSharedData | null> => {
  try {
    const sharedDataRef = ref(db, `sharedFinanceData/${groupId}`);
    const snapshot = await get(sharedDataRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Error getting group shared data:", error);
    throw error;
  }
};

/**
 * Gets the current user's sharing settings for a specific group
 */
export const getUserGroupSharingSettings = async (
  userId: string,
  groupId: string
): Promise<DataSharingSettings | null> => {
  try {
    const userDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}`
    );
    const snapshot = await get(userDataRef);

    if (snapshot.exists()) {
      const userData = snapshot.val();
      return userData.sharingSettings || null;
    }
    return null;
  } catch (error) {
    console.error("Error getting user group sharing settings:", error);
    return null;
  }
};

/**
 * Removes a user's shared data from a group
 */
export const removeUserFromGroup = async (
  userId: string,
  groupId: string
): Promise<void> => {
  try {
    const sharedDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}`
    );
    await remove(sharedDataRef);
    console.log("✅ Removed user from group shared data:", userId, groupId);
  } catch (error) {
    console.error("❌ Error removing user from group:", error);
    throw error;
  }
};

/**
 * Removes all shared data for a group (when group is deleted)
 */
export const removeGroupSharedData = async (groupId: string): Promise<void> => {
  try {
    const sharedDataRef = ref(db, `sharedFinanceData/${groupId}`);
    await remove(sharedDataRef);
    console.log("✅ Removed all shared data for group:", groupId);
  } catch (error) {
    console.error("❌ Error removing group shared data:", error);
    throw error;
  }
};
