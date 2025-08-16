import React from "react";
import { SafeAreaView, ScrollView, View, Text, Dimensions } from "react-native";
import { Stat, RatioBar } from "../components";
import { BasicLineChart, BasicBarChart } from "../components/BasicCharts";
import {
  months,
  spendCategories,
  totalIncome,
  totalExpenses,
  netCashFlow,
  netWorth,
  debtToAsset,
  mortgageDSR,
  debtSafety,
  chartConfig,
} from "../data/mockData";

const screenWidth = Dimensions.get("window").width;

export const DashboardScreen: React.FC = () => {
  // Transform data for Victory Native charts
  const lineChartData = months.map((m) => ({ x: m.month, y: m.income }));
  const lineChartData2 = months.map((m) => ({ x: m.month, y: m.expenses }));
  const barChartData = spendCategories.map((c) => ({ x: c.name, y: c.value }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* KPIs */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Stat
              label="Net Worth"
              value={`$${netWorth.toLocaleString()}`}
              icon="trending-up"
              positive
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
            marginTop: 12,
          }}
        >
          <Text style={{ fontWeight: "600", marginBottom: 8 }}>
            Cashflow Trend
          </Text>
          <BasicLineChart
            data={lineChartData}
            data2={lineChartData2}
            title="Cashflow Trend"
            height={200}
          />
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
            marginTop: 12,
          }}
        >
          <Text style={{ fontWeight: "600", marginBottom: 8 }}>
            Spending by Category
          </Text>
          <BasicBarChart
            data={barChartData}
            title="Spending by Category"
            height={220}
          />
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
            marginTop: 12,
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
