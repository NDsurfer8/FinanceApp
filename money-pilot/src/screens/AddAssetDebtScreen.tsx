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
  const { assets, debts, updateDataOptimistically, refreshInBackground } =
    useZeroLoading();
  const { type } = route.params; // "asset" or "debt"

  const [formData, setFormData] = useState({
    name: "",
    balance: "",
    rate: "", // APR for debts
    payment: "", // Monthly payment for debts
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
          type: "asset",
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
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
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: "600", color: "#374151" }}>
              Add {type === "asset" ? "Asset" : "Debt"}
            </Text>
          </View>

          {/* Form */}
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
            {/* Name */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
              >
                Name *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                }}
                placeholder={
                  type === "asset"
                    ? "e.g., Savings Account"
                    : "e.g., Credit Card"
                }
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
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
              >
                {type === "asset" ? "Current Balance" : "Outstanding Balance"} *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                }}
                placeholder="0.00"
                value={formData.balance}
                onChangeText={(text) =>
                  setFormData({ ...formData, balance: text })
                }
                keyboardType="decimal-pad"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* APR (for debts only) */}
            {type === "debt" && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
                >
                  APR (%) *
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: "#d1d5db",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  placeholder="0.00"
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
                  style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
                >
                  Monthly Payment *
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: "#d1d5db",
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  placeholder="0.00"
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
              backgroundColor: type === "asset" ? "#10b981" : "#ef4444",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginTop: 24,
            }}
            onPress={handleSave}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Save {type === "asset" ? "Asset" : "Debt"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
