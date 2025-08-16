import React, { useState, useEffect } from "react";
import { SafeAreaView, ScrollView, View, Text, Dimensions } from "react-native";
import { Stat, RatioBar } from "../components";
import { CustomLineChart, CustomBarChart } from "../components/BeautifulCharts";
import { useAuth } from "../hooks/useAuth";
import {
  getUserTransactions,
  getUserAssets,
  getUserDebts,
} from "../services/userData";

interface DashboardScreenProps {
  navigation: any;
}

const screenWidth = Dimensions.get("window").width;

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

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
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics from real data
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netCashFlow = totalIncome - totalExpenses;

  const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0);
  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const netWorth = totalAssets - totalDebt;

  const debtToAsset = totalAssets > 0 ? (totalDebt / totalAssets) * 100 : 0;
  const mortgageDSR =
    totalIncome > 0
      ? (debts.reduce((sum, debt) => sum + debt.payment, 0) / totalIncome) * 100
      : 0;
  const debtSafety =
    totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

  // Generate chart data from transactions
  const generateChartData = () => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date.toISOString().slice(0, 7); // YYYY-MM format
    }).reverse();

    const monthlyData = last6Months.map((month) => {
      const monthTransactions = transactions.filter(
        (t) => t.date && t.date.toString().startsWith(month)
      );

      const income = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const expenses = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        month: new Date(month + "-01").toLocaleDateString("en-US", {
          month: "short",
        }),
        income,
        expenses,
      };
    });

    return {
      lineChartData: monthlyData.map((d) => ({ x: d.month, y: d.income })),
      lineChartData2: monthlyData.map((d) => ({ x: d.month, y: d.expenses })),
    };
  };

  // Generate spending by category data
  const generateSpendingData = () => {
    const categoryTotals: { [key: string]: number } = {};

    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        categoryTotals[t.category] =
          (categoryTotals[t.category] || 0) + t.amount;
      });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ x: name, y: value }))
      .sort((a, b) => b.y - a.y)
      .slice(0, 5); // Top 5 categories
  };

  const { lineChartData, lineChartData2 } = generateChartData();
  const barChartData = generateSpendingData();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* KPIs */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Stat
              label="Net Worth"
              value={`$${netWorth.toLocaleString()}`}
              icon="trending-up"
              positive={netWorth >= 0}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Stat
              label="Income"
              value={`$${totalIncome.toLocaleString()}`}
              icon="arrow-up-circle"
              positive
            />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Stat
              label="Expenses"
              value={`$${totalExpenses.toLocaleString()}`}
              icon="arrow-down-circle"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Stat
              label="Net Cash Flow"
              value={`$${netCashFlow.toLocaleString()}`}
              icon="wallet"
              positive={netCashFlow >= 0}
            />
          </View>
        </View>

        {/* Charts */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            marginTop: 16,
          }}
        >
          <Text style={{ fontWeight: "600", marginBottom: 8 }}>
            Cashflow Trend
          </Text>
          {loading ? (
            <Text
              style={{ color: "#6b7280", textAlign: "center", padding: 20 }}
            >
              Loading chart data...
            </Text>
          ) : (
            <CustomLineChart
              data={lineChartData}
              data2={lineChartData2}
              title=""
              height={200}
            />
          )}
        </View>

        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            marginTop: 16,
          }}
        >
          <Text style={{ fontWeight: "600", marginBottom: 8 }}>
            Spending by Category
          </Text>
          {loading ? (
            <Text
              style={{ color: "#6b7280", textAlign: "center", padding: 20 }}
            >
              Loading chart data...
            </Text>
          ) : barChartData.length === 0 ? (
            <Text
              style={{ color: "#6b7280", textAlign: "center", padding: 20 }}
            >
              No spending data available
            </Text>
          ) : (
            <CustomBarChart data={barChartData} title="" height={220} />
          )}
        </View>

        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            marginTop: 16,
          }}
        >
          <Text style={{ fontWeight: "600", marginBottom: 8 }}>
            Health Ratios
          </Text>
          <RatioBar label="Debt / Asset" value={debtToAsset} />
          <RatioBar label="Mortgage DSR" value={mortgageDSR} />
          <RatioBar label="Debt Safety" value={debtSafety} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
