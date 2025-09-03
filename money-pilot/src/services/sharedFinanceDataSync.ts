import { ref, set, get, update, remove, onValue, off } from "firebase/database";
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

// Global listener registry to track active listeners
const activeListeners: {
  [userId: string]: {
    [groupId: string]: {
      [dataType: string]: () => void;
    };
  };
} = {};

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
 * Syncs user's selected financial data to a shared group
 */
export const syncUserDataToGroup = async (
  userId: string,
  groupId: string,
  userSettings: DataSharingSettings
): Promise<void> => {
  try {
    // Get user's profile to get their display name
    const userProfile = await getUserProfile(userId);
    const displayName = userProfile?.displayName || "User";

    // Get user's financial data based on their sharing settings
    const sharedData: SharedFinanceData = {
      userId,
      displayName: displayName,
      lastSynced: Date.now(),
    };

    // Only sync data that the user has chosen to share
    if (userSettings.shareNetWorth) {
      const netWorthData = await getUserNetWorthData(userId);
      if (
        netWorthData &&
        netWorthData.current !== undefined &&
        netWorthData.current !== null
      ) {
        sharedData.netWorth = netWorthData;
      }
    }

    if (userSettings.shareMonthlyIncome || userSettings.shareMonthlyExpenses) {
      const monthlyData = await getUserMonthlyData(userId);
      if (monthlyData) {
        if (
          userSettings.shareMonthlyIncome &&
          monthlyData.income !== undefined &&
          monthlyData.income !== null
        ) {
          sharedData.monthlyIncome = monthlyData.income;
        }
        if (
          userSettings.shareMonthlyExpenses &&
          monthlyData.expenses !== undefined &&
          monthlyData.expenses !== null
        ) {
          sharedData.monthlyExpenses = monthlyData.expenses;
        }
      }
    }

    if (userSettings.shareTransactions) {
      const transactions = await getUserRecentTransactions(userId);
      if (transactions && transactions.length > 0) {
        // Filter out any transactions with undefined values
        const validTransactions = transactions.filter(
          (t) =>
            t &&
            t.id !== undefined &&
            t.amount !== undefined &&
            t.description !== undefined &&
            t.date !== undefined
        );
        if (validTransactions.length > 0) {
          sharedData.transactions = validTransactions;
        }
      }
    }

    if (userSettings.shareRecurringTransactions) {
      const recurringTransactions = await getUserRecurringTransactions(userId);
      if (recurringTransactions && recurringTransactions.length > 0) {
        // Filter out any recurring transactions with undefined values
        const validRecurringTransactions = recurringTransactions.filter(
          (rt) =>
            rt &&
            rt.id !== undefined &&
            rt.amount !== undefined &&
            rt.name !== undefined &&
            rt.startDate !== undefined
        );
        if (validRecurringTransactions.length > 0) {
          sharedData.recurringTransactions = validRecurringTransactions;
        }
      }
    }

    if (userSettings.shareAssets) {
      const assets = await getUserAssets(userId);
      if (assets && assets.length > 0) {
        // Filter out any assets with undefined values
        const validAssets = assets.filter(
          (a) =>
            a &&
            a.id !== undefined &&
            a.balance !== undefined &&
            a.name !== undefined
        );
        if (validAssets.length > 0) {
          sharedData.assets = validAssets;
        }
      }
    }

    if (userSettings.shareDebts) {
      const debts = await getUserDebts(userId);
      if (debts && debts.length > 0) {
        // Filter out any debts with undefined values
        const validDebts = debts.filter(
          (d) =>
            d &&
            d.id !== undefined &&
            d.balance !== undefined &&
            d.name !== undefined
        );
        if (validDebts.length > 0) {
          sharedData.debts = validDebts;
        }
      }
    }

    if (userSettings.shareGoals) {
      const goals = await getUserGoals(userId);
      if (goals && goals.length > 0) {
        // Filter out any goals with undefined values
        const validGoals = goals.filter(
          (g) =>
            g &&
            g.id !== undefined &&
            g.targetAmount !== undefined &&
            g.name !== undefined
        );
        if (validGoals.length > 0) {
          sharedData.goals = validGoals;
        }
      }
    }

    // Clean the data object to remove any undefined values
    const cleanData = JSON.parse(JSON.stringify(sharedData));

    // Log the cleaned data for debugging
    console.log(
      "Cleaned shared data for user:",
      userId,
      "group:",
      groupId,
      cleanData
    );

    // Update the shared finance data in Firebase
    const sharedDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}`
    );
    await set(sharedDataRef, cleanData);

    // Save the user's sharing settings preferences
    const settingsRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}/sharingSettings`
    );
    await set(settingsRef, userSettings);
    console.log("Saved sharing settings:", userSettings);

    // Update the group's last updated timestamp
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    await update(groupRef, {
      lastDataSync: Date.now(),
    });
  } catch (error) {
    console.error("Error syncing user data to group:", error);
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

      // Determine what data is currently being shared based on what exists
      const settings: DataSharingSettings = {
        shareNetWorth: !!userData.netWorth,
        shareMonthlyIncome: userData.monthlyIncome !== undefined,
        shareMonthlyExpenses: userData.monthlyExpenses !== undefined,
        shareTransactions:
          !!userData.transactions && userData.transactions.length > 0,
        shareRecurringTransactions:
          !!userData.recurringTransactions &&
          userData.recurringTransactions.length > 0,
        shareAssets: !!userData.assets && userData.assets.length > 0,
        shareDebts: !!userData.debts && userData.debts.length > 0,
        shareGoals: !!userData.goals && userData.goals.length > 0,
      };

      return settings;
    }
    return null;
  } catch (error) {
    console.error("Error getting user group sharing settings:", error);
    return null;
  }
};

/**
 * Removes user's data from a shared group when they leave
 */
export const removeUserDataFromGroup = async (
  userId: string,
  groupId: string
): Promise<void> => {
  try {
    const userDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}`
    );
    await remove(userDataRef);
  } catch (error) {
    console.error("Error removing user data from group:", error);
    throw error;
  }
};

/**
 * Sets up real-time data sharing for a user in a group
 * This replaces the need for manual syncing - data updates automatically
 */
export const setupRealTimeDataSharing = async (
  userId: string,
  groupId: string,
  userSettings: DataSharingSettings
): Promise<void> => {
  try {
    console.log(
      "🔄 Setting up real-time data sharing for user:",
      userId,
      "in group:",
      groupId
    );

    // First, stop any existing listeners for this user/group combination
    stopRealTimeDataSharing(userId, groupId);

    // Initialize the listener registry for this user/group
    if (!activeListeners[userId]) {
      activeListeners[userId] = {};
    }
    if (!activeListeners[userId][groupId]) {
      activeListeners[userId][groupId] = {};
    }

    // Get user's profile to get their display name
    const userProfile = await getUserProfile(userId);
    const displayName = userProfile?.displayName || "User";

    // Save the sharing settings first
    const settingsRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}/sharingSettings`
    );
    await set(settingsRef, userSettings);
    console.log("✅ Sharing settings saved");

    // Set up real-time listeners for each data type the user wants to share
    if (userSettings.shareNetWorth) {
      const unsubscribe = setupNetWorthListener(userId, groupId);
      activeListeners[userId][groupId].netWorth = unsubscribe;
      console.log("✅ Net worth listener set up");
    }

    if (userSettings.shareMonthlyIncome || userSettings.shareMonthlyExpenses) {
      const unsubscribe = setupMonthlyDataListener(userId, groupId);
      activeListeners[userId][groupId].monthlyData = unsubscribe;
      console.log("✅ Monthly data listener set up");
    }

    if (userSettings.shareTransactions) {
      const unsubscribe = setupTransactionsListener(userId, groupId);
      activeListeners[userId][groupId].transactions = unsubscribe;
      console.log("✅ Transactions listener set up");
    }

    if (userSettings.shareRecurringTransactions) {
      const unsubscribe = setupRecurringTransactionsListener(userId, groupId);
      activeListeners[userId][groupId].recurringTransactions = unsubscribe;
      console.log("✅ Recurring transactions listener set up");
    }

    if (userSettings.shareAssets) {
      const unsubscribe = setupAssetsListener(userId, groupId);
      activeListeners[userId][groupId].assets = unsubscribe;
      console.log("✅ Assets listener set up");
    }

    if (userSettings.shareDebts) {
      const unsubscribe = setupDebtsListener(userId, groupId);
      activeListeners[userId][groupId].debts = unsubscribe;
      console.log("✅ Debts listener set up");
    }

    if (userSettings.shareGoals) {
      const unsubscribe = setupGoalsListener(userId, groupId);
      activeListeners[userId][groupId].goals = unsubscribe;
      console.log("✅ Goals listener set up");
    }

    // Update the group's last updated timestamp
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    await update(groupRef, {
      lastDataSync: Date.now(),
    });

    console.log(
      "✅ Real-time data sharing setup complete for user:",
      userId,
      "in group:",
      groupId
    );
    console.log(
      "📊 Active listeners:",
      Object.keys(activeListeners[userId][groupId])
    );
  } catch (error) {
    console.error("❌ Error setting up real-time data sharing:", error);
    throw error;
  }
};

/**
 * Sets up a real-time listener for net worth data
 */
const setupNetWorthListener = (userId: string, groupId: string) => {
  console.log(
    "🔍 Setting up net worth listener for user:",
    userId,
    "in group:",
    groupId
  );
  const netWorthRef = ref(db, `users/${userId}/netWorth`);

  const unsubscribe = onValue(netWorthRef, async (snapshot) => {
    console.log("📊 Net worth data changed for user:", userId);
    if (snapshot.exists()) {
      const netWorthData = snapshot.val();
      await updateSharedNetWorth(userId, groupId, netWorthData);
    }
  });

  return unsubscribe;
};

/**
 * Sets up a real-time listener for monthly income/expense data
 */
const setupMonthlyDataListener = (userId: string, groupId: string) => {
  console.log(
    "🔍 Setting up monthly data listener for user:",
    userId,
    "in group:",
    groupId
  );
  const transactionsRef = ref(db, `users/${userId}/transactions`);
  const recurringRef = ref(db, `users/${userId}/recurringTransactions`);

  const unsubscribeTransactions = onValue(transactionsRef, async () => {
    console.log("📊 Transactions changed for user:", userId);
    const monthlyData = await getUserMonthlyData(userId);
    if (monthlyData) {
      await updateSharedMonthlyData(userId, groupId, monthlyData);
    }
  });

  const unsubscribeRecurring = onValue(recurringRef, async () => {
    console.log("📊 Recurring transactions changed for user:", userId);
    const monthlyData = await getUserMonthlyData(userId);
    if (monthlyData) {
      await updateSharedMonthlyData(userId, groupId, monthlyData);
    }
  });

  // Return a combined unsubscribe function
  return () => {
    unsubscribeTransactions();
    unsubscribeRecurring();
  };
};

/**
 * Sets up a real-time listener for transactions
 */
const setupTransactionsListener = (userId: string, groupId: string) => {
  console.log(
    "🔍 Setting up transactions listener for user:",
    userId,
    "in group:",
    groupId
  );
  const transactionsRef = ref(db, `users/${userId}/transactions`);

  const unsubscribe = onValue(transactionsRef, async (snapshot) => {
    console.log("📊 Transactions changed for user:", userId);
    if (snapshot.exists()) {
      const transactions = snapshot.val();
      const recentTransactions = await getUserRecentTransactions(userId);
      if (recentTransactions && recentTransactions.length > 0) {
        await updateSharedTransactions(userId, groupId, recentTransactions);
      }
    }
  });

  return unsubscribe;
};

/**
 * Sets up a real-time listener for recurring transactions
 */
const setupRecurringTransactionsListener = (
  userId: string,
  groupId: string
) => {
  console.log(
    "🔍 Setting up recurring transactions listener for user:",
    userId,
    "in group:",
    groupId
  );
  const recurringRef = ref(db, `users/${userId}/recurringTransactions`);

  const unsubscribe = onValue(recurringRef, async (snapshot) => {
    console.log("📊 Recurring transactions changed for user:", userId);
    if (snapshot.exists()) {
      const recurringTransactions = snapshot.val();
      const validRecurring = await getUserRecurringTransactions(userId);
      if (validRecurring && validRecurring.length > 0) {
        await updateSharedRecurringTransactions(
          userId,
          groupId,
          validRecurring
        );
      }
    }
  });

  return unsubscribe;
};

/**
 * Sets up a real-time listener for assets
 */
const setupAssetsListener = (userId: string, groupId: string) => {
  console.log(
    "🔍 Setting up assets listener for user:",
    userId,
    "in group:",
    groupId
  );
  const assetsRef = ref(db, `users/${userId}/assets`);

  const unsubscribe = onValue(assetsRef, async (snapshot) => {
    console.log("📊 Assets changed for user:", userId);
    if (snapshot.exists()) {
      const assets = snapshot.val();
      const validAssets = await getUserAssets(userId);
      if (validAssets && validAssets.length > 0) {
        await updateSharedAssets(userId, groupId, validAssets);
      }
    }
  });

  return unsubscribe;
};

/**
 * Sets up a real-time listener for debts
 */
const setupDebtsListener = (userId: string, groupId: string) => {
  console.log(
    "🔍 Setting up debts listener for user:",
    userId,
    "in group:",
    groupId
  );
  const debtsRef = ref(db, `users/${userId}/debts`);

  const unsubscribe = onValue(debtsRef, async (snapshot) => {
    console.log("📊 Debts changed for user:", userId);
    if (snapshot.exists()) {
      const debts = snapshot.val();
      const validDebts = await getUserDebts(userId);
      if (validDebts && validDebts.length > 0) {
        await updateSharedDebts(userId, groupId, validDebts);
      }
    }
  });

  return unsubscribe;
};

/**
 * Sets up a real-time listener for financial goals
 */
const setupGoalsListener = (userId: string, groupId: string) => {
  console.log(
    "🔍 Setting up goals listener for user:",
    userId,
    "in group:",
    groupId
  );
  const goalsRef = ref(db, `users/${userId}/financialGoals`);

  const unsubscribe = onValue(goalsRef, async (snapshot) => {
    console.log("📊 Goals changed for user:", userId);
    if (snapshot.exists()) {
      const goals = snapshot.val();
      const validGoals = await getUserGoals(userId);
      if (validGoals && validGoals.length > 0) {
        await updateSharedGoals(userId, groupId, validGoals);
      }
    }
  });

  return unsubscribe;
};

/**
 * Updates shared net worth data in real-time
 */
const updateSharedNetWorth = async (
  userId: string,
  groupId: string,
  netWorthData: any
) => {
  try {
    // Get current user profile to ensure display name is up to date
    const userProfile = await getUserProfile(userId);
    const currentDisplayName = userProfile?.displayName || "User";

    // Clean the data before writing to Firebase
    const cleanedNetWorth = cleanDataForFirebase(netWorthData);

    // Update sharedFinanceData collection (for real-time listeners)
    const sharedDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}/netWorth`
    );
    await set(sharedDataRef, cleanedNetWorth);

    // Also update sharedGroups collection's sharedData subcollection (for display)
    const groupSharedDataRef = ref(
      db,
      `sharedGroups/${groupId}/sharedData/${userId}/netWorth`
    );
    await set(groupSharedDataRef, cleanedNetWorth);

    // Also update the display name to ensure it's current
    const memberRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}/displayName`
    );
    await set(memberRef, currentDisplayName);

    // Update the group's last updated timestamp
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    await update(groupRef, {
      lastDataSync: Date.now(),
    });

    console.log(
      "✅ Net worth updated in real-time for group:",
      groupId,
      "with display name:",
      currentDisplayName
    );
  } catch (error) {
    console.error("❌ Error updating shared net worth:", error);
  }
};

/**
 * Updates shared monthly data in real-time
 */
const updateSharedMonthlyData = async (
  userId: string,
  groupId: string,
  monthlyData: any
) => {
  try {
    // Get current user profile to ensure display name is up to date
    const userProfile = await getUserProfile(userId);
    const currentDisplayName = userProfile?.displayName || "User";

    const sharedDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}`
    );

    const updates: any = {};
    if (monthlyData.income !== undefined) {
      updates.monthlyIncome = monthlyData.income;
    }
    if (monthlyData.expenses !== undefined) {
      updates.monthlyExpenses = monthlyData.expenses;
    }

    // Also update the display name to ensure it's current
    updates.displayName = currentDisplayName;

    await update(sharedDataRef, updates);

    // Update the group's last updated timestamp
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    await update(groupRef, {
      lastDataSync: Date.now(),
    });

    console.log(
      "✅ Monthly data updated in real-time for group:",
      groupId,
      "with display name:",
      currentDisplayName
    );
  } catch (error) {
    console.error("❌ Error updating shared monthly data:", error);
  }
};

/**
 * Updates shared transactions in real-time
 */
const updateSharedTransactions = async (
  userId: string,
  groupId: string,
  transactions: Transaction[]
) => {
  try {
    // Get current user profile to ensure display name is up to date
    const userProfile = await getUserProfile(userId);
    const currentDisplayName = userProfile?.displayName || "User";

    // Clean the data before writing to Firebase
    const cleanedTransactions = cleanDataForFirebase(transactions);

    // Update sharedFinanceData collection (for real-time listeners)
    const sharedDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}/transactions`
    );
    await set(sharedDataRef, cleanedTransactions);

    // Also update sharedGroups collection's sharedData subcollection (for display)
    const groupSharedDataRef = ref(
      db,
      `sharedGroups/${groupId}/sharedData/${userId}/transactions`
    );
    await set(groupSharedDataRef, cleanedTransactions);

    // Also update the display name to ensure it's current
    const memberRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}/displayName`
    );
    await set(memberRef, currentDisplayName);

    // Update the group's last updated timestamp
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    await update(groupRef, {
      lastDataSync: Date.now(),
    });

    console.log(
      "✅ Transactions updated in real-time for group:",
      groupId,
      "with display name:",
      currentDisplayName
    );
  } catch (error) {
    console.error("❌ Error updating shared transactions:", error);
  }
};

/**
 * Updates shared recurring transactions in real-time
 */
const updateSharedRecurringTransactions = async (
  userId: string,
  groupId: string,
  recurringTransactions: RecurringTransaction[]
) => {
  try {
    const sharedDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}/recurringTransactions`
    );
    await set(sharedDataRef, recurringTransactions);

    // Update the group's last updated timestamp
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    await update(groupRef, {
      lastDataSync: Date.now(),
    });

    console.log(
      "✅ Recurring transactions updated in real-time for group:",
      groupId
    );
  } catch (error) {
    console.error("❌ Error updating shared recurring transactions:", error);
  }
};

/**
 * Updates shared assets in real-time
 */
const updateSharedAssets = async (
  userId: string,
  groupId: string,
  assets: Asset[]
) => {
  try {
    // Clean the data before writing to Firebase
    const cleanedAssets = cleanDataForFirebase(assets);

    // Update sharedFinanceData collection (for real-time listeners)
    const sharedDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}/assets`
    );
    await set(sharedDataRef, cleanedAssets);

    // Also update sharedGroups collection's sharedData subcollection (for display)
    const groupSharedDataRef = ref(
      db,
      `sharedGroups/${groupId}/sharedData/${userId}/assets`
    );
    await set(groupSharedDataRef, cleanedAssets);

    // Update the group's last updated timestamp
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    await update(groupRef, {
      lastDataSync: Date.now(),
    });

    console.log("✅ Assets updated in real-time for group:", groupId);
  } catch (error) {
    console.error("❌ Error updating shared assets:", error);
  }
};

/**
 * Updates shared debts in real-time
 */
const updateSharedDebts = async (
  userId: string,
  groupId: string,
  debts: Debt[]
) => {
  try {
    // Clean the data before writing to Firebase
    const cleanedDebts = cleanDataForFirebase(debts);

    // Update sharedFinanceData collection (for real-time listeners)
    const sharedDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}/debts`
    );
    await set(sharedDataRef, cleanedDebts);

    // Also update sharedGroups collection's sharedData subcollection (for display)
    const groupSharedDataRef = ref(
      db,
      `sharedGroups/${groupId}/sharedData/${userId}/debts`
    );
    await set(groupSharedDataRef, cleanedDebts);

    // Update the group's last updated timestamp
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    await update(groupRef, {
      lastDataSync: Date.now(),
    });

    console.log("✅ Debts updated in real-time for group:", groupId);
  } catch (error) {
    console.error("❌ Error updating shared debts:", error);
  }
};

/**
 * Updates shared goals in real-time
 */
const updateSharedGoals = async (
  userId: string,
  groupId: string,
  goals: FinancialGoal[]
) => {
  try {
    // Clean the data before writing to Firebase
    const cleanedGoals = cleanDataForFirebase(goals);

    // Update sharedFinanceData collection (for real-time listeners)
    const sharedDataRef = ref(
      db,
      `sharedFinanceData/${groupId}/members/${userId}/goals`
    );
    await set(sharedDataRef, cleanedGoals);

    // Also update sharedGroups collection's sharedData subcollection (for display)
    const groupSharedDataRef = ref(
      db,
      `sharedGroups/${groupId}/sharedData/${userId}/goals`
    );
    await set(groupSharedDataRef, cleanedGoals);

    // Update the group's last updated timestamp
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    await update(groupRef, {
      lastDataSync: Date.now(),
    });

    console.log("✅ Goals updated in real-time for group:", groupId);
  } catch (error) {
    console.error("❌ Error updating shared goals:", error);
  }
};

/**
 * Stops real-time data sharing for a user in a group
 * Call this when user leaves group or changes sharing settings
 */
export const stopRealTimeDataSharing = (userId: string, groupId: string) => {
  try {
    console.log(
      "🛑 Stopping real-time data sharing for user:",
      userId,
      "in group:",
      groupId
    );

    if (activeListeners[userId] && activeListeners[userId][groupId]) {
      const groupListeners = activeListeners[userId][groupId];

      // Stop all active listeners for this group
      Object.entries(groupListeners).forEach(([dataType, unsubscribe]) => {
        try {
          unsubscribe();
          console.log(
            `🛑 Stopped ${dataType} listener for user:`,
            userId,
            "in group:",
            groupId
          );
        } catch (error) {
          console.error(`Error stopping ${dataType} listener:`, error);
        }
      });

      // Remove the group from the listener registry
      delete activeListeners[userId][groupId];
      console.log(
        "✅ All listeners stopped for user:",
        userId,
        "in group:",
        groupId
      );
    }
  } catch (error) {
    console.error("❌ Error stopping real-time data sharing:", error);
  }
};

/**
 * Stops real-time data sharing for a specific data type
 */
export const stopRealTimeDataSharingForDataType = (
  userId: string,
  groupId: string,
  dataType: string
): void => {
  try {
    if (
      activeListeners[userId] &&
      activeListeners[userId][groupId] &&
      activeListeners[userId][groupId][dataType]
    ) {
      const unsubscribe = activeListeners[userId][groupId][dataType];
      unsubscribe();
      delete activeListeners[userId][groupId][dataType];
      console.log(
        `🛑 Stopped ${dataType} listener for user:`,
        userId,
        "in group:",
        groupId
      );
    }
  } catch (error) {
    console.error(`❌ Error stopping ${dataType} listener:`, error);
  }
};

/**
 * Gets the current status of active listeners for debugging
 */
export const getActiveListenersStatus = () => {
  console.log("📊 Current Active Listeners Status:");
  console.log(JSON.stringify(activeListeners, null, 2));

  let totalListeners = 0;
  Object.values(activeListeners).forEach((userGroups) => {
    Object.values(userGroups).forEach((groupListeners) => {
      totalListeners += Object.keys(groupListeners).length;
    });
  });

  console.log(`📊 Total active listeners: ${totalListeners}`);
  return activeListeners;
};

// Helper functions to get user data
const getUserNetWorthData = async (userId: string) => {
  try {
    const netWorthRef = ref(db, `users/${userId}/netWorth`);
    const snapshot = await get(netWorthRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      const entries = Object.values(data || {}) as NetWorthEntry[];
      const current =
        entries.length > 0 ? entries[entries.length - 1].netWorth : 0;

      return {
        current,
        history: entries.slice(-12), // Last 12 entries
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting user net worth data:", error);
    return null;
  }
};

const getUserMonthlyData = async (userId: string) => {
  try {
    const currentMonth = new Date();
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    ).getTime();
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    ).getTime();

    // Get transactions for current month
    const transactionsRef = ref(db, `users/${userId}/transactions`);
    const transactionsSnapshot = await get(transactionsRef);

    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    if (transactionsSnapshot.exists()) {
      const transactions = Object.values(
        transactionsSnapshot.val() || {}
      ) as Transaction[];

      for (const transaction of transactions) {
        if (transaction.date >= monthStart && transaction.date <= monthEnd) {
          if (transaction.type === "income") {
            monthlyIncome += transaction.amount;
          } else {
            monthlyExpenses += transaction.amount;
          }
        }
      }
    }

    // Get recurring transactions for current month
    const recurringRef = ref(db, `users/${userId}/recurringTransactions`);
    const recurringSnapshot = await get(recurringRef);

    if (recurringSnapshot.exists()) {
      const recurringTransactions = Object.values(
        recurringSnapshot.val() || {}
      ) as RecurringTransaction[];

      for (const recurring of recurringTransactions) {
        if (
          recurring.isActive &&
          recurring.startDate >= monthStart &&
          recurring.startDate <= monthEnd
        ) {
          if (recurring.type === "income") {
            monthlyIncome += recurring.amount;
          } else {
            monthlyExpenses += recurring.amount;
          }
        }
      }
    }

    return { income: monthlyIncome, expenses: monthlyExpenses };
  } catch (error) {
    console.error("Error getting user monthly data:", error);
    return null;
  }
};

const getUserRecentTransactions = async (userId: string) => {
  try {
    const transactionsRef = ref(db, `users/${userId}/transactions`);
    const snapshot = await get(transactionsRef);

    if (snapshot.exists()) {
      const transactions = Object.values(snapshot.val() || {}) as Transaction[];
      // Return last 30 transactions
      return transactions.sort((a, b) => b.date - a.date).slice(0, 30);
    }
    return null;
  } catch (error) {
    console.error("Error getting user transactions:", error);
    return null;
  }
};

const getUserRecurringTransactions = async (userId: string) => {
  try {
    const recurringRef = ref(db, `users/${userId}/recurringTransactions`);
    const snapshot = await get(recurringRef);

    if (snapshot.exists()) {
      const recurringTransactions = Object.values(
        snapshot.val() || {}
      ) as RecurringTransaction[];
      return recurringTransactions.filter((rt) => rt.isActive);
    }
    return null;
  } catch (error) {
    console.error("Error getting user recurring transactions:", error);
    return null;
  }
};

const getUserAssets = async (userId: string) => {
  try {
    const assetsRef = ref(db, `users/${userId}/assets`);
    const snapshot = await get(assetsRef);

    if (snapshot.exists()) {
      return Object.values(snapshot.val() || {}) as Asset[];
    }
    return null;
  } catch (error) {
    console.error("Error getting user assets:", error);
    return null;
  }
};

const getUserDebts = async (userId: string) => {
  try {
    const debtsRef = ref(db, `users/${userId}/debts`);
    const snapshot = await get(debtsRef);

    if (snapshot.exists()) {
      return Object.values(snapshot.val() || {}) as Debt[];
    }
    return null;
  } catch (error) {
    console.error("Error getting user debts:", error);
    return null;
  }
};

const getUserGoals = async (userId: string) => {
  try {
    const goalsRef = ref(db, `users/${userId}/financialGoals`);
    const snapshot = await get(goalsRef);

    if (snapshot.exists()) {
      return Object.values(snapshot.val() || {}) as FinancialGoal[];
    }
    return null;
  } catch (error) {
    console.error("Error getting user goals:", error);
    return null;
  }
};
