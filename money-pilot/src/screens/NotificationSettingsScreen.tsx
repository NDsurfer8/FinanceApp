import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { notificationService } from "../services/notifications";
import { billReminderService } from "../services/billReminders";
import { budgetReminderService } from "../services/budgetReminders";
import { useAuth } from "../hooks/useAuth";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { StandardHeader } from "../components/StandardHeader";

interface NotificationSettingsScreenProps {
  navigation: any;
}

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  enabled: boolean;
  type: string;
}

export const NotificationSettingsScreen: React.FC<
  NotificationSettingsScreenProps
> = ({ navigation }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [balanceThresholds, setBalanceThresholds] = useState<{
    [accountName: string]: number;
  }>({});

  useEffect(() => {
    checkPermissions();
    loadSavedSettings();
  }, []);

  // Re-check permissions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkPermissions();
    }, [])
  );

  const loadSavedSettings = async () => {
    try {
      // Loading saved settings

      // Load balance thresholds
      const savedThresholds = await AsyncStorage.getItem("balance_thresholds");
      if (savedThresholds) {
        setBalanceThresholds(JSON.parse(savedThresholds));
      }

      // First, check badge indicator preference and update notification handler
      const badgeEnabled = await AsyncStorage.getItem(
        "notification_badge-indicators"
      );
      if (badgeEnabled === "true") {
        await updateNotificationHandler(true);
        // Initialize badge count when badge indicators are enabled
        try {
          const { notificationService } = await import(
            "../services/notifications"
          );
          await notificationService.getBadgeCount();
          // Badge count initialized
        } catch (error) {
          console.error("Error initializing badge count:", error);
        }
      }

      const defaultSettings: NotificationSetting[] = [
        {
          id: "badge-indicators",
          title: t("notification_settings.badge_indicators"),
          description: t("notification_settings.badge_indicators_description"),
          icon: "notifications",
          enabled: false,
          type: "badge",
        },
        {
          id: "budget-reminders",
          title: t("notification_settings.budget_reminders"),
          description: t("notification_settings.budget_reminders_description"),
          icon: "wallet",
          enabled: false,
          type: "budget",
        },
        {
          id: "bill-reminders",
          title: t("notification_settings.bill_due_reminders"),
          description: t(
            "notification_settings.bill_due_reminders_description"
          ),
          icon: "calendar",
          enabled: false,
          type: "bills",
        },
        {
          id: "low-balance-alerts",
          title: t("notification_settings.low_balance_alerts"),
          description: t(
            "notification_settings.low_balance_alerts_description"
          ),
          icon: "warning",
          enabled: false,
          type: "balance",
        },
        {
          id: "goal-reminders",
          title: t("notification_settings.goal_progress_alerts"),
          description: t(
            "notification_settings.goal_progress_alerts_description"
          ),
          icon: "trophy",
          enabled: false,
          type: "goals",
        },
        {
          id: "webhook-transactions",
          title: t("notification_settings.new_transaction_alerts"),
          description: t(
            "notification_settings.new_transaction_alerts_description"
          ),
          icon: "refresh",
          enabled: false,
          type: "webhook-transactions",
        },
        {
          id: "webhook-accounts",
          title: t("notification_settings.new_account_alerts"),
          description: t(
            "notification_settings.new_account_alerts_description"
          ),
          icon: "card",
          enabled: false,
          type: "webhook-accounts",
        },
        {
          id: "webhook-connection-issues",
          title: t("notification_settings.connection_issue_alerts"),
          description: t(
            "notification_settings.connection_issue_alerts_description"
          ),
          icon: "alert-circle",
          enabled: false,
          type: "webhook-issue",
        },
      ];

      const savedSettings = await Promise.all(
        defaultSettings.map(async (setting) => {
          const savedValue = await AsyncStorage.getItem(
            `notification_${setting.id}`
          );
          const isEnabled = savedValue === "true";
          // Loaded from AsyncStorage
          return {
            ...setting,
            enabled: isEnabled,
          };
        })
      );
      // Final saved settings loaded
      setSettings(savedSettings);

      // Then check actual notification status
      await checkBillReminderStatus();
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading saved settings:", error);
      checkBillReminderStatus();
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSavedSettings();
    }, [])
  );

  const checkBillReminderStatus = async () => {
    try {
      const scheduledNotifications =
        await notificationService.getScheduledNotifications();
      const hasBillReminders = scheduledNotifications.some(
        (notification) =>
          notification.content.data?.type === "bill-reminder" ||
          notification.content.data?.type === "bill-due-today"
      );

      const hasBudgetReminders = scheduledNotifications.some(
        (notification) => notification.content.data?.type === "budget-reminder"
      );

      // Found scheduled notifications

      // Check saved state and update if needed for bill reminders
      const savedBillValue = await AsyncStorage.getItem(
        `notification_bill-reminders`
      );
      const savedBillEnabled = savedBillValue === "true";

      // Bill reminder status check

      // Only update if there are actual notifications and they don't match saved state
      // If saved is true but no notifications exist, keep the saved state (user wants them enabled)
      if (savedBillEnabled && !hasBillReminders) {
        // Saved state is true but no notifications found - keeping saved state
        // Don't update - keep the saved state
      } else if (savedBillEnabled !== hasBillReminders) {
        // Updating bill reminder state
        await AsyncStorage.setItem(
          `notification_bill-reminders`,
          hasBillReminders ? "true" : "false"
        );
        setSettings((prev) =>
          prev.map((setting) =>
            setting.id === "bill-reminders"
              ? { ...setting, enabled: hasBillReminders }
              : setting
          )
        );
      } else {
        // Bill reminder state matches, no update needed
      }

      // Check saved state and update if needed for budget reminders
      const savedBudgetValue = await AsyncStorage.getItem(
        `notification_budget-reminders`
      );
      const savedBudgetEnabled = savedBudgetValue === "true";

      // Budget reminder status check

      if (savedBudgetEnabled && !hasBudgetReminders) {
        // Saved budget state is true but no notifications found - keeping saved state
        // Don't update - keep the saved state
      } else if (savedBudgetEnabled !== hasBudgetReminders) {
        // Updating budget reminder state
        await AsyncStorage.setItem(
          `notification_budget-reminders`,
          hasBudgetReminders ? "true" : "false"
        );
        setSettings((prev) =>
          prev.map((setting) =>
            setting.id === "budget-reminders"
              ? { ...setting, enabled: hasBudgetReminders }
              : setting
          )
        );
      } else {
        // Budget reminder state matches, no update needed
      }
    } catch (error) {
      console.error("Error checking reminder status:", error);
    }
  };

  const checkPermissions = async () => {
    const hasPermission = await notificationService.checkPermissions();
    console.log("Notification permissions status:", hasPermission);
    setPermissionGranted(hasPermission);
  };

  const toggleSetting = async (settingId: string) => {
    // Toggling setting

    const updatedSettings = settings.map((setting) =>
      setting.id === settingId
        ? { ...setting, enabled: !setting.enabled }
        : setting
    );
    setSettings(updatedSettings);

    const setting = updatedSettings.find((s) => s.id === settingId);
    // New setting state

    // Save the setting state to AsyncStorage
    const storageKey = `notification_${settingId}`;
    const storageValue = setting?.enabled ? "true" : "false";
    await AsyncStorage.setItem(storageKey, storageValue);
    // Saved to AsyncStorage

    if (setting?.enabled) {
      await scheduleNotification(setting);
    } else {
      await cancelNotification(settingId);
    }

    // Special handling for badge indicators
    if (settingId === "badge-indicators") {
      await updateNotificationHandler(setting?.enabled || false);
    }
  };

  const updateNotificationHandler = async (badgeEnabled: boolean) => {
    try {
      const { notificationService } = await import("../services/notifications");
      await notificationService.updateNotificationHandler(badgeEnabled);
      // Updated notification handler
    } catch (error) {
      console.error("Error updating notification handler:", error);
    }
  };

  const scheduleNotification = async (setting: NotificationSetting) => {
    try {
      switch (setting.type) {
        case "badge":
          // Update notification handler for badge setting
          await updateNotificationHandler(setting.enabled);
          break;
        case "budget":
          if (user) {
            await budgetReminderService.scheduleAllBudgetReminders(user.uid);
          }
          break;
        case "bills":
          if (user) {
            await billReminderService.scheduleAllBillReminders(user.uid);
          }
          break;
        case "balance":
          await notificationService.scheduleLowBalanceAlert(
            "Checking Account",
            500
          );
          break;
        case "goals":
          // Goal reminders are scheduled when goals are created/updated
          // This toggle just enables/disables the feature
          // Goal reminder notifications enabled
          break;
        case "webhook-transactions":
          // Webhook notifications are handled automatically by the system
          // This toggle just enables/disables the feature
          // Webhook transaction notifications enabled
          break;
        case "webhook-accounts":
          // Webhook notifications are handled automatically by the system
          // Webhook account notifications enabled
          break;

        case "webhook-issue":
          // Webhook notifications are handled automatically by the system
          // Webhook connection issue notifications enabled
          break;
      }
    } catch (error) {
      console.error("Error scheduling notification:", error);
      Alert.alert(
        t("common.error"),
        t("notification_settings.failed_to_schedule_notification")
      );
    }
  };

  const cancelNotification = async (settingId: string) => {
    try {
      if (settingId === "bill-reminders") {
        // Cancel all bill reminders specifically
        await billReminderService.cancelAllBillReminders();
      } else if (settingId === "budget-reminders") {
        // Cancel all budget reminders specifically
        await budgetReminderService.cancelAllBudgetReminders();
      } else if (settingId === "goal-reminders") {
        // Cancel all goal reminders specifically
        const scheduledNotifications =
          await notificationService.getScheduledNotifications();
        for (const notification of scheduledNotifications) {
          if (notification.content.data?.type === "goal-reminder") {
            await notificationService.cancelNotification(
              notification.identifier
            );
          }
        }
      } else {
        // Cancel all notifications for this setting type
        const scheduledNotifications =
          await notificationService.getScheduledNotifications();
        for (const notification of scheduledNotifications) {
          if (notification.content.data?.type === settingId) {
            await notificationService.cancelNotification(
              notification.identifier
            );
          }
        }
      }
    } catch (error) {
      console.error("Error canceling notification:", error);
    }
  };

  const updateBalanceThreshold = async (
    accountName: string,
    threshold: number
  ) => {
    try {
      const newThresholds = { ...balanceThresholds, [accountName]: threshold };
      setBalanceThresholds(newThresholds);
      await AsyncStorage.setItem(
        "balance_thresholds",
        JSON.stringify(newThresholds)
      );

      // Schedule low balance alert for this account
      if (threshold > 0) {
        await notificationService.scheduleLowBalanceAlert(
          accountName,
          threshold
        );
      }

      // Updated balance threshold
    } catch (error) {
      console.error("Error updating balance threshold:", error);
      Alert.alert(
        t("common.error"),
        t("notification_settings.failed_to_update_balance_threshold")
      );
    }
  };

  const requestPermissions = async () => {
    const granted = await notificationService.requestPermissions();
    setPermissionGranted(granted);

    if (!granted) {
      Alert.alert(
        t("notification_settings.permissions_required"),
        t("notification_settings.permissions_required_message")
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <StandardHeader
            title={t("notification_settings.title")}
            subtitle={t("common.loading")}
            onBack={() => navigation.goBack()}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <StandardHeader
          title={t("notification_settings.title")}
          subtitle={t("notification_settings.subtitle")}
          onBack={() => navigation.goBack()}
        />

        {/* Permission Status */}
        <View
          style={[
            styles.permissionCard,
            { backgroundColor: colors.surface, shadowColor: colors.shadow },
          ]}
        >
          <View style={styles.permissionHeader}>
            <Ionicons
              name={permissionGranted ? "checkmark-circle" : "alert-circle"}
              size={24}
              color={permissionGranted ? "#16a34a" : "#f59e0b"}
            />
            <Text style={[styles.permissionTitle, { color: colors.text }]}>
              {permissionGranted
                ? t("notification_settings.notifications_enabled")
                : t("notification_settings.permissions_required")}
            </Text>
          </View>
          <Text
            style={[
              styles.permissionDescription,
              { color: colors.textSecondary },
            ]}
          >
            {permissionGranted
              ? t("notification_settings.notifications_enabled_description")
              : t("notification_settings.permissions_required_description")}
          </Text>
          {!permissionGranted && (
            <TouchableOpacity
              style={[
                styles.permissionButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={requestPermissions}
            >
              <Text
                style={[
                  styles.permissionButtonText,
                  { color: colors.buttonText },
                ]}
              >
                {t("notification_settings.enable_notifications")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification Settings */}
        <View style={styles.settingsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("notification_settings.notification_types")}
          </Text>

          {settings.map((setting) => (
            <View
              key={setting.id}
              style={[
                styles.settingItem,
                { backgroundColor: colors.surface, shadowColor: colors.shadow },
              ]}
            >
              <View style={styles.settingInfo}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <Ionicons
                    name={setting.icon}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {setting.title}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={0}
                  >
                    {setting.description}
                  </Text>
                </View>
                <Switch
                  value={setting.enabled}
                  onValueChange={() => toggleSetting(setting.id)}
                  disabled={!permissionGranted}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={
                    setting.enabled
                      ? colors.buttonText
                      : colors.surfaceSecondary
                  }
                />
              </View>
            </View>
          ))}
        </View>

        {/* Balance Thresholds */}
        <View style={styles.settingsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("notification_settings.balance_alert_thresholds")}
          </Text>
          <View
            style={[styles.thresholdCard, { backgroundColor: colors.surface }]}
          >
            <Text
              style={[
                styles.thresholdDescription,
                { color: colors.textSecondary },
              ]}
            >
              {t("notification_settings.balance_threshold_description")}
            </Text>

            {/* Default account thresholds */}
            <View style={styles.thresholdItem}>
              <Text style={[styles.accountName, { color: colors.text }]}>
                {t("notification_settings.checking_account")}
              </Text>
              <View style={styles.thresholdInput}>
                <Text
                  style={[
                    styles.currencySymbol,
                    { color: colors.textSecondary },
                  ]}
                >
                  $
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  value={
                    balanceThresholds["Checking Account"]?.toString() || "500"
                  }
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 0;
                    updateBalanceThreshold("Checking Account", value);
                  }}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.thresholdItem}>
              <Text style={[styles.accountName, { color: colors.text }]}>
                {t("notification_settings.savings_account")}
              </Text>
              <View style={styles.thresholdInput}>
                <Text
                  style={[
                    styles.currencySymbol,
                    { color: colors.textSecondary },
                  ]}
                >
                  $
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  value={
                    balanceThresholds["Savings Account"]?.toString() || "1000"
                  }
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 0;
                    updateBalanceThreshold("Savings Account", value);
                  }}
                  keyboardType="numeric"
                  placeholder="1000"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.thresholdItem}>
              <Text style={[styles.accountName, { color: colors.text }]}>
                {t("notification_settings.credit_card")}
              </Text>
              <View style={styles.thresholdInput}>
                <Text
                  style={[
                    styles.currencySymbol,
                    { color: colors.textSecondary },
                  ]}
                >
                  $
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  value={balanceThresholds["Credit Card"]?.toString() || "500"}
                  onChangeText={(text) => {
                    const value = parseFloat(text) || 0;
                    updateBalanceThreshold("Credit Card", value);
                  }}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Credit Card Threshold Hint */}
            <View style={styles.thresholdHintContainer}>
              <Text
                style={[styles.thresholdHint, { color: colors.textSecondary }]}
              >
                {t("notification_settings.credit_card_hint")}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("notification_settings.quick_actions")}
          </Text>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
            onPress={() => notificationService.cancelAllNotifications()}
          >
            <Ionicons name="close-circle" size={20} color="#ef4444" />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              {t("notification_settings.cancel_all_notifications")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
            onPress={async () => {
              const notifications =
                await notificationService.getScheduledNotifications();
              Alert.alert(
                t("notification_settings.scheduled_notifications"),
                t("notification_settings.scheduled_notifications_message", {
                  count: notifications.length,
                })
              );
            }}
          >
            <Ionicons name="list" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              {t("notification_settings.view_scheduled")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  permissionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  permissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  permissionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },

  settingsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  settingItem: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  settingIcon: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  quickActions: {
    marginBottom: 24,
  },
  actionButton: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  thresholdCard: {
    borderRadius: 16,
    padding: 20,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  thresholdDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  thresholdItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  accountName: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  thresholdInput: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 120,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  input: {
    fontSize: 16,
    fontWeight: "600",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
    textAlign: "center",
  },
  thresholdHintContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  thresholdHint: {
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 16,
  },
});
