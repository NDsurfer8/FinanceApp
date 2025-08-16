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
import {
  CustomPieChart,
  CustomLineChart,
  CustomBarChart,
} from "../components/BeautifulCharts";
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
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#374151" }}>
            Financial Dashboard
          </Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Premium Feature", "Export your financial report!")
            }
          >
            <Ionicons name="share-outline" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {/* Premium Feature: Smart Insights */}
        {insights.length > 0 && (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons
                name="bulb"
                size={20}
                color="#f59e0b"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{ fontSize: 18, fontWeight: "600", color: "#374151" }}
              >
                Smart Insights
              </Text>
            </View>

            {insights.map((insight, index) => (
              <View key={index} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name={insight.icon as any}
                    size={16}
                    color={
                      insight.type === "success"
                        ? "#10b981"
                        : insight.type === "warning"
                        ? "#ef4444"
                        : "#3b82f6"
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
                  style={{ fontSize: 12, color: "#6b7280", marginLeft: 24 }}
                >
                  {insight.message}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Premium Feature: Quick Actions */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 16,
              color: "#374151",
            }}
          >
            Quick Actions
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  flex: 1,
                  minWidth: "45%",
                  backgroundColor: "#f3f4f6",
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                onPress={action.onPress}
              >
                <Ionicons
                  name={action.icon as any}
                  size={24}
                  color={action.color}
                  style={{ marginBottom: 8 }}
                />
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}
                >
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Monthly Overview */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 16,
              color: "#374151",
            }}
          >
            This Month
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                Income
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#10b981" }}
              >
                {formatCurrency(monthlyIncome)}
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                Expenses
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#ef4444" }}
              >
                {formatCurrency(monthlyExpenses)}
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                Net
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: netIncome >= 0 ? "#10b981" : "#ef4444",
                }}
              >
                {formatCurrency(netIncome)}
              </Text>
            </View>
          </View>
        </View>

        {/* Net Worth */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 16,
              color: "#374151",
            }}
          >
            Net Worth
          </Text>

          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "700",
                color: netWorth >= 0 ? "#10b981" : "#ef4444",
              }}
            >
              {formatCurrency(netWorth)}
            </Text>
          </View>

          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                Assets
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#10b981" }}
              >
                {formatCurrency(totalAssets)}
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                Debts
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#ef4444" }}
              >
                {formatCurrency(totalDebts)}
              </Text>
            </View>
          </View>
        </View>

        {/* Premium Feature: 6-Month Trend */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 16,
              color: "#374151",
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
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 14, color: "#6b7280", width: 40 }}>
                {month.month}
              </Text>
              <Text style={{ fontSize: 14, color: "#10b981", width: 80 }}>
                {formatCurrency(month.income)}
              </Text>
              <Text style={{ fontSize: 14, color: "#ef4444", width: 80 }}>
                {formatCurrency(month.expenses)}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: month.net >= 0 ? "#10b981" : "#ef4444",
                }}
              >
                {formatCurrency(month.net)}
              </Text>
            </View>
          ))}
        </View>

        {/* Premium Feature: Export & Share */}
        <TouchableOpacity
          style={{
            backgroundColor: "#6366f1",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            marginBottom: 16,
          }}
          onPress={() =>
            Alert.alert(
              "Premium Feature",
              "Export your financial report as PDF!"
            )
          }
        >
          <Ionicons
            name="document-text"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            Export Financial Report
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
