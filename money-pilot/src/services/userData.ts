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

    await set(newInvitationRef, {
      ...invitation,
      id: invitationId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log("Invitation created successfully");
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
        if (
          invitation.inviteeEmail === email &&
          invitation.status === "pending"
        ) {
          invitations.push(invitation);
        }
      });
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

    // Aggregate data from all members
    for (const member of group.members) {
      // Get member's assets
      const memberAssets = await getUserAssets(member.userId);
      totalAssets += memberAssets.reduce(
        (sum, asset) => sum + asset.balance,
        0
      );

      // Get member's debts
      const memberDebts = await getUserDebts(member.userId);
      totalDebts += memberDebts.reduce((sum, debt) => sum + debt.balance, 0);

      // Get member's transactions (current month)
      const memberTransactions = await getUserTransactions(member.userId);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const currentMonthTransactions = memberTransactions.filter(
        (transaction) => {
          const transactionDate = new Date(transaction.date);
          return (
            transactionDate.getMonth() === currentMonth &&
            transactionDate.getFullYear() === currentYear
          );
        }
      );

      totalIncome += currentMonthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      totalExpenses += currentMonthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      // Get member's goals
      const memberGoals = await getUserGoals(member.userId);
      totalGoals += memberGoals.length;
      totalGoalProgress += memberGoals.reduce(
        (sum, goal) => sum + goal.currentAmount,
        0
      );
    }

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
