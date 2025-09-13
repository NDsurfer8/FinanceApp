import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import { useZeroLoading } from "../hooks/useZeroLoading";
import { useScrollDetection } from "../hooks/useScrollDetection";
import { isNewUser } from "../services/userData";

import { useData } from "../contexts/DataContext";
import {
  getUserNetWorthEntries,
  updateNetWorthFromAssetsAndDebts,
  getUserInvitations,
  getUserBudgetStreak,
  calculateMonthlyBudgetResult,
  updateBudgetStreak,
  getUserBudgetCategories,
} from "../services/userData";
import {
  getAchievementProgress,
  markAchievementsAsSeen as markAchievementsAsSeenService,
  getUnseenAchievements,
  cleanupIrrelevantAchievements,
  Achievement,
} from "../services/achievementService";
import {
  checkMonthTransitions,
  initializeMonthTracking,
} from "../services/monthTransitionService";

import { useTheme } from "../contexts/ThemeContext";
import { useTranslation } from "../hooks/useTranslation";
import { useCurrency } from "../contexts/CurrencyContext";
import { LanguageAwareText } from "../components/LanguageAwareText";
import { StandardHeader } from "../components/StandardHeader";
import { CustomTrendChart } from "../components/CustomTrendChart";
import { FloatingAIChatbot } from "../components/FloatingAIChatbot";
import { HelpfulTooltip } from "../components/HelpfulTooltip";
import { DashboardPrompts } from "../components/DashboardPrompts";
import { useSetup } from "../contexts/SetupContext";

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const {
    transactions,
    assets,
    debts,
    recurringTransactions,
    refreshInBackground,
  } = useZeroLoading();
  const { goals, budgetSettings, refreshAssetsDebts } = useData();
  const { setupProgress, updateSetupProgress } = useSetup();
  const { isScrolling, handleScrollBegin, handleScrollEnd } =
    useScrollDetection();

  const [loading, setLoading] = useState(false);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(
    new Set()
  );
  const [pendingInvitations, setPendingInvitations] = useState<number>(0);
  const [isNewUserState, setIsNewUserState] = useState<boolean>(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    content: string;
    icon: string;
    color: string;
  } | null>(null);
  const [budgetStreak, setBudgetStreak] = useState<any>(null);
  const [monthlyBudgetResult, setMonthlyBudgetResult] = useState<any>(null);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [hasBudgetCategories, setHasBudgetCategories] = useState(false);
  const [achievementsHidden, setAchievementsHidden] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unseenAchievements, setUnseenAchievements] = useState<Achievement[]>(
    []
  );
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();

  // Generate personalized welcome message
  const getWelcomeMessage = () => {
    const userName = user?.displayName || t("common.user");
    return isNewUserState
      ? t("dashboard.welcome_new", { name: userName })
      : t("dashboard.welcome_back", { name: userName });
  };

  const getAvailableAmountModalContent = () => {
    return `${t("dashboard.formula")}\n${t(
      "dashboard.net_income_minus_savings",
      { savingsPercent, debtPayoffPercent }
    )}\n\n${t("dashboard.income_expenses")}\n${t(
      "dashboard.gross_income"
    )}     ${formatCurrency(monthlyIncome)}\n${t(
      "dashboard.expenses"
    )}         ${formatCurrency(
      monthlyExpenses
    )}\n─────────────────────────\n${t(
      "dashboard.net_income"
    )}       ${formatCurrency(netIncome)}\n\n${t("dashboard.allocations")}\n${t(
      "dashboard.savings"
    )}          ${formatCurrency(savingsAmount)}\n${t(
      "dashboard.goal_contrib"
    )}     ${formatCurrency(totalGoalContributions)}\n${t(
      "dashboard.debt_payoff"
    )}      ${formatCurrency(debtPayoffAmount)}\n─────────────────────────\n${t(
      "dashboard.available"
    )}        ${formatCurrency(availableAmount)}`;
  };

  const showInfoModalHandler = (
    title: string,
    content: string,
    icon: string,
    color: string
  ) => {
    setModalContent({ title, content, icon, color });
    setShowInfoModal(true);
  };

  // Function to fetch pending invitations
  const fetchPendingInvitations = React.useCallback(async () => {
    if (user?.email) {
      try {
        const invitations = await getUserInvitations(user.email);
        const pendingCount = invitations.filter(
          (inv) => inv.status === "pending"
        ).length;
        setPendingInvitations(pendingCount);
      } catch (error) {
        console.error("Error fetching pending invitations:", error);
      }
    }
  }, [user?.email]);

  // Fetch invitations when component mounts
  React.useEffect(() => {
    if (user) {
      fetchPendingInvitations();
    }
  }, [user]);

  // Check if user is new for personalized welcome message
  React.useEffect(() => {
    const checkIfNewUser = async () => {
      if (user) {
        try {
          const newUserStatus = await isNewUser(user);
          setIsNewUserState(newUserStatus);
        } catch (error) {
          console.error("Error checking if user is new:", error);
          setIsNewUserState(false); // Default to returning user on error
        }
      }
    };

    checkIfNewUser();
  }, [user]);

  // Background refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        refreshInBackground();
        // Refresh trend data when dashboard comes into focus
        const refreshTrendData = async () => {
          // Dashboard focused - refreshing trend data
          const data = await getTrendData();
          setTrendData(data);
        };
        refreshTrendData();
        // Fetch pending invitations
        fetchPendingInvitations();
        // Load budget streak data
        loadBudgetStreakData();
        checkBudgetCategories();
        loadAchievements();
      }
    }, [user, refreshInBackground, fetchPendingInvitations])
  );

  // Calculate current month data
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.date);
    return (
      transactionDate.getMonth() === currentMonth &&
      transactionDate.getFullYear() === currentYear
    );
  });

  // Calculate recurring monthly amounts
  const recurringMonthlyIncome = recurringTransactions
    .filter((t) => t.type === "income" && t.isActive)
    .reduce((sum: number, rt: any) => {
      let monthlyAmount = rt.amount;
      if (rt.frequency === "weekly") {
        monthlyAmount = rt.amount * 4; // 4 weeks in a month
      } else if (rt.frequency === "biweekly") {
        monthlyAmount = rt.amount * 2; // 2 bi-weekly periods in a month
      } else if (rt.frequency === "monthly") {
        monthlyAmount = rt.amount * 1; // 1 month period
      }
      return sum + monthlyAmount;
    }, 0);

  const recurringMonthlyExpenses = recurringTransactions
    .filter((t) => t.type === "expense" && t.isActive)
    .reduce((sum: number, rt: any) => {
      let monthlyAmount = rt.amount;
      if (rt.frequency === "weekly") {
        monthlyAmount = rt.amount * 4; // 4 weeks in a month
      } else if (rt.frequency === "biweekly") {
        monthlyAmount = rt.amount * 2; // 2 bi-weekly periods in a month
      } else if (rt.frequency === "monthly") {
        monthlyAmount = rt.amount * 1; // 1 month period
      }
      return sum + monthlyAmount;
    }, 0);

  // Filter out individual transactions that are generated from recurring transactions
  // to avoid double counting (these are already included in recurring amounts)
  const nonRecurringMonthlyTransactions = monthlyTransactions.filter(
    (t) => !t.recurringTransactionId
  );

  // Total monthly amounts including recurring
  const monthlyIncome =
    nonRecurringMonthlyTransactions
      .filter((t) => t.type === "income")
      .reduce((sum: number, t: any) => sum + t.amount, 0) +
    recurringMonthlyIncome;

  const monthlyExpenses =
    nonRecurringMonthlyTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum: number, t: any) => sum + t.amount, 0) +
    recurringMonthlyExpenses;

  const netIncome = monthlyIncome - monthlyExpenses;

  // Calculate available amount (same as BudgetScreen)
  const savingsPercent = budgetSettings?.savingsPercentage
    ? parseFloat(budgetSettings.savingsPercentage)
    : 20;
  const debtPayoffPercent = budgetSettings?.debtPayoffPercentage
    ? parseFloat(budgetSettings.debtPayoffPercentage)
    : 5;
  const savingsAmount = monthlyIncome * (savingsPercent / 100);
  const debtPayoffAmount = monthlyIncome * (debtPayoffPercent / 100);

  // Calculate total goal contributions
  const totalGoalContributions = goals.reduce((total, goal) => {
    return total + goal.monthlyContribution;
  }, 0);

  const discretionaryIncome =
    netIncome - savingsAmount - debtPayoffAmount - totalGoalContributions;
  const availableAmount = discretionaryIncome;

  // Calculate total assets and debts
  const totalAssets = assets.reduce(
    (sum: number, asset: any) => sum + asset.balance,
    0
  );
  const totalDebts = debts.reduce(
    (sum: number, debt: any) => sum + debt.balance,
    0
  );
  const netWorth = totalAssets - totalDebts;

  // Calculate savings breakdown
  const totalSavings = assets
    .filter((asset: any) => asset.type === "savings")
    .reduce((sum: number, asset: any) => sum + asset.balance, 0);
  const emergencyFundTarget = monthlyExpenses * 6;
  const emergencyFundProgress =
    emergencyFundTarget > 0 && monthlyExpenses > 0
      ? (totalSavings / emergencyFundTarget) * 100
      : 0;

  // Premium Feature: Smart Insights
  const getInsights = () => {
    const insights = [];

    if (monthlyIncome > 0) {
      // Calculate discretionary savings rate (what's actually available after all allocations)
      const discretionarySavingsRate = (availableAmount / monthlyIncome) * 100;
      if (discretionarySavingsRate >= 20) {
        insights.push({
          id: "excellent-savings-rate",
          type: "success",
          icon: "trending-up",
          title: t("dashboard.excellent_discretionary_savings"),
          message: t("dashboard.excellent_discretionary_savings_message", {
            rate: discretionarySavingsRate.toFixed(1),
          }),
        });
      } else if (discretionarySavingsRate < 0) {
        insights.push({
          id: "spending-more-than-income",
          type: "warning",
          icon: "alert-circle",
          title: t("dashboard.over_budget"),
          message: t("dashboard.over_budget_message"),
        });
      }
    }

    if (totalDebts > 0 && totalAssets > 0 && totalAssets > totalDebts) {
      const debtToAssetRatio = (totalDebts / totalAssets) * 100;
      if (debtToAssetRatio > 50) {
        insights.push({
          id: "high-debt-ratio",
          type: "warning",
          icon: "card",
          title: t("dashboard.high_debt_ratio"),
          message: t("dashboard.high_debt_ratio_message", {
            ratio: debtToAssetRatio.toFixed(1),
          }),
        });
      }
    }

    if (nonRecurringMonthlyTransactions.length >= 10) {
      insights.push({
        id: "active-month",
        type: "info",
        icon: "analytics",
        title: t("dashboard.active_month"),
        message: t("dashboard.active_month_message", {
          count: nonRecurringMonthlyTransactions.length,
        }),
      });
    }

    // Emergency Fund Insight
    if (emergencyFundProgress >= 100) {
      insights.push({
        id: "emergency-fund-complete",
        type: "success",
        icon: "shield-checkmark",
        title: t("dashboard.emergency_fund_complete"),
        message: t("dashboard.emergency_fund_complete_message", {
          progress: emergencyFundProgress.toFixed(0),
        }),
      });
    } else if (emergencyFundProgress >= 50) {
      insights.push({
        id: "emergency-fund-progress",
        type: "info",
        icon: "shield",
        title: t("dashboard.emergency_fund_progress"),
        message: t("dashboard.emergency_fund_progress_message", {
          progress: emergencyFundProgress.toFixed(0),
        }),
      });
    } else if (emergencyFundProgress > 0) {
      insights.push({
        id: "build-emergency-fund",
        type: "warning",
        icon: "shield-outline",
        title: t("dashboard.build_emergency_fund"),
        message: t("dashboard.build_emergency_fund_message", {
          progress: emergencyFundProgress.toFixed(0),
        }),
      });
    }

    // Recurring Transaction Insights
    if (recurringMonthlyIncome > 0 || recurringMonthlyExpenses > 0) {
      // Calculate what percentage of total monthly income is from recurring sources
      const totalMonthlyIncome = monthlyIncome; // This already includes recurring income
      const recurringIncomePercentage =
        totalMonthlyIncome > 0
          ? (recurringMonthlyIncome / totalMonthlyIncome) * 100
          : 0;

      if (recurringIncomePercentage > 80) {
        insights.push({
          id: "high-recurring-commitments",
          type: "info",
          icon: "repeat",
          title: t("dashboard.high_recurring_commitments"),
          message: t("dashboard.high_recurring_message", {
            percentage: recurringIncomePercentage.toFixed(0),
          }),
        });
      } else if (recurringIncomePercentage > 50) {
        insights.push({
          id: "moderate-recurring-commitments",
          type: "info",
          icon: "repeat",
          title: t("dashboard.moderate_recurring_commitments"),
          message: t("dashboard.moderate_recurring_message", {
            percentage: recurringIncomePercentage.toFixed(0),
          }),
        });
      } else if (recurringIncomePercentage > 0) {
        insights.push({
          id: "low-recurring-commitments",
          type: "info",
          icon: "repeat",
          title: t("dashboard.low_recurring_commitments"),
          message: t("dashboard.low_recurring_message", {
            percentage: recurringIncomePercentage.toFixed(0),
          }),
        });
      }
    }

    return insights;
  };
  // Available amount is discretionary income
  const allInsights = React.useMemo(
    () => getInsights(),
    [
      monthlyIncome,
      availableAmount,
      totalDebts,
      totalAssets,
      nonRecurringMonthlyTransactions.length,
      emergencyFundProgress,
      totalSavings,
      recurringMonthlyIncome,
      recurringMonthlyExpenses,
    ]
  );

  const insights = React.useMemo(
    () => allInsights.filter((insight) => !dismissedInsights.has(insight.id)),
    [allInsights, dismissedInsights]
  );

  const handleDismissInsight = (insightId: string) => {
    setDismissedInsights((prev) => new Set([...prev, insightId]));
  };

  // Premium Feature: Trend Analysis
  const getTrendData = async () => {
    const last6Months = [];

    // Get net worth entries
    const netWorthEntries = await getUserNetWorthEntries(user?.uid || "");

    // Calculate the 6 months ending with the current month
    // This will show: [5 months ago, 4 months ago, 3 months ago, 2 months ago, 1 month ago, current month]
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);

      // Debug: Log what month we're calculating

      const monthTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        return (
          tDate.getMonth() === date.getMonth() &&
          tDate.getFullYear() === date.getFullYear()
        );
      });

      // Filter out individual transactions that are generated from recurring transactions
      // to avoid double counting (these are already included in recurring amounts)
      const nonRecurringMonthTransactions = monthTransactions.filter(
        (t) => !t.recurringTransactionId
      );

      // Calculate actual transactions for this month (excluding recurring-generated ones)
      const actualIncome = nonRecurringMonthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const actualExpenses = nonRecurringMonthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      // Calculate recurring amounts for this month (only if recurring transaction was active during this month)
      const recurringIncome = recurringTransactions
        .filter((t) => t.type === "income" && t.isActive)
        .reduce((sum: number, rt: any) => {
          // Check if this recurring transaction was active during the month we're calculating
          const transactionStartDate = new Date(rt.startDate);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

          // Only include if transaction started before or during this month
          if (transactionStartDate <= monthEnd) {
            let monthlyAmount = rt.amount;
            if (rt.frequency === "weekly") {
              monthlyAmount = rt.amount * 4;
            } else if (rt.frequency === "biweekly") {
              monthlyAmount = rt.amount * 2;
            } else if (rt.frequency === "monthly") {
              monthlyAmount = rt.amount * 1;
            }
            return sum + monthlyAmount;
          }
          return sum;
        }, 0);

      const recurringExpenses = recurringTransactions
        .filter((t) => t.type === "expense" && t.isActive)
        .reduce((sum: number, rt: any) => {
          // Check if this recurring transaction was active during the month we're calculating
          const transactionStartDate = new Date(rt.startDate);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

          // Only include if transaction started before or during this month
          if (transactionStartDate <= monthEnd) {
            let monthlyAmount = rt.amount;
            if (rt.frequency === "weekly") {
              monthlyAmount = rt.amount * 4;
            } else if (rt.frequency === "biweekly") {
              monthlyAmount = rt.amount * 2;
            } else if (rt.frequency === "monthly") {
              monthlyAmount = rt.amount * 1;
            }
            return sum + monthlyAmount;
          }
          return sum;
        }, 0);

      // Total monthly amounts including recurring
      const totalIncome = actualIncome + recurringIncome;
      const totalExpenses = actualExpenses + recurringExpenses;

      // Find net worth for this month
      const monthNetWorthEntry = netWorthEntries.find((entry) => {
        const entryDate = new Date(entry.date);
        return (
          entryDate.getMonth() === date.getMonth() &&
          entryDate.getFullYear() === date.getFullYear()
        );
      });

      let netWorth = monthNetWorthEntry ? monthNetWorthEntry.netWorth : 0;

      // If no net worth entry exists, calculate current net worth for current month
      if (!monthNetWorthEntry && i === 0) {
        // Current month
        const totalAssets = assets.reduce(
          (sum: number, asset: any) => sum + asset.balance,
          0
        );
        const totalDebts = debts.reduce(
          (sum: number, debt: any) => sum + debt.balance,
          0
        );
        netWorth = totalAssets - totalDebts;
      }

      last6Months.push({
        month: date.toLocaleDateString("en-US", { month: "short" }),
        income: totalIncome,
        expenses: totalExpenses,
        netWorth,
        // Additional breakdown for insights
        actualIncome,
        actualExpenses,
        recurringIncome,
        recurringExpenses,
      });
    }

    // Debug logging to verify recurring transaction calculations

    return last6Months;
  };

  // Load budget streak data
  // Function to check if user has budget categories with limits
  const checkBudgetCategories = async () => {
    if (!user?.uid) return;

    try {
      const categories = await getUserBudgetCategories(user.uid);
      const hasCategoriesWithLimits = categories.some(
        (category: any) => category.monthlyLimit > 0
      );
      setHasBudgetCategories(hasCategoriesWithLimits);
    } catch (error) {
      console.error("Error checking budget categories:", error);
      setHasBudgetCategories(false);
    }
  };

  // Load achievements and hidden state
  const loadAchievements = async () => {
    if (!user?.uid) return;

    try {
      // Clean up irrelevant achievements first
      await cleanupIrrelevantAchievements(user.uid);

      // Load achievement progress
      const progress = await getAchievementProgress(user.uid);
      setAchievements(progress.achievements);

      // Load unseen achievements
      const unseen = await getUnseenAchievements(user.uid);
      setUnseenAchievements(unseen);

      // Load hidden state
      const hiddenState = await AsyncStorage.getItem(
        `achievementsHidden_${user.uid}`
      );
      if (hiddenState !== null) {
        setAchievementsHidden(JSON.parse(hiddenState));
      }
    } catch (error) {
      console.error("Error loading achievements:", error);
    }
  };

  // Save achievements hidden state
  const saveAchievementsHiddenState = async (hidden: boolean) => {
    if (!user?.uid) return;

    try {
      await AsyncStorage.setItem(
        `achievementsHidden_${user.uid}`,
        JSON.stringify(hidden)
      );
    } catch (error) {
      console.error("Error saving achievements hidden state:", error);
    }
  };

  // Check if achievements should be shown
  const shouldShowAchievements = () => {
    if (!hasBudgetCategories || achievements.length === 0) return false;

    // Always show if there are unseen achievements
    if (unseenAchievements.length > 0) return true;

    // Show if not hidden by user
    return !achievementsHidden;
  };

  // Mark achievements as seen
  const markAchievementsAsSeen = async () => {
    if (!user?.uid || unseenAchievements.length === 0) return;

    try {
      const achievementIds = unseenAchievements.map((a) => a.id);
      await markAchievementsAsSeenService(user.uid, achievementIds);

      // Update local state
      const unseen = await getUnseenAchievements(user.uid);
      setUnseenAchievements(unseen);
    } catch (error) {
      console.error("Error marking achievements as seen:", error);
    }
  };

  const loadBudgetStreakData = async () => {
    if (!user?.uid) return;

    try {
      // Check for month transitions and process achievements
      // This will only process completed months, not the current month
      await checkMonthTransitions(user.uid);

      // Initialize month tracking for new users
      await initializeMonthTracking(user.uid);

      // Get current streak data
      const streak = await getUserBudgetStreak(user.uid);
      setBudgetStreak(streak);

      // Calculate current month's budget result
      const currentDate = new Date();
      const monthlyResult = await calculateMonthlyBudgetResult(
        user.uid,
        currentDate.getFullYear(),
        currentDate.getMonth()
      );
      setMonthlyBudgetResult(monthlyResult);

      // Update streak for current month (no achievements awarded)
      await updateBudgetStreak(user.uid, monthlyResult);

      // Reload streak data after update
      const updatedStreak = await getUserBudgetStreak(user.uid);
      setBudgetStreak(updatedStreak);

      // Reload achievements to check for new ones
      await loadAchievements();

      // Auto-show achievements card if there are unseen achievements
      if (unseenAchievements.length > 0 && achievementsHidden) {
        setAchievementsHidden(false);
        await saveAchievementsHiddenState(false);
      }
    } catch (error) {
      console.error("Error loading budget streak data:", error);
    }
  };

  // Load trend data
  React.useEffect(() => {
    const loadTrendData = async () => {
      if (user) {
        // Initialize net worth if no entries exist
        const netWorthEntries = await getUserNetWorthEntries(user.uid);
        if (netWorthEntries.length === 0) {
          await updateNetWorthFromAssetsAndDebts(user.uid);
        }

        const data = await getTrendData();
        setTrendData(data);
      }
    };
    loadTrendData();
  }, [user, transactions, recurringTransactions, netWorth, assets, debts]); // Added assets and debts dependencies

  // Force refresh when assets or debts change (immediate update)
  React.useEffect(() => {
    if (user && (assets.length > 0 || debts.length > 0)) {
      const forceRefresh = async () => {
        // Force refreshing chart data due to assets/debts change
        const data = await getTrendData();
        setTrendData(data);
      };
      forceRefresh();
    }
  }, [assets, debts, user]);

  // Prepare data for line chart - Make it reactive to source data
  const chartData = React.useMemo(() => {
    if (!user || !assets || !debts || !transactions || !recurringTransactions)
      return [];

    // Use the existing trendData state which is already calculated
    return trendData.map((month) => ({
      x: month.month,
      y: month.income,
    }));
  }, [trendData, user, assets, debts, transactions, recurringTransactions]);

  const expensesData = React.useMemo(() => {
    if (!user || !assets || !debts || !transactions || !recurringTransactions)
      return [];

    // Use the existing trendData state which is already calculated
    return trendData.map((month) => ({
      x: month.month,
      y: month.expenses,
    }));
  }, [trendData, user, assets, debts, transactions, recurringTransactions]);

  const netWorthData = React.useMemo(() => {
    if (!user || !assets || !debts || !transactions || !recurringTransactions)
      return [];

    // Use the existing trendData state which is already calculated
    return trendData.map((month) => ({
      x: month.month,
      y: month.netWorth,
    }));
  }, [trendData, user, assets, debts, transactions, recurringTransactions]);

  // formatCurrency is now provided by useCurrency() hook

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollBegin={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {/* Header */}
        <StandardHeader
          title={t("dashboard.title")}
          subtitle={getWelcomeMessage()}
          showBackButton={false}
          rightComponent={
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate("FinancialRisk")}
                style={{
                  backgroundColor: colors.error,
                  padding: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: colors.shadow,
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={20}
                  color={colors.buttonText}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate("SharedFinance")}
                style={{
                  backgroundColor: "#8b5cf6",
                  padding: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: colors.shadow,
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}
                activeOpacity={0.8}
              >
                <View style={{ position: "relative" }}>
                  <Ionicons name="people" size={20} color={colors.buttonText} />
                  {pendingInvitations > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        top: -20,
                        right: -18,
                        backgroundColor: colors.error,
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        justifyContent: "center",
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: colors.background,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.buttonText,
                          fontSize: 12,
                          fontWeight: "bold",
                        }}
                      >
                        {pendingInvitations > 99 ? "99+" : pendingInvitations}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          }
        />

        {/* Recent Achievements */}
        {shouldShowAchievements() && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              shadowColor: colors.shadow,
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="trophy"
                  size={24}
                  color={colors.primary}
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  Recent Achievements
                </Text>
              </View>

              <TouchableOpacity
                onPress={async () => {
                  setAchievementsHidden(true);
                  await saveAchievementsHiddenState(true);
                  await markAchievementsAsSeen();
                }}
                style={{
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: colors.surfaceSecondary,
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {achievements.length > 0 ? (
              (() => {
                const achievementsToShow = showAllAchievements
                  ? achievements
                  : achievements.slice(-3);

                return achievementsToShow.map(
                  (achievement: Achievement, index: number) => {
                    const isUnseen = unseenAchievements.some(
                      (u) => u.id === achievement.id
                    );
                    return (
                      <View
                        key={achievement.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 8,
                          borderBottomWidth:
                            index < achievementsToShow.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                          backgroundColor: isUnseen
                            ? colors.primary + "10"
                            : "transparent",
                          borderRadius: isUnseen ? 8 : 0,
                          paddingHorizontal: isUnseen ? 8 : 0,
                        }}
                      >
                        <Text style={{ fontSize: 24, marginRight: 12 }}>
                          {achievement.icon}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "600",
                              color: colors.text,
                            }}
                          >
                            {achievement.title}
                            {isUnseen && (
                              <Text
                                style={{ color: colors.primary, fontSize: 12 }}
                              >
                                {" "}
                                NEW
                              </Text>
                            )}
                          </Text>
                          <Text
                            style={{
                              fontSize: 14,
                              color: colors.textSecondary,
                            }}
                          >
                            {achievement.description}
                          </Text>
                        </View>
                      </View>
                    );
                  }
                );
              })()
            ) : (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  No achievements yet. Stay on budget to earn your first
                  achievement! 🎯
                </Text>
              </View>
            )}

            {/* Show All / Show Less Button */}
            {achievements.length > 3 && (
              <TouchableOpacity
                onPress={() => setShowAllAchievements(!showAllAchievements)}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  alignItems: "center",
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {showAllAchievements
                    ? `Show Less (${achievements.length - 3} hidden)`
                    : `Show All (${achievements.length - 3} more)`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Monthly Overview - Large Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            shadowColor: colors.shadow,
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                backgroundColor: colors.surfaceSecondary,
                padding: 12,
                borderRadius: 14,
                marginRight: 16,
              }}
            >
              <Ionicons name="calendar" size={22} color={colors.primary} />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                  letterSpacing: -0.3,
                }}
              >
                {t("dashboard.budget_snapshot")}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginTop: 2,
                  fontWeight: "500",
                }}
              >
                {new Date().toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>

          <View style={{ gap: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  padding: 12,
                  borderRadius: 12,
                  marginRight: 16,
                  width: 50,
                  height: 50,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="trending-up" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {t("dashboard.monthly_income")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      showInfoModalHandler(
                        t("dashboard.income_breakdown"),
                        t("dashboard.income_breakdown_description"),
                        "trending-up",
                        colors.success
                      );
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: colors.success,
                    letterSpacing: -0.3,
                  }}
                >
                  {formatCurrency(monthlyIncome)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  padding: 12,
                  borderRadius: 12,
                  marginRight: 16,
                  width: 50,
                  height: 50,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="trending-down" size={20} color={colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {t("dashboard.monthly_expenses")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      showInfoModalHandler(
                        t("dashboard.expenses_breakdown"),
                        t("dashboard.expenses_breakdown_description"),
                        "trending-down",
                        colors.error
                      );
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: colors.error,
                    letterSpacing: -0.3,
                  }}
                >
                  {formatCurrency(monthlyExpenses)}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  padding: 12,
                  borderRadius: 12,
                  marginRight: 16,
                  width: 50,
                  height: 50,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name={availableAmount >= 0 ? "wallet" : "alert-circle"}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {t("dashboard.available_amount")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      showInfoModalHandler(
                        t("dashboard.available_amount_calculation"),
                        getAvailableAmountModalContent(),
                        "calculator",
                        availableAmount >= 0 ? colors.warning : colors.error
                      );
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: availableAmount >= 0 ? colors.warning : colors.error,
                    letterSpacing: -0.3,
                  }}
                >
                  {formatCurrency(availableAmount)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Balance Sheet Card */}

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            shadowColor: colors.shadow,
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 20,
              color: colors.text,
            }}
          >
            {t("dashboard.balance_sheet_snapshot")}
          </Text>

          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 36,
                fontWeight: "800",
                color: netWorth >= 0 ? colors.success : colors.error,
                marginBottom: 8,
              }}
            >
              {formatCurrency(netWorth)}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
              {netWorth >= 0
                ? t("dashboard.positive_net_worth")
                : t("dashboard.negative_net_worth")}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginBottom: 4,
                }}
              >
                Total {t("dashboard.total_assets")}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.success,
                }}
              >
                {formatCurrency(totalAssets)}
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginBottom: 4,
                }}
              >
                Total {t("dashboard.total_liabilities")}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.error,
                }}
              >
                {formatCurrency(totalDebts)}
              </Text>
            </View>
          </View>
        </View>

        {/* Smart Insights */}
        {insights.length > 0 ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              marginBottom: 20,
              shadowColor: colors.shadow,
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.warningLight,
                  padding: 8,
                  borderRadius: 10,
                  marginRight: 12,
                }}
              >
                <Ionicons name="bulb" size={20} color={colors.warning} />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  marginBottom: 20,
                  color: colors.text,
                }}
              >
                {t("dashboard.smart_insights")}
              </Text>
            </View>

            {insights.map((insight, index) => (
              <View
                key={`insight-${insight.id}-${index}`}
                style={{ marginBottom: 12 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Ionicons
                    name={insight.icon as any}
                    size={16}
                    color={
                      insight.type === "success"
                        ? colors.success
                        : insight.type === "warning"
                        ? colors.error
                        : colors.primary
                    }
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.text,
                      flex: 1,
                    }}
                  >
                    {insight.title}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleDismissInsight(insight.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{
                      padding: 4,
                      borderRadius: 12,
                      backgroundColor: colors.surfaceSecondary,
                    }}
                  >
                    <Ionicons
                      name="close"
                      size={14}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    marginLeft: 24,
                    marginBottom: 8,
                  }}
                >
                  {insight.message}
                </Text>

                {/* Action Button for Insights */}
                {insight.id === "build-emergency-fund" && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Goals")}
                    style={{
                      marginLeft: 24,
                      backgroundColor: colors.primary + "15",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.primary,
                        fontWeight: "600",
                      }}
                    >
                      Set Emergency Fund Goal →
                    </Text>
                  </TouchableOpacity>
                )}

                {insight.id === "spending-more-than-income" && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Budget")}
                    style={{
                      marginLeft: 24,
                      backgroundColor: colors.error + "15",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.error,
                        fontWeight: "600",
                      }}
                    >
                      Review Budget →
                    </Text>
                  </TouchableOpacity>
                )}

                {insight.id === "high-debt-ratio" && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Assets/Debts")}
                    style={{
                      marginLeft: 24,
                      backgroundColor: colors.warning + "15",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      alignSelf: "flex-start",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.warning,
                        fontWeight: "600",
                      }}
                    >
                      Manage Debts →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          /* No Insights - Show Helpful Tip */
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              marginBottom: 20,
              shadowColor: colors.shadow,
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.success + "15",
                  padding: 8,
                  borderRadius: 10,
                  marginRight: 12,
                }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.success}
                />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                You're Doing Great! 🎉
              </Text>
            </View>

            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                lineHeight: 20,
                marginBottom: 16,
              }}
            >
              Your finances look healthy! Keep tracking your expenses and
              working toward your goals.
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate("AIFinancialAdvisor")}
              style={{
                backgroundColor: colors.primary + "15",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                alignSelf: "flex-start",
              }}
            >
              <Ionicons
                name="chatbubble"
                size={16}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: colors.primary,
                  fontWeight: "600",
                }}
              >
                Get Personalized Advice
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 6-Month Trend - Line Chart */}
        <HelpfulTooltip
          tooltipId="balance-sheet"
          title={t("dashboard.your_net_worth")}
          description={t("dashboard.net_worth_description")}
          position="top"
          delay={2500}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              marginBottom: 20,
              shadowColor: colors.shadow,
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 20,
                color: colors.text,
              }}
            >
              {t("dashboard.six_month_trend")}
            </Text>

            <CustomTrendChart
              key={`chart-${trendData.length}-${JSON.stringify(
                trendData.map((m) => m.netWorth)
              )}`}
              incomeData={chartData}
              expensesData={expensesData}
              netWorthData={netWorthData}
              height={250}
            />

            {/* Chart Legend and Notes */}
            <View style={{ marginTop: 16, paddingHorizontal: 8 }}>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 16,
                }}
              >
                {t("dashboard.chart_description")}
              </Text>
            </View>
          </View>
        </HelpfulTooltip>
      </ScrollView>
      <FloatingAIChatbot hideOnScroll={true} isScrolling={isScrolling} />

      {/* Info Modal */}
      <Modal
        visible={showInfoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxWidth: 400,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: modalContent?.color + "15",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <Ionicons
                  name={modalContent?.icon as any}
                  size={24}
                  color={modalContent?.color}
                />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                  flex: 1,
                }}
              >
                {modalContent?.title}
              </Text>
            </View>

            {/* Content */}
            <View style={{ marginBottom: 24 }}>
              {modalContent?.content.split("\n").map((line, index) => {
                // Check if line is a section header (all caps)
                const isSectionHeader =
                  line === line.toUpperCase() &&
                  line.length > 0 &&
                  !line.includes("─");
                // Check if line is a separator
                const isSeparator = line.includes("─");
                // Check if line is a formula
                const isFormula =
                  line.includes("Net Income -") || line.includes("FORMULA");

                return (
                  <Text
                    key={index}
                    style={{
                      fontSize: isSectionHeader ? 14 : isFormula ? 13 : 15,
                      color: isSectionHeader
                        ? colors.primary
                        : isFormula
                        ? colors.textSecondary
                        : colors.text,
                      lineHeight: isSectionHeader ? 20 : 22,
                      marginBottom: isSectionHeader ? 8 : isSeparator ? 4 : 2,
                      fontWeight: isSectionHeader
                        ? "700"
                        : isFormula
                        ? "500"
                        : "400",
                      fontFamily: isFormula ? "monospace" : undefined,
                      textAlign: isSeparator ? "center" : "left",
                    }}
                  >
                    {line}
                  </Text>
                );
              })}
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setShowInfoModal(false)}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "white",
                }}
              >
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
