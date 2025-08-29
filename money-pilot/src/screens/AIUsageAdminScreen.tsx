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

  const getPeriodEndDate = () => {
    const now = new Date();
    switch (config.resetFrequency) {
      case "daily":
        return new Date(
          now.getTime() + 24 * 60 * 60 * 1000
        ).toLocaleDateString();
      case "weekly":
        const weekEnd = new Date(now);
        weekEnd.setDate(now.getDate() + (7 - now.getDay()));
        return weekEnd.toLocaleDateString();
      case "monthly":
      default:
        return new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          1
        ).toLocaleDateString();
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
        {/* System Status */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 16,
            }}
          >
            🔧 System Status
          </Text>

          <View
            style={{
              backgroundColor: colors.surface,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ gap: 16 }}>
              {/* System Enabled Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "600",
                      fontSize: 16,
                    }}
                  >
                    System Enabled
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      marginTop: 2,
                    }}
                  >
                    {config.enabled
                      ? "AI usage tracking is active"
                      : "AI usage tracking is disabled"}
                  </Text>
                </View>
                <Switch
                  value={config.enabled}
                  onValueChange={(value) => updateConfig({ enabled: value })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>

              {/* Tracking Enabled Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "600",
                      fontSize: 16,
                    }}
                  >
                    Usage Tracking
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      marginTop: 2,
                    }}
                  >
                    {config.trackingEnabled
                      ? "Tracking user AI usage"
                      : "Not tracking usage"}
                  </Text>
                </View>
                <Switch
                  value={config.trackingEnabled}
                  onValueChange={(value) =>
                    updateConfig({ trackingEnabled: value })
                  }
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>
            </View>
          </View>
        </View>

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
            ⚙️ Current Configuration
          </Text>

          <View
            style={{
              backgroundColor: colors.surface,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    Free Tier Limit
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Questions per period
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "700",
                    fontSize: 18,
                  }}
                >
                  {config.freeTierLimit}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    Premium Tier Limit
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Premium user questions
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.warning,
                    fontWeight: "700",
                    fontSize: 18,
                  }}
                >
                  {config.premiumTierLimit === null
                    ? "Unlimited"
                    : config.premiumTierLimit}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    Reset Frequency
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    When limits reset
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.info,
                    fontWeight: "700",
                    fontSize: 18,
                  }}
                >
                  {config.resetFrequency}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    Period Ends
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    Next reset date
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.success,
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  {getPeriodEndDate()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Setup Options */}
        <View style={{ marginBottom: 24 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 16,
            }}
          >
            🚀 Quick Setup Options
          </Text>

          <View
            style={{
              backgroundColor: colors.surface,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ gap: 16 }}>
              {/* 5 Questions/Month Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons
                      name="calendar"
                      size={16}
                      color={colors.primary}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      5 Free Questions/Month
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      marginLeft: 24,
                    }}
                  >
                    Conservative free tier limit
                  </Text>
                </View>
                <Switch
                  value={
                    config.freeTierLimit === 5 &&
                    config.resetFrequency === "monthly"
                  }
                  onValueChange={(value) => {
                    if (value) {
                      quickSetup("free5");
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.surface}
                />
              </View>

              {/* 10 Questions/Month Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons
                      name="calendar"
                      size={16}
                      color={colors.info}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      10 Free Questions/Month
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      marginLeft: 24,
                    }}
                  >
                    Generous free tier limit
                  </Text>
                </View>
                <Switch
                  value={
                    config.freeTierLimit === 10 &&
                    config.resetFrequency === "monthly"
                  }
                  onValueChange={(value) => {
                    if (value) {
                      quickSetup("free10");
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.info }}
                  thumbColor={colors.surface}
                />
              </View>

              {/* 10 Questions/Week Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons
                      name="calendar"
                      size={16}
                      color={colors.warning}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      10 Questions/Week
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      marginLeft: 24,
                    }}
                  >
                    Weekly reset frequency
                  </Text>
                </View>
                <Switch
                  value={
                    config.freeTierLimit === 10 &&
                    config.resetFrequency === "weekly"
                  }
                  onValueChange={(value) => {
                    if (value) {
                      quickSetup("weekly");
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.warning }}
                  thumbColor={colors.surface}
                />
              </View>

              {/* 2 Questions/Day Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons
                      name="calendar"
                      size={16}
                      color={colors.error}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      2 Questions/Day
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      marginLeft: 24,
                    }}
                  >
                    Daily reset frequency
                  </Text>
                </View>
                <Switch
                  value={
                    config.freeTierLimit === 2 &&
                    config.resetFrequency === "daily"
                  }
                  onValueChange={(value) => {
                    if (value) {
                      quickSetup("daily");
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.error }}
                  thumbColor={colors.surface}
                />
              </View>

              {/* Unlimited Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons
                      name="infinite"
                      size={16}
                      color={colors.success}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      Unlimited (No Tracking)
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      marginLeft: 24,
                    }}
                  >
                    No usage limits or tracking
                  </Text>
                </View>
                <Switch
                  value={!config.trackingEnabled && config.enabled}
                  onValueChange={(value) => {
                    if (value) {
                      quickSetup("unlimited");
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor={colors.surface}
                />
              </View>

              {/* Disable System Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={colors.error}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "600",
                        fontSize: 16,
                      }}
                    >
                      Disable System
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      marginLeft: 24,
                    }}
                  >
                    Completely disable AI usage tracking
                  </Text>
                </View>
                <Switch
                  value={!config.enabled}
                  onValueChange={(value) => {
                    if (value) {
                      quickSetup("disabled");
                    }
                  }}
                  trackColor={{ false: colors.border, true: colors.error }}
                  thumbColor={colors.surface}
                />
              </View>
            </View>
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
            👤 User Actions
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: colors.warning,
              padding: 16,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: colors.shadow,
              shadowOpacity: 0.1,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
            onPress={resetUserUsage}
          >
            <Ionicons
              name="refresh"
              size={20}
              color={colors.buttonText}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                color: colors.buttonText,
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              Reset My Usage
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Summary */}
        <View
          style={{
            backgroundColor: colors.surface,
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 24,
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
            📈 System Status
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {config.enabled
              ? `AI usage tracking is ${
                  config.trackingEnabled ? "enabled" : "disabled"
                }. Free users get ${config.freeTierLimit} questions per ${
                  config.resetFrequency
                }. Current period ends on ${getPeriodEndDate()}.`
              : "AI usage tracking is completely disabled. All users have unlimited access."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
