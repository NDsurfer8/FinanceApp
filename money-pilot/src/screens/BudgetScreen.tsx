import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
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
import { saveBudgetSettings, updateBudgetSettings } from "../services/userData";
import { getProjectedTransactionsForMonth } from "../services/transactionService";
import { billReminderService } from "../services/billReminders";

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
    refreshBankData,
    isBankDataStale,
    refreshBudgetSettings,
  } = useData();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [savingsPercentage, setSavingsPercentage] = useState("20");
  const [debtPayoffPercentage, setDebtPayoffPercentage] = useState("5");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [editingAmount, setEditingAmount] = useState("");
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
  const [importSuccess, setImportSuccess] = useState<{
    count: number;
    message: string;
  } | null>(null);
  const monthPickerScrollRef = useRef<ScrollView>(null);
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();

  // Custom Slider Component
  const CustomSlider = ({
    value,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    color = colors.primary,
  }: {
    value: number;
    onValueChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    color?: string;
  }) => {
    const [sliderWidth, setSliderWidth] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragValue, setDragValue] = useState(value);
    const percentage =
      (((isDragging ? dragValue : value) - min) / (max - min)) * 100;

    const handleSliderPress = (event: any) => {
      if (!isDragging) {
        const { locationX } = event.nativeEvent;
        const newPercentage = Math.max(
          0,
          Math.min(100, (locationX / sliderWidth) * 100)
        );
        const newValue = Math.round((newPercentage / 100) * (max - min) + min);
        // Round to nearest 5
        const roundedValue = Math.round(newValue / 5) * 5;
        onValueChange(roundedValue);
      }
    };

    const onGestureEvent = (event: any) => {
      const { translationX, state } = event.nativeEvent;

      if (state === State.BEGAN) {
        setIsDragging(true);
        setDragValue(value);
      } else if (state === State.ACTIVE) {
        const currentPercentage = ((value - min) / (max - min)) * 100;
        const translationPercentage = (translationX / sliderWidth) * 100;
        const newPercentage = Math.max(
          0,
          Math.min(100, currentPercentage + translationPercentage)
        );
        const newValue = Math.round((newPercentage / 100) * (max - min) + min);
        // Round to nearest 5
        const roundedValue = Math.round(newValue / 5) * 5;
        setDragValue(roundedValue);
      } else if (state === State.END || state === State.CANCELLED) {
        setIsDragging(false);
        onValueChange(dragValue);
      }
    };

    return (
      <View style={{ flex: 1 }}>
        <View
          style={{
            height: 6,
            backgroundColor: colors.border,
            borderRadius: 3,
            position: "relative",
          }}
          onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
        >
          <View
            style={{
              width: `${percentage}%`,
              height: 6,
              backgroundColor: color,
              borderRadius: 3,
            }}
          />
        </View>
        <PanGestureHandler onGestureEvent={onGestureEvent}>
          <View
            style={{
              position: "absolute",
              left: `${percentage}%`,
              top: -5,
              width: 16,
              height: 16,
              backgroundColor: color,
              borderRadius: 8,
              borderWidth: 2,
              borderColor: colors.surface,
              transform: [{ translateX: -8 }],
            }}
            hitSlop={{ top: 60, bottom: 60, left: 60, right: 60 }}
          />
        </PanGestureHandler>
        <TouchableOpacity
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "transparent",
          }}
          onPress={handleSliderPress}
          activeOpacity={1}
          hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
        />
      </View>
    );
  };

  // Filter accounts to only show checking/savings accounts (not loans)

  useEffect(() => {
    if (user) {
      // Set the percentages from saved settings or defaults
      if (budgetSettings) {
        setSavingsPercentage(budgetSettings.savingsPercentage.toString());
        setDebtPayoffPercentage(budgetSettings.debtPayoffPercentage.toString());
      }
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
      // If no settings exist, any non-default values are changes
      const currentSavings = parseFloat(savingsPercentage) || 0;
      const currentDebt = parseFloat(debtPayoffPercentage) || 0;
      const hasChanges = currentSavings !== 20 || currentDebt !== 5;
      setHasUnsavedChanges(hasChanges);
    }
  }, [savingsPercentage, debtPayoffPercentage, budgetSettings]);

  // Get cache status for display
  const getCacheStatus = () => {
    if (!bankDataLastUpdated) return "No data";

    const now = Date.now();
    const ageMinutes = Math.round(
      (now - bankDataLastUpdated.getTime()) / 1000 / 60
    );

    if (ageMinutes < 60) return `Fresh (${ageMinutes}m ago)`;
    if (ageMinutes < 240) return `Recent (${Math.round(ageMinutes / 60)}h ago)`; // 4 hours
    if (ageMinutes < 1440) return `Stale (${Math.round(ageMinutes / 60)}h ago)`; // 24 hours
    return `Very stale (${Math.round(ageMinutes / 60 / 24)}d ago)`;
  };

  // Note: DataContext handles initial data loading
  // This useEffect has been removed to prevent duplicate API calls

  // Note: DataContext handles auto-loading bank data when bank connects
  // This useEffect has been removed to prevent duplicate API calls

  // Scroll to current month when modal opens
  useEffect(() => {
    if (showMonthPicker) {
      // Use setTimeout to ensure the modal is fully rendered
      setTimeout(() => {
        scrollToCurrentMonth();
      }, 100);
    }
  }, [showMonthPicker]);

  // Get transactions for selected month
  const getMonthlyTransactions = (date: Date) => {
    const month = date.getMonth();
    const year = date.getFullYear();

    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return (
        transactionDate.getMonth() === month &&
        transactionDate.getFullYear() === year
      );
    });
  };

  const monthlyTransactions = getMonthlyTransactions(selectedMonth);

  // Check if selected month is in the future
  const checkIfFutureMonth = (date: Date) => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const selectedMonthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    return selectedMonthStart > currentMonth;
  };

  // Load projected transactions for future months
  const loadProjectedTransactions = async (date: Date) => {
    console.log(
      "BudgetScreen: loadProjectedTransactions called with date:",
      date
    );
    if (!user) return;

    const isFuture = checkIfFutureMonth(date);
    setIsFutureMonth(isFuture);

    if (isFuture) {
      try {
        const { projected } = await getProjectedTransactionsForMonth(
          user.uid,
          date
        );
        setProjectedTransactions(projected);
      } catch (error) {
        console.error("Error loading projected transactions:", error);
        setProjectedTransactions([]);
      }
    } else {
      setProjectedTransactions([]);
    }
  };

  // Load projected transactions when selected month changes
  useEffect(() => {
    loadProjectedTransactions(selectedMonth);
  }, [selectedMonth, user]);

  // Calculate totals
  const incomeTransactions = monthlyTransactions
    .filter((t) => t.type === "income")
    .sort((a, b) => b.amount - a.amount); // Sort by amount, largest first
  const expenseTransactions = monthlyTransactions
    .filter((t) => t.type === "expense")
    .sort((a, b) => b.amount - a.amount); // Sort by amount, largest first

  // Include projected transactions for future months
  const projectedIncomeTransactions = isFutureMonth
    ? projectedTransactions.filter((t) => t.type === "income")
    : [];
  const projectedExpenseTransactions = isFutureMonth
    ? projectedTransactions.filter((t) => t.type === "expense")
    : [];

  const totalIncome =
    incomeTransactions.reduce((sum, t) => sum + t.amount, 0) +
    projectedIncomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses =
    expenseTransactions.reduce((sum, t) => sum + t.amount, 0) +
    projectedExpenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  // Calculate budget metrics
  const savingsPercent = parseFloat(savingsPercentage) || 0;
  const debtPayoffPercent = parseFloat(debtPayoffPercentage) || 0;
  const savingsAmount = netIncome * (savingsPercent / 100);

  // Calculate total goal contributions
  const totalGoalContributions = goals.reduce((total, goal) => {
    return total + goal.monthlyContribution;
  }, 0);

  const discretionaryIncome =
    netIncome - savingsAmount - totalGoalContributions;
  const debtPayoffAmount = discretionaryIncome * (debtPayoffPercent / 100);
  const remainingBalance = discretionaryIncome - debtPayoffAmount;

  // Premium Features: Smart Insights
  const getInsights = () => {
    const insights = [];

    if (totalIncome > 0) {
      // Calculate discretionary savings rate (what's actually available after all allocations)
      const discretionarySavingsRate = (remainingBalance / totalIncome) * 100;
      insights.push({
        id: "savings-rate",
        type: "success",
        icon: "trending-up",
        title: "Discretionary Savings Rate",
        message: `You have ${discretionarySavingsRate.toFixed(
          1
        )}% of your income available for additional savings`,
      });
    }

    if (expenseTransactions.length >= 10) {
      insights.push({
        id: "active-budgeting",
        type: "info",
        icon: "analytics",
        title: "Active Budgeting",
        message: `${expenseTransactions.length} expenses tracked this month`,
      });
    }

    if (incomeTransactions.length >= 2) {
      insights.push({
        id: "diversified-income",
        type: "success",
        icon: "diamond",
        title: "Diversified Income",
        message: `You have ${incomeTransactions.length} income sources`,
      });
    }

    return insights;
  };

  const allInsights = React.useMemo(
    () => getInsights(),
    [
      totalIncome,
      remainingBalance,
      expenseTransactions.length,
      incomeTransactions.length,
    ]
  );

  const insights = React.useMemo(
    () => allInsights.filter((insight) => !dismissedInsights.has(insight.id)),
    [allInsights, dismissedInsights]
  );

  const handleDismissInsight = (insightId: string) => {
    setDismissedInsights((prev) => new Set([...prev, insightId]));
  };

  const showMicroFeedback = (type: "income" | "expense", amount: number) => {
    const message =
      type === "income"
        ? `Available increased by ${formatCurrency(amount)}`
        : `Available decreased by ${formatCurrency(amount)}`;

    setMicroFeedback({ message, type, amount });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setMicroFeedback(null);
    }, 3000);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const calculatePaymentsRemaining = (goal: any) => {
    if (goal.monthlyContribution <= 0) return "∞";

    const remainingAmount = goal.targetAmount - goal.currentAmount;
    if (remainingAmount <= 0) return "Complete!";

    const paymentsNeeded = Math.ceil(
      remainingAmount / goal.monthlyContribution
    );
    return `${paymentsNeeded} payment${paymentsNeeded !== 1 ? "s" : ""} left`;
  };

  const isRecurringTransaction = (transaction: any) => {
    // Check if transaction has a recurring transaction ID
    if (transaction.recurringTransactionId) {
      return true;
    }

    // Fallback to the old method for backward compatibility
    return recurringTransactions.some(
      (recurring) =>
        recurring.name === transaction.description &&
        recurring.amount === transaction.amount &&
        recurring.type === transaction.type &&
        recurring.isActive
    );
  };

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

  const generateAvailableMonths = () => {
    const months = [];
    const currentDate = new Date();

    // Generate last 12 months
    for (let i = 12; i >= 1; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push(date);
    }

    // Add current month
    months.push(new Date());

    // Generate next 12 months
    for (let i = 1; i <= 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      months.push(date);
    }

    return months;
  };

  const handleMonthSelect = (month: Date) => {
    // Haptic feedback for month selection
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);

    setSelectedMonth(month);
    setShowMonthPicker(false);
  };

  // Enhanced month navigation with haptic feedback
  const navigateMonth = (direction: "prev" | "next") => {
    const newMonth = new Date(selectedMonth);
    if (direction === "prev") {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }

    // Haptic feedback for month navigation
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSelectedMonth(newMonth);
  };

  // Handle swipe gestures for month navigation
  const onGestureEvent = (event: any) => {
    const { translationX, state } = event.nativeEvent;

    if (state === State.END) {
      const swipeThreshold = 50;

      if (translationX > swipeThreshold) {
        // Swipe right - go to previous month
        navigateMonth("prev");
      } else if (translationX < -swipeThreshold) {
        // Swipe left - go to next month
        navigateMonth("next");
      }
    }
  };

  // Handle long press for quick month picker
  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowMonthPicker(true);
  };

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

  const handleSaveBudgetSettings = async () => {
    if (!user) return;

    try {
      const newSettings = {
        savingsPercentage: parseFloat(savingsPercentage) || 20,
        debtPayoffPercentage: parseFloat(debtPayoffPercentage) || 5,
        userId: user.uid,
        updatedAt: Date.now(),
      };

      // Optimistic update - update UI immediately
      updateDataOptimistically({ budgetSettings: newSettings });

      if (budgetSettings?.id) {
        // Update existing settings
        await updateBudgetSettings({
          ...newSettings,
          id: budgetSettings.id,
        });
      } else {
        // Create new settings
        await saveBudgetSettings(newSettings);
      }

      // Refresh data to ensure consistency
      await refreshBudgetSettings();

      // Refresh bill reminders when budget settings change
      if (user) {
        await billReminderService.scheduleAllBillReminders(user.uid);
      }

      Alert.alert("Success", "Budget settings saved successfully!");
    } catch (error) {
      console.error("BudgetScreen: Error saving budget settings:", error);
      Alert.alert("Error", "Failed to save budget settings");

      // Revert optimistic update on error
      if (budgetSettings) {
        console.log("BudgetScreen: Reverting optimistic update due to error");
        updateDataOptimistically({ budgetSettings });
      }
    }
  };

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

        {/* Premium Feature: Quick Setup */}

        {/* Premium Feature: Smart Insights */}
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
                  marginBottom: 20,
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
                    color={insight.type === "success" ? "#16a34a" : "#d97706"}
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
                  }}
                >
                  {insight.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Income Section */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: isIncomeCollapsed ? 0 : 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: colors.successLight,
                  padding: 8,
                  borderRadius: 10,
                  marginRight: 12,
                }}
              >
                <Ionicons name="trending-up" size={20} color={colors.text} />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {translate("income", isFriendlyMode)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsIncomeCollapsed(!isIncomeCollapsed)}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: colors.surfaceSecondary,
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isIncomeCollapsed ? "chevron-down" : "chevron-up"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Income Transactions List */}
          {!isIncomeCollapsed &&
            [
              ...incomeTransactions,
              ...(isFutureMonth
                ? projectedTransactions.filter((t) => t.type === "income")
                : []),
            ].map((transaction, index, array) => (
              <TouchableOpacity
                key={transaction.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  paddingVertical: 8,
                  borderBottomWidth: index === array.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
                onPress={() =>
                  navigation.navigate("AddTransaction", {
                    type: "income",
                    editMode: true,
                    transaction: transaction,
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      color: colors.text,
                      fontWeight: "500",
                    }}
                  >
                    {transaction.description}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 2,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                      {transaction.category} • {formatDate(transaction.date)}
                    </Text>
                    {(isRecurringTransaction(transaction) ||
                      transaction.id?.startsWith("projected-")) && (
                      <Ionicons
                        name="repeat"
                        size={12}
                        color={colors.primary}
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: colors.text,
                      marginRight: 8,
                    }}
                  >
                    {formatCurrency(transaction.amount)}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            ))}

          {(incomeTransactions.length > 0 ||
            projectedIncomeTransactions.length > 0) && (
            <View
              style={{
                borderTopWidth: 2,
                borderTopColor: colors.border,
                paddingTop: 16,
                marginTop: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: colors.text,
                  }}
                >
                  Total Income
                </Text>
                <Text
                  style={{ fontSize: 18, fontWeight: "800", color: "#16a34a" }}
                >
                  $
                  {totalIncome.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
          )}

          {/* Inline Add Income Button */}
          <TouchableOpacity
            onPress={handleAddIncome}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
              marginTop: 16,
              backgroundColor: colors.successLight,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.success,
              borderStyle: "dashed",
            }}
          >
            <Ionicons name="add-circle" size={20} color={colors.success} />
            <Text
              style={{
                color: colors.success,
                fontSize: 14,
                fontWeight: "600",
                marginLeft: 8,
              }}
              allowFontScaling={true}
            >
              Add Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Expenses Section */}
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
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: isExpensesCollapsed ? 0 : 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: colors.errorLight,
                  padding: 8,
                  borderRadius: 10,
                  marginRight: 12,
                }}
              >
                <Ionicons name="trending-down" size={20} color={colors.text} />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {translate("expenses", isFriendlyMode)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsExpensesCollapsed(!isExpensesCollapsed)}
              style={{
                padding: 8,
                borderRadius: 8,
                backgroundColor: colors.surfaceSecondary,
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isExpensesCollapsed ? "chevron-down" : "chevron-up"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Expense Transactions List */}
          {!isExpensesCollapsed &&
            [
              ...expenseTransactions,
              ...(isFutureMonth
                ? projectedTransactions.filter((t) => t.type === "expense")
                : []),
            ].map((transaction, index, array) => (
              <TouchableOpacity
                key={transaction.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  paddingVertical: 8,
                  borderBottomWidth: index === array.length - 1 ? 0 : 1,
                  borderBottomColor: colors.border,
                }}
                onPress={() =>
                  navigation.navigate("AddTransaction", {
                    type: "expense",
                    editMode: true,
                    transaction: transaction,
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      color: colors.text,
                      fontWeight: "500",
                    }}
                  >
                    {transaction.description}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 2,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                      {transaction.category} • {formatDate(transaction.date)}
                    </Text>
                    {(isRecurringTransaction(transaction) ||
                      transaction.id?.startsWith("projected-")) && (
                      <Ionicons
                        name="repeat"
                        size={12}
                        color={colors.primary}
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: colors.text,
                      marginRight: 8,
                    }}
                  >
                    {formatCurrency(transaction.amount)}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            ))}

          {(expenseTransactions.length > 0 ||
            projectedExpenseTransactions.length > 0) && (
            <View
              style={{
                borderTopWidth: 2,
                borderTopColor: colors.border,
                paddingTop: 16,
                marginTop: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: colors.text,
                  }}
                >
                  Total Expenses
                </Text>
                <Text
                  style={{ fontSize: 18, fontWeight: "800", color: "#dc2626" }}
                >
                  $
                  {totalExpenses.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
          )}

          {/* Inline Add Expense Button */}
          <TouchableOpacity
            onPress={handleAddExpense}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 12,
              marginTop: 16,
              backgroundColor: colors.surfaceSecondary,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.primary,
              borderStyle: "dashed",
            }}
          >
            <Ionicons name="add-circle" size={20} color={colors.primary} />
            <Text
              style={{
                color: colors.primary,
                fontSize: 14,
                fontWeight: "600",
                marginLeft: 8,
              }}
              allowFontScaling={true}
            >
              Add Expense
            </Text>
          </TouchableOpacity>
        </View>

        {/* Budget Summary */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
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
            {translate("budget", isFriendlyMode)} Summary
          </Text>

          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>💵</Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.textSecondary,
                    fontWeight: "500",
                  }}
                >
                  {translate("netIncome", isFriendlyMode)}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: netIncome >= 0 ? "#16a34a" : "#dc2626",
                }}
              >
                {formatCurrency(netIncome)}
              </Text>
            </View>
          </View>

          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>💰</Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.textSecondary,
                    fontWeight: "500",
                  }}
                >
                  {translate("savings", isFriendlyMode)}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: "#16a34a",
                    fontWeight: "600",
                    marginLeft: 8,
                  }}
                >
                  {Math.round(parseFloat(savingsPercentage) || 0)}%
                </Text>
              </View>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#16a34a" }}
              >
                {formatCurrency(savingsAmount)}
              </Text>
            </View>
            {/* Interactive Slider */}
            <View style={{ marginTop: 12 }}>
              <CustomSlider
                value={parseFloat(savingsPercentage) || 0}
                onValueChange={(value) =>
                  setSavingsPercentage(value.toString())
                }
                min={0}
                max={100}
                color={colors.success}
              />
            </View>
          </View>

          {/* Individual Goal Fields */}
          {goals.map((goal, index) => (
            <View key={goal.id} style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.textSecondary,
                    fontWeight: "500",
                  }}
                >
                  {goal.name}
                </Text>
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: "#3b82f6" }}
                >
                  {formatCurrency(goal.monthlyContribution)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    fontStyle: "italic",
                  }}
                >
                  {calculatePaymentsRemaining(goal)}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginRight: 4,
                    }}
                  >
                    Progress:
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#3b82f6",
                      fontWeight: "600",
                    }}
                  >
                    {formatCurrency(goal.currentAmount)} /{" "}
                    {formatCurrency(goal.targetAmount)}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: colors.textSecondary,
                  fontWeight: "500",
                }}
              >
                {translate("discretionaryIncome", isFriendlyMode)}
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#f59e0b" }}
              >
                {formatCurrency(discretionaryIncome)}
              </Text>
            </View>
          </View>

          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>💳</Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.textSecondary,
                    fontWeight: "500",
                  }}
                >
                  Pay Debt
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: "#dc2626",
                    fontWeight: "600",
                    marginLeft: 8,
                  }}
                >
                  {Math.round(parseFloat(debtPayoffPercentage) || 0)}%
                </Text>
              </View>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#dc2626" }}
              >
                {formatCurrency(debtPayoffAmount)}
              </Text>
            </View>
            {/* Interactive Slider */}
            <View style={{ marginTop: 12 }}>
              <CustomSlider
                value={parseFloat(debtPayoffPercentage) || 0}
                onValueChange={(value) =>
                  setDebtPayoffPercentage(value.toString())
                }
                min={0}
                max={100}
                color={colors.error}
              />
            </View>
          </View>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 12,
              position: "relative",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>💸</Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: colors.text,
                  }}
                >
                  {translate("availableAmount", isFriendlyMode)}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "800",
                  color: remainingBalance >= 0 ? "#16a34a" : "#dc2626",
                }}
              >
                $
                {remainingBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>

          {/* Save Settings Button */}
          <TouchableOpacity
            style={{
              backgroundColor: hasUnsavedChanges
                ? colors.primary
                : colors.surfaceSecondary,
              borderRadius: 8,
              padding: 12,
              alignItems: "center",
              marginTop: 40,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: hasUnsavedChanges ? colors.primary : colors.border,
              opacity: hasUnsavedChanges ? 1 : 0.6,
            }}
            onPress={hasUnsavedChanges ? handleSaveBudgetSettings : undefined}
            disabled={!hasUnsavedChanges}
          >
            <Text
              style={{
                color: hasUnsavedChanges
                  ? colors.buttonText
                  : colors.textSecondary,
                fontSize: 14,
                fontWeight: "500",
              }}
              allowFontScaling={true}
            >
              {hasUnsavedChanges
                ? `${translate("save", isFriendlyMode)} ${translate(
                    "budget",
                    isFriendlyMode
                  )} Settings`
                : `${translate("budget", isFriendlyMode)} Settings Saved`}
            </Text>
          </TouchableOpacity>

          {/* Auto Budget Importer Button */}
          {isBankConnected && (
            <TouchableOpacity
              style={{
                backgroundColor: colors.info,
                borderRadius: 8,
                padding: 12,
                alignItems: "center",
                marginBottom: 20,
                borderWidth: 1,
                borderColor: colors.info,
                flexDirection: "row",
                justifyContent: "center",
              }}
              onPress={() => setShowAutoImporter(true)}
            >
              <Ionicons
                name="download"
                size={16}
                color={colors.buttonText}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color: colors.buttonText,
                  fontSize: 14,
                  fontWeight: "500",
                }}
                allowFontScaling={true}
              >
                Import{" "}
                {selectedMonth ? formatMonth(selectedMonth) : "Current Month"}
                {bankTransactions.length > 0 && (
                  <Text style={{ color: colors.buttonText }}>
                    {" "}
                    (
                    {
                      bankTransactions.filter((transaction: any) => {
                        const transactionDate = new Date(transaction.date);
                        const currentMonth = selectedMonth.getMonth();
                        const currentYear = selectedMonth.getFullYear();
                        return (
                          transactionDate.getMonth() === currentMonth &&
                          transactionDate.getFullYear() === currentYear
                        );
                      }).length
                    }
                    )
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
                    key={index}
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
        onSuccess={(count) => {
          // Refresh data after successful import
          refreshData();
          setShowAutoImporter(false);
          setImportSuccess({
            count,
            message: `Successfully imported ${count} transactions to your budget!`,
          });
          // Auto-hide success message after 5 seconds
          setTimeout(() => setImportSuccess(null), 5000);
        }}
      />
    </SafeAreaView>
  );
};
