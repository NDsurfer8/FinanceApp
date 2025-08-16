import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

interface PieChartData {
  name: string;
  population: number;
  color: string;
}

interface SimplePieChartProps {
  data: PieChartData[];
  title?: string;
  height?: number;
}

export const SimplePieChart: React.FC<SimplePieChartProps> = ({
  data,
  title,
  height = 220,
}) => {
  const total = data.reduce((sum, item) => sum + item.population, 0);

  if (total === 0) {
    return (
      <View style={[styles.container, { height }]}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data to display</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      {title && <Text style={styles.title}>{title}</Text>}

      <View style={styles.chartContainer}>
        {/* Horizontal bar chart representation */}
        <View style={styles.barContainer}>
          {data.map((item, index) => {
            const percentage = (item.population / total) * 100;
            return (
              <View key={index} style={styles.barRow}>
                <View style={styles.barLabel}>
                  <Text style={styles.barName}>{item.name}</Text>
                  <Text style={styles.barValue}>
                    ${item.population.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        backgroundColor: item.color,
                        width: `${percentage}%`,
                      },
                    ]}
                  />
                  <Text style={styles.barPercentage}>
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Total */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Net Worth</Text>
          <Text style={styles.totalValue}>${total.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: "#374151",
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noDataText: {
    color: "#6b7280",
    fontSize: 14,
  },
  chartContainer: {
    flex: 1,
  },
  barContainer: {
    marginBottom: 20,
  },
  barRow: {
    marginBottom: 16,
  },
  barLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  barName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  barValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  barWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bar: {
    height: 12,
    borderRadius: 6,
    flex: 1,
  },
  barPercentage: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    minWidth: 40,
    textAlign: "right",
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#374151",
  },
});
