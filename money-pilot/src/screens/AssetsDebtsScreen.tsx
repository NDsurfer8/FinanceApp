import React, { useState, useEffect } from "react";
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

interface AssetsDebtsScreenProps {
  navigation: any;
}

const screenWidth = Dimensions.get("window").width;

export const AssetsDebtsScreen: React.FC<AssetsDebtsScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { assets, debts, updateDataOptimistically, refreshInBackground } =
    useZeroLoading();
  const [loading, setLoading] = useState(false);

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
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#374151" }}>
            Assets & Debts
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("AddAssetDebt", { type: "asset" })
              }
              style={{
                backgroundColor: "#10b981",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>
                + Asset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("AddAssetDebt", { type: "debt" })
              }
              style={{
                backgroundColor: "#ef4444",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>
                + Debt
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Assets Section */}
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
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            Assets
          </Text>

          {assets.length === 0 ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <Ionicons name="wallet-outline" size={32} color="#d1d5db" />
              <Text
                style={{ color: "#6b7280", marginTop: 8, textAlign: "center" }}
              >
                No assets yet
              </Text>
            </View>
          ) : (
            <>
              {assets.map((asset, i) => (
                <View
                  key={asset.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 10,
                    borderBottomWidth: i < assets.length - 1 ? 1 : 0,
                    borderBottomColor: "#f3f4f6",
                  }}
                >
                  <Text style={{ flex: 1 }}>{asset.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontWeight: "600", marginRight: 8 }}>
                      ${asset.balance.toLocaleString()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteAsset(asset.id)}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <View
                style={{
                  height: 1,
                  backgroundColor: "#e5e7eb",
                  marginVertical: 8,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontWeight: "600" }}>Total</Text>
                <Text style={{ fontWeight: "700" }}>
                  ${assetTotal.toLocaleString()}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Debts Section */}
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
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            Debts
          </Text>

          {debts.length === 0 ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <Ionicons name="card-outline" size={32} color="#d1d5db" />
              <Text
                style={{ color: "#6b7280", marginTop: 8, textAlign: "center" }}
              >
                No debts yet
              </Text>
            </View>
          ) : (
            <>
              {debts.map((debt, i) => (
                <View
                  key={debt.id}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: i < debts.length - 1 ? 1 : 0,
                    borderBottomColor: "#f3f4f6",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ flex: 1 }}>{debt.name}</Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={{ fontWeight: "600", marginRight: 8 }}>
                        ${debt.balance.toLocaleString()}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteDebt(debt.id)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#ef4444"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={{ color: "#6b7280", fontSize: 12 }}>
                    {debt.rate}% APR • ${debt.payment}/mo
                  </Text>
                </View>
              ))}
              <View
                style={{
                  height: 1,
                  backgroundColor: "#e5e7eb",
                  marginVertical: 8,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontWeight: "600" }}>Total Debt</Text>
                <Text style={{ fontWeight: "700" }}>
                  ${totalDebt.toLocaleString()}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Net Worth Chart */}
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
            Financial Overview
          </Text>
          <AssetsDebtsChart assets={chartAssets} debts={chartDebts} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
