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
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { useAuth } from "../hooks/useAuth";
import { useZeroLoading } from "../hooks/useZeroLoading";
import { useData } from "../contexts/DataContext";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";
import { StandardHeader } from "../components/StandardHeader";

import { AutoBudgetImporter } from "../components/AutoBudgetImporter";
import { BudgetOverviewCard } from "../components/BudgetOverviewCard";
import { TransactionListCard } from "../components/TransactionListCard";
import { QuickActionsCard } from "../components/QuickActionsCard";
import { BudgetSettingsModal } from "../components/BudgetSettingsModal";
import { saveBudgetSettings, updateBudgetSettings } from "../services/userData";
import { getProjectedTransactionsForMonth } from "../services/transactionService";
import { billReminderService } from "../services/billReminders";
import { timestampToDateString } from "../utils/dateUtils";
import { FloatingAIChatbot } from "../components/FloatingAIChatbot";

// Reconciliation system imports
import {
  findReconciliationMatches,
  calculateBudgetComparison,
} from "../services/reconciliationService";

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
    hasData,
    getDataInstantly,
    updateDataOptimistically,
    refreshInBackground,
    refreshData,
  } = useZeroLoading();

  // Bank data from global context
  const {
    bankTransactions,
    bankAccounts,
    isBankConnected,
    bankDataLastUpdated,
    isBankDataLoading,
    bankConnectionError,
    setBankConnectionError,
    refreshBankData,
    isBankDataStale,
    refreshBudgetSettings,
  } = useData();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
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

  // Reconciliation system state
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [showBudgetAnalysisModal, setShowBudgetAnalysisModal] = useState(false);
  const [reconciliationMatches, setReconciliationMatches] = useState<any[]>([]);
  const [budgetComparisons, setBudgetComparisons] = useState<any[]>([]);

  const monthPickerScrollRef = useRef<ScrollView>(null);
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();

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
  const savingsAmount = (netIncome * parseFloat(savingsPercentage)) / 100;
  const debtPayoffAmount = (netIncome * parseFloat(debtPayoffPercentage)) / 100;
  const goalsAmount = goals.reduce(
    (sum, goal) => sum + goal.monthlyContribution,
    0
  );
  const discretionaryIncome =
    netIncome - savingsAmount - debtPayoffAmount - goalsAmount;
  const remainingBalance = discretionaryIncome;

  // Calculate budget vs. actual comparisons
  const calculateBudgetVsActual = () => {
    // Get expected transactions (identified by description prefix "Expected:" and exclude income)
    const expectedTransactions = allMonthTransactions.filter(
      (t) => t.description?.startsWith("Expected:") && t.type !== "income"
    );

    // Also include recurring transactions as expected expenses for the current month (exclude income)
    const currentMonth = selectedMonth.toISOString().slice(0, 7); // YYYY-MM format
    const recurringAsExpected = recurringTransactions
      .filter((rt) => rt.isActive && rt.type !== "income")
      .map((rt) => ({
        id: `recurring_${rt.id}`,
        amount: rt.amount,
        type: rt.type,
        category: rt.category,
        description: `Expected: ${rt.name}`,
        date: selectedMonth.getTime(),
        userId: user?.uid || "",
        createdAt: Date.now(),
        isRecurring: true,
        recurringId: rt.id,
      }));

    // Combine manual expected transactions with recurring ones
    const allExpectedTransactions = [
      ...expectedTransactions,
      ...recurringAsExpected,
    ];

    // Get actual transactions (anything that doesn't start with "Expected:", isn't projected, and isn't income)
    const actualTransactions = allMonthTransactions.filter(
      (t) =>
        !t.description?.startsWith("Expected:") &&
        !t.isProjected &&
        t.type !== "income"
    );

    // Calculate comparisons
    const comparisons = calculateBudgetComparison(
      allExpectedTransactions,
      actualTransactions
    );

    setBudgetComparisons(comparisons);

    return comparisons;
  };

  // Smart Insights generation
  const getInsights = () => {
    const insights = [];

    // Add budget-related insights if we have budget comparisons
    if (budgetComparisons.length > 0) {
      // Find categories that are over budget
      const overBudgetCategories = budgetComparisons.filter(
        (c) => c.status === "over_budget"
      );
      if (overBudgetCategories.length > 0) {
        insights.push({
          id: "budget-over",
          type: "warning",
          icon: "alert-circle",
          title: "Budget Alert",
          message: `${overBudgetCategories.length} category${
            overBudgetCategories.length > 1 ? "ies are" : " is"
          } over budget. Consider adjusting your spending.`,
        });
      }

      // Find categories that are close to budget limit
      const closeToLimitCategories = budgetComparisons.filter(
        (c) => c.status === "close_to_limit"
      );
      if (closeToLimitCategories.length > 0) {
        insights.push({
          id: "budget-close",
          type: "warning",
          icon: "warning",
          title: "Budget Warning",
          message: `${closeToLimitCategories.length} category${
            closeToLimitCategories.length > 1 ? "ies are" : " is"
          } close to budget limit.`,
        });
      }

      // Find categories that are under budget (positive insight)
      const underBudgetCategories = budgetComparisons.filter(
        (c) => c.status === "under_budget"
      );
      if (underBudgetCategories.length > 0) {
        insights.push({
          id: "budget-under",
          type: "success",
          icon: "checkmark-circle",
          title: "Great Job!",
          message: `${underBudgetCategories.length} category${
            underBudgetCategories.length > 1 ? "ies are" : " is"
          } under budget. You're managing your money well!`,
        });
      }
    }

    if (totalIncome > 0) {
      // Calculate discretionary savings rate (what's actually available after all allocations)
      const discretionarySavingsRate = (remainingBalance / totalIncome) * 100;
      if (discretionarySavingsRate >= 20) {
        insights.push({
          id: "excellent-savings-rate",
          type: "success",
          icon: "trending-up",
          title: "Excellent Discretionary Savings!",
          message: `You have ${discretionarySavingsRate.toFixed(
            1
          )}% of your income available for additional savings`,
        });
      } else if (discretionarySavingsRate < 0) {
        insights.push({
          id: "spending-more-than-income",
          type: "warning",
          icon: "alert-circle",
          title: "Over Budget",
          message: "Your expenses and allocations exceed your income",
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
          title: "High Expense Ratio",
          message: `${expenseToIncomeRatio.toFixed(
            1
          )}% of income goes to expenses`,
        });
      }
    }

    if (allMonthTransactions.length >= 10) {
      insights.push({
        id: "active-month",
        type: "info",
        icon: "analytics",
        title: "Active Month",
        message: `${allMonthTransactions.length} transactions tracked`,
      });
    }

    // Savings percentage insight
    if (parseFloat(savingsPercentage) >= 25) {
      insights.push({
        id: "high-savings-rate",
        type: "success",
        icon: "trending-up",
        title: "High Savings Rate!",
        message: `${savingsPercentage}% savings rate is excellent`,
      });
    } else if (parseFloat(savingsPercentage) < 10) {
      insights.push({
        id: "low-savings-rate",
        type: "warning",
        icon: "trending-down",
        title: "Low Savings Rate",
        message: `Consider increasing your ${savingsPercentage}% savings rate`,
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

      setHasUnsavedChanges(false);
      Alert.alert("Success", "Budget settings saved successfully!");
    } catch (error) {
      console.error("Error saving budget settings:", error);
      Alert.alert("Error", "Failed to save budget settings");
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
      >
        {/* Header */}
        <StandardHeader
          title={translate("budget", isFriendlyMode)}
          subtitle="Monthly Planning"
          showBackButton={false}
          rightComponent={
            <PanGestureHandler onGestureEvent={onGestureEvent}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  onPress={() => navigateMonth("prev")}
                  style={{
                    padding: 8,
                    borderRadius: 8,
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
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    minWidth: 120,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: "#f97316",
                    }}
                  >
                    {formatMonth(selectedMonth)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigateMonth("next")}
                  style={{
                    padding: 8,
                    borderRadius: 8,
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
                Reconnect
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
          onPressSettings={() => setShowBudgetSettingsModal(true)}
          onPressIncome={handleAddIncome}
          onPressExpense={handleAddExpense}
          onPressImport={() => setShowAutoImporter(true)}
          onPressBudgetAnalysis={() => {
            console.log("🔍 Budget Analysis button pressed");
            console.log(
              "📊 Current month transactions:",
              allMonthTransactions.length
            );

            console.log("🔍 Budget Analysis button pressed");

            // Run the budget analysis
            const comparisons = calculateBudgetVsActual();
            if (comparisons.length > 0) {
              setShowBudgetAnalysisModal(true);
              console.log(
                "✅ Budget analysis completed:",
                comparisons.length,
                "categories"
              );
            } else {
              console.log("ℹ️ No budget data to analyze yet");
            }
          }}
          isBankConnected={isBankConnected}
          availableTransactionsCount={getAvailableTransactionsCount()}
          hasBudgetData={budgetComparisons.length > 0}
          budgetSummary={
            budgetComparisons.length > 0
              ? {
                  totalCategories: budgetComparisons.length,
                  overBudget: budgetComparisons.filter(
                    (c) => c.status === "over_budget"
                  ).length,
                  closeToLimit: budgetComparisons.filter(
                    (c) => c.status === "close_to_limit"
                  ).length,
                  underBudget: budgetComparisons.filter(
                    (c) => c.status === "under_budget"
                  ).length,
                }
              : undefined
          }
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
                {translate("smartInsights", isFriendlyMode)}
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
          title="Income"
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
        {/* Budget Summary for Expenses */}
        {budgetComparisons.length > 0 && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons
                name="trending-down"
                size={20}
                color={colors.error}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.text,
                }}
              >
                Expenses Budget Summary
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: colors.primary,
                  }}
                >
                  {formatCurrency(
                    budgetComparisons.reduce((sum, c) => sum + c.expected, 0)
                  )}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  Budgeted
                </Text>
              </View>

              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {formatCurrency(
                    budgetComparisons.reduce((sum, c) => sum + c.actual, 0)
                  )}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  Actual
                </Text>
              </View>

              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: (() => {
                      const variance = budgetComparisons.reduce(
                        (sum, c) => sum + (c.expected - c.actual),
                        0
                      );
                      return variance >= 0 ? colors.success : colors.error;
                    })(),
                  }}
                >
                  {formatCurrency(
                    budgetComparisons.reduce(
                      (sum, c) => sum + (c.expected - c.actual),
                      0
                    )
                  )}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  Remaining
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={{ marginBottom: 8 }}>
              <View
                style={{
                  height: 8,
                  backgroundColor: colors.border,
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${Math.min(
                      (budgetComparisons.reduce((sum, c) => sum + c.actual, 0) /
                        Math.max(
                          budgetComparisons.reduce(
                            (sum, c) => sum + c.expected,
                            0
                          ),
                          1
                        )) *
                        100,
                      100
                    )}%`,
                    backgroundColor: (() => {
                      const percentage =
                        (budgetComparisons.reduce(
                          (sum, c) => sum + c.actual,
                          0
                        ) /
                          Math.max(
                            budgetComparisons.reduce(
                              (sum, c) => sum + c.expected,
                              0
                            ),
                            1
                          )) *
                        100;
                      return percentage >= 100
                        ? colors.error
                        : percentage >= 80
                        ? colors.warning
                        : colors.success;
                    })(),
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                {Math.round(
                  (budgetComparisons.reduce((sum, c) => sum + c.actual, 0) /
                    Math.max(
                      budgetComparisons.reduce((sum, c) => sum + c.expected, 0),
                      1
                    )) *
                    100
                )}
                % of budget used
              </Text>
            </View>
          </View>
        )}

        {/* Expenses Section */}
        <TransactionListCard
          title="Expenses"
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

                setHasUnsavedChanges(false);
                Alert.alert("Success", "Budget settings saved successfully!");
              } catch (error) {
                console.error("Error saving budget settings:", error);
                Alert.alert("Error", "Failed to save budget settings");
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
                Select Month
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
                    Current
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
                          color: isSelected ? colors.buttonText : colors.text,
                        }}
                      >
                        {formatMonth(month)}
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
                            Current
                          </Text>
                        </View>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={colors.buttonText}
                      />
                    )}
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
            message: `Successfully imported ${count} transactions to your budget!`,
          });
          setTimeout(() => setImportSuccess(null), 5000);
        }}
      />

      {/* Floating AI Chatbot - only show on main tab screens */}
      <FloatingAIChatbot />

      {/* Budget Analysis Modal */}
      {showBudgetAnalysisModal && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              margin: 20,
              maxHeight: "80%",
              width: "90%",
              shadowColor: colors.shadow,
              shadowOpacity: 0.2,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            }}
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
                  fontSize: 24,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                Budget Analysis
              </Text>
              <TouchableOpacity
                onPress={() => setShowBudgetAnalysisModal(false)}
                style={{
                  padding: 8,
                  borderRadius: 20,
                  backgroundColor: colors.surfaceSecondary,
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {budgetComparisons.map((comparison, index) => (
                <View
                  key={`modal-comparison-${comparison.category}-${index}`}
                  style={{
                    marginBottom: 16,
                    padding: 16,
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: 12,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "600",
                        color: colors.text,
                        textTransform: "capitalize",
                      }}
                    >
                      {comparison.category}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                        backgroundColor:
                          comparison.status === "over_budget"
                            ? colors.errorLight
                            : comparison.status === "close_to_limit"
                            ? colors.warningLight
                            : comparison.status === "under_budget"
                            ? colors.successLight
                            : colors.primaryLight,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color:
                            comparison.status === "over_budget"
                              ? colors.error
                              : comparison.status === "close_to_limit"
                              ? colors.warning
                              : comparison.status === "under_budget"
                              ? colors.success
                              : colors.primary,
                          textTransform: "uppercase",
                        }}
                      >
                        {comparison.status.replace("_", " ")}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                          marginBottom: 4,
                        }}
                      >
                        Expected
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: colors.text,
                        }}
                      >
                        {formatCurrency(comparison.expected)}
                      </Text>
                    </View>

                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                          marginBottom: 4,
                        }}
                      >
                        Actual
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color:
                            comparison.variance > 0
                              ? colors.error
                              : comparison.variance < 0
                              ? colors.success
                              : colors.text,
                        }}
                      >
                        {formatCurrency(comparison.actual)}
                      </Text>
                    </View>

                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                          marginBottom: 4,
                        }}
                      >
                        Variance
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color:
                            comparison.variance > 0
                              ? colors.error
                              : comparison.variance < 0
                              ? colors.success
                              : colors.text,
                        }}
                      >
                        {comparison.variance > 0 ? "+" : ""}
                        {formatCurrency(comparison.variance)}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{
                      height: 6,
                      backgroundColor: colors.surface,
                      borderRadius: 3,
                      marginBottom: 8,
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        width: `${Math.min(comparison.percentage, 100)}%`,
                        backgroundColor:
                          comparison.percentage > 100
                            ? colors.error
                            : comparison.percentage > 90
                            ? colors.warning
                            : colors.success,
                      }}
                    />
                  </View>

                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      textAlign: "center",
                    }}
                  >
                    {comparison.percentage.toFixed(1)}% of budget used
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};
