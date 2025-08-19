import { useSubscription } from "./useSubscription";
import { useData } from "../contexts/DataContext";
import { PREMIUM_FEATURES } from "../services/revenueCat";

export const useTransactionLimits = () => {
  const { isFeatureAvailable } = useSubscription();
  const { transactions, recurringTransactions } = useData();

  // Constants for free tier limits
  const FREE_TIER_LIMITS = {
    TRANSACTIONS: 5,
    INCOME_SOURCES: 1,
  };

  // Check if user has unlimited transactions
  const hasUnlimitedTransactions = () => {
    return isFeatureAvailable(PREMIUM_FEATURES.UNLIMITED_TRANSACTIONS);
  };

  // Check if user has unlimited income sources
  const hasUnlimitedIncomeSources = () => {
    return isFeatureAvailable(PREMIUM_FEATURES.UNLIMITED_INCOME_SOURCES);
  };

  // Get current transaction count
  const getCurrentTransactionCount = () => {
    return transactions.length;
  };

  // Get current income sources count
  const getCurrentIncomeSourcesCount = () => {
    const incomeTransactions = transactions.filter((t) => t.type === "income");
    const incomeRecurring = recurringTransactions.filter(
      (t) => t.type === "income" && t.isActive
    );

    // Count unique income sources (combining regular and recurring)
    const uniqueSources = new Set();

    incomeTransactions.forEach((t) => uniqueSources.add(t.description));
    incomeRecurring.forEach((t) => uniqueSources.add(t.name));

    return uniqueSources.size;
  };

  // Check if user can add more transactions
  const canAddTransaction = () => {
    if (hasUnlimitedTransactions()) return true;
    return getCurrentTransactionCount() < FREE_TIER_LIMITS.TRANSACTIONS;
  };

  // Check if user can add more income sources
  const canAddIncomeSource = () => {
    if (hasUnlimitedIncomeSources()) return true;
    return getCurrentIncomeSourcesCount() < FREE_TIER_LIMITS.INCOME_SOURCES;
  };

  // Get remaining transaction slots
  const getRemainingTransactionSlots = () => {
    if (hasUnlimitedTransactions()) return Infinity;
    return Math.max(
      0,
      FREE_TIER_LIMITS.TRANSACTIONS - getCurrentTransactionCount()
    );
  };

  // Get remaining income source slots
  const getRemainingIncomeSourceSlots = () => {
    if (hasUnlimitedIncomeSources()) return Infinity;
    return Math.max(
      0,
      FREE_TIER_LIMITS.INCOME_SOURCES - getCurrentIncomeSourcesCount()
    );
  };

  // Get limit information for display
  const getTransactionLimitInfo = () => {
    if (hasUnlimitedTransactions()) {
      return {
        current: getCurrentTransactionCount(),
        limit: "Unlimited",
        remaining: "Unlimited",
        isUnlimited: true,
      };
    }

    return {
      current: getCurrentTransactionCount(),
      limit: FREE_TIER_LIMITS.TRANSACTIONS,
      remaining: getRemainingTransactionSlots(),
      isUnlimited: false,
    };
  };

  const getIncomeSourceLimitInfo = () => {
    if (hasUnlimitedIncomeSources()) {
      return {
        current: getCurrentIncomeSourcesCount(),
        limit: "Unlimited",
        remaining: "Unlimited",
        isUnlimited: true,
      };
    }

    return {
      current: getCurrentIncomeSourcesCount(),
      limit: FREE_TIER_LIMITS.INCOME_SOURCES,
      remaining: getRemainingIncomeSourceSlots(),
      isUnlimited: false,
    };
  };

  return {
    // Limits
    FREE_TIER_LIMITS,

    // Capability checks
    hasUnlimitedTransactions,
    hasUnlimitedIncomeSources,
    canAddTransaction,
    canAddIncomeSource,

    // Current counts
    getCurrentTransactionCount,
    getCurrentIncomeSourcesCount,

    // Remaining slots
    getRemainingTransactionSlots,
    getRemainingIncomeSourceSlots,

    // Limit info for UI
    getTransactionLimitInfo,
    getIncomeSourceLimitInfo,
  };
};
