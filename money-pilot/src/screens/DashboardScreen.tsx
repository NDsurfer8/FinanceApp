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

import { useData } from "../contexts/DataContext";
import {
  getUserNetWorthEntries,
  updateNetWorthFromAssetsAndDebts,
} from "../services/userData";

import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";
import { CustomTrendChart } from "../components/CustomTrendChart";

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { transactions, assets, debts, refreshInBackground } = useZeroLoading();
  const { goals, budgetSettings, refreshAssetsDebts } = useData();

  const [loading, setLoading] = useState(false);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(
    new Set()
  );
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();

  // Function to determine if name should be on a new line
  const shouldWrapName = (name: string) => {
    return name.length > 15;
  };

  // Background refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        refreshInBackground();
        // Also refresh trend data specifically with a small delay to ensure context is updated
        const refreshTrendData = async () => {
          // Small delay to ensure context has been updated
          setTimeout(async () => {
            const data = await getTrendData();
            setTrendData(data);
          }, 500); // Increased delay to ensure context is fully updated
        };
        refreshTrendData();
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

    if (totalDebts > 0 && totalAssets > 0 && totalAssets > totalDebts) {
      const debtToAssetRatio = (totalDebts / totalAssets) * 100;
      if (debtToAssetRatio > 50) {
        insights.push({
          id: "high-debt-ratio",
          type: "warning",
          icon: "card",
          title: "High Debt Ratio",
          message: `${debtToAssetRatio.toFixed(1)}% of assets are debt`,
        });
      }
    }

    if (monthlyTransactions.length >= 10) {
      insights.push({
        id: "active-month",
        type: "info",
        icon: "analytics",
        title: "Active Month",
        message: `${monthlyTransactions.length} transactions tracked`,
      });
    }

    // Emergency Fund Insight
    if (emergencyFundProgress >= 100) {
      insights.push({
        id: "emergency-fund-complete",
        type: "success",
        icon: "shield-checkmark",
        title: "Emergency Fund Complete!",
        message: `You have ${emergencyFundProgress.toFixed(
          0
        )}% of your 6-month target`,
      });
    } else if (emergencyFundProgress >= 50) {
      insights.push({
        id: "emergency-fund-progress",
        type: "info",
        icon: "shield",
        title: "Emergency Fund Progress",
        message: `${emergencyFundProgress.toFixed(
          0
        )}% of 6-month target ($${totalSavings.toLocaleString()})`,
      });
    } else if (emergencyFundProgress > 0) {
      insights.push({
        id: "build-emergency-fund",
        type: "warning",
        icon: "shield-outline",
        title: "Build Emergency Fund",
        message: `${emergencyFundProgress.toFixed(
          0
        )}% of 6-month target - keep saving!`,
      });
    }

    return insights;
  };

  const allInsights = React.useMemo(
    () => getInsights(),
    [
      monthlyIncome,
      availableAmount,
      totalDebts,
      totalAssets,
      monthlyTransactions.length,
      emergencyFundProgress,
      totalSavings,
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
        income,
        expenses,
        netWorth,
      });
    }
    return last6Months;
  };

  // Load trend data
  useEffect(() => {
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
  }, [user, transactions, assets, debts]); // Added assets and debts as dependencies

  // Prepare data for line chart
  const chartData = trendData.map((month) => ({
    x: month.month,
    y: month.income,
  }));

  const expensesData = trendData.map((month) => ({
    x: month.month,
    y: month.expenses,
  }));

  const netWorthData = trendData.map((month) => ({
    x: month.month,
    y: month.netWorth,
  }));

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
                fontSize: 28,
                fontWeight: "800",
                color: colors.text,
                letterSpacing: -0.5,
              }}
            >
              {translate("dashboard", isFriendlyMode)}
            </Text>

            {shouldWrapName(user?.displayName || "User") ? (
              <View style={{ marginTop: 6 }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.textSecondary,
                    fontWeight: "500",
                  }}
                >
                  Welcome back,
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    color: colors.textSecondary,
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
                  color: colors.textSecondary,
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
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 28,
            marginBottom: 24,
            shadowColor: colors.shadow,
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
                  fontSize: 22,
                  fontWeight: "700",
                  color: colors.text,
                  letterSpacing: -0.3,
                }}
              >
                Budget Snapshot
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
                    color: colors.textSecondary,
                    marginBottom: 4,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {translate("income", isFriendlyMode)}
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
                    color: colors.textSecondary,
                    marginBottom: 4,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {translate("expenses", isFriendlyMode)}
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
                    color: colors.textSecondary,
                    marginBottom: 4,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {translate("availableAmount", isFriendlyMode)}
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
            Balance Sheet Snapshot
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
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>
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
                  color: colors.textSecondary,
                  marginBottom: 4,
                }}
              >
                Total {translate("assets", isFriendlyMode)}
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
                Total {translate("liabilities", isFriendlyMode)}
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: colors.error }}
              >
                {formatCurrency(totalDebts)}
              </Text>
            </View>
          </View>
        </View>

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

        {/* 6-Month Trend - Line Chart */}
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
            6-Month Trend
          </Text>

          <CustomTrendChart
            incomeData={chartData}
            expensesData={expensesData}
            netWorthData={netWorthData}
            height={250}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
