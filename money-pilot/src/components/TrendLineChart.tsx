import React from "react";
import { View, Dimensions, Text } from "react-native";
import { LineChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

interface TrendLineChartProps {
  incomeData: { x: string; y: number }[];
  expensesData: { x: string; y: number }[];
  netWorthData: { x: string; y: number }[];
  height?: number;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  incomeData,
  expensesData,
  netWorthData,
  height = 250,
}) => {
  // Convert data to chart-kit format
  const chartData = {
    labels: incomeData.map((d) => d.x),
    datasets: [
      {
        data: incomeData.map((d) => d.y),
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green for income
        strokeWidth: 2,
      },
      {
        data: expensesData.map((d) => d.y),
        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // Red for expenses
        strokeWidth: 2,
      },
      {
        data: netWorthData.map((d) => d.y),
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Blue for net worth
        strokeWidth: 2,
      },
    ],
  };

  return (
    <View style={{ height }}>
      <LineChart
        data={chartData}
        width={width - 48}
        height={height}
        chartConfig={{
          backgroundColor: "#ffffff",
          backgroundGradientFrom: "#ffffff",
          backgroundGradientTo: "#ffffff",
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: "4",
            strokeWidth: "2",
            stroke: "#10b981",
          },
          propsForBackgroundLines: {
            strokeDasharray: "",
            stroke: "#e5e7eb",
            strokeWidth: 1,
          },
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        withDots={true}
        withShadow={false}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        fromZero={false}
        yAxisLabel="$"
        yAxisSuffix=""
        yLabelsOffset={10}
        xLabelsOffset={-10}
      />

      {/* Legend */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          marginTop: 16,
          paddingHorizontal: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 12,
              height: 12,
              backgroundColor: "#10b981",
              borderRadius: 6,
              marginRight: 6,
            }}
          />
          <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "500" }}>
            Income
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 12,
              height: 12,
              backgroundColor: "#ef4444",
              borderRadius: 6,
              marginRight: 6,
            }}
          />
          <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "500" }}>
            Expenses
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 12,
              height: 12,
              backgroundColor: "#3b82f6",
              borderRadius: 6,
              marginRight: 6,
            }}
          />
          <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "500" }}>
            Net Worth
          </Text>
        </View>
      </View>
    </View>
  );
};
