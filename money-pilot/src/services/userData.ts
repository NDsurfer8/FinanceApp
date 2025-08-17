import { ref, set, get, push, update, remove } from "firebase/database";
import { db, auth } from "./firebase";

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
  userId: string;
  createdAt: number;
  updatedAt: number;
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

    // Auto-update shared groups
    await updateSharedGroupsForUser(transaction.userId);

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

    // Auto-update shared groups
    await updateSharedGroupsForUser(asset.userId);

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

    // Auto-update shared groups
    await updateSharedGroupsForUser(debt.userId);

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

    // Auto-update shared groups
    await updateSharedGroupsForUser(userId);
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

    // Auto-update shared groups
    await updateSharedGroupsForUser(userId);
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

    // Auto-update shared groups
    await updateSharedGroupsForUser(userId);
  } catch (error) {
    console.error("Error removing debt:", error);
    throw error;
  }
};

// ===== GOALS CRUD OPERATIONS =====

// Save goal
export const saveGoal = async (goal: FinancialGoal): Promise<string> => {
  try {
    const goalsRef = ref(db, `users/${goal.userId}/goals`);
    const newGoalRef = push(goalsRef);
    const goalId = newGoalRef.key;

    if (!goalId) {
      throw new Error("Failed to generate goal ID");
    }

    await set(newGoalRef, {
      ...goal,
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
    const goalsRef = ref(db, `users/${userId}/goals`);
    const snapshot = await get(goalsRef);

    if (snapshot.exists()) {
      const goals: FinancialGoal[] = [];
      snapshot.forEach((childSnapshot) => {
        goals.push(childSnapshot.val());
      });
      return goals.sort((a, b) => b.createdAt - a.createdAt);
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
    const goalRef = ref(db, `users/${goal.userId}/goals/${goal.id}`);
    await update(goalRef, {
      ...goal,
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
      ...emergencyFund,
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
    const emergencyFundRef = ref(db, `users/${userId}/emergencyFund`);
    const snapshot = await get(emergencyFundRef);

    if (snapshot.exists()) {
      const emergencyFunds: EmergencyFund[] = [];
      snapshot.forEach((childSnapshot) => {
        emergencyFunds.push(childSnapshot.val());
      });
      // Return the most recent emergency fund entry
      return (
        emergencyFunds.sort((a, b) => b.updatedAt - a.updatedAt)[0] || null
      );
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
    const emergencyFundRef = ref(
      db,
      `users/${emergencyFund.userId}/emergencyFund/${emergencyFund.id}`
    );
    await update(emergencyFundRef, {
      ...emergencyFund,
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
      ...budgetSettings,
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
    const budgetSettingsRef = ref(db, `users/${userId}/budgetSettings`);
    const snapshot = await get(budgetSettingsRef);

    if (snapshot.exists()) {
      const budgetSettings: BudgetSettings[] = [];
      snapshot.forEach((childSnapshot) => {
        budgetSettings.push(childSnapshot.val());
      });
      // Return the most recent budget settings entry
      return (
        budgetSettings.sort((a, b) => b.updatedAt - a.updatedAt)[0] || null
      );
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
    const budgetSettingsRef = ref(
      db,
      `users/${budgetSettings.userId}/budgetSettings/${budgetSettings.id}`
    );
    await update(budgetSettingsRef, {
      ...budgetSettings,
      updatedAt: Date.now(),
    });
    console.log("Budget settings updated successfully");
  } catch (error) {
    console.error("Error updating budget settings:", error);
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

// Delete shared group
export const deleteSharedGroup = async (groupId: string): Promise<void> => {
  try {
    const groupRef = ref(db, `sharedGroups/${groupId}`);
    await remove(groupRef);
    console.log("Shared group deleted successfully");
  } catch (error) {
    console.error("Error deleting shared group:", error);
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
    console.log("Member removed from group successfully");
  } catch (error) {
    console.error("Error removing member from group:", error);
    throw error;
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
      console.log("Searching for invitations for email:", email);
      snapshot.forEach((childSnapshot) => {
        const invitation = childSnapshot.val();
        console.log("Found invitation:", invitation);
        console.log("Comparing:", invitation.inviteeEmail, "===", email);
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
    await set(groupRef, {
      assets,
      debts,
      transactions,
      goals,
      lastUpdated: Date.now(),
    });

    console.log("User data added to shared group successfully");
  } catch (error) {
    console.error("Error adding user data to group:", error);
    throw error;
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
      await addUserDataToGroup(groupId, userId);
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
        if (userData.assets) allAssets.push(...userData.assets);
        if (userData.debts) allDebts.push(...userData.debts);
        if (userData.transactions)
          allTransactions.push(...userData.transactions);
        if (userData.goals) allGoals.push(...userData.goals);
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
): Promise<void> => {
  try {
    const recurringTransactionRef = ref(db, "recurringTransactions");
    const newRecurringTransactionRef = push(recurringTransactionRef);

    // Remove undefined values before saving to Firebase
    const transactionToSave = { ...recurringTransaction };
    if (transactionToSave.endDate === undefined) {
      delete transactionToSave.endDate;
    }

    await set(newRecurringTransactionRef, {
      ...transactionToSave,
      id: newRecurringTransactionRef.key,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("Recurring transaction saved successfully");
  } catch (error) {
    console.error("Error saving recurring transaction:", error);
    throw new Error("Failed to save recurring transaction");
  }
};

export const getUserRecurringTransactions = async (
  userId: string
): Promise<RecurringTransaction[]> => {
  try {
    const recurringTransactionsRef = ref(db, "recurringTransactions");
    const snapshot = await get(recurringTransactionsRef);

    if (snapshot.exists()) {
      const recurringTransactions = snapshot.val();
      return Object.values(recurringTransactions).filter(
        (transaction: any) => transaction.userId === userId
      ) as RecurringTransaction[];
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
    if (!recurringTransaction.id) {
      throw new Error("Recurring transaction ID is required for update");
    }

    const recurringTransactionRef = ref(
      db,
      `recurringTransactions/${recurringTransaction.id}`
    );

    // Remove undefined values before updating Firebase
    const transactionToUpdate = { ...recurringTransaction };
    if (transactionToUpdate.endDate === undefined) {
      delete transactionToUpdate.endDate;
    }

    await update(recurringTransactionRef, {
      ...transactionToUpdate,
      updatedAt: Date.now(),
    });

    console.log("Recurring transaction updated successfully");
  } catch (error) {
    console.error("Error updating recurring transaction:", error);
    throw new Error("Failed to update recurring transaction");
  }
};

export const deleteRecurringTransaction = async (
  recurringTransactionId: string
): Promise<void> => {
  try {
    const recurringTransactionRef = ref(
      db,
      `recurringTransactions/${recurringTransactionId}`
    );

    await remove(recurringTransactionRef);
    console.log("Recurring transaction deleted successfully");
  } catch (error) {
    console.error("Error deleting recurring transaction:", error);
    throw new Error("Failed to delete recurring transaction");
  }
};

export const skipRecurringTransactionForMonth = async (
  recurringTransactionId: string,
  monthKey: string
): Promise<void> => {
  try {
    const recurringTransactionRef = ref(
      db,
      `recurringTransactions/${recurringTransactionId}`
    );

    // Get the current recurring transaction
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

    // Update the recurring transaction
    await update(recurringTransactionRef, {
      skippedMonths,
      updatedAt: Date.now(),
    });

    console.log(`Skipped recurring transaction for month: ${monthKey}`);
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
