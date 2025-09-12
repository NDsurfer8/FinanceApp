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
import { useTranslation } from "react-i18next";
import { useZeroLoading } from "../hooks/useZeroLoading";
import { StandardHeader } from "../components/StandardHeader";
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
  const { t } = useTranslation();
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
      Alert.alert(t("common.error"), t("add_asset_debt.fill_all_fields"));
      return;
    }

    if (type === "debt" && (!formData.rate || !formData.payment)) {
      Alert.alert(t("common.error"), t("add_asset_debt.fill_debt_fields"));
      return;
    }

    if (!user) {
      Alert.alert(t("common.error"), t("add_asset_debt.must_be_logged_in"));
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
        t("common.success"),
        `${type === "asset" ? "Asset" : "Debt"} ${
          editMode ? "updated" : "saved"
        } successfully!`,
        [{ text: t("common.ok"), onPress: () => navigation.goBack() }]
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
      Alert.alert(t("common.error"), t("add_asset_debt.must_be_logged_in"));
      return;
    }

    setDeleteLoading(true);

    try {
      Alert.alert(
        t("add_asset_debt.delete_confirmation"),
        t("add_asset_debt.delete_confirmation_message", {
          type: t(`add_asset_debt.${type}`),
        }),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
            onPress: () => {
              setDeleteLoading(false);
            },
          },
          {
            text: t("common.delete"),
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
                  t("common.success"),
                  t("add_asset_debt.delete_success", {
                    type: t(`add_asset_debt.${type}`),
                  }),
                  [{ text: t("common.ok"), onPress: () => navigation.goBack() }]
                );
              } catch (error) {
                console.error(`Error deleting ${type}:`, error);
                Alert.alert(
                  t("common.error"),
                  t("add_asset_debt.delete_failed", {
                    type: t(`add_asset_debt.${type}`),
                  })
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
          <StandardHeader
            title={`${editMode ? t("common.edit") : t("common.add")} ${
              type === "asset"
                ? t("add_asset_debt.asset")
                : t("add_asset_debt.debt")
            }`}
            onBack={() => navigation.goBack()}
            showBackButton={true}
          />

          {/* Form Fields */}
          {/* Name */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              {t("add_asset_debt.name")}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.card,
              }}
              placeholder={
                type === "asset"
                  ? t("add_asset_debt.asset_name_placeholder")
                  : t("add_asset_debt.debt_name_placeholder")
              }
              placeholderTextColor={colors.inputPlaceholder}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          {/* Balance */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              {type === "asset"
                ? formData.assetType === "investment" ||
                  formData.assetType === "real_estate" ||
                  formData.assetType === "vehicle" ||
                  formData.assetType === "other"
                  ? t("add_asset_debt.value")
                  : t("add_asset_debt.current_balance")
                : t("add_asset_debt.outstanding_balance")}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.card,
              }}
              placeholder={t("add_asset_debt.amount_placeholder")}
              placeholderTextColor={colors.inputPlaceholder}
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
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                {t("add_asset_debt.asset_type")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 8 }}
              >
                {[
                  {
                    value: "savings",
                    label: t("add_asset_debt.asset_types.savings"),
                    icon: "💾",
                  },
                  {
                    value: "checking",
                    label: t("add_asset_debt.asset_types.checking"),
                    icon: "🏦",
                  },
                  {
                    value: "investment",
                    label: t("add_asset_debt.asset_types.investment"),
                    icon: "📈",
                  },
                  {
                    value: "real_estate",
                    label: t("add_asset_debt.asset_types.real_estate"),
                    icon: "🏠",
                  },
                  {
                    value: "vehicle",
                    label: t("add_asset_debt.asset_types.vehicle"),
                    icon: "🚗",
                  },
                  {
                    value: "other",
                    label: t("add_asset_debt.asset_types.other"),
                    icon: "💼",
                  },
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
                💡 {t("add_asset_debt.savings_accounts_note")}
              </Text>
            </View>
          )}

          {/* APR (for debts only) */}
          {type === "debt" && (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                {t("add_asset_debt.apr")}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  color: colors.text,
                  backgroundColor: colors.card,
                }}
                placeholder={t("add_asset_debt.amount_placeholder")}
                placeholderTextColor={colors.inputPlaceholder}
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
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                {t("add_asset_debt.monthly_payment")}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 16,
                  fontSize: 16,
                  color: colors.text,
                  backgroundColor: colors.card,
                }}
                placeholder={t("add_asset_debt.amount_placeholder")}
                placeholderTextColor={colors.inputPlaceholder}
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
                padding: 18,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                shadowColor: colors.primary,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
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
                  fontWeight: "700",
                }}
              >
                {editMode ? t("common.update") : t("common.save")}{" "}
                {type === "asset"
                  ? t("add_asset_debt.asset")
                  : t("add_asset_debt.debt")}
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
                  {t("common.delete")}{" "}
                  {type === "asset"
                    ? t("add_asset_debt.asset")
                    : t("add_asset_debt.debt")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
