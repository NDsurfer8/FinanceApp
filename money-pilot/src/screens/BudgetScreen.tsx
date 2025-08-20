import React, { useState, useEffect } from "react";
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
import { useAuth } from "../hooks/useAuth";
import { useZeroLoading } from "../hooks/useZeroLoading";
import { useData } from "../contexts/DataContext";
import {
  saveTransaction,
  removeTransaction,
  updateTransaction,
  saveBudgetSettings,
  getUserRecurringTransactions,
  skipRecurringTransactionForMonth,
} from "../services/userData";
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
    bankRecurringSuggestions: recurringSuggestions,
    isBankConnected,
    bankDataLastUpdated,
    isBankDataLoading,
    refreshBankData,
    isBankDataStale,
  } = useData();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [savingsPercentage, setSavingsPercentage] = useState("20");
  const [debtPayoffPercentage, setDebtPayoffPercentage] = useState("75");
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [editingAmount, setEditingAmount] = useState("");
  const [projectedTransactions, setProjectedTransactions] = useState<any[]>([]);
  const [isFutureMonth, setIsFutureMonth] = useState(false);

  useEffect(() => {
    if (user) {
      // Set the percentages from saved settings or defaults
      if (budgetSettings) {
        setSavingsPercentage(budgetSettings.savingsPercentage.toString());
        setDebtPayoffPercentage(budgetSettings.debtPayoffPercentage.toString());
      }
    }
  }, [user, budgetSettings]);

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

  // Handle adding a recurring suggestion from bank data
  const handleAddRecurringSuggestion = (suggestion: any) => {
    navigation.navigate("AddTransaction", {
      type: suggestion.type,
      description: suggestion.name,
      amount: suggestion.amount.toString(),
      category: suggestion.category,
      isRecurring: true,
      frequency: suggestion.frequency,
      fromBankSuggestion: true,
    });
  };

  // Handle refresh button press with debouncing
  const handleRefreshPress = () => {
    if (!isBankDataLoading) {
      refreshBankData(true);
    }
  };

  // Background refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log("BudgetScreen useFocusEffect triggered");
      if (user) {
        console.log("Refreshing data in background...");
        // Force refresh when screen comes into focus to get latest data
        refreshData().catch((error: any) => {
          console.error("Background refresh failed:", error);
        });

        // Load bank data with smart caching strategy
        refreshBankData();
      }
    }, [user, refreshData])
  );

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

  // Handle delete transaction
  const handleDeleteTransaction = async (transaction: any) => {
    if (!user) return;

    const isRecurring =
      isRecurringTransaction(transaction) ||
      transaction.id?.startsWith("projected-");

    if (isRecurring) {
      // For recurring transactions, show options
      Alert.alert(
        "Delete Recurring Transaction",
        `"${transaction.description}" is a recurring transaction. What would you like to delete?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete This Occurrence Only",
            style: "default",
            onPress: async () => {
              try {
                // Optimistic update - remove from UI immediately
                const updatedTransactions = transactions.filter(
                  (t) => t.id !== transaction.id
                );
                updateDataOptimistically({ transactions: updatedTransactions });

                // Also remove from projected transactions if it's a projected transaction
                if (transaction.id?.startsWith("projected-")) {
                  const updatedProjectedTransactions =
                    projectedTransactions.filter(
                      (t) => t.id !== transaction.id
                    );
                  setProjectedTransactions(updatedProjectedTransactions);
                }

                // Delete from database in background
                await removeTransaction(user.uid, transaction.id);

                // Find the recurring transaction and skip this month
                let recurringTransaction;
                if (transaction.recurringTransactionId) {
                  // Use the direct reference if available
                  recurringTransaction = recurringTransactions.find(
                    (recurring) =>
                      recurring.id === transaction.recurringTransactionId
                  );
                } else {
                  // Fallback to the old method for backward compatibility
                  recurringTransaction = recurringTransactions.find(
                    (recurring) =>
                      recurring.name === transaction.description &&
                      recurring.amount === transaction.amount &&
                      recurring.type === transaction.type &&
                      recurring.isActive
                  );
                }

                if (recurringTransaction?.id) {
                  const monthKey = `${selectedMonth.getFullYear()}-${String(
                    selectedMonth.getMonth() + 1
                  ).padStart(2, "0")}`;
                  await skipRecurringTransactionForMonth(
                    recurringTransaction.id,
                    monthKey
                  );
                }

                Alert.alert(
                  "Success",
                  "Transaction occurrence deleted and skipped for this month!"
                );
              } catch (error) {
                console.error("Error deleting transaction:", error);
                Alert.alert("Error", "Failed to delete transaction");

                // Revert optimistic update on error
                await refreshInBackground();
              }
            },
          },
          {
            text: "Delete All Future Occurrences",
            style: "destructive",
            onPress: async () => {
              try {
                // Optimistic update - remove from UI immediately
                const updatedTransactions = transactions.filter(
                  (t) => t.id !== transaction.id
                );
                updateDataOptimistically({ transactions: updatedTransactions });

                // Also remove from projected transactions if it's a projected transaction
                if (transaction.id?.startsWith("projected-")) {
                  const updatedProjectedTransactions =
                    projectedTransactions.filter(
                      (t) => t.id !== transaction.id
                    );
                  setProjectedTransactions(updatedProjectedTransactions);
                }

                // Find the recurring transaction and delete it
                let recurringTransaction;
                if (transaction.recurringTransactionId) {
                  // Use the direct reference if available
                  recurringTransaction = recurringTransactions.find(
                    (recurring) =>
                      recurring.id === transaction.recurringTransactionId
                  );
                } else {
                  // Fallback to the old method for backward compatibility
                  recurringTransaction = recurringTransactions.find(
                    (recurring) =>
                      recurring.name === transaction.description &&
                      recurring.amount === transaction.amount &&
                      recurring.type === transaction.type &&
                      recurring.isActive
                  );
                }

                if (recurringTransaction?.id) {
                  const { deleteRecurringTransaction } = await import(
                    "../services/transactionService"
                  );
                  await deleteRecurringTransaction(recurringTransaction.id);
                }

                Alert.alert(
                  "Success",
                  "Recurring transaction and all related transactions deleted!"
                );
              } catch (error) {
                console.error("Error deleting transaction:", error);
                Alert.alert("Error", "Failed to delete transaction");

                // Revert optimistic update on error
                await refreshInBackground();
              }
            },
          },
        ]
      );
    } else {
      // For regular transactions, show simple delete confirmation
      Alert.alert(
        "Delete Transaction",
        `Are you sure you want to delete "${transaction.description}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                // Optimistic update - remove from UI immediately
                const updatedTransactions = transactions.filter(
                  (t) => t.id !== transaction.id
                );
                updateDataOptimistically({ transactions: updatedTransactions });

                // Delete from database in background
                await removeTransaction(user.uid, transaction.id);
                Alert.alert("Success", "Transaction deleted successfully");
              } catch (error) {
                console.error("Error deleting transaction:", error);
                Alert.alert("Error", "Failed to delete transaction");

                // Revert optimistic update on error
                await refreshInBackground();
              }
            },
          },
        ]
      );
    }
  };

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
      const savingsRate = (savingsAmount / totalIncome) * 100;
      insights.push({
        type: "success",
        icon: "trending-up",
        title: "Great Savings Rate!",
        message: `You're saving ${savingsRate.toFixed(1)}% of your income`,
      });
    }

    if (expenseTransactions.length >= 10) {
      insights.push({
        type: "info",
        icon: "analytics",
        title: "Active Month",
        message: `${expenseTransactions.length} expenses tracked`,
      });
    }

    if (incomeTransactions.length >= 2) {
      insights.push({
        type: "success",
        icon: "diamond",
        title: "Diversified Income",
        message: `You have ${incomeTransactions.length} income sources`,
      });
    }

    return insights;
  };

  const insights = getInsights();

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const formatMonthYear = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
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

  const handleMonthChange = async (direction: "prev" | "next") => {
    const newDate = new Date(selectedMonth);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedMonth(newDate);
  };

  const handleSaveBudgetSettings = async () => {
    if (!user) return;

    try {
      const newSettings = {
        savingsPercentage: parseFloat(savingsPercentage) || 20,
        debtPayoffPercentage: parseFloat(debtPayoffPercentage) || 75,
        userId: user.uid,
        updatedAt: Date.now(),
      };

      if (budgetSettings?.id) {
        // Update existing settings
        // await updateBudgetSettings({ // This line is removed as per the new_code
        //   ...newSettings,
        //   id: budgetSettings.id,
        // });
      } else {
        // Create new settings
        await saveBudgetSettings(newSettings);
      }

      await refreshInBackground(); // Reload to get updated settings

      // Refresh bill reminders when budget settings change
      if (user) {
        await billReminderService.scheduleAllBillReminders(user.uid);
      }

      Alert.alert("Success", "Budget settings saved successfully!");
    } catch (error) {
      console.error("Error saving budget settings:", error);
      Alert.alert("Error", "Failed to save budget settings");
    }
  };

  const handleEditTransaction = (transaction: any) => {
    if (transaction.id?.startsWith("projected-")) {
      Alert.alert(
        "Projected Transaction",
        "This is a projected transaction and cannot be edited directly.",
        [{ text: "OK" }]
      );
      return;
    }
    setEditingTransactionId(transaction.id);
    setEditingAmount(transaction.amount.toString());
  };

  const handleSaveTransactionEdit = async () => {
    if (!user || !editingTransactionId) return;

    const newAmount = parseFloat(editingAmount);
    if (isNaN(newAmount) || newAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    try {
      // Find the transaction to update
      const transactionToUpdate = transactions.find(
        (t) => t.id === editingTransactionId
      );
      if (!transactionToUpdate) {
        Alert.alert("Error", "Transaction not found");
        return;
      }

      // Check if this is a recurring transaction
      const isRecurring = isRecurringTransaction(transactionToUpdate);

      if (isRecurring) {
        // Handle recurring transaction update
        const { updateRecurringTransaction } = await import(
          "../services/transactionService"
        );

        // Find the recurring transaction
        const recurringTransaction = recurringTransactions.find(
          (recurring) =>
            recurring.name === transactionToUpdate.description &&
            recurring.amount === transactionToUpdate.amount &&
            recurring.type === transactionToUpdate.type &&
            recurring.isActive
        );

        if (recurringTransaction?.id) {
          const updatedRecurringTransaction = {
            ...recurringTransaction,
            amount: newAmount,
            updatedAt: Date.now(),
          };

          // Optimistic update - update UI immediately
          const updatedTransactions = transactions.map((t) =>
            t.id === editingTransactionId ? { ...t, amount: newAmount } : t
          );
          updateDataOptimistically({ transactions: updatedTransactions });

          // Save recurring transaction to database
          await updateRecurringTransaction(updatedRecurringTransaction);
        } else {
          throw new Error("Recurring transaction not found");
        }
      } else {
        // Handle regular transaction update
        const updatedTransaction = {
          ...transactionToUpdate,
          amount: newAmount,
          userId: user.uid,
        };

        // Optimistic update - update UI immediately
        const updatedTransactions = transactions.map((t) =>
          t.id === editingTransactionId ? updatedTransaction : t
        );
        updateDataOptimistically({ transactions: updatedTransactions });

        // Save to database in background
        await updateTransaction(updatedTransaction);
      }

      // Reset editing state
      setEditingTransactionId(null);
      setEditingAmount("");

      Alert.alert("Success", "Transaction amount updated successfully!");
    } catch (error) {
      console.error("Error updating transaction:", error);
      Alert.alert("Error", "Failed to update transaction amount");

      // Revert optimistic update on error
      await refreshInBackground();
    }
  };

  const handleCancelEdit = () => {
    setEditingTransactionId(null);
    setEditingAmount("");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View>
            <Text style={{ fontSize: 28, fontWeight: "800", color: "#1f2937" }}>
              Budget
            </Text>
            <Text style={{ fontSize: 16, color: "#6b7280", marginTop: 4 }}>
              Plan your finances
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={() => handleMonthChange("prev")}>
              <Ionicons name="chevron-back" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#f97316",
                marginHorizontal: 12,
              }}
            >
              {formatMonth(selectedMonth)}
            </Text>
            <TouchableOpacity onPress={() => handleMonthChange("next")}>
              <Ionicons name="chevron-forward" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium Feature: Quick Setup */}

        {/* Premium Feature: Smart Insights */}
        {insights.length > 0 && (
          <View
            style={{
              backgroundColor: "#fff",
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
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  backgroundColor: "#fef3c7",
                  padding: 8,
                  borderRadius: 10,
                  marginRight: 12,
                }}
              >
                <Ionicons name="bulb" size={20} color="#d97706" />
              </View>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#1f2937" }}
              >
                Smart Insights
              </Text>
            </View>

            {insights.map((insight, index) => (
              <View
                key={`insight-${insight.title}-${index}`}
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
                      color: "#374151",
                    }}
                  >
                    {insight.title}
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 13, color: "#6b7280", marginLeft: 24 }}
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
            backgroundColor: "#fff",
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
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: "#dcfce7",
                  padding: 8,
                  borderRadius: 10,
                  marginRight: 12,
                }}
              >
                <Ionicons name="trending-up" size={20} color="#374151" />
              </View>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#374151" }}
              >
                Income
              </Text>
            </View>
            <TouchableOpacity onPress={handleAddIncome}>
              <Ionicons name="add-circle" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {incomeTransactions.length === 0 &&
          projectedIncomeTransactions.length === 0 ? (
            <TouchableOpacity
              onPress={handleAddIncome}
              style={{
                padding: 20,
                alignItems: "center",
                backgroundColor: "#f8fafc",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderStyle: "dashed",
              }}
            >
              <Text
                style={{
                  color: "#6b7280",
                  textAlign: "center",
                  fontSize: 16,
                }}
              >
                No income transactions for this month
              </Text>
              <Text
                style={{
                  color: "#16a34a",
                  textAlign: "center",
                  fontSize: 14,
                  marginTop: 4,
                  fontWeight: "500",
                }}
              >
                Tap to add income
              </Text>
            </TouchableOpacity>
          ) : (
            // Combine actual and projected transactions for future months
            [
              ...incomeTransactions,
              ...(isFutureMonth
                ? projectedTransactions.filter((t) => t.type === "income")
                : []),
            ].map((transaction, index, array) => (
              <View
                key={transaction.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  paddingVertical: 8,
                  borderBottomWidth: index === array.length - 1 ? 0 : 1,
                  borderBottomColor: "#f3f4f6",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      color: "#374151",
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
                    <Text style={{ fontSize: 14, color: "#6b7280" }}>
                      {transaction.category} • {formatDate(transaction.date)}
                    </Text>
                    {(isRecurringTransaction(transaction) ||
                      transaction.id?.startsWith("projected-")) && (
                      <Ionicons
                        name="repeat"
                        size={12}
                        color="#6366f1"
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {editingTransactionId === transaction.id ? (
                    <>
                      <TextInput
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: "#16a34a",
                          marginRight: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: "#16a34a",
                          paddingHorizontal: 4,
                          minWidth: 80,
                          textAlign: "right",
                        }}
                        value={editingAmount}
                        onChangeText={setEditingAmount}
                        keyboardType="numeric"
                        autoFocus
                      />
                      <TouchableOpacity
                        onPress={handleSaveTransactionEdit}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: "#dcfce7",
                          marginRight: 4,
                        }}
                      >
                        <Ionicons name="checkmark" size={14} color="#16a34a" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCancelEdit}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: "#fee2e2",
                          marginRight: 8,
                        }}
                      >
                        <Ionicons name="close" size={14} color="#dc2626" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteTransaction(transaction)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: "#fee2e2",
                          marginRight: 8,
                        }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="#dc2626"
                        />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => handleEditTransaction(transaction)}
                        style={{ marginRight: 12 }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: "#374151",
                          }}
                        >
                          {formatCurrency(transaction.amount)}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )}

          {(incomeTransactions.length > 0 ||
            projectedIncomeTransactions.length > 0) && (
            <View
              style={{
                borderTopWidth: 2,
                borderTopColor: "#374151",
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
                  style={{ fontSize: 18, fontWeight: "800", color: "#374151" }}
                >
                  Total Income
                </Text>
                <Text
                  style={{ fontSize: 18, fontWeight: "800", color: "#16a34a" }}
                >
                  ${totalIncome.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Bank Recurring Suggestions Section */}
        {isBankConnected && recurringSuggestions.length > 0 && (
          <View
            style={{
              backgroundColor: "#fff",
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
            <View style={{ marginBottom: 20 }}>
              {/* Title Row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    backgroundColor: "#dbeafe",
                    padding: 8,
                    borderRadius: 10,
                    marginRight: 12,
                  }}
                >
                  <Ionicons name="repeat" size={20} color="#1d4ed8" />
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#1d4ed8",
                    flex: 1,
                  }}
                >
                  Bank Recurring Suggestions
                </Text>
              </View>

              {/* Status Row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    backgroundColor: "#f3f4f6",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  {recurringSuggestions.length} suggestions found
                </Text>
                <TouchableOpacity
                  onPress={handleRefreshPress}
                  disabled={isBankDataLoading}
                  style={{
                    padding: 6,
                    borderRadius: 6,
                    backgroundColor: isBankDataLoading ? "#e5e7eb" : "#dbeafe",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name={isBankDataLoading ? "refresh" : "refresh-outline"}
                    size={14}
                    color={isBankDataLoading ? "#9ca3af" : "#1d4ed8"}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={{
                      fontSize: 12,
                      color: isBankDataLoading ? "#9ca3af" : "#1d4ed8",
                      fontWeight: "600",
                    }}
                  >
                    {isBankDataLoading ? "Loading..." : "Refresh"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  lineHeight: 20,
                }}
              >
                Based on your bank transactions, we found these recurring
                payments. Tap to add them to your budget.
              </Text>
              {bankDataLastUpdated && (
                <Text
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    marginTop: 4,
                    fontStyle: "italic",
                  }}
                >
                  {getCacheStatus()} • {bankTransactions.length} transactions
                </Text>
              )}
            </View>

            {recurringSuggestions.slice(0, 5).map((suggestion, index) => (
              <TouchableOpacity
                key={`${suggestion.name}_${suggestion.amount}_${index}`}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: "#f8fafc",
                  borderRadius: 12,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                }}
                onPress={() => handleAddRecurringSuggestion(suggestion)}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: 2,
                    }}
                  >
                    {suggestion.name}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginRight: 8,
                      }}
                    >
                      {suggestion.frequency} • {suggestion.occurrences} times
                    </Text>
                    <View
                      style={{
                        backgroundColor:
                          suggestion.type === "income" ? "#dcfce7" : "#fee2e2",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color:
                            suggestion.type === "income"
                              ? "#16a34a"
                              : "#dc2626",
                        }}
                      >
                        {suggestion.type}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color:
                        suggestion.type === "income" ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {formatCurrency(suggestion.amount)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      marginTop: 2,
                    }}
                  >
                    {suggestion.category}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {recurringSuggestions.length > 5 && (
              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  alignItems: "center",
                  backgroundColor: "#f3f4f6",
                  borderRadius: 12,
                  marginTop: 8,
                }}
                onPress={() =>
                  navigation.navigate("AddTransaction", {
                    showBankSuggestions: true,
                    suggestions: recurringSuggestions,
                  })
                }
              >
                <Text
                  style={{
                    color: "#6366f1",
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  View All {recurringSuggestions.length} Suggestions
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Expenses Section */}
        <View
          style={{
            backgroundColor: "#fff",
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
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: "#fee2e2",
                  padding: 8,
                  borderRadius: 10,
                  marginRight: 12,
                }}
              >
                <Ionicons name="trending-down" size={20} color="#374151" />
              </View>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#374151" }}
              >
                Expenses
              </Text>
            </View>
            <TouchableOpacity onPress={handleAddExpense}>
              <Ionicons name="add-circle" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {expenseTransactions.length === 0 &&
          projectedExpenseTransactions.length === 0 ? (
            <TouchableOpacity
              onPress={handleAddExpense}
              style={{
                padding: 20,
                alignItems: "center",
                backgroundColor: "#f8fafc",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                borderStyle: "dashed",
              }}
            >
              <Text
                style={{
                  color: "#6b7280",
                  textAlign: "center",
                  fontSize: 16,
                }}
              >
                No expenses for this month
              </Text>
              <Text
                style={{
                  color: "#dc2626",
                  textAlign: "center",
                  fontSize: 14,
                  marginTop: 4,
                  fontWeight: "500",
                }}
              >
                Tap to add expense
              </Text>
            </TouchableOpacity>
          ) : (
            // Combine actual and projected transactions for future months
            [
              ...expenseTransactions,
              ...(isFutureMonth
                ? projectedTransactions.filter((t) => t.type === "expense")
                : []),
            ].map((transaction, index, array) => (
              <View
                key={transaction.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  paddingVertical: 8,
                  borderBottomWidth: index === array.length - 1 ? 0 : 1,
                  borderBottomColor: "#f3f4f6",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      color: "#374151",
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
                    <Text style={{ fontSize: 14, color: "#6b7280" }}>
                      {transaction.category} • {formatDate(transaction.date)}
                    </Text>
                    {(isRecurringTransaction(transaction) ||
                      transaction.id?.startsWith("projected-")) && (
                      <Ionicons
                        name="repeat"
                        size={12}
                        color="#6366f1"
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {editingTransactionId === transaction.id ? (
                    <>
                      <TextInput
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: "#dc2626",
                          marginRight: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: "#dc2626",
                          paddingHorizontal: 4,
                          minWidth: 80,
                          textAlign: "right",
                        }}
                        value={editingAmount}
                        onChangeText={setEditingAmount}
                        keyboardType="numeric"
                        autoFocus
                      />
                      <TouchableOpacity
                        onPress={handleSaveTransactionEdit}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: "#dcfce7",
                          marginRight: 4,
                        }}
                      >
                        <Ionicons name="checkmark" size={14} color="#16a34a" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleCancelEdit}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: "#fee2e2",
                          marginRight: 8,
                        }}
                      >
                        <Ionicons name="close" size={14} color="#dc2626" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteTransaction(transaction)}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          backgroundColor: "#fee2e2",
                          marginRight: 8,
                        }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="#dc2626"
                        />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => handleEditTransaction(transaction)}
                        style={{ marginRight: 12 }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "700",
                            color: "#374151",
                          }}
                        >
                          {formatCurrency(transaction.amount)}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )}

          {(expenseTransactions.length > 0 ||
            projectedExpenseTransactions.length > 0) && (
            <View
              style={{
                borderTopWidth: 2,
                borderTopColor: "#374151",
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
                  style={{ fontSize: 18, fontWeight: "800", color: "#374151" }}
                >
                  Total Expenses
                </Text>
                <Text
                  style={{ fontSize: 18, fontWeight: "800", color: "#dc2626" }}
                >
                  ${totalExpenses.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Budget Summary */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 24,
            shadowColor: "#000",
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
              color: "#1f2937",
            }}
          >
            Budget Summary
          </Text>

          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text
                style={{ fontSize: 16, color: "#6b7280", fontWeight: "500" }}
              >
                Net Income
              </Text>
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
                <Text
                  style={{ fontSize: 16, color: "#6b7280", fontWeight: "500" }}
                >
                  Savings (
                </Text>
                <TextInput
                  style={{
                    fontSize: 16,
                    color: "#16a34a",
                    fontWeight: "600",
                    width: 35,
                    textAlign: "center",
                    borderBottomWidth: 1,
                    borderBottomColor: "#16a34a",
                    paddingHorizontal: 4,
                  }}
                  value={savingsPercentage}
                  onChangeText={setSavingsPercentage}
                  keyboardType="numeric"
                  maxLength={3}
                  placeholder="20"
                />
                <Text
                  style={{ fontSize: 16, color: "#6b7280", fontWeight: "500" }}
                >
                  % of NI)
                </Text>
              </View>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#16a34a" }}
              >
                {formatCurrency(savingsAmount)}
              </Text>
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
                  style={{ fontSize: 16, color: "#6b7280", fontWeight: "500" }}
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
                    color: "#9ca3af",
                    fontStyle: "italic",
                  }}
                >
                  {calculatePaymentsRemaining(goal)}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text
                    style={{ fontSize: 12, color: "#9ca3af", marginRight: 4 }}
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
                style={{ fontSize: 16, color: "#6b7280", fontWeight: "500" }}
              >
                Discretionary Income
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
                <Text
                  style={{ fontSize: 16, color: "#6b7280", fontWeight: "500" }}
                >
                  Debt Payoff (
                </Text>
                <TextInput
                  style={{
                    fontSize: 16,
                    color: "#dc2626",
                    fontWeight: "600",
                    width: 35,
                    textAlign: "center",
                    borderBottomWidth: 1,
                    borderBottomColor: "#dc2626",
                    paddingHorizontal: 4,
                  }}
                  value={debtPayoffPercentage}
                  onChangeText={setDebtPayoffPercentage}
                  keyboardType="numeric"
                  maxLength={3}
                  placeholder="75"
                />
                <Text
                  style={{ fontSize: 16, color: "#6b7280", fontWeight: "500" }}
                >
                  % of DI)
                </Text>
              </View>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#dc2626" }}
              >
                {formatCurrency(debtPayoffAmount)}
              </Text>
            </View>
          </View>

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#374151",
              paddingTop: 20,
              position: "relative",
            }}
          >
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: "#374151",
              }}
            />
            <View
              style={{
                position: "absolute",
                top: 2,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: "#374151",
              }}
            />
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text
                style={{ fontSize: 20, fontWeight: "800", color: "#374151" }}
              >
                $ Available
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "800",
                  color: remainingBalance >= 0 ? "#16a34a" : "#dc2626",
                }}
              >
                {formatCurrency(remainingBalance)}
              </Text>
            </View>
          </View>

          {/* Save Settings Button */}
          <TouchableOpacity
            style={{
              backgroundColor: "#f3f4f6",
              borderRadius: 8,
              padding: 12,
              alignItems: "center",
              marginTop: 40,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
            onPress={handleSaveBudgetSettings}
          >
            <Text style={{ color: "#6b7280", fontSize: 14, fontWeight: "500" }}>
              Save Budget Settings
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
