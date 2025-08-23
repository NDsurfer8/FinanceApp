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

    try {
      if (type === "asset") {
        if (editMode && asset) {
          // Update existing asset
          const updatedAsset = {
            ...asset,
            name: formData.name,
            balance: parseFloat(formData.balance),
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
            balance: parseFloat(formData.balance),
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
            balance: parseFloat(formData.balance),
            rate: parseFloat(formData.rate),
            payment: parseFloat(formData.payment),
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
            balance: parseFloat(formData.balance),
            rate: parseFloat(formData.rate),
            payment: parseFloat(formData.payment),
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
    }
  };

  const handleDelete = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to delete data");
      return;
    }

    Alert.alert(
      "Delete Confirmation",
      `Are you sure you want to delete this ${type}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
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
                `${type === "asset" ? "Asset" : "Debt"} deleted successfully!`,
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
            }
          },
        },
      ]
    );
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

          {/* Form */}
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
            }}
          >
            {/* Name */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                Name *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.text,
                }}
                placeholder={
                  type === "asset"
                    ? "e.g., Savings Account"
                    : "e.g., Credit Card"
                }
                placeholderTextColor={colors.textSecondary}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Balance */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                {type === "asset" ? "Current Balance" : "Outstanding Balance"} *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.text,
                }}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={formatNumberWithCommas(formData.balance)}
                onChangeText={(text) => {
                  const cleanValue = removeCommas(text);
                  setFormData({ ...formData, balance: cleanValue });
                }}
                keyboardType="decimal-pad"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Asset Type (for assets only) */}
            {type === "asset" && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    marginBottom: 8,
                    color: colors.text,
                  }}
                >
                  Asset Type *
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 20 }}
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
                        minWidth: 90,
                        maxWidth: 120,
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 2,
                        borderColor:
                          formData.assetType === assetType.value
                            ? colors.primary
                            : colors.border,
                        backgroundColor:
                          formData.assetType === assetType.value
                            ? colors.primary + "20"
                            : colors.surfaceSecondary,
                        alignItems: "center",
                        marginRight: 8,
                        flexShrink: 0,
                      }}
                      onPress={() =>
                        setFormData({ ...formData, assetType: assetType.value })
                      }
                    >
                      <Text style={{ fontSize: 16, marginBottom: 4 }}>
                        {assetType.icon}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color:
                            formData.assetType === assetType.value
                              ? colors.primary
                              : colors.textSecondary,
                          textAlign: "center",
                        }}
                        numberOfLines={2}
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
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    marginBottom: 8,
                    color: colors.text,
                  }}
                >
                  APR (%) *
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.text,
                  }}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.rate}
                  onChangeText={(text) =>
                    setFormData({ ...formData, rate: text })
                  }
                  keyboardType="decimal-pad"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
            )}

            {/* Monthly Payment (for debts only) */}
            {type === "debt" && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    marginBottom: 8,
                    color: colors.text,
                  }}
                >
                  Monthly Payment *
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.text,
                  }}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.payment}
                  onChangeText={(text) =>
                    setFormData({ ...formData, payment: text })
                  }
                  keyboardType="decimal-pad"
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginTop: 24,
            }}
            onPress={handleSave}
          >
            <Text
              style={{
                color: colors.buttonText,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {editMode ? "Update" : "Save"}{" "}
              {type === "asset" ? "Asset" : "Debt"}
            </Text>
          </TouchableOpacity>

          {/* Delete Button (only show in edit mode) */}
          {editMode && (
            <TouchableOpacity
              style={{
                backgroundColor: colors.error,
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
                marginTop: 12,
              }}
              onPress={handleDelete}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Delete {type === "asset" ? "Asset" : "Debt"}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
