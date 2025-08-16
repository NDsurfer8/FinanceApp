import React from "react";
import { SafeAreaView, ScrollView, View, Text, Dimensions } from "react-native";
import { CustomPieChart } from "../components/BeautifulCharts";
import {
  assets,
  debts,
  spendCategories,
  totalDebt,
  chartConfig,
} from "../data/mockData";

const screenWidth = Dimensions.get("window").width;

export const AssetsDebtsScreen: React.FC = () => {
  const assetTotal = assets.reduce((a, b) => a + b.balance, 0);
  const pieChartData = spendCategories.map((c) => ({
    name: c.name,
    population: c.value,
    color: c.color,
    legendFontColor: "#374151",
    legendFontSize: 12,
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
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
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600" }}>Assets</Text>
          {assets.map((a, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 10,
              }}
            >
              <Text>{a.name}</Text>
              <Text style={{ fontWeight: "600" }}>
                ${a.balance.toLocaleString()}
              </Text>
            </View>
          ))}
          <View
            style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 8 }}
          />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ fontWeight: "600" }}>Total</Text>
            <Text style={{ fontWeight: "700" }}>
              ${assetTotal.toLocaleString()}
            </Text>
          </View>
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
          <Text style={{ fontSize: 16, fontWeight: "600" }}>Debts</Text>
          {debts.map((d, i) => (
            <View key={i} style={{ paddingVertical: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text>{d.name}</Text>
                <Text style={{ fontWeight: "600" }}>
                  ${d.balance.toLocaleString()}
                </Text>
              </View>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>
                {d.rate}% APR · ${d.payment}/mo
              </Text>
            </View>
          ))}
          <View
            style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 8 }}
          />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={{ fontWeight: "600" }}>Total Debt</Text>
            <Text style={{ fontWeight: "700" }}>
              ${totalDebt.toLocaleString()}
            </Text>
          </View>
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
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            Spending Breakdown
          </Text>
          <CustomPieChart data={pieChartData} title="" height={220} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
