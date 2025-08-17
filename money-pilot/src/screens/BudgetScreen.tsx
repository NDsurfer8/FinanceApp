import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import {
  getUserTransactions,
  removeTransaction,
  getUserBudgetSettings,
  saveBudgetSettings,
  updateBudgetSettings,
  BudgetSettings,
  getUserGoals,
  generateRecurringTransactions,
  getUserRecurringTransactions,
  skipRecurringTransactionForMonth,
} from "../services/userData";

interface BudgetScreenProps {
  navigation: any;
}

export const BudgetScreen: React.FC<BudgetScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [savingsPercentage, setSavingsPercentage] = useState("20");
  const [debtPayoffPercentage, setDebtPayoffPercentage] = useState("75");
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings | null>(
    null
  );
  const [goals, setGoals] = useState<any[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<any[]>([]);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [editingAmount, setEditingAmount] = useState("");

  const loadTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Generate recurring transactions for the selected month
      await generateRecurringTransactions(user.uid, selectedMonth);

      const [
        userTransactions,
        userBudgetSettings,
        userGoals,
        userRecurringTransactions,
      ] = await Promise.all([
        getUserTransactions(user.uid),
        getUserBudgetSettings(user.uid),
        getUserGoals(user.uid),
        getUserRecurringTransactions(user.uid),
      ]);
      setTransactions(userTransactions);
      setBudgetSettings(userBudgetSettings);
      setGoals(userGoals);
      setRecurringTransactions(userRecurringTransactions);

      // Set the percentages from saved settings or defaults
      if (userBudgetSettings) {
        setSavingsPercentage(userBudgetSettings.savingsPercentage.toString());
        setDebtPayoffPercentage(
          userBudgetSettings.debtPayoffPercentage.toString()
        );
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadTransactions();
      }
    }, [user])
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

  // Handle delete transaction
  const handleDeleteTransaction = async (transaction: any) => {
    if (!user) return;

    const isRecurring = isRecurringTransaction(transaction);

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
                // Delete the current transaction
                await removeTransaction(user.uid, transaction.id);

                // Find the recurring transaction and skip this month
                const recurringTransaction = recurringTransactions.find(
                  (recurring) =>
                    recurring.name === transaction.description &&
                    recurring.amount === transaction.amount &&
                    recurring.type === transaction.type &&
                    recurring.isActive
                );

                if (recurringTransaction?.id) {
                  const monthKey = `${selectedMonth.getFullYear()}-${String(
                    selectedMonth.getMonth() + 1
                  ).padStart(2, "0")}`;
                  await skipRecurringTransactionForMonth(
                    recurringTransaction.id,
                    monthKey
                  );
                }

                await loadTransactions();
                Alert.alert(
                  "Success",
                  "Transaction occurrence deleted and skipped for this month!"
                );
              } catch (error) {
                console.error("Error deleting transaction:", error);
                Alert.alert("Error", "Failed to delete transaction");
              }
            },
          },
          {
            text: "Delete All Future Occurrences",
            style: "destructive",
            onPress: async () => {
              try {
                // Find the recurring transaction and delete it
                const recurringTransaction = recurringTransactions.find(
                  (recurring) =>
                    recurring.name === transaction.description &&
                    recurring.amount === transaction.amount &&
                    recurring.type === transaction.type &&
                    recurring.isActive
                );

                if (recurringTransaction?.id) {
                  const { deleteRecurringTransaction } = await import(
                    "../services/userData"
                  );
                  await deleteRecurringTransaction(recurringTransaction.id);
                  await loadTransactions();
                  Alert.alert(
                    "Success",
                    "Recurring transaction deleted successfully!"
                  );
                } else {
                  Alert.alert(
                    "Error",
                    "Could not find recurring transaction to delete"
                  );
                }
              } catch (error) {
                console.error("Error deleting recurring transaction:", error);
                Alert.alert("Error", "Failed to delete recurring transaction");
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
                await removeTransaction(user.uid, transaction.id);
                await loadTransactions();
                Alert.alert("Success", "Transaction deleted successfully");
              } catch (error) {
                console.error("Error deleting transaction:", error);
                Alert.alert("Error", "Failed to delete transaction");
              }
            },
          },
        ]
      );
    }
  };

  // Calculate totals
  const incomeTransactions = monthlyTransactions.filter(
    (t) => t.type === "income"
  );
  const expenseTransactions = monthlyTransactions.filter(
    (t) => t.type === "expense"
  );

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = expenseTransactions.reduce(
    (sum, t) => sum + t.amount,
    0
  );
  const netIncome = totalIncome - totalExpenses;

  // Calculate budget metrics
  const savingsPercent = parseFloat(savingsPercentage) || 0;
  const debtPayoffPercent = parseFloat(debtPayoffPercentage) || 0;
  const savingsAmount = totalIncome * (savingsPercent / 100);

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

  const handleSetupRecurring = () => {
    navigation.navigate("RecurringTransactions", {
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

    // Generate recurring transactions for the new month and reload data
    if (user) {
      try {
        await generateRecurringTransactions(user.uid, newDate);
        await loadTransactions();
      } catch (error) {
        console.error(
          "Error generating recurring transactions for new month:",
          error
        );
      }
    }
  };

  const handleSaveBudgetSettings = async () => {
    if (!user) return;

    try {
      const newSettings: BudgetSettings = {
        savingsPercentage: parseFloat(savingsPercentage) || 20,
        debtPayoffPercentage: parseFloat(debtPayoffPercentage) || 75,
        userId: user.uid,
        updatedAt: Date.now(),
      };

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

      await loadTransactions(); // Reload to get updated settings
      Alert.alert("Success", "Budget settings saved successfully!");
    } catch (error) {
      console.error("Error saving budget settings:", error);
      Alert.alert("Error", "Failed to save budget settings");
    }
  };

  const handleEditTransaction = (transaction: any) => {
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

      // Update the transaction amount
      const updatedTransaction = {
        ...transactionToUpdate,
        amount: newAmount,
      };

      // Import the update function
      const { updateTransaction } = await import("../services/userData");
      await updateTransaction(updatedTransaction);

      // Reset editing state
      setEditingTransactionId(null);
      setEditingAmount("");

      // Reload transactions
      await loadTransactions();
      Alert.alert("Success", "Transaction amount updated successfully!");
    } catch (error) {
      console.error("Error updating transaction:", error);
      Alert.alert("Error", "Failed to update transaction amount");
    }
  };

  const handleCancelEdit = () => {
    setEditingTransactionId(null);
    setEditingAmount("");
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ fontSize: 16, color: "#6b7280" }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <TouchableOpacity
          style={{
            backgroundColor: "#6366f1",
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#6366f1",
            shadowOpacity: 0.3,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
          onPress={handleSetupRecurring}
        >
          <Ionicons
            name="settings"
            size={20}
            color="#fff"
            style={{ marginRight: 12 }}
          />
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            Setup Recurring Income & Expenses
          </Text>
        </TouchableOpacity>

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
              <View key={index} style={{ marginBottom: 12 }}>
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
                <Ionicons name="trending-up" size={20} color="#16a34a" />
              </View>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#16a34a" }}
              >
                Income Streams
              </Text>
            </View>
            <TouchableOpacity onPress={handleAddIncome}>
              <Ionicons name="add-circle" size={24} color="#16a34a" />
            </TouchableOpacity>
          </View>

          {incomeTransactions.length === 0 ? (
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
            incomeTransactions.map((transaction) => (
              <View
                key={transaction.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
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
                    {isRecurringTransaction(transaction) && (
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
                            color: "#16a34a",
                          }}
                        >
                          {formatCurrency(transaction.amount)}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteTransaction(transaction)}
                        style={{
                          padding: 8,
                          borderRadius: 8,
                          backgroundColor: "#fee2e2",
                        }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#dc2626"
                        />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )}

          <View
            style={{
              borderTopWidth: 2,
              borderTopColor: "#16a34a",
              paddingTop: 16,
              marginTop: 8,
            }}
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "800", color: "#16a34a" }}
              >
                Total Income
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "800", color: "#16a34a" }}
              >
                {formatCurrency(totalIncome)}
              </Text>
            </View>
          </View>
        </View>

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
                <Ionicons name="trending-down" size={20} color="#dc2626" />
              </View>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#dc2626" }}
              >
                Expenses
              </Text>
            </View>
            <TouchableOpacity onPress={handleAddExpense}>
              <Ionicons name="add-circle" size={24} color="#dc2626" />
            </TouchableOpacity>
          </View>

          {expenseTransactions.length === 0 ? (
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
            expenseTransactions.map((transaction) => (
              <View
                key={transaction.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  paddingVertical: 8,
                  borderBottomWidth: 1,
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
                    {isRecurringTransaction(transaction) && (
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
                            color: "#dc2626",
                          }}
                        >
                          {formatCurrency(transaction.amount)}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteTransaction(transaction)}
                        style={{
                          padding: 8,
                          borderRadius: 8,
                          backgroundColor: "#fee2e2",
                        }}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#dc2626"
                        />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )}

          <View
            style={{
              borderTopWidth: 2,
              borderTopColor: "#dc2626",
              paddingTop: 16,
              marginTop: 8,
            }}
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "800", color: "#dc2626" }}
              >
                Total Expenses
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "800", color: "#dc2626" }}
              >
                {formatCurrency(totalExpenses)}
              </Text>
            </View>
          </View>
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
                    color: "#8b5cf6",
                    fontWeight: "600",
                    width: 35,
                    textAlign: "center",
                    borderBottomWidth: 1,
                    borderBottomColor: "#8b5cf6",
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
                style={{ fontSize: 16, fontWeight: "700", color: "#8b5cf6" }}
              >
                {formatCurrency(debtPayoffAmount)}
              </Text>
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
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
                style={{ fontSize: 16, fontWeight: "700", color: "#d97706" }}
              >
                {formatCurrency(discretionaryIncome)}
              </Text>
            </View>
          </View>

          <View
            style={{
              borderTopWidth: 2,
              borderTopColor: "#f97316",
              paddingTop: 20,
            }}
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text
                style={{ fontSize: 20, fontWeight: "800", color: "#f97316" }}
              >
                End Balance
              </Text>
              <Text
                style={{ fontSize: 20, fontWeight: "800", color: "#f97316" }}
              >
                {formatCurrency(remainingBalance)}
              </Text>
            </View>
          </View>

          {/* Save Settings Button */}
          <TouchableOpacity
            style={{
              backgroundColor: "#6366f1",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginTop: 20,
            }}
            onPress={handleSaveBudgetSettings}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Save Budget Settings
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
