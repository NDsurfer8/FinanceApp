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
import { StandardHeader } from "../components/StandardHeader";
import { CustomTrendChart } from "../components/CustomTrendChart";
import { FloatingAIChatbot } from "../components/FloatingAIChatbot";

interface DashboardScreenProps {
  navigation: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const {
    transactions,
    assets,
    debts,
    recurringTransactions,
    refreshInBackground,
  } = useZeroLoading();
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
        // Refresh trend data when dashboard comes into focus
        const refreshTrendData = async () => {
          // Dashboard focused - refreshing trend data
          const data = await getTrendData();
          setTrendData(data);
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

  // Calculate recurring monthly amounts
  const recurringMonthlyIncome = recurringTransactions
    .filter((t) => t.type === "income" && t.isActive)
    .reduce((sum: number, rt: any) => {
      let monthlyAmount = rt.amount;
      if (rt.frequency === "weekly") {
        monthlyAmount = rt.amount * 4; // 4 weeks in a month
      } else if (rt.frequency === "biweekly") {
        monthlyAmount = rt.amount * 2; // 2 bi-weekly periods in a month
      } else if (rt.frequency === "monthly") {
        monthlyAmount = rt.amount * 1; // 1 month period
      }
      return sum + monthlyAmount;
    }, 0);

  const recurringMonthlyExpenses = recurringTransactions
    .filter((t) => t.type === "expense" && t.isActive)
    .reduce((sum: number, rt: any) => {
      let monthlyAmount = rt.amount;
      if (rt.frequency === "weekly") {
        monthlyAmount = rt.amount * 4; // 4 weeks in a month
      } else if (rt.frequency === "biweekly") {
        monthlyAmount = rt.amount * 2; // 2 bi-weekly periods in a month
      } else if (rt.frequency === "monthly") {
        monthlyAmount = rt.amount * 1; // 1 month period
      }
      return sum + monthlyAmount;
    }, 0);

  // Total monthly amounts including recurring
  const monthlyIncome =
    monthlyTransactions
      .filter((t) => t.type === "income")
      .reduce((sum: number, t: any) => sum + t.amount, 0) +
    recurringMonthlyIncome;

  const monthlyExpenses =
    monthlyTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum: number, t: any) => sum + t.amount, 0) +
    recurringMonthlyExpenses;

  const netIncome = monthlyIncome - monthlyExpenses;

  // Calculate available amount (same as BudgetScreen)
  const savingsPercent = budgetSettings?.savingsPercentage
    ? parseFloat(budgetSettings.savingsPercentage)
    : 0;
  const debtPayoffPercent = budgetSettings?.debtPayoffPercentage
    ? parseFloat(budgetSettings.debtPayoffPercentage)
    : 0;
  const savingsAmount = netIncome * (savingsPercent / 100);
  const debtPayoffAmount = netIncome * (debtPayoffPercent / 100);

  // Calculate total goal contributions
  const totalGoalContributions = goals.reduce((total, goal) => {
    return total + goal.monthlyContribution;
  }, 0);

  const discretionaryIncome =
    netIncome - savingsAmount - debtPayoffAmount - totalGoalContributions;
  const availableAmount = discretionaryIncome;

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

    // Recurring Transaction Insights
    if (recurringMonthlyIncome > 0 || recurringMonthlyExpenses > 0) {
      const totalRecurring = recurringMonthlyIncome + recurringMonthlyExpenses;
      const recurringPercentage =
        monthlyIncome > 0 ? (totalRecurring / monthlyIncome) * 100 : 0;

      if (recurringPercentage > 80) {
        insights.push({
          id: "high-recurring-commitments",
          type: "info",
          icon: "repeat",
          title: "High Recurring Commitments",
          message: `${recurringPercentage.toFixed(
            0
          )}% of your monthly finances are recurring - good predictability!`,
        });
      } else if (recurringPercentage > 50) {
        insights.push({
          id: "moderate-recurring-commitments",
          type: "info",
          icon: "repeat",
          title: "Moderate Recurring Commitments",
          message: `${recurringPercentage.toFixed(
            0
          )}% of your monthly finances are recurring - balanced approach!`,
        });
      } else if (recurringPercentage > 0) {
        insights.push({
          id: "low-recurring-commitments",
          type: "info",
          icon: "repeat",
          title: "Low Recurring Commitments",
          message: `${recurringPercentage.toFixed(
            0
          )}% of your monthly finances are recurring - flexible spending!`,
        });
      }
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
      recurringMonthlyIncome,
      recurringMonthlyExpenses,
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

    // Calculate the 6 months ending with the current month
    // This will show: [5 months ago, 4 months ago, 3 months ago, 2 months ago, 1 month ago, current month]
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);

      // Debug: Log what month we're calculating

      const monthTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        return (
          tDate.getMonth() === date.getMonth() &&
          tDate.getFullYear() === date.getFullYear()
        );
      });

      // Calculate actual transactions for this month
      const actualIncome = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const actualExpenses = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      // Calculate recurring amounts for this month (only if recurring transaction was active during this month)
      const recurringIncome = recurringTransactions
        .filter((t) => t.type === "income" && t.isActive)
        .reduce((sum: number, rt: any) => {
          // Check if this recurring transaction was active during the month we're calculating
          const transactionStartDate = new Date(rt.startDate);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

          // Only include if transaction started before or during this month
          if (transactionStartDate <= monthEnd) {
            let monthlyAmount = rt.amount;
            if (rt.frequency === "weekly") {
              monthlyAmount = rt.amount * 4;
            } else if (rt.frequency === "biweekly") {
              monthlyAmount = rt.amount * 2;
            } else if (rt.frequency === "monthly") {
              monthlyAmount = rt.amount * 1;
            }
            return sum + monthlyAmount;
          }
          return sum;
        }, 0);

      const recurringExpenses = recurringTransactions
        .filter((t) => t.type === "expense" && t.isActive)
        .reduce((sum: number, rt: any) => {
          // Check if this recurring transaction was active during the month we're calculating
          const transactionStartDate = new Date(rt.startDate);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

          // Only include if transaction started before or during this month
          if (transactionStartDate <= monthEnd) {
            let monthlyAmount = rt.amount;
            if (rt.frequency === "weekly") {
              monthlyAmount = rt.amount * 4;
            } else if (rt.frequency === "biweekly") {
              monthlyAmount = rt.amount * 2;
            } else if (rt.frequency === "monthly") {
              monthlyAmount = rt.amount * 1;
            }
            return sum + monthlyAmount;
          }
          return sum;
        }, 0);

      // Total monthly amounts including recurring
      const totalIncome = actualIncome + recurringIncome;
      const totalExpenses = actualExpenses + recurringExpenses;

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
        income: totalIncome,
        expenses: totalExpenses,
        netWorth,
        // Additional breakdown for insights
        actualIncome,
        actualExpenses,
        recurringIncome,
        recurringExpenses,
      });
    }

    // Debug logging to verify recurring transaction calculations

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
  }, [user, transactions, recurringTransactions, netWorth, assets, debts]); // Added assets and debts dependencies

  // Force refresh when assets or debts change (immediate update)
  useEffect(() => {
    if (user && (assets.length > 0 || debts.length > 0)) {
      const forceRefresh = async () => {
        // Force refreshing chart data due to assets/debts change
        const data = await getTrendData();
        setTrendData(data);
      };
      forceRefresh();
    }
  }, [assets, debts, user]);

  // Prepare data for line chart - Make it reactive to source data
  const chartData = React.useMemo(() => {
    if (!user || !assets || !debts || !transactions || !recurringTransactions)
      return [];

    // Use the existing trendData state which is already calculated
    return trendData.map((month) => ({
      x: month.month,
      y: month.income,
    }));
  }, [trendData, user, assets, debts, transactions, recurringTransactions]);

  const expensesData = React.useMemo(() => {
    if (!user || !assets || !debts || !transactions || !recurringTransactions)
      return [];

    // Use the existing trendData state which is already calculated
    return trendData.map((month) => ({
      x: month.month,
      y: month.expenses,
    }));
  }, [trendData, user, assets, debts, transactions, recurringTransactions]);

  const netWorthData = React.useMemo(() => {
    if (!user || !assets || !debts || !transactions || !recurringTransactions)
      return [];

    // Use the existing trendData state which is already calculated
    return trendData.map((month) => ({
      x: month.month,
      y: month.netWorth,
    }));
  }, [trendData, user, assets, debts, transactions, recurringTransactions]);

  const formatCurrency = (amount: number) => {
    return `$${Math.round(amount).toLocaleString()}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <StandardHeader
          title={translate("dashboard", isFriendlyMode)}
          subtitle={`Welcome back, ${user?.displayName || "User"}`}
          showBackButton={false}
          rightComponent={
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate("FinancialRisk")}
                style={{
                  backgroundColor: colors.error,
                  padding: 14,
                  borderRadius: 14,
                  shadowColor: colors.error,
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                }}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={22}
                  color={colors.buttonText}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate("SharedFinance")}
                style={{
                  backgroundColor: "#8b5cf6",
                  padding: 14,
                  borderRadius: 14,
                  shadowColor: "#8b5cf6",
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                }}
              >
                <Ionicons name="people" size={22} color={colors.buttonText} />
              </TouchableOpacity>
            </View>
          }
        />

        {/* Monthly Overview - Large Card */}
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
              marginBottom: 20,
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
                  fontSize: 20,
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
                  backgroundColor: colors.surfaceSecondary,
                  padding: 12,
                  borderRadius: 12,
                  marginRight: 16,
                  width: 50,
                  height: 50,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="trending-up" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {translate("income", isFriendlyMode)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        "Income Breakdown",
                        "Income includes both actual transactions this month and recurring income (salary, rent, etc.) that automatically occurs each month.",
                        [{ text: "Got it" }]
                      );
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: colors.success,
                    letterSpacing: -0.3,
                  }}
                >
                  {formatCurrency(monthlyIncome)}
                </Text>
                {/* Show breakdown of actual vs recurring income */}
                {recurringMonthlyIncome > 0 && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {formatCurrency(monthlyIncome - recurringMonthlyIncome)}{" "}
                    recorded + {formatCurrency(recurringMonthlyIncome)}{" "}
                    recurring
                  </Text>
                )}
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  padding: 12,
                  borderRadius: 12,
                  marginRight: 16,
                  width: 50,
                  height: 50,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="trending-down" size={20} color={colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {translate("expenses", isFriendlyMode)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        "Expenses Breakdown",
                        "Expenses include both actual transactions this month and recurring expenses (mortgage, utilities, etc.) that automatically occur each month.",
                        [{ text: "Got it" }]
                      );
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: colors.error,
                    letterSpacing: -0.3,
                  }}
                >
                  {formatCurrency(monthlyExpenses)}
                </Text>
                {/* Show breakdown of actual vs recurring expenses */}
                {recurringMonthlyExpenses > 0 && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {formatCurrency(monthlyExpenses - recurringMonthlyExpenses)}{" "}
                    recorded + {formatCurrency(recurringMonthlyExpenses)}{" "}
                    recurring
                  </Text>
                )}
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: colors.surfaceSecondary,
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
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {translate("availableAmount", isFriendlyMode)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        "Available Amount Calculation",
                        `Formula:\nNet Income - Savings (${savingsPercent}%) - Goal Contributions - Debt Payoff (${debtPayoffPercent}%)\n\nBreakdown:\n\nGross Income:     ${formatCurrency(
                          monthlyIncome
                        )}\nExpenses:         ${formatCurrency(
                          monthlyExpenses
                        )}\n─────────────────────────\nNet Income:       ${formatCurrency(
                          netIncome
                        )}\n\nSavings:          ${formatCurrency(
                          savingsAmount
                        )}\nGoal Contrib:     ${formatCurrency(
                          totalGoalContributions
                        )}\nDebt Payoff:      ${formatCurrency(
                          debtPayoffAmount
                        )}\n─────────────────────────\nAvailable:        ${formatCurrency(
                          availableAmount
                        )}`,
                        [{ text: "Got it", style: "default" }]
                      );
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: availableAmount >= 0 ? colors.warning : colors.error,
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
                color: netWorth >= 0 ? colors.success : colors.error,
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
            6-Month Trend (Last 6 Months)
          </Text>

          <CustomTrendChart
            key={`chart-${trendData.length}-${JSON.stringify(
              trendData.map((m) => m.netWorth)
            )}`}
            incomeData={chartData}
            expensesData={expensesData}
            netWorthData={netWorthData}
            height={250}
          />

          {/* Chart Legend and Notes */}
          <View style={{ marginTop: 16, paddingHorizontal: 8 }}>
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight: 16,
              }}
            >
              Chart shows the last 6 months ending with the current month.
              Includes both actual transactions and recurring commitments.
              Recurring amounts only appear for months after they were created.
            </Text>
          </View>
        </View>
      </ScrollView>
      <FloatingAIChatbot />
    </SafeAreaView>
  );
};
