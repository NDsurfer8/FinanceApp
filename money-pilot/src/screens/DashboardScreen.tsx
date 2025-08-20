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
import { useZeroLoading } from "../hooks/useZeroLoading";
import { useTransactionLimits } from "../hooks/useTransactionLimits";
import { useData } from "../contexts/DataContext";
import { useSubscription } from "../contexts/SubscriptionContext";
import { usePaywall } from "../hooks/usePaywall";
import { PREMIUM_FEATURES } from "../services/revenueCat";

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { transactions, assets, debts, refreshInBackground } = useZeroLoading();
  const { goals, budgetSettings } = useData();
  const { subscriptionStatus } = useSubscription();
  const { presentPaywall } = usePaywall();
  const {
    getTransactionLimitInfo,
    getIncomeSourceLimitInfo,
    getGoalLimitInfo,
  } = useTransactionLimits();
  const [loading, setLoading] = useState(false);

  // Check if user has access to AI Financial Advisor feature
  const hasAIAccess =
    subscriptionStatus?.features?.includes(
      PREMIUM_FEATURES.AI_FINANCIAL_ADVISOR
    ) || false;

  // Function to determine if name should be on a new line
  const shouldWrapName = (name: string) => {
    return name.length > 15;
  };

  // Background refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        refreshInBackground();
      }
    }, [user, refreshInBackground])
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

  // Calculate available amount (same as BudgetScreen)
  const savingsPercent = budgetSettings?.savingsPercentage
    ? parseFloat(budgetSettings.savingsPercentage)
    : 0;
  const debtPayoffPercent = budgetSettings?.debtPayoffPercentage
    ? parseFloat(budgetSettings.debtPayoffPercentage)
    : 0;
  const savingsAmount = netIncome * (savingsPercent / 100);

  // Calculate total goal contributions
  const totalGoalContributions = goals.reduce((total, goal) => {
    return total + goal.monthlyContribution;
  }, 0);

  const discretionaryIncome =
    netIncome - savingsAmount - totalGoalContributions;
  const debtPayoffAmount = discretionaryIncome * (debtPayoffPercent / 100);
  const availableAmount = discretionaryIncome - debtPayoffAmount;

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
  const transactionLimitInfo = getTransactionLimitInfo();
  const incomeLimitInfo = getIncomeSourceLimitInfo();
  const goalLimitInfo = getGoalLimitInfo();

  const quickActions = [
    {
      title: "Transaction",
      subtitle: transactionLimitInfo.isUnlimited
        ? "Unlimited"
        : `${transactionLimitInfo.current}/${transactionLimitInfo.limit}`,
      icon: "add-circle",
      onPress: () => navigation.navigate("AddTransaction"),
      color: "#6366f1",
    },
    {
      title: "Bank Data",
      icon: "card-outline",
      onPress: () => navigation.navigate("BankTransactions"),
      color: "#8b5cf6",
    },
    {
      title: "Asset",
      icon: "trending-up",
      onPress: () => navigation.navigate("AddAssetDebt", { type: "asset" }),
      color: "#10b981",
    },
    {
      title: "Debt",
      icon: "card",
      onPress: () => navigation.navigate("AddAssetDebt", { type: "debt" }),
      color: "#ef4444",
    },
    {
      title: "Goals",
      subtitle: goalLimitInfo.isUnlimited
        ? "Unlimited"
        : `${goalLimitInfo.current}/${goalLimitInfo.limit}`,
      icon: "flag",
      onPress: () => navigation.navigate("Goals", { openAddModal: true }),
      color: "#f59e0b",
    },
    {
      title: "AI Advisor",
      subtitle: "Premium",
      icon: "chatbubble-ellipses",
      onPress: hasAIAccess
        ? () => navigation.navigate("AIFinancialAdvisor")
        : () => {
            Alert.alert(
              "Premium Feature",
              "Vectra AI Financial Advisor is a premium feature. Upgrade to get personalized financial advice and insights.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Upgrade", onPress: presentPaywall },
              ]
            );
          },
      color: hasAIAccess ? "#06b6d4" : "#9ca3af",
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
    return `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
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
            marginBottom: 32,
            paddingTop: 8,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "800",
                color: "#1f2937",
                letterSpacing: -0.5,
              }}
            >
              Dashboard
            </Text>
            {shouldWrapName(user?.displayName || "User") ? (
              <View style={{ marginTop: 6 }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: "#6b7280",
                    fontWeight: "500",
                  }}
                >
                  Welcome back,
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: "#6b7280",
                    fontWeight: "500",
                    marginTop: 2,
                  }}
                >
                  {user?.displayName || "User"} 👋
                </Text>
              </View>
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  color: "#6b7280",
                  marginTop: 6,
                  fontWeight: "500",
                }}
              >
                Welcome back, {user?.displayName || "User"} 👋
              </Text>
            )}
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate("BalanceSheet")}
              style={{
                backgroundColor: "#6366f1",
                padding: 14,
                borderRadius: 14,
              }}
            >
              <Ionicons name="analytics-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("SharedFinance")}
              style={{
                backgroundColor: "#ec4899",
                padding: 14,
                borderRadius: 14,
              }}
            >
              <Ionicons name="people" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Monthly Overview - Large Card */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 28,
            marginBottom: 24,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <View
              style={{
                backgroundColor: "#f3f4f6",
                padding: 12,
                borderRadius: 14,
                marginRight: 16,
              }}
            >
              <Ionicons name="calendar" size={22} color="#6366f1" />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "700",
                  color: "#1f2937",
                  letterSpacing: -0.3,
                }}
              >
                Budget Snapshot
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#6b7280",
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
                  backgroundColor: "#dcfce7",
                  padding: 12,
                  borderRadius: 12,
                  marginRight: 16,
                  width: 50,
                  height: 50,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="trending-up" size={20} color="#16a34a" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#6b7280",
                    marginBottom: 4,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Income
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: "#16a34a",
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
                  backgroundColor: "#fee2e2",
                  padding: 12,
                  borderRadius: 12,
                  marginRight: 16,
                  width: 50,
                  height: 50,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="trending-down" size={20} color="#dc2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#6b7280",
                    marginBottom: 4,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Expenses
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: "#dc2626",
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
                  backgroundColor: availableAmount >= 0 ? "#dbeafe" : "#fef3c7",
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
                  color={availableAmount >= 0 ? "#2563eb" : "#d97706"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#6b7280",
                    marginBottom: 4,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Available
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: availableAmount >= 0 ? "#2563eb" : "#d97706",
                    letterSpacing: -0.3,
                  }}
                >
                  {formatCurrency(availableAmount)}
                </Text>
              </View>
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

          <View style={{ alignItems: "center" }}>
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

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={`action-${action.title}-${index}`}
                style={{
                  flex: 1,
                  minWidth: "48%",
                  backgroundColor: "#f8fafc",
                  padding: 16,
                  borderRadius: 16,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
                onPress={action.onPress}
              >
                <View
                  style={{
                    backgroundColor: action.color + "15",
                    padding: 10,
                    borderRadius: 10,
                    marginBottom: 8,
                  }}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={20}
                    color={action.color}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: "#374151",
                    textAlign: "center",
                    lineHeight: 16,
                  }}
                >
                  {action.title}
                </Text>
                {action.subtitle && (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "500",
                      color: "#6b7280",
                      textAlign: "center",
                      marginTop: 2,
                    }}
                  >
                    {action.subtitle}
                  </Text>
                )}
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
              key={`trend-${month.month}-${index}`}
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
