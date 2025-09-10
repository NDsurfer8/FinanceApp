import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { useAuth } from "../hooks/useAuth";
import { useZeroLoading } from "../hooks/useZeroLoading";
import { useData } from "../contexts/DataContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSelectedMonth } from "../contexts/SelectedMonthContext";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { StandardHeader } from "../components/StandardHeader";
import { AutoBudgetImporter } from "../components/AutoBudgetImporter";
import { BudgetOverviewCard } from "../components/BudgetOverviewCard";
import { TransactionListCard } from "../components/TransactionListCard";
import { BudgetSettingsModal } from "../components/BudgetSettingsModal";
import { HelpfulTooltip } from "../components/HelpfulTooltip";
import {
  saveBudgetSettings,
  updateBudgetSettings,
  getUserBudgetCategories,
} from "../services/userData";
import { getProjectedTransactionsForMonth } from "../services/transactionService";
import { timestampToDateString } from "../utils/dateUtils";
import { FloatingAIChatbot } from "../components/FloatingAIChatbot";
import { useScrollDetection } from "../hooks/useScrollDetection";

interface BudgetScreenProps {
  navigation: any;
}

export const BudgetScreen: React.FC<BudgetScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const {
    transactions,
    budgetSettings,
    goals,
    recurringTransactions,
    updateDataOptimistically,
    refreshData,
  } = useZeroLoading();
  const { refreshBudgetSettings } = useData();
  const { isScrolling, handleScrollBegin, handleScrollEnd } =
    useScrollDetection();

  // Bank data from global context
  const {
    bankTransactions,
    isBankConnected,
    bankConnectionError,
    setBankConnectionError,
    refreshBankData,
  } = useData();

  const { selectedMonth, setSelectedMonth } = useSelectedMonth();

  const [savingsPercentage, setSavingsPercentage] = useState("20");
  const [debtPayoffPercentage, setDebtPayoffPercentage] = useState("5");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [projectedTransactions, setProjectedTransactions] = useState<any[]>([]);
  const [isFutureMonth, setIsFutureMonth] = useState(false);

  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(
    new Set()
  );
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const [microFeedback, setMicroFeedback] = useState<{
    message: string;
    type: "income" | "expense";
    amount: number;
  } | null>(null);
  const [isIncomeCollapsed, setIsIncomeCollapsed] = useState(false);
  const [isExpensesCollapsed, setIsExpensesCollapsed] = useState(false);
  const [showAutoImporter, setShowAutoImporter] = useState(false);
  const [showBudgetSettingsModal, setShowBudgetSettingsModal] = useState(false);
  const [importSuccess, setImportSuccess] = useState<{
    count: number;
    message: string;
  } | null>(null);
  const [budgetCategories, setBudgetCategories] = useState<any[]>([]);
  const [seenOverBudgetCategories, setSeenOverBudgetCategories] = useState<
    Map<string, Set<string>>
  >(new Map());
  const monthPickerScrollRef = useRef<ScrollView>(null);
  const lastMonthRef = useRef<string>("");
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Load budget categories and check for over-budget items
  const loadBudgetCategories = async () => {
    if (user?.uid) {
      try {
        const categories = await getUserBudgetCategories(user.uid);
        setBudgetCategories(categories);
      } catch (error) {
        console.error("Error loading budget categories:", error);
      }
    }
  };

  // Check if any categories are over their monthly limits
  const hasOverBudgetItems = () => {
    if (budgetCategories.length === 0) return false;

    const targetMonth = selectedMonth.getMonth();
    const targetYear = selectedMonth.getFullYear();
    const monthKey = `${targetMonth}-${targetYear}`;

    return budgetCategories.some((category) => {
      // Get actual spending for this category (transactions + recurring)
      const categoryTransactions = transactions.filter((t) => {
        const transactionDate = new Date(t.date);
        return (
          transactionDate.getMonth() === targetMonth &&
          transactionDate.getFullYear() === targetYear &&
          t.type === "expense" &&
          t.category === category.name
        );
      });

      const categoryRecurring = recurringTransactions.filter((rt) => {
        return (
          rt.type === "expense" && rt.isActive && rt.category === category.name
        );
      });

      const actualSpending =
        categoryTransactions.reduce((sum, t) => sum + t.amount, 0) +
        categoryRecurring.reduce((sum, rt) => {
          let monthlyAmount = rt.amount;
          if (rt.frequency === "weekly") monthlyAmount = rt.amount * 4;
          else if (rt.frequency === "biweekly") monthlyAmount = rt.amount * 2;
          return sum + monthlyAmount;
        }, 0);

      // Only show badge if category is over budget AND user hasn't seen it yet for this month
      const monthSeenCategories =
        seenOverBudgetCategories.get(monthKey) || new Set();
      return (
        actualSpending > category.monthlyLimit &&
        !monthSeenCategories.has(category.name)
      );
    });
  };

  // Helper function to check if a bank transaction already exists in budget (same as AutoBudgetImporter)
  const isTransactionAlreadyImported = (bankTransaction: any): boolean => {
    const bankDate = new Date(bankTransaction.date);
    const bankAmount = Math.abs(bankTransaction.amount);
    const bankName = bankTransaction.name?.toLowerCase() || "";

    return transactions.some((budgetTransaction: any) => {
      const budgetDate = new Date(budgetTransaction.date);
      const budgetAmount = Math.abs(budgetTransaction.amount);
      const budgetName = budgetTransaction.description?.toLowerCase() || "";

      // Check if dates are within 1 day of each other (to account for timezone differences)
      const dateDiff = Math.abs(bankDate.getTime() - budgetDate.getTime());
      const oneDayInMs = 24 * 60 * 60 * 1000;

      // Check if amounts match (within $0.01 tolerance for rounding differences)
      const amountDiff = Math.abs(bankAmount - budgetAmount);

      // Check if names are similar (basic fuzzy matching)
      const nameSimilarity =
        bankName.includes(budgetName) || budgetName.includes(bankName);

      return dateDiff <= oneDayInMs && amountDiff <= 0.01 && nameSimilarity;
    });
  };

  // Calculate available transactions for import (excluding already imported ones)
  const getAvailableTransactionsCount = () => {
    if (!isBankConnected || !bankTransactions.length) return 0;

    const currentMonthTransactions = bankTransactions.filter(
      (transaction: any) => {
        const transactionDate = new Date(transaction.date);
        return (
          transactionDate.getMonth() === selectedMonth.getMonth() &&
          transactionDate.getFullYear() === selectedMonth.getFullYear()
        );
      }
    );

    // Filter out transactions that are already imported using the same logic as AutoBudgetImporter
    return currentMonthTransactions.filter(
      (transaction: any) => !isTransactionAlreadyImported(transaction)
    ).length;
  };

  // Filter transactions for the selected month
  const selectedMonthTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.date);
    return (
      transactionDate.getMonth() === selectedMonth.getMonth() &&
      transactionDate.getFullYear() === selectedMonth.getFullYear()
    );
  });

  // Combine actual transactions with projected recurring transactions for the selected month
  // The transactionService already handles duplicates, so we just filter by type
  const uniqueProjectedTransactions = isFutureMonth
    ? projectedTransactions
    : [];

  const allMonthTransactions = [
    ...selectedMonthTransactions,
    ...uniqueProjectedTransactions,
  ];

  // Debug logging for projected transactions
  if (isFutureMonth && projectedTransactions.length > 0) {
    // Projected transactions available
  }

  const incomeTransactions = allMonthTransactions.filter(
    (t) => t.type === "income"
  );
  const expenseTransactions = allMonthTransactions.filter(
    (t) => t.type === "expense"
  );

  // Calculate totals including projected transactions
  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenseTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );
  const netIncome = totalIncome - totalExpenses;

  // Calculate budget allocations
  const savingsAmount = (totalIncome * parseFloat(savingsPercentage)) / 100;
  const debtPayoffAmount =
    (totalIncome * parseFloat(debtPayoffPercentage)) / 100;
  const goalsAmount = goals.reduce(
    (sum, goal) => sum + goal.monthlyContribution,
    0
  );
  const discretionaryIncome =
    netIncome - savingsAmount - debtPayoffAmount - goalsAmount;
  const remainingBalance = discretionaryIncome;

  // Smart Insights generation
  const getInsights = () => {
    const insights = [];

    if (totalIncome > 0) {
      // Calculate discretionary savings rate (what's actually available after all allocations)
      const discretionarySavingsRate = (remainingBalance / totalIncome) * 100;
      if (discretionarySavingsRate >= 20) {
        insights.push({
          id: "excellent-savings-rate",
          type: "success",
          icon: "trending-up",
          title: t("budget.excellent_discretionary_savings"),
          message: t("budget.excellent_discretionary_savings_message", {
            rate: discretionarySavingsRate.toFixed(1),
          }),
        });
      } else if (discretionarySavingsRate < 0) {
        insights.push({
          id: "spending-more-than-income",
          type: "warning",
          icon: "alert-circle",
          title: t("budget.over_budget"),
          message: t("budget.over_budget_message"),
        });
      }
    }

    if (totalExpenses > 0 && totalIncome > 0) {
      const expenseToIncomeRatio = (totalExpenses / totalIncome) * 100;
      if (expenseToIncomeRatio > 90) {
        insights.push({
          id: "high-expense-ratio",
          type: "warning",
          icon: "trending-down",
          title: t("budget.high_expense_ratio"),
          message: t("budget.high_expense_ratio_message", {
            ratio: expenseToIncomeRatio.toFixed(1),
          }),
        });
      }
    }

    if (allMonthTransactions.length >= 10) {
      insights.push({
        id: "active-month",
        type: "info",
        icon: "analytics",
        title: t("budget.active_month"),
        message: t("budget.active_month_message", {
          count: allMonthTransactions.length,
        }),
      });
    }

    // Savings percentage insight
    if (parseFloat(savingsPercentage) >= 25) {
      insights.push({
        id: "high-savings-rate",
        type: "success",
        icon: "trending-up",
        title: t("budget.high_savings_rate"),
        message: t("budget.high_savings_rate_message", {
          percentage: savingsPercentage,
        }),
      });
    } else if (parseFloat(savingsPercentage) < 10) {
      insights.push({
        id: "low-savings-rate",
        type: "warning",
        icon: "trending-down",
        title: t("budget.low_savings_rate"),
        message: t("budget.low_savings_rate_message", {
          percentage: savingsPercentage,
        }),
      });
    }

    return insights;
  };

  const insights = React.useMemo(
    () => getInsights().filter((insight) => !dismissedInsights.has(insight.id)),
    [
      totalIncome,
      totalExpenses,
      remainingBalance,
      allMonthTransactions.length,
      savingsPercentage,
      dismissedInsights,
    ]
  );

  const handleDismissInsight = (insightId: string) => {
    setDismissedInsights((prev) => new Set([...prev, insightId]));
  };

  // Check if selected month is in the future
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  const selectedMonthStart = new Date(selectedMonth);
  selectedMonthStart.setDate(1);
  selectedMonthStart.setHours(0, 0, 0, 0);

  const checkIfFutureMonth = () => {
    return selectedMonthStart >= currentMonth;
  };

  // Load projected transactions for future months
  useEffect(() => {
    const loadProjectedTransactions = async () => {
      if (checkIfFutureMonth() && user) {
        setIsFutureMonth(true);
        try {
          const projected = await getProjectedTransactionsForMonth(
            user.uid,
            selectedMonth
          );
          setProjectedTransactions(projected.projected);
        } catch (error) {
          console.error("Error loading projected transactions:", error);
        }
      } else {
        setIsFutureMonth(false);
        setProjectedTransactions([]);
      }
    };

    loadProjectedTransactions();
  }, [selectedMonth, recurringTransactions, user]);

  // Recalculate budget when month changes or projected transactions update
  useEffect(() => {
    // This effect will trigger a re-render and recalculate budget values
    // when selectedMonth or projectedTransactions change
  }, [selectedMonth, projectedTransactions]);

  // Set budget settings from saved data
  useEffect(() => {
    if (user && budgetSettings) {
      setSavingsPercentage(budgetSettings.savingsPercentage.toString());
      setDebtPayoffPercentage(budgetSettings.debtPayoffPercentage.toString());
    }
  }, [user, budgetSettings]);

  // Track changes to enable/disable save button
  useEffect(() => {
    if (budgetSettings) {
      const currentSavings = parseFloat(savingsPercentage) || 0;
      const currentDebt = parseFloat(debtPayoffPercentage) || 0;
      const savedSavings = budgetSettings.savingsPercentage;
      const savedDebt = budgetSettings.debtPayoffPercentage;

      const hasChanges =
        currentSavings !== savedSavings || currentDebt !== savedDebt;
      setHasUnsavedChanges(hasChanges);
    } else {
      const currentSavings = parseFloat(savingsPercentage) || 0;
      const currentDebt = parseFloat(debtPayoffPercentage) || 0;
      const hasChanges = currentSavings !== 20 || currentDebt !== 5;
      setHasUnsavedChanges(hasChanges);
    }
  }, [savingsPercentage, debtPayoffPercentage, budgetSettings]);

  // Load budget categories when component mounts
  useEffect(() => {
    if (user?.uid) {
      loadBudgetCategories();
    }
  }, [user?.uid]);

  // Reset seen over-budget categories monthly
  useFocusEffect(
    React.useCallback(() => {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const currentMonthKey = `${currentMonth}-${currentYear}`;

      // Check if we need to reset for a new month
      if (lastMonthRef.current !== currentMonthKey) {
        // Clear the old month's seen categories but keep the Map structure
        setSeenOverBudgetCategories(new Map());
        lastMonthRef.current = currentMonthKey;
      }
    }, [])
  );

  // Refresh bank data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isBankConnected && user?.uid) {
        console.log("🔄 BudgetScreen: Screen focused, refreshing bank data");
        refreshBankData(false); // Use cache if available, but refresh if stale
      }
    }, [isBankConnected, user?.uid, refreshBankData])
  );

  // Save budget settings
  const handleSaveBudgetSettings = async () => {
    if (!user) return;

    try {
      const newSettings = {
        savingsPercentage: parseFloat(savingsPercentage),
        debtPayoffPercentage: parseFloat(debtPayoffPercentage),
        userId: user.uid,
        updatedAt: Date.now(),
      };

      if (budgetSettings?.id) {
        await updateBudgetSettings({
          ...newSettings,
          id: budgetSettings.id,
        });
      } else {
        await saveBudgetSettings(newSettings);
      }

      // Refresh budget settings in the DataContext to update dashboard
      await refreshBudgetSettings();

      setHasUnsavedChanges(false);
      Alert.alert(t("common.success"), t("budget.budget_settings_saved"));
    } catch (error) {
      console.error("Error saving budget settings:", error);
      Alert.alert(t("common.error"), t("budget.budget_settings_failed"));
    }
  };

  // Utility functions
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: number) => {
    return timestampToDateString(date);
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  };

  const formatMonthShort = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  };

  const formatMonthSmart = (date: Date, maxLength: number = 15) => {
    const longFormat = formatMonth(date);
    if (longFormat.length <= maxLength) {
      return longFormat;
    }

    // Try short format
    const shortFormat = formatMonthShort(date);
    if (shortFormat.length <= maxLength) {
      return shortFormat;
    }

    // If still too long, use just month and year without spaces
    const month = date.toLocaleDateString(undefined, { month: "short" });
    const year = date.getFullYear().toString();
    const compactFormat = `${month} ${year}`;

    if (compactFormat.length <= maxLength) {
      return compactFormat;
    }

    // Last resort: use just month abbreviation
    return month;
  };

  const getMonthStatus = (date: Date) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const targetYear = date.getFullYear();
    const targetMonth = date.getMonth();

    if (
      targetYear < currentYear ||
      (targetYear === currentYear && targetMonth < currentMonth)
    ) {
      return "past";
    } else if (targetYear === currentYear && targetMonth === currentMonth) {
      return "current";
    } else {
      return "future";
    }
  };

  const getMonthColor = (date: Date) => {
    const status = getMonthStatus(date);
    switch (status) {
      case "past":
        return "#9CA3AF"; // Gray for past months
      case "current":
        return "#f97316"; // Orange for current month
      case "future":
        return "#3B82F6"; // Blue for future months
      default:
        return "#f97316";
    }
  };

  const isRecurringTransaction = (transaction: any) => {
    return (
      transaction.recurringTransactionId ||
      transaction.id?.startsWith("projected-")
    );
  };

  // Navigation handlers
  const handleAddIncome = () => {
    navigation.navigate("AddTransaction", {
      type: "income",
      selectedMonth: selectedMonth.getTime(),
    });
  };

  const handleAddExpense = () => {
    navigation.navigate("AddTransaction", {
      type: "expense",
      selectedMonth: selectedMonth.getTime(),
    });
  };

  // Month navigation
  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(selectedMonth);
    if (direction === "prev") {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMonth(newMonth);
  };

  const handleMonthSelect = (month: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
    setSelectedMonth(month);
    setShowMonthPicker(false);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowMonthPicker(true);
  };

  // Gesture handling
  const onGestureEvent = (event: any) => {
    const { translationX, state } = event.nativeEvent;
    if (state === State.END) {
      const swipeThreshold = 50;
      if (translationX > swipeThreshold) {
        navigateMonth("prev");
      } else if (translationX < -swipeThreshold) {
        navigateMonth("next");
      }
    }
  };

  // Generate available months for picker
  const generateAvailableMonths = () => {
    const months = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Generate last 12 months
    for (let i = 12; i >= 1; i--) {
      const targetMonth = currentMonth - i;
      const targetYear = currentYear + Math.floor(targetMonth / 12);
      const adjustedMonth = ((targetMonth % 12) + 12) % 12;
      const date = new Date(targetYear, adjustedMonth, 1);
      months.push(date);
    }

    // Add current month
    months.push(new Date(currentYear, currentMonth, 1));

    // Generate next 12 months
    for (let i = 1; i <= 12; i++) {
      const targetMonth = currentMonth + i;
      const targetYear = currentYear + Math.floor(targetMonth / 12);
      const adjustedMonth = targetMonth % 12;
      const date = new Date(targetYear, adjustedMonth, 1);
      months.push(date);
    }

    months.sort((a, b) => a.getTime() - b.getTime());
    return months;
  };

  // Scroll to current month when modal opens
  const scrollToCurrentMonth = () => {
    const months = generateAvailableMonths();
    const currentMonthIndex = months.findIndex(
      (month) =>
        month.getMonth() === new Date().getMonth() &&
        month.getFullYear() === new Date().getFullYear()
    );

    if (currentMonthIndex !== -1 && monthPickerScrollRef.current) {
      // Scroll to one position before current month for better visibility
      monthPickerScrollRef.current.scrollTo({
        y: Math.max(0, (currentMonthIndex - 1) * 60), // One position before current month
        animated: true,
      });
    }
  };

  // Scroll to current month when modal opens
  useEffect(() => {
    if (showMonthPicker) {
      // Use setTimeout to ensure the modal is fully rendered
      setTimeout(() => {
        scrollToCurrentMonth();
      }, 100);
    }
  }, [showMonthPicker]);

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
          title={t("budget.title")}
          subtitle={t("budget.monthly_planning")}
          showBackButton={false}
          rightComponent={
            <PanGestureHandler onGestureEvent={onGestureEvent}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  minWidth: 210,
                  maxWidth: 240,
                  justifyContent: "space-between",
                }}
              >
                <TouchableOpacity
                  onPress={() => navigateMonth("prev")}
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                >
                  <Ionicons
                    name="chevron-back"
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowMonthPicker(true)}
                  onLongPress={handleLongPress}
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 6,
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    marginHorizontal: 2,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: "500",
                      color: getMonthColor(selectedMonth),
                      textAlign: "center",
                    }}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.7}
                  >
                    {formatMonthSmart(selectedMonth, 10)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigateMonth("next")}
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </PanGestureHandler>
          }
        />

        {/* Bank Connection Error Banner */}
        {bankConnectionError && (
          <View
            style={{
              backgroundColor: colors.errorLight,
              borderColor: colors.error,
              borderWidth: 1,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <Ionicons
                name="warning"
                size={20}
                color={colors.error}
                style={{ marginRight: 12 }}
              />
              <Text
                style={{
                  color: colors.error,
                  fontSize: 14,
                  fontWeight: "500",
                  flex: 1,
                }}
              >
                {bankConnectionError}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setBankConnectionError(null);
                refreshBankData(true);
              }}
              style={{
                backgroundColor: colors.error,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {t("budget.reconnect")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Micro Feedback */}
        {microFeedback && (
          <View
            style={{
              backgroundColor:
                microFeedback.type === "income"
                  ? colors.successLight
                  : colors.errorLight,
              borderColor:
                microFeedback.type === "income" ? colors.success : colors.error,
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <Ionicons
                name={
                  microFeedback.type === "income"
                    ? "trending-up"
                    : "trending-down"
                }
                size={16}
                color={
                  microFeedback.type === "income"
                    ? colors.success
                    : colors.error
                }
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color:
                    microFeedback.type === "income"
                      ? colors.success
                      : colors.error,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {microFeedback.message}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setMicroFeedback(null)}
              style={{ padding: 4 }}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Import Success Message */}
        {importSuccess && (
          <View
            style={{
              backgroundColor: colors.successLight,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: colors.success,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.success}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color: colors.success,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                {importSuccess.message}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setImportSuccess(null)}
              style={{ padding: 4 }}
            >
              <Ionicons name="close" size={16} color={colors.success} />
            </TouchableOpacity>
          </View>
        )}

        {/* Budget Overview Card */}
        <BudgetOverviewCard
          netIncome={netIncome}
          totalIncome={totalIncome}
          totalExpenses={totalExpenses}
          savingsAmount={savingsAmount}
          savingsPercentage={parseFloat(savingsPercentage)}
          discretionaryIncome={discretionaryIncome}
          remainingBalance={remainingBalance}
          onPressDetails={() => setShowBudgetSettingsModal(true)}
          onPressSettings={() => {
            // Mark all current over-budget categories as seen for the selected month
            const targetMonth = selectedMonth.getMonth();
            const targetYear = selectedMonth.getFullYear();
            const monthKey = `${targetMonth}-${targetYear}`;

            const newSeenCategories = new Map(seenOverBudgetCategories);
            const monthSeenCategories = new Set(
              newSeenCategories.get(monthKey) || []
            );

            budgetCategories.forEach((category) => {
              const categoryTransactions = transactions.filter((t) => {
                const transactionDate = new Date(t.date);
                return (
                  transactionDate.getMonth() === targetMonth &&
                  transactionDate.getFullYear() === targetYear &&
                  t.type === "expense" &&
                  t.category === category.name
                );
              });

              const categoryRecurring = recurringTransactions.filter((rt) => {
                return (
                  rt.type === "expense" &&
                  rt.isActive &&
                  rt.category === category.name
                );
              });

              const actualSpending =
                categoryTransactions.reduce((sum, t) => sum + t.amount, 0) +
                categoryRecurring.reduce((sum, rt) => {
                  let monthlyAmount = rt.amount;
                  if (rt.frequency === "weekly") monthlyAmount = rt.amount * 4;
                  else if (rt.frequency === "biweekly")
                    monthlyAmount = rt.amount * 2;
                  return sum + monthlyAmount;
                }, 0);

              if (actualSpending > category.monthlyLimit) {
                monthSeenCategories.add(category.name);
              }
            });

            newSeenCategories.set(monthKey, monthSeenCategories);
            setSeenOverBudgetCategories(newSeenCategories);
            navigation.navigate("BudgetCategories", {
              selectedMonth: selectedMonth.toISOString(),
            });
          }}
          onPressIncome={handleAddIncome}
          onPressExpense={handleAddExpense}
          onPressImport={() => setShowAutoImporter(true)}
          isBankConnected={isBankConnected}
          availableTransactionsCount={getAvailableTransactionsCount()}
          hasOverBudgetItems={hasOverBudgetItems()}
        />

        {/* Smart Insights - Only show if there are insights */}
        {insights.length > 0 && (
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
                  color: colors.text,
                }}
              >
                {t("budget.smart_insights")}
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
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginLeft: 24,
                  }}
                >
                  {insight.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Income Section */}

        <TransactionListCard
          title={t("budget.income")}
          icon="trending-up"
          iconColor={colors.success}
          transactions={selectedMonthTransactions.filter(
            (t) => t.type === "income"
          )}
          projectedTransactions={projectedTransactions.filter(
            (t) => t.type === "income"
          )}
          isCollapsed={isIncomeCollapsed}
          onToggleCollapse={() => setIsIncomeCollapsed(!isIncomeCollapsed)}
          onTransactionPress={(transaction) =>
            navigation.navigate("AddTransaction", {
              type: "income",
              editMode: true,
              transaction: transaction,
            })
          }
          onAddTransaction={handleAddIncome}
          isFutureMonth={isFutureMonth}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          isRecurringTransaction={isRecurringTransaction}
        />

        {/* Expenses Section */}

        <TransactionListCard
          title={t("budget.expenses")}
          icon="trending-down"
          iconColor={colors.error}
          transactions={selectedMonthTransactions.filter(
            (t) => t.type === "expense"
          )}
          projectedTransactions={projectedTransactions.filter(
            (t) => t.type === "expense"
          )}
          isCollapsed={isExpensesCollapsed}
          onToggleCollapse={() => setIsExpensesCollapsed(!isExpensesCollapsed)}
          onTransactionPress={(transaction) =>
            navigation.navigate("AddTransaction", {
              type: "expense",
              editMode: true,
              transaction: transaction,
            })
          }
          onAddTransaction={handleAddExpense}
          isFutureMonth={isFutureMonth}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          isRecurringTransaction={isRecurringTransaction}
        />

        {/* Budget Settings Modal */}
        <BudgetSettingsModal
          visible={showBudgetSettingsModal}
          onClose={() => setShowBudgetSettingsModal(false)}
          savingsPercentage={savingsPercentage}
          debtPayoffPercentage={debtPayoffPercentage}
          onSavingsChange={setSavingsPercentage}
          onDebtChange={setDebtPayoffPercentage}
          onSave={(localSavingsValue?: string, localDebtValue?: string) => {
            // Create a custom save function that uses the passed local values
            const saveWithLocalValues = async () => {
              if (!user) return;

              try {
                const newSettings = {
                  savingsPercentage: parseFloat(
                    localSavingsValue || savingsPercentage
                  ),
                  debtPayoffPercentage: parseFloat(
                    localDebtValue || debtPayoffPercentage
                  ),
                  userId: user.uid,
                  updatedAt: Date.now(),
                };

                if (budgetSettings?.id) {
                  await updateBudgetSettings({
                    ...newSettings,
                    id: budgetSettings.id,
                  });
                } else {
                  await saveBudgetSettings(newSettings);
                }

                // Refresh budget settings in the DataContext to update dashboard
                await refreshBudgetSettings();

                setHasUnsavedChanges(false);
                Alert.alert(
                  t("common.success"),
                  t("budget.budget_settings_saved")
                );
              } catch (error) {
                console.error("Error saving budget settings:", error);
                Alert.alert(
                  t("common.error"),
                  t("budget.budget_settings_failed")
                );
              }
            };

            saveWithLocalValues();
          }}
          hasUnsavedChanges={hasUnsavedChanges}
          netIncome={totalIncome}
          totalExpenses={totalExpenses}
          formatCurrency={formatCurrency}
          goals={goals}
          onGoalContributionChange={async (goalId, contribution) => {
            // Update the goal's monthly contribution
            const updatedGoals = goals.map((goal) =>
              goal.id === goalId
                ? { ...goal, monthlyContribution: contribution }
                : goal
            );
            // Update the UI optimistically
            updateDataOptimistically({ goals: updatedGoals });

            // Save to database
            try {
              const { updateGoal } = await import("../services/userData");
              const goalToUpdate = goals.find((goal) => goal.id === goalId);
              if (goalToUpdate) {
                await updateGoal({
                  ...goalToUpdate,
                  monthlyContribution: contribution,
                });
                // Goal contribution saved to database
              }
            } catch (error) {
              console.error(
                "Error saving goal contribution to database:",
                error
              );
            }
          }}
        />
      </ScrollView>

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              width: "85%",
              maxHeight: "70%",
              shadowColor: colors.shadow,
              shadowOpacity: 0.25,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            }}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {t("budget.select_month")}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedMonth(new Date());
                    setShowMonthPicker(false);
                  }}
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    marginRight: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: colors.buttonText,
                    }}
                  >
                    {t("budget.current")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowMonthPicker(false)}
                  style={{
                    padding: 4,
                  }}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              ref={monthPickerScrollRef}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
            >
              {generateAvailableMonths().map((month, index) => {
                const isSelected =
                  month.getMonth() === selectedMonth.getMonth() &&
                  month.getFullYear() === selectedMonth.getFullYear();
                const isCurrentMonth =
                  month.getMonth() === new Date().getMonth() &&
                  month.getFullYear() === new Date().getFullYear();

                return (
                  <TouchableOpacity
                    key={`${month.getFullYear()}-${month.getMonth()}`}
                    onPress={() => handleMonthSelect(month)}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 16,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: isSelected
                        ? colors.primary
                        : isCurrentMonth
                        ? colors.warningLight
                        : "transparent",
                      borderWidth: isSelected ? 2 : isCurrentMonth ? 1 : 0,
                      borderColor: isSelected ? colors.primary : colors.warning,
                      marginBottom: 4,
                    }}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: isSelected ? "700" : "500",
                          color: isSelected
                            ? colors.buttonText
                            : getMonthColor(month),
                          flex: 1,
                          flexWrap: "wrap",
                        }}
                        numberOfLines={2}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.8}
                      >
                        {formatMonthSmart(month, 18)}
                      </Text>
                      {isCurrentMonth && (
                        <View
                          style={{
                            backgroundColor: colors.warning,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 8,
                            marginLeft: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: colors.buttonText,
                            }}
                          >
                            {t("budget.current")}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Auto Budget Importer Modal */}
      <AutoBudgetImporter
        isVisible={showAutoImporter}
        onClose={() => setShowAutoImporter(false)}
        selectedMonth={selectedMonth}
        onDataRefresh={refreshData}
        onSuccess={(count) => {
          refreshData();
          setShowAutoImporter(false);
          setImportSuccess({
            count,
            message: t("budget.import_success_message", { count }),
          });
          setTimeout(() => setImportSuccess(null), 5000);
        }}
      />

      {/* Floating AI Chatbot - only show on main tab screens */}
      <FloatingAIChatbot hideOnScroll={true} isScrolling={isScrolling} />
    </SafeAreaView>
  );
};
