import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface AssetDebtData {
  name: string;
  balance: number;
  type: "asset" | "debt";
  category?: string;
}

interface AssetsDebtsChartProps {
  assets: AssetDebtData[];
  debts: AssetDebtData[];
  title?: string;
}

export const AssetsDebtsChart: React.FC<AssetsDebtsChartProps> = ({
  assets,
  debts,
  title,
}) => {
  const { colors } = useTheme();
  const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0);
  const totalDebts = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const netWorth = totalAssets - totalDebts;

  // Calculate debt-to-asset ratio
  const debtToAssetRatio =
    totalAssets > 0 ? (totalDebts / totalAssets) * 100 : 0;

  // Get top 3 assets and debts for breakdown
  const topAssets = [...assets]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 3);
  const topDebts = [...debts].sort((a, b) => b.balance - a.balance).slice(0, 3);

  return (
    <View style={styles.container}>
      {title && (
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      )}

      <View style={styles.chartContainer}>
        {/* Net Worth Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text
                style={[styles.summaryLabel, { color: colors.textSecondary }]}
              >
                Total Assets
              </Text>
              <Text style={[styles.summaryValue, styles.assetColor]}>
                ${totalAssets.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text
                style={[styles.summaryLabel, { color: colors.textSecondary }]}
              >
                Total Debts
              </Text>
              <Text style={[styles.summaryValue, styles.debtColor]}>
                ${totalDebts.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.netWorthContainer}>
            <Text
              style={[styles.netWorthLabel, { color: colors.textSecondary }]}
            >
              Net Worth
            </Text>
            <Text
              style={[
                styles.netWorthValue,
                netWorth >= 0 ? styles.positiveColor : styles.negativeColor,
              ]}
            >
              ${Math.abs(netWorth).toLocaleString()}
              {netWorth < 0 ? " (Negative)" : ""}
            </Text>
          </View>
        </View>

        {/* Debt-to-Asset Ratio */}
        <View style={styles.ratioContainer}>
          <Text style={[styles.ratioLabel, { color: colors.textSecondary }]}>
            Debt-to-Asset Ratio
          </Text>
          <View style={[styles.ratioBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.ratioFill,
                {
                  width: `${Math.min(debtToAssetRatio, 100)}%`,
                  backgroundColor:
                    debtToAssetRatio > 50
                      ? "#ef4444"
                      : debtToAssetRatio > 30
                      ? "#f59e0b"
                      : "#10b981",
                },
              ]}
            />
          </View>
          <Text style={[styles.ratioValue, { color: colors.text }]}>
            {debtToAssetRatio.toFixed(1)}%
          </Text>
          <Text
            style={[styles.ratioDescription, { color: colors.textSecondary }]}
          >
            {debtToAssetRatio > 50
              ? "High risk"
              : debtToAssetRatio > 30
              ? "Moderate risk"
              : "Low risk"}
          </Text>
        </View>

        {/* Top Assets Breakdown */}
        {topAssets.length > 0 && (
          <View style={styles.breakdownContainer}>
            <Text style={[styles.breakdownTitle, { color: colors.text }]}>
              Top Assets
            </Text>
            {topAssets.map((asset, index) => {
              const percentage =
                totalAssets > 0 ? (asset.balance / totalAssets) * 100 : 0;
              return (
                <View key={index} style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text
                      style={[styles.breakdownName, { color: colors.text }]}
                    >
                      {asset.name}
                    </Text>
                    <Text
                      style={[styles.breakdownValue, { color: colors.text }]}
                    >
                      ${asset.balance.toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.breakdownBar,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.breakdownFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: "#10b981",
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.breakdownPercentage,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Top Debts Breakdown */}
        {topDebts.length > 0 && (
          <View style={styles.breakdownContainer}>
            <Text style={[styles.breakdownTitle, { color: colors.text }]}>
              Top Debts
            </Text>
            {topDebts.map((debt, index) => {
              const percentage =
                totalDebts > 0 ? (debt.balance / totalDebts) * 100 : 0;
              return (
                <View key={index} style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text
                      style={[styles.breakdownName, { color: colors.text }]}
                    >
                      {debt.name}
                    </Text>
                    <Text
                      style={[styles.breakdownValue, { color: colors.text }]}
                    >
                      ${debt.balance.toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.breakdownBar,
                      { backgroundColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.breakdownFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: "#ef4444",
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.breakdownPercentage,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent", // Will be overridden by parent container
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: "#374151",
  },
  chartContainer: {
    flex: 1,
  },
  summaryContainer: {
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  assetColor: {
    color: "#10b981",
  },
  debtColor: {
    color: "#ef4444",
  },
  netWorthContainer: {
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  netWorthLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 6,
  },
  netWorthValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  positiveColor: {
    color: "#10b981",
  },
  negativeColor: {
    color: "#ef4444",
  },
  ratioContainer: {
    marginBottom: 24,
  },
  ratioLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  ratioBar: {
    height: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    marginBottom: 10,
  },
  ratioFill: {
    height: "100%",
    borderRadius: 4,
  },
  ratioValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  ratioDescription: {
    fontSize: 12,
    color: "#6b7280",
  },
  breakdownContainer: {
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  breakdownItem: {
    marginBottom: 16,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  breakdownName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  breakdownBar: {
    height: 6,
    backgroundColor: "#f3f4f6",
    borderRadius: 3,
    marginBottom: 6,
  },
  breakdownFill: {
    height: "100%",
    borderRadius: 3,
  },
  breakdownPercentage: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "right",
  },
});
