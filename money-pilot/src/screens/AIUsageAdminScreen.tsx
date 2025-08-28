import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { aiUsageTracker, AIUsageConfig } from "../services/aiUsageTracker";
import { useAuth } from "../hooks/useAuth";
import { useNavigation } from "@react-navigation/native";

export const AIUsageAdminScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [config, setConfig] = useState<AIUsageConfig>({
    enabled: true,
    freeTierLimit: 5,
    premiumTierLimit: null,
    resetFrequency: "monthly",
    trackingEnabled: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const currentConfig = await aiUsageTracker.loadConfig();
      setConfig(currentConfig);
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (updates: Partial<AIUsageConfig>) => {
    try {
      await aiUsageTracker.saveConfig(updates);
      setConfig((prev) => ({ ...prev, ...updates }));
      Alert.alert("Success", "Configuration updated successfully!");
    } catch (error) {
      console.error("Error updating config:", error);
      Alert.alert("Error", "Failed to update configuration");
    }
  };

  const resetUserUsage = async () => {
    if (!user?.uid) return;

    Alert.alert(
      "Reset Usage",
      "Are you sure you want to reset your AI usage for this period?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await aiUsageTracker.resetUsage(user.uid);
              Alert.alert("Success", "Usage reset successfully!");
            } catch (error) {
              console.error("Error resetting usage:", error);
              Alert.alert("Error", "Failed to reset usage");
            }
          },
        },
      ]
    );
  };

  const quickSetup = async (setupType: string) => {
    try {
      switch (setupType) {
        case "free5":
          await aiUsageTracker.setupFreeTier(5);
          break;
        case "free10":
          await aiUsageTracker.setupFreeTier(10);
          break;
        case "weekly":
          await aiUsageTracker.setupWeeklyReset(10);
          break;
        case "daily":
          await aiUsageTracker.setupDailyReset(2);
          break;
        case "unlimited":
          await aiUsageTracker.enableUnlimited();
          break;
        case "disabled":
          await aiUsageTracker.disableTracking();
          break;
      }
      await loadConfig();
      Alert.alert("Success", `Setup ${setupType} applied successfully!`);
    } catch (error) {
      console.error("Error applying setup:", error);
      Alert.alert("Error", "Failed to apply setup");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: colors.text }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header with Back Button */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            padding: 8,
            marginRight: 12,
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="settings" size={24} color={colors.text} />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "600",
              color: colors.text,
              marginLeft: 12,
            }}
          >
            AI Usage Admin
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Current Configuration */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 16,
            }}
          >
            Current Configuration
          </Text>

          <View
            style={{
              backgroundColor: colors.surface,
              padding: 16,
              borderRadius: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: colors.text }}>System Enabled:</Text>
              <Text
                style={{
                  color: config.enabled ? colors.success : colors.error,
                }}
              >
                {config.enabled ? "Yes" : "No"}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: colors.text }}>Tracking Enabled:</Text>
              <Text
                style={{
                  color: config.trackingEnabled ? colors.success : colors.error,
                }}
              >
                {config.trackingEnabled ? "Yes" : "No"}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: colors.text }}>Free Tier Limit:</Text>
              <Text style={{ color: colors.text }}>
                {config.freeTierLimit} questions
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ color: colors.text }}>Premium Tier Limit:</Text>
              <Text style={{ color: colors.text }}>
                {config.premiumTierLimit === null
                  ? "Unlimited"
                  : `${config.premiumTierLimit} questions`}
              </Text>
            </View>

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: colors.text }}>Reset Frequency:</Text>
              <Text style={{ color: colors.text }}>
                {config.resetFrequency}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Setup Buttons */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 16,
            }}
          >
            Quick Setup Options
          </Text>

          <View style={{ gap: 12 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: 16,
                borderRadius: 12,
              }}
              onPress={() => quickSetup("free5")}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                5 Free Questions/Month
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.info,
                padding: 16,
                borderRadius: 12,
              }}
              onPress={() => quickSetup("free10")}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                10 Free Questions/Month
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.warning,
                padding: 16,
                borderRadius: 12,
              }}
              onPress={() => quickSetup("weekly")}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                10 Questions/Week
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.error,
                padding: 16,
                borderRadius: 12,
              }}
              onPress={() => quickSetup("daily")}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                2 Questions/Day
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.success,
                padding: 16,
                borderRadius: 12,
              }}
              onPress={() => quickSetup("unlimited")}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                Unlimited (No Tracking)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.border,
                padding: 16,
                borderRadius: 12,
              }}
              onPress={() => quickSetup("disabled")}
            >
              <Text
                style={{
                  color: colors.text,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                Disable System
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Manual Configuration */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 16,
            }}
          >
            Manual Configuration
          </Text>

          <View style={{ gap: 12 }}>
            <TouchableOpacity
              style={{
                backgroundColor: colors.surface,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              onPress={() => {
                const newLimit = config.freeTierLimit === 5 ? 10 : 5;
                updateConfig({ freeTierLimit: newLimit });
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                Toggle Free Limit: {config.freeTierLimit} →{" "}
                {config.freeTierLimit === 5 ? 10 : 5}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: colors.surface,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              onPress={() => {
                const newFrequency =
                  config.resetFrequency === "monthly" ? "weekly" : "monthly";
                updateConfig({ resetFrequency: newFrequency });
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                Toggle Reset: {config.resetFrequency} →{" "}
                {config.resetFrequency === "monthly" ? "weekly" : "monthly"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* User Actions */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 16,
            }}
          >
            User Actions
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: colors.warning,
              padding: 16,
              borderRadius: 12,
            }}
            onPress={resetUserUsage}
          >
            <Text
              style={{
                color: colors.buttonText,
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              Reset My Usage
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status */}
        <View
          style={{
            backgroundColor: colors.surface,
            padding: 16,
            borderRadius: 12,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 8,
            }}
          >
            System Status
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            {config.enabled
              ? `AI usage tracking is ${
                  config.trackingEnabled ? "enabled" : "disabled"
                }. Free users get ${config.freeTierLimit} questions per ${
                  config.resetFrequency
                }.`
              : "AI usage tracking is completely disabled. All users have unlimited access."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
