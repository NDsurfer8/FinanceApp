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
  getUserAssets,
  getUserDebts,
  getUserTransactions,
} from "../services/userData";

interface BalanceSheetScreenProps {
  navigation: any;
}

export const BalanceSheetScreen: React.FC<BalanceSheetScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
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
    switch (type) {
      case "liquidity":
        return ratio >= 1 ? "Good" : "Poor";
      case "coverage":
        return ratio >= 6 ? "Excellent" : ratio >= 3 ? "Good" : "Poor";
      case "debtAsset":
        return ratio <= 30 ? "Excellent" : ratio <= 50 ? "Good" : "Poor";
      case "debtSafety":
        return ratio <= 28 ? "Excellent" : ratio <= 36 ? "Good" : "Poor";
      default:
        return "Unknown";
    }
  };

  const getRatioColor = (ratio: number, type: string) => {
    const status = getRatioStatus(ratio, type);
    switch (status) {
      case "Excellent":
        return "#16a34a";
      case "Good":
        return "#d97706";
      case "Poor":
        return "#dc2626";
      default:
        return "#6b7280";
    }
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
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View>
              <Text
                style={{ fontSize: 28, fontWeight: "800", color: "#1f2937" }}
              >
                Balance Sheet
              </Text>
              <Text style={{ fontSize: 16, color: "#6b7280", marginTop: 4 }}>
                Your financial position
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("AddAssetDebt", { type: "asset" })
            }
            style={{
              backgroundColor: "#6366f1",
              padding: 12,
              borderRadius: 12,
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Net Worth Summary */}
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
            Net Worth Summary
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
              <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>
                Total Assets
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#16a34a" }}
              >
                {formatCurrency(totalAssets)}
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>
                Total Liabilities
              </Text>
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#dc2626" }}
              >
                {formatCurrency(totalLiabilities)}
              </Text>
            </View>
          </View>
        </View>

        {/* Assets Section */}
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
                Assets
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("AddAssetDebt", { type: "asset" })
              }
            >
              <Ionicons name="add-circle" size={24} color="#16a34a" />
            </TouchableOpacity>
          </View>

          {assets.length === 0 ? (
            <Text
              style={{ color: "#6b7280", textAlign: "center", padding: 20 }}
            >
              No assets added yet
            </Text>
          ) : (
            assets.map((asset) => (
              <View
                key={asset.id}
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
                    {asset.name}
                  </Text>
                  <Text
                    style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}
                  >
                    {asset.type}
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: "#16a34a" }}
                >
                  {formatCurrency(asset.balance)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Liabilities Section */}
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
                Liabilities
              </Text>
            </View>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("AddAssetDebt", { type: "debt" })
              }
            >
              <Ionicons name="add-circle" size={24} color="#dc2626" />
            </TouchableOpacity>
          </View>

          {debts.length === 0 ? (
            <Text
              style={{ color: "#6b7280", textAlign: "center", padding: 20 }}
            >
              No debts added yet
            </Text>
          ) : (
            debts.map((debt) => (
              <View
                key={debt.id}
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
                    {debt.name}
                  </Text>
                  <Text
                    style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}
                  >
                    {formatPercentage(debt.rate)} APR • ${debt.payment}/month
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: "#dc2626" }}
                >
                  {formatCurrency(debt.balance)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Financial Ratios Section */}
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
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
              <Ionicons name="analytics" size={20} color="#2563eb" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#2563eb" }}>
              Financial Ratios
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
                style={{ fontSize: 14, color: "#6b7280", fontWeight: "500" }}
              >
                Liquidity Ratio
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
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#374151" }}>
              {formatRatio(liquidityRatio)}x
            </Text>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>
              Current assets ÷ Current liabilities
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
                style={{ fontSize: 14, color: "#6b7280", fontWeight: "500" }}
              >
                Monthly Living Expenses Coverage
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
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#374151" }}>
              {formatRatio(monthlyLivingExpensesCoverage)}x
            </Text>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>
              Current assets ÷ Total monthly expenses
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
                style={{ fontSize: 14, color: "#6b7280", fontWeight: "500" }}
              >
                Debt-Asset Ratio
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
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#374151" }}>
              {formatPercentage(debtAssetRatio)}
            </Text>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>
              Total liabilities ÷ Total assets
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
                style={{ fontSize: 14, color: "#6b7280", fontWeight: "500" }}
              >
                Debt Safety Ratio
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
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#374151" }}>
              {formatPercentage(debtSafetyRatio)}
            </Text>
            <Text style={{ fontSize: 12, color: "#6b7280" }}>
              Total monthly debt payments ÷ Total income
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
