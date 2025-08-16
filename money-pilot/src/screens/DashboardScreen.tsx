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
import {
  getUserTransactions,
  getUserAssets,
  getUserDebts,
} from "../services/userData";

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [userTransactions, userAssets, userDebts] = await Promise.all([
        getUserTransactions(user.uid),
        getUserAssets(user.uid),
        getUserDebts(user.uid),
      ]);
      setTransactions(userTransactions);
      setAssets(userAssets);
      setDebts(userDebts);
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
      loadData();
    }
  }, [user]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadData();
      }
    }, [user])
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

  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === "income")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const netIncome = monthlyIncome - monthlyExpenses;

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

  // Premium Feature: Smart Insights
  const getInsights = () => {
    const insights = [];

    if (monthlyIncome > 0) {
      const savingsRate =
        ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
      if (savingsRate >= 20) {
        insights.push({
          type: "success",
          icon: "trending-up",
          title: "Excellent Savings Rate!",
          message: `You're saving ${savingsRate.toFixed(
            1
          )}% of your income this month`,
        });
      } else if (savingsRate < 0) {
        insights.push({
          type: "warning",
          icon: "alert-circle",
          title: "Spending More Than Income",
          message: "Consider reviewing your expenses",
        });
      }
    }

    if (totalDebts > 0 && totalAssets > 0) {
      const debtToAssetRatio = (totalDebts / totalAssets) * 100;
      if (debtToAssetRatio > 50) {
        insights.push({
          type: "warning",
          icon: "card",
          title: "High Debt Ratio",
          message: `${debtToAssetRatio.toFixed(1)}% of assets are debt`,
        });
      }
    }

    if (monthlyTransactions.length >= 10) {
      insights.push({
        type: "info",
        icon: "analytics",
        title: "Active Month",
        message: `${monthlyTransactions.length} transactions tracked`,
      });
    }

    return insights;
  };

  const insights = getInsights();

  // Premium Feature: Quick Actions
  const quickActions = [
    {
      title: "Add Income",
      icon: "add-circle",
      color: "#10b981",
      onPress: () => navigation.navigate("AddTransaction", { type: "income" }),
    },
    {
      title: "Add Expense",
      icon: "remove-circle",
      color: "#ef4444",
      onPress: () => navigation.navigate("AddTransaction", { type: "expense" }),
    },
    {
      title: "Add Asset",
      icon: "trending-up",
      color: "#3b82f6",
      onPress: () => navigation.navigate("AddAssetDebt", { type: "asset" }),
    },
    {
      title: "Add Debt",
      icon: "card",
      color: "#f59e0b",
      onPress: () => navigation.navigate("AddAssetDebt", { type: "debt" }),
    },
  ];

  // Premium Feature: Trend Analysis
  const getTrendData = () => {
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        return (
          tDate.getMonth() === date.getMonth() &&
          tDate.getFullYear() === date.getFullYear()
        );
      });

      const income = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const expenses = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      last6Months.push({
        month: date.toLocaleDateString("en-US", { month: "short" }),
        income,
        expenses,
        net: income - expenses,
      });
    }
    return last6Months;
  };

  const trendData = getTrendData();

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
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
              Dashboard
            </Text>
            <Text style={{ fontSize: 16, color: "#6b7280", marginTop: 4 }}>
              Your financial overview
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("BalanceSheet")}
            style={{
              backgroundColor: "#6366f1",
              padding: 12,
              borderRadius: 12,
            }}
          >
            <Ionicons name="analytics-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Monthly Overview - Large Card */}
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
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 20,
              color: "#1f2937",
            }}
          >
            This Month
          </Text>

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  backgroundColor: "#dcfce7",
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 12,
                  width: 60,
                  height: 60,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="trending-up" size={24} color="#16a34a" />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginBottom: 4,
                  fontWeight: "500",
                }}
              >
                Income
              </Text>
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: "#16a34a" }}
              >
                {formatCurrency(monthlyIncome)}
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  backgroundColor: "#fee2e2",
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 12,
                  width: 60,
                  height: 60,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="trending-down" size={24} color="#dc2626" />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginBottom: 4,
                  fontWeight: "500",
                }}
              >
                Expenses
              </Text>
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: "#dc2626" }}
              >
                {formatCurrency(monthlyExpenses)}
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <View
                style={{
                  backgroundColor: netIncome >= 0 ? "#dbeafe" : "#fef3c7",
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 12,
                  width: 60,
                  height: 60,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name={netIncome >= 0 ? "wallet" : "alert-circle"}
                  size={24}
                  color={netIncome >= 0 ? "#2563eb" : "#d97706"}
                />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  marginBottom: 4,
                  fontWeight: "500",
                }}
              >
                Net
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: netIncome >= 0 ? "#2563eb" : "#d97706",
                }}
              >
                {formatCurrency(netIncome)}
              </Text>
            </View>
          </View>
        </View>

        {/* Net Worth Card */}
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
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 20,
              color: "#1f2937",
            }}
          >
            Net Worth
          </Text>

          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 36,
                fontWeight: "800",
                color: netWorth >= 0 ? "#16a34a" : "#dc2626",
                marginBottom: 8,
              }}
            >
              {formatCurrency(netWorth)}
            </Text>
            <Text style={{ fontSize: 14, color: "#6b7280" }}>
              {netWorth >= 0 ? "Positive net worth" : "Negative net worth"}
            </Text>
          </View>

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  marginBottom: 4,
                  fontWeight: "500",
                }}
              >
                Assets
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#16a34a" }}
              >
                {formatCurrency(totalAssets)}
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6b7280",
                  marginBottom: 4,
                  fontWeight: "500",
                }}
              >
                Debts
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#dc2626" }}
              >
                {formatCurrency(totalDebts)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
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
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 20,
              color: "#1f2937",
            }}
          >
            Quick Actions
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  flex: 1,
                  minWidth: "45%",
                  backgroundColor: "#f8fafc",
                  padding: 20,
                  borderRadius: 16,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                }}
                onPress={action.onPress}
              >
                <View
                  style={{
                    backgroundColor: action.color + "20",
                    padding: 12,
                    borderRadius: 12,
                    marginBottom: 12,
                  }}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={24}
                    color={action.color}
                  />
                </View>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}
                >
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Smart Insights - Only show if there are insights */}
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
                    color={
                      insight.type === "success"
                        ? "#16a34a"
                        : insight.type === "warning"
                        ? "#dc2626"
                        : "#2563eb"
                    }
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

        {/* 6-Month Trend - Simplified */}
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
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 20,
              color: "#1f2937",
            }}
          >
            6-Month Trend
          </Text>

          {trendData.map((month, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 12,
                paddingVertical: 8,
                borderBottomWidth: index < trendData.length - 1 ? 1 : 0,
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
