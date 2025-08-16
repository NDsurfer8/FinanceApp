import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import { getUserTransactions } from "../services/userData";

interface BudgetScreenProps {
  navigation: any;
}

export const BudgetScreen: React.FC<BudgetScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const loadTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userTransactions = await getUserTransactions(user.uid);
      setTransactions(userTransactions);
    } catch (error) {
      console.error("Error loading transactions:", error);
      Alert.alert("Error", "Failed to load transactions");
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

  // Calculate income streams
  const incomeStreams = monthlyTransactions
    .filter((t) => t.type === "income")
    .reduce((acc, transaction) => {
      const category = transaction.category || "Other Income";
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += transaction.amount;
      return acc;
    }, {} as Record<string, number>);

  const totalIncome = (Object.values(incomeStreams) as number[]).reduce(
    (sum: number, amount: number) => sum + amount,
    0
  );

  // Calculate fixed expenses
  const fixedExpenseCategories = [
    "Rent",
    "Car Payment",
    "Insurance",
    "Utilities",
    "Internet",
    "Phone",
    "Subscriptions",
    "Credit Card",
    "Loan Payment",
  ];

  const fixedExpenses = monthlyTransactions
    .filter(
      (t) => t.type === "expense" && fixedExpenseCategories.includes(t.category)
    )
    .reduce((acc, transaction) => {
      const category = transaction.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += transaction.amount;
      return acc;
    }, {} as Record<string, number>);

  const totalFixedExpenses = (Object.values(fixedExpenses) as number[]).reduce(
    (sum: number, amount: number) => sum + amount,
    0
  );

  // Calculate variable expenses
  const variableExpenses = monthlyTransactions
    .filter(
      (t) =>
        t.type === "expense" && !fixedExpenseCategories.includes(t.category)
    )
    .reduce((acc, transaction) => {
      const category = transaction.category || "Other";
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += transaction.amount;
      return acc;
    }, {} as Record<string, number>);

  const totalVariableExpenses = (
    Object.values(variableExpenses) as number[]
  ).reduce((sum: number, amount: number) => sum + amount, 0);

  // Calculate budget metrics
  const totalExpenses = totalFixedExpenses + totalVariableExpenses;
  const netIncome = totalIncome - totalExpenses;
  const savingsAmount = totalIncome * 0.2; // 20% savings
  const discretionaryIncome = netIncome - savingsAmount;
  const debtPayoffAmount = discretionaryIncome * 0.75; // 75% of discretionary for debt
  const remainingBalance = discretionaryIncome - debtPayoffAmount;

  // Premium Features: Forecasting
  const getNext3MonthsForecast = () => {
    const forecast = [];
    for (let i = 1; i <= 3; i++) {
      const forecastDate = new Date(selectedMonth);
      forecastDate.setMonth(forecastDate.getMonth() + i);
      forecast.push({
        month: forecastDate.toLocaleDateString("en-US", { month: "short" }),
        income: totalIncome, // Assuming same income
        expenses: totalExpenses, // Assuming same expenses
        net: totalIncome - totalExpenses,
      });
    }
    return forecast;
  };

  const forecast = getNext3MonthsForecast();

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

    if (totalFixedExpenses > totalIncome * 0.5) {
      insights.push({
        type: "warning",
        icon: "alert-circle",
        title: "High Fixed Expenses",
        message: "Your fixed expenses are over 50% of income",
      });
    }

    if (Object.keys(incomeStreams).length >= 3) {
      insights.push({
        type: "success",
        icon: "diamond",
        title: "Diversified Income",
        message: `You have ${Object.keys(incomeStreams).length} income streams`,
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

  const handleAddIncome = () => {
    navigation.navigate("AddTransaction", { type: "income" });
  };

  const handleAddExpense = () => {
    navigation.navigate("AddTransaction", { type: "expense" });
  };

  const handleSetupRecurring = () => {
    Alert.alert(
      "Premium Feature",
      "Set up recurring income and expenses for automatic tracking and forecasting!",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Coming Soon", style: "default" },
      ]
    );
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    const newDate = new Date(selectedMonth);
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedMonth(newDate);
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

        {/* Premium Feature: 3-Month Forecast */}
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
                backgroundColor: "#dcfce7",
                padding: 8,
                borderRadius: 10,
                marginRight: 12,
              }}
            >
              <Ionicons name="trending-up" size={20} color="#16a34a" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1f2937" }}>
              3-Month Forecast
            </Text>
          </View>

          {forecast.map((month, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
                paddingVertical: 8,
                borderBottomWidth: index < forecast.length - 1 ? 1 : 0,
                borderBottomColor: "#f3f4f6",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  width: 40,
                  fontWeight: "500",
                }}
              >
                {month.month}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#16a34a",
                  width: 80,
                  fontWeight: "600",
                }}
              >
                {formatCurrency(month.income)}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#dc2626",
                  width: 80,
                  fontWeight: "600",
                }}
              >
                {formatCurrency(month.expenses)}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: month.net >= 0 ? "#16a34a" : "#dc2626",
                }}
              >
                {formatCurrency(month.net)}
              </Text>
            </View>
          ))}

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#e5e7eb",
              paddingTop: 16,
              marginTop: 8,
            }}
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#374151" }}
              >
                Total
              </Text>
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: "#16a34a" }}
              >
                {formatCurrency(forecast.reduce((sum, m) => sum + m.net, 0))}
              </Text>
            </View>
          </View>
        </View>

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

          {Object.entries(incomeStreams).map(([category, amount]) => (
            <View
              key={category}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: "#f3f4f6",
              }}
            >
              <Text
                style={{ fontSize: 16, color: "#374151", fontWeight: "500" }}
              >
                {category}
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#16a34a" }}
              >
                {formatCurrency(amount as number)}
              </Text>
            </View>
          ))}

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
                Total Net Income
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "800", color: "#16a34a" }}
              >
                {formatCurrency(totalIncome)}
              </Text>
            </View>
          </View>
        </View>

        {/* Fixed Expenses Section */}
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
                <Ionicons name="home" size={20} color="#dc2626" />
              </View>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#dc2626" }}
              >
                Fixed Expenses
              </Text>
            </View>
            <TouchableOpacity onPress={handleAddExpense}>
              <Ionicons name="add-circle" size={24} color="#dc2626" />
            </TouchableOpacity>
          </View>

          {Object.entries(fixedExpenses).map(([category, amount]) => (
            <View
              key={category}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: "#f3f4f6",
              }}
            >
              <Text
                style={{ fontSize: 16, color: "#374151", fontWeight: "500" }}
              >
                {category}
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#dc2626" }}
              >
                {formatCurrency(amount as number)}
              </Text>
            </View>
          ))}

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
                style={{ fontSize: 16, fontWeight: "700", color: "#dc2626" }}
              >
                Total Fixed Expenses
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#dc2626" }}
              >
                {formatCurrency(totalFixedExpenses)}
              </Text>
            </View>
          </View>
        </View>

        {/* Variable Expenses Section */}
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
              marginBottom: 20,
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
              <Ionicons name="cart" size={20} color="#d97706" />
            </View>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#d97706",
              }}
            >
              Variable Expenses
            </Text>
          </View>

          {Object.entries(variableExpenses).map(([category, amount]) => (
            <View
              key={category}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: "#f3f4f6",
              }}
            >
              <Text
                style={{ fontSize: 16, color: "#374151", fontWeight: "500" }}
              >
                {category}
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#d97706" }}
              >
                {formatCurrency(amount as number)}
              </Text>
            </View>
          ))}

          <View
            style={{
              borderTopWidth: 2,
              borderTopColor: "#d97706",
              paddingTop: 16,
              marginTop: 8,
            }}
          >
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#d97706" }}
              >
                Total Variable Expenses
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#d97706" }}
              >
                {formatCurrency(totalVariableExpenses)}
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
                Total Expenses (Fixed + Variable)
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#dc2626" }}
              >
                {formatCurrency(totalExpenses)}
              </Text>
            </View>
          </View>

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
                Savings (20%)
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#16a34a" }}
              >
                {formatCurrency(savingsAmount)}
              </Text>
            </View>
          </View>

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
                Debt Payoff (75% of Discretionary)
              </Text>
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
