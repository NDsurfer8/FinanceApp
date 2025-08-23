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
import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";
import { gradeRatio, fmt } from "../utils/ratioGrading";
import {
  getUserAssets,
  getUserDebts,
  getUserTransactions,
} from "../services/userData";

interface FinancialRiskScreenProps {
  navigation: any;
}

export const FinancialRiskScreen: React.FC<FinancialRiskScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();
  const [assets, setAssets] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [userAssets, userDebts, userTransactions] = await Promise.all([
        getUserAssets(user.uid),
        getUserDebts(user.uid),
        getUserTransactions(user.uid),
      ]);
      setAssets(userAssets);
      setDebts(userDebts);
      setTransactions(userTransactions);
    } catch (error) {
      console.error("Error loading balance sheet data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadData();
      }
    }, [user])
  );

  // Calculate totals
  const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0);
  const totalLiabilities = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const netWorth = totalAssets - totalLiabilities;
  const totalMonthlyDebtPayments = debts.reduce(
    (sum, debt) => sum + debt.payment,
    0
  );

  // Calculate current month income and expenses
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
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate savings breakdown
  const totalSavings = assets
    .filter((asset) => asset.type === "savings")
    .reduce((sum, asset) => sum + asset.balance, 0);
  const emergencyFundTarget = monthlyExpenses * 6;
  const emergencyFundProgress =
    emergencyFundTarget > 0 ? (totalSavings / emergencyFundTarget) * 100 : 0;

  // Calculate financial ratios
  const liquidityRatio =
    totalLiabilities > 0 ? totalAssets / totalLiabilities : 0;
  const monthlyLivingExpensesCoverage =
    monthlyExpenses > 0 ? totalAssets / monthlyExpenses : 0;
  const debtAssetRatio =
    totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
  const debtSafetyRatio =
    monthlyIncome > 0 ? (totalMonthlyDebtPayments / monthlyIncome) * 100 : 0;

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatRatio = (ratio: number) => {
    return ratio.toFixed(2);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  const getRatioStatus = (ratio: number, type: string) => {
    const mode = isFriendlyMode ? "friendly" : "pro";
    let ratioKey: any;

    switch (type) {
      case "liquidity":
        ratioKey = "liquidity";
        break;
      case "coverage":
        ratioKey = "monthsCovered";
        break;
      case "debtAsset":
        ratioKey = "debtToAsset";
        break;
      case "debtSafety":
        ratioKey = "debtToIncome";
        break;
      default:
        return "Unknown";
    }

    return gradeRatio(ratioKey, ratio, mode).status;
  };

  const getRatioColor = (ratio: number, type: string) => {
    const mode = isFriendlyMode ? "friendly" : "pro";
    let ratioKey: any;

    switch (type) {
      case "liquidity":
        ratioKey = "liquidity";
        break;
      case "coverage":
        ratioKey = "monthsCovered";
        break;
      case "debtAsset":
        ratioKey = "debtToAsset";
        break;
      case "debtSafety":
        ratioKey = "debtToIncome";
        break;
      default:
        return "#6b7280";
    }

    return gradeRatio(ratioKey, ratio, mode).color;
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ fontSize: 16, color: colors.textSecondary }}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View>
              <Text
                style={{ fontSize: 28, fontWeight: "800", color: colors.text }}
              >
                {"Financial Risk Profile"}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: colors.textSecondary,
                  marginTop: 4,
                }}
              >
                Your financial risk overview
              </Text>
            </View>
          </View>
        </View>

        {/* Emergency Fund Section */}
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
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: "#fef3c7",
                  padding: 8,
                  borderRadius: 10,
                  marginRight: 12,
                }}
              >
                <Ionicons name="shield-checkmark" size={20} color="#d97706" />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  marginBottom: 20,
                  color: "#d97706",
                }}
              >
                Emergency Fund
              </Text>
            </View>
          </View>

          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "800",
                color:
                  emergencyFundProgress >= 100
                    ? "#16a34a"
                    : emergencyFundProgress >= 50
                    ? "#d97706"
                    : "#dc2626",
                marginBottom: 4,
              }}
            >
              {formatCurrency(totalSavings)}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginBottom: 8,
              }}
            >
              {emergencyFundProgress >= 100
                ? "Fully Funded!"
                : emergencyFundProgress >= 50
                ? "Halfway There"
                : "Getting Started"}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {formatPercentage(emergencyFundProgress)} of 6-month target
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={{ marginBottom: 20 }}>
            <View
              style={{
                height: 8,
                backgroundColor: "#f3f4f6",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  backgroundColor:
                    emergencyFundProgress >= 100
                      ? "#16a34a"
                      : emergencyFundProgress >= 50
                      ? "#d97706"
                      : "#dc2626",
                  width: `${Math.min(emergencyFundProgress, 100)}%`,
                }}
              />
            </View>
          </View>

          {/* Details */}
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginBottom: 4,
                  textAlign: "center",
                }}
              >
                Target
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: colors.text,
                  textAlign: "center",
                }}
              >
                {formatCurrency(emergencyFundTarget)}
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginBottom: 4,
                  textAlign: "center",
                }}
              >
                Remaining
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#dc2626",
                  textAlign: "center",
                }}
              >
                {formatCurrency(
                  Math.max(0, emergencyFundTarget - totalSavings)
                )}
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginBottom: 4,
                  textAlign: "center",
                }}
              >
                Months
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#16a34a",
                  textAlign: "center",
                }}
              >
                {monthlyExpenses > 0
                  ? (totalSavings / monthlyExpenses).toFixed(1)
                  : "0"}
              </Text>
            </View>
          </View>
        </View>

        {/* Financial Ratios Section */}
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                backgroundColor: colors.infoLight,
                padding: 8,
                borderRadius: 10,
                marginRight: 12,
              }}
            >
              <Ionicons name="analytics" size={20} color={colors.info} />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 20,
                color: colors.info,
              }}
            >
              {translate(
                isFriendlyMode ? "keyNumbers" : "financialRatios",
                isFriendlyMode
              )}
            </Text>
          </View>

          {/* Liquidity Ratio */}
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  fontWeight: "500",
                }}
              >
                {translate(
                  isFriendlyMode ? "billsCushion" : "liquidityRatio",
                  isFriendlyMode
                )}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: getRatioColor(liquidityRatio, "liquidity"),
                }}
              >
                {getRatioStatus(liquidityRatio, "liquidity")}
              </Text>
            </View>
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: colors.text }}
            >
              {fmt.ratio(liquidityRatio)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {translate("currentAssetsCurrentLiabilities", isFriendlyMode)}
            </Text>
          </View>

          {/* Monthly Living Expenses Coverage */}
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  fontWeight: "500",
                }}
              >
                {translate(
                  isFriendlyMode
                    ? "monthsCovered"
                    : "monthlyLivingExpensesCoverage",
                  isFriendlyMode
                )}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: getRatioColor(
                    monthlyLivingExpensesCoverage,
                    "coverage"
                  ),
                }}
              >
                {getRatioStatus(monthlyLivingExpensesCoverage, "coverage")}
              </Text>
            </View>
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: colors.text }}
            >
              {fmt.months(monthlyLivingExpensesCoverage)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {translate("currentAssetsTotalMonthlyExpenses", isFriendlyMode)}
            </Text>
          </View>

          {/* Debt-Asset Ratio */}
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  fontWeight: "500",
                }}
              >
                {translate(
                  isFriendlyMode ? "debtVsWhatYouOwn" : "debtAssetRatio",
                  isFriendlyMode
                )}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: getRatioColor(debtAssetRatio, "debtAsset"),
                }}
              >
                {getRatioStatus(debtAssetRatio, "debtAsset")}
              </Text>
            </View>
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: colors.text }}
            >
              {fmt.pct(debtAssetRatio)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {translate("totalLiabilitiesTotalAssets", isFriendlyMode)}
            </Text>
          </View>

          {/* Debt Safety Ratio */}
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  fontWeight: "500",
                }}
              >
                {translate(
                  isFriendlyMode ? "debtVsIncome" : "debtSafetyRatio",
                  isFriendlyMode
                )}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: getRatioColor(debtSafetyRatio, "debtSafety"),
                }}
              >
                {getRatioStatus(debtSafetyRatio, "debtSafety")}
              </Text>
            </View>
            <Text
              style={{ fontSize: 16, fontWeight: "700", color: colors.text }}
            >
              {fmt.pct(debtSafetyRatio)}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
              {translate("totalMonthlyDebtPaymentsTotalIncome", isFriendlyMode)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
