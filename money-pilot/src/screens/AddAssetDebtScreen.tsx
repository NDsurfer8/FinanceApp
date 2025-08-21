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
import { saveAsset, saveDebt } from "../services/userData";

interface AddAssetDebtScreenProps {
  navigation: any;
  route: any;
}

export const AddAssetDebtScreen: React.FC<AddAssetDebtScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { assets, debts, updateDataOptimistically, refreshInBackground } =
    useZeroLoading();
  const { type } = route.params; // "asset" or "debt"

  const [formData, setFormData] = useState({
    name: "",
    balance: "",
    rate: "", // APR for debts
    payment: "", // Monthly payment for debts
    assetType: "savings", // For assets only
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
        const asset = {
          id: `temp-${Date.now()}`,
          name: formData.name,
          balance: parseFloat(formData.balance),
          type: formData.assetType,
          userId: user.uid,
          createdAt: new Date().toISOString(),
        };

        // Optimistic update - add to UI immediately
        const updatedAssets = [...assets, asset];
        updateDataOptimistically({ assets: updatedAssets });

        // Save to database in background
        const savedAssetId = await saveAsset(asset);

        // Update with real ID from database
        const finalAssets = updatedAssets.map((a) =>
          a.id === asset.id ? { ...a, id: savedAssetId } : a
        );
        updateDataOptimistically({ assets: finalAssets });
      } else {
        const debt = {
          id: `temp-${Date.now()}`,
          name: formData.name,
          balance: parseFloat(formData.balance),
          rate: parseFloat(formData.rate),
          payment: parseFloat(formData.payment),
          userId: user.uid,
          createdAt: new Date().toISOString(),
        };

        // Optimistic update - add to UI immediately
        const updatedDebts = [...debts, debt];
        updateDataOptimistically({ debts: updatedDebts });

        // Save to database in background
        const savedDebtId = await saveDebt(debt);

        // Update with real ID from database
        const finalDebts = updatedDebts.map((d) =>
          d.id === debt.id ? { ...d, id: savedDebtId } : d
        );
        updateDataOptimistically({ debts: finalDebts });
      }

      Alert.alert(
        "Success",
        `${type === "asset" ? "Asset" : "Debt"} saved successfully!`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error(`Error saving ${type}:`, error);
      Alert.alert("Error", `Failed to save ${type}. Please try again.`);

      // Revert optimistic update on error
      if (type === "asset") {
        const revertedAssets = assets.filter((a) => !a.id.startsWith("temp-"));
        updateDataOptimistically({ assets: revertedAssets });
      } else {
        const revertedDebts = debts.filter((d) => !d.id.startsWith("temp-"));
        updateDataOptimistically({ debts: revertedDebts });
      }
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
              Add {type === "asset" ? "Asset" : "Debt"}
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
                value={formData.balance}
                onChangeText={(text) =>
                  setFormData({ ...formData, balance: text })
                }
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
                        width: 80,
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
              backgroundColor: type === "asset" ? colors.success : colors.error,
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
              Save {type === "asset" ? "Asset" : "Debt"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
