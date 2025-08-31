import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import { useZeroLoading } from "../hooks/useZeroLoading";
import {
  saveAsset,
  saveDebt,
  updateAsset,
  updateDebt,
  removeAsset,
  removeDebt,
} from "../services/userData";
import { formatNumberWithCommas, removeCommas } from "../utils/formatNumber";

interface AddAssetDebtScreenProps {
  navigation: any;
  route: any;
}

interface RouteParams {
  type: "asset" | "debt";
  editMode?: boolean;
  asset?: any;
  debt?: any;
}

export const AddAssetDebtScreen: React.FC<AddAssetDebtScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { assets, debts, updateDataOptimistically, refreshInBackground } =
    useZeroLoading();
  const { type, editMode, asset, debt } = route.params as RouteParams; // "asset" or "debt"

  const [formData, setFormData] = useState({
    name: editMode
      ? type === "asset"
        ? asset?.name || ""
        : debt?.name || ""
      : "",
    balance: editMode
      ? type === "asset"
        ? asset?.balance?.toString() || ""
        : debt?.balance?.toString() || ""
      : "",
    rate: editMode && type === "debt" ? debt?.rate?.toString() || "" : "", // APR for debts
    payment: editMode && type === "debt" ? debt?.payment?.toString() || "" : "", // Monthly payment for debts
    assetType:
      editMode && type === "asset" ? asset?.type || "savings" : "savings", // For assets only
  });
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSave = async () => {
    if (!formData.name || !formData.balance) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (type === "debt" && (!formData.rate || !formData.payment)) {
      Alert.alert("Error", "Please fill in APR and monthly payment for debts");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to save data");
      return;
    }

    setLoading(true);
    try {
      if (type === "asset") {
        if (editMode && asset) {
          // Update existing asset
          const updatedAsset = {
            ...asset,
            name: formData.name,
            balance: parseFloat(removeCommas(formData.balance)),
            type: formData.assetType,
            updatedAt: Date.now(),
          };

          // Optimistic update
          const updatedAssets = assets.map((a) =>
            a.id === asset.id ? updatedAsset : a
          );
          updateDataOptimistically({ assets: updatedAssets });

          // Update in database
          await updateAsset(updatedAsset);
        } else {
          // Create new asset
          const newAsset = {
            id: `temp-${Date.now()}`,
            name: formData.name,
            balance: parseFloat(removeCommas(formData.balance)),
            type: formData.assetType,
            userId: user.uid,
            createdAt: new Date().toISOString(),
          };

          // Optimistic update - add to UI immediately
          const updatedAssets = [...assets, newAsset];
          updateDataOptimistically({ assets: updatedAssets });

          // Save to database in background
          const savedAssetId = await saveAsset(newAsset);

          // Update with real ID from database
          const finalAssets = updatedAssets.map((a) =>
            a.id === newAsset.id ? { ...a, id: savedAssetId } : a
          );
          updateDataOptimistically({ assets: finalAssets });
        }
      } else {
        if (editMode && debt) {
          // Update existing debt
          const updatedDebt = {
            ...debt,
            name: formData.name,
            balance: parseFloat(removeCommas(formData.balance)),
            rate: parseFloat(removeCommas(formData.rate)),
            payment: parseFloat(removeCommas(formData.payment)),
            updatedAt: Date.now(),
          };

          // Optimistic update
          const updatedDebts = debts.map((d) =>
            d.id === debt.id ? updatedDebt : d
          );
          updateDataOptimistically({ debts: updatedDebts });

          // Update in database
          await updateDebt(updatedDebt);
        } else {
          // Create new debt
          const newDebt = {
            id: `temp-${Date.now()}`,
            name: formData.name,
            balance: parseFloat(removeCommas(formData.balance)),
            rate: parseFloat(removeCommas(formData.rate)),
            payment: parseFloat(removeCommas(formData.payment)),
            userId: user.uid,
            createdAt: new Date().toISOString(),
          };

          // Optimistic update - add to UI immediately
          const updatedDebts = [...debts, newDebt];
          updateDataOptimistically({ debts: updatedDebts });

          // Save to database in background
          const savedDebtId = await saveDebt(newDebt);

          // Update with real ID from database
          const finalDebts = updatedDebts.map((d) =>
            d.id === newDebt.id ? { ...d, id: savedDebtId } : d
          );
          updateDataOptimistically({ debts: finalDebts });
        }
      }

      Alert.alert(
        "Success",
        `${type === "asset" ? "Asset" : "Debt"} ${
          editMode ? "updated" : "saved"
        } successfully!`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error(
        `Error ${editMode ? "updating" : "saving"} ${type}:`,
        error
      );
      Alert.alert(
        "Error",
        `Failed to ${editMode ? "update" : "save"} ${type}. Please try again.`
      );

      // Revert optimistic update on error
      refreshInBackground();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to delete data");
      return;
    }

    setDeleteLoading(true);

    try {
      Alert.alert(
        "Delete Confirmation",
        `Are you sure you want to delete this ${type}? This action cannot be undone.`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setDeleteLoading(false);
            },
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                if (type === "asset" && asset) {
                  // Optimistic update
                  const updatedAssets = assets.filter((a) => a.id !== asset.id);
                  updateDataOptimistically({ assets: updatedAssets });

                  // Delete from database
                  await removeAsset(user.uid, asset.id);

                  // Refresh context to ensure all data is in sync
                  refreshInBackground();
                } else if (type === "debt" && debt) {
                  // Optimistic update
                  const updatedDebts = debts.filter((d) => d.id !== debt.id);
                  updateDataOptimistically({ debts: updatedDebts });

                  // Delete from database
                  await removeDebt(user.uid, debt.id);

                  // Refresh context to ensure all data is in sync
                  refreshInBackground();
                }

                Alert.alert(
                  "Success",
                  `${
                    type === "asset" ? "Asset" : "Debt"
                  } deleted successfully!`,
                  [{ text: "OK", onPress: () => navigation.goBack() }]
                );
              } catch (error) {
                console.error(`Error deleting ${type}:`, error);
                Alert.alert(
                  "Error",
                  `Failed to delete ${type}. Please try again.`
                );

                // Revert optimistic update on error
                refreshInBackground();
              } finally {
                setDeleteLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in delete confirmation:", error);
      setDeleteLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 20, fontWeight: "600", color: colors.text }}
            >
              {editMode ? "Edit" : "Add"} {type === "asset" ? "Asset" : "Debt"}
            </Text>
          </View>

          {/* Form Fields */}
          {/* Name */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Name
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.card,
              }}
              placeholder={
                type === "asset" ? "e.g., Savings Account" : "e.g., Credit Card"
              }
              placeholderTextColor={colors.textSecondary}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          {/* Balance */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              {type === "asset" ? "Current Balance" : "Outstanding Balance"}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.card,
              }}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={formatNumberWithCommas(formData.balance)}
              onChangeText={(text) => {
                const cleanValue = removeCommas(text);
                setFormData({ ...formData, balance: cleanValue });
              }}
              keyboardType="numeric"
            />
          </View>

          {/* Asset Type (for assets only) */}
          {type === "asset" && (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                Asset Type
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 8 }}
              >
                {[
                  { value: "savings", label: "Savings", icon: "💾" },
                  { value: "checking", label: "Checking", icon: "🏦" },
                  { value: "investment", label: "Investment", icon: "📈" },
                  { value: "real_estate", label: "Real Estate", icon: "🏠" },
                  { value: "vehicle", label: "Vehicle", icon: "🚗" },
                  { value: "other", label: "Other", icon: "💼" },
                ].map((assetType) => (
                  <TouchableOpacity
                    key={assetType.value}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      marginRight: 8,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor:
                        formData.assetType === assetType.value
                          ? colors.primary
                          : colors.border,
                      backgroundColor:
                        formData.assetType === assetType.value
                          ? colors.primary
                          : "transparent",
                      alignItems: "center",
                      flexDirection: "row",
                    }}
                    onPress={() =>
                      setFormData({ ...formData, assetType: assetType.value })
                    }
                  >
                    <Text style={{ fontSize: 16, marginRight: 4 }}>
                      {assetType.icon}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color:
                          formData.assetType === assetType.value
                            ? "white"
                            : colors.text,
                      }}
                    >
                      {assetType.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  marginTop: 8,
                }}
              >
                💡 Savings accounts are used for emergency fund calculations
              </Text>
            </View>
          )}

          {/* APR (for debts only) */}
          {type === "debt" && (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                APR (%)
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  color: colors.text,
                  backgroundColor: colors.card,
                }}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={formData.rate}
                onChangeText={(text) =>
                  setFormData({ ...formData, rate: text })
                }
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Monthly Payment (for debts only) */}
          {type === "debt" && (
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                Monthly Payment
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  color: colors.text,
                  backgroundColor: colors.card,
                }}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={formatNumberWithCommas(formData.payment)}
                onChangeText={(text) => {
                  const cleanValue = removeCommas(text);
                  setFormData({ ...formData, payment: cleanValue });
                }}
                keyboardType="numeric"
              />
            </View>
          )}

          {/* Action Buttons */}
          <View style={{ marginTop: 20, gap: 12 }}>
            {/* Save Button */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: 16,
                borderRadius: 8,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
              }}
              onPress={handleSave}
              disabled={loading}
            >
              {loading && (
                <ActivityIndicator
                  size="small"
                  color="white"
                  style={{ marginRight: 8 }}
                />
              )}
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {editMode ? "Update" : "Save"}{" "}
                {type === "asset" ? "Asset" : "Debt"}
              </Text>
            </TouchableOpacity>

            {/* Delete Button (only in edit mode) */}
            {editMode && (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.error + "20",
                  padding: 18,
                  borderRadius: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.error,
                }}
                onPress={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading && (
                  <ActivityIndicator
                    size="small"
                    color={colors.error}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text
                  style={{
                    color: colors.error,
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  Delete {type === "asset" ? "Asset" : "Debt"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
