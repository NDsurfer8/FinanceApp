<<<<<<< HEAD
import React, { useState, useEffect } from "react";
=======
import React from "react";
import { SafeAreaView, ScrollView, View, Text, Dimensions } from "react-native";
import { CustomPieChart } from "../components/BeautifulCharts";
>>>>>>> origin/main
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fontFamily } from "../config/fonts";
import { AssetsDebtsChart } from "../components/AssetsDebtsChart";
import { useAuth } from "../hooks/useAuth";
import { useZeroLoading } from "../hooks/useZeroLoading";
import {
  saveAsset,
  saveDebt,
  removeAsset,
  removeDebt,
} from "../services/userData";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { getAssetTypeLabel } from "../utils/assetMigration";

interface AssetsDebtsScreenProps {
  navigation: any;
}

const screenWidth = Dimensions.get("window").width;

<<<<<<< HEAD
export const AssetsDebtsScreen: React.FC<AssetsDebtsScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { assets, debts, updateDataOptimistically, refreshInBackground } =
    useZeroLoading();
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  // Background refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        refreshInBackground();
      }
    }, [user, refreshInBackground])
  );

  const handleDeleteAsset = async (assetId: string) => {
    if (!user) return;

    Alert.alert("Delete Asset", "Are you sure you want to delete this asset?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // Optimistic update - remove from UI immediately
            const updatedAssets = assets.filter((a) => a.id !== assetId);
            updateDataOptimistically({ assets: updatedAssets });

            // Delete from database in background
            await removeAsset(user.uid, assetId);
            Alert.alert("Success", "Asset deleted successfully");
          } catch (error) {
            console.error("Error deleting asset:", error);
            Alert.alert("Error", "Failed to delete asset");

            // Revert optimistic update on error
            await refreshInBackground();
          }
        },
      },
    ]);
  };

  const handleDeleteDebt = async (debtId: string) => {
    if (!user) return;

    Alert.alert("Delete Debt", "Are you sure you want to delete this debt?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // Optimistic update - remove from UI immediately
            const updatedDebts = debts.filter((d) => d.id !== debtId);
            updateDataOptimistically({ debts: updatedDebts });

            // Delete from database in background
            await removeDebt(user.uid, debtId);
            Alert.alert("Success", "Debt deleted successfully");
          } catch (error) {
            console.error("Error deleting debt:", error);
            Alert.alert("Error", "Failed to delete debt");

            // Revert optimistic update on error
            await refreshInBackground();
          }
        },
      },
    ]);
  };

  const assetTotal = assets.reduce((sum, asset) => sum + asset.balance, 0);
  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);

  // Prepare data for the new chart
  const chartAssets = assets.map((asset) => ({
    name: asset.name,
    balance: asset.balance,
    type: "asset" as const,
  }));

  const chartDebts = debts.map((debt) => ({
    name: debt.name,
    balance: debt.balance,
    type: "debt" as const,
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
=======
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
>>>>>>> origin/main
        <View
          style={{
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily.bold,
              fontSize: 28,
              fontWeight: "700",
              color: colors.text,
            }}
          >
            Assets & Debts
          </Text>
        </View>

        {/* Assets Section */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            shadowColor: colors.shadow,
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
<<<<<<< HEAD
=======
            marginTop: 16,
>>>>>>> origin/main
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily.semiBold,
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 12,
              color: colors.text,
            }}
          >
            Assets
          </Text>

          {assets.length === 0 ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <Ionicons
                name="wallet-outline"
                size={32}
                color={colors.textTertiary}
              />
              <Text
                style={{
                  fontFamily: fontFamily.regular,
                  color: colors.textSecondary,
                  marginTop: 8,
                  textAlign: "center",
                  fontSize: 16,
                }}
              >
                No assets yet
              </Text>
            </View>
          ) : (
            <>
              {assets.map((asset, i) => (
                <TouchableOpacity
                  key={asset.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                    paddingVertical: 8,
                    borderBottomWidth: i < assets.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                  onPress={() =>
                    navigation.navigate("AddAssetDebt", {
                      type: "asset",
                      editMode: true,
                      asset: asset,
                    })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        color: colors.text,
                        fontWeight: "500",
                      }}
                    >
                      {asset.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {getAssetTypeLabel(asset.type)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.text,
                        marginRight: 8,
                      }}
                    >
                      ${asset.balance.toLocaleString()}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              ))}
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  marginVertical: 8,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.semiBold,
                    fontWeight: "600",
                    fontSize: 16,
                    color: colors.text,
                  }}
                >
                  Total
                </Text>
                <Text
                  style={{
                    fontFamily: fontFamily.bold,
                    fontWeight: "700",
                    fontSize: 18,
                    color: "#10b981",
                  }}
                >
                  ${assetTotal.toLocaleString()}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Debts Section */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            shadowColor: colors.shadow,
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            marginTop: 16,
          }}
        >
<<<<<<< HEAD
          <Text
            style={{
              fontFamily: fontFamily.semiBold,
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 12,
              color: colors.text,
            }}
          >
            Debts
          </Text>

          {debts.length === 0 ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <Ionicons
                name="card-outline"
                size={32}
                color={colors.textTertiary}
              />
              <Text
                style={{
                  fontFamily: fontFamily.regular,
                  color: colors.textSecondary,
                  marginTop: 8,
                  textAlign: "center",
                  fontSize: 16,
                }}
              >
                No debts yet
              </Text>
            </View>
          ) : (
            <>
              {debts.map((debt, i) => (
                <TouchableOpacity
                  key={debt.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                    paddingVertical: 8,
                    borderBottomWidth: i < debts.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }}
                  onPress={() =>
                    navigation.navigate("AddAssetDebt", {
                      type: "debt",
                      editMode: true,
                      debt: debt,
                    })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        color: colors.text,
                        fontWeight: "500",
                      }}
                    >
                      {debt.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {debt.rate}% APR • ${debt.payment}/mo
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: colors.text,
                        marginRight: 8,
                      }}
                    >
                      ${debt.balance.toLocaleString()}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              ))}
              <View
                style={{
                  height: 1,
                  backgroundColor: colors.border,
                  marginVertical: 8,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.semiBold,
                    fontWeight: "600",
                    fontSize: 16,
                    color: colors.text,
                  }}
                >
                  Total Debt
                </Text>
                <Text
                  style={{
                    fontFamily: fontFamily.bold,
                    fontWeight: "700",
                    fontSize: 18,
                    color: "#ef4444",
                  }}
                >
                  ${totalDebt.toLocaleString()}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 16,
            justifyContent: "center",
          }}
        >
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("AddAssetDebt", { type: "asset" })
            }
            style={{
              backgroundColor: "#10b981",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.semiBold,
                color: "#fff",
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              + Add Asset
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("AddAssetDebt", { type: "debt" })
            }
            style={{
              backgroundColor: "#ef4444",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.semiBold,
                color: "#fff",
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              + Add Debt
            </Text>
          </TouchableOpacity>
        </View>

        {/* Net Worth Chart */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            shadowColor: colors.shadow,
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            marginTop: 16,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily.semiBold,
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 8,
              color: colors.text,
            }}
          >
            Financial Overview
          </Text>
          <AssetsDebtsChart assets={chartAssets} debts={chartDebts} />
=======
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            Spending Breakdown
          </Text>
          <CustomPieChart data={pieChartData} title="" height={220} />
>>>>>>> origin/main
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
