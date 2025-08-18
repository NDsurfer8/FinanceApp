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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { notificationService } from "../services/notifications";
import { billReminderService } from "../services/billReminders";
import { budgetReminderService } from "../services/budgetReminders";
import { useAuth } from "../hooks/useAuth";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPermissions();
    loadSavedSettings();
  }, []);

  const loadSavedSettings = async () => {
    try {
      console.log("Loading saved settings...");

      // First, check badge indicator preference and update notification handler
      const badgeEnabled = await AsyncStorage.getItem(
        "notification_badge-indicators"
      );
      if (badgeEnabled === "true") {
        await updateNotificationHandler(true);
      }

      const defaultSettings: NotificationSetting[] = [
        {
          id: "badge-indicators",
          title: "Badge Indicators",
          description: "Show notification count on app icon",
          icon: "notifications",
          enabled: false,
          type: "badge",
        },
        {
          id: "budget-reminders",
          title: "Budget Reminders",
          description: "Get reminded to track your expenses",
          icon: "wallet",
          enabled: false,
          type: "budget",
        },
        {
          id: "bill-reminders",
          title: "Bill Due Reminders",
          description: "Get notified before bills are due",
          icon: "calendar",
          enabled: false,
          type: "bills",
        },
        {
          id: "goal-updates",
          title: "Goal Progress Updates",
          description: "Track your financial goals progress",
          icon: "flag",
          enabled: false,
          type: "goals",
        },
        {
          id: "weekly-reports",
          title: "Weekly Reports",
          description: "Receive weekly financial summaries",
          icon: "bar-chart",
          enabled: false,
          type: "weekly",
        },
        {
          id: "monthly-reports",
          title: "Monthly Reports",
          description: "Get monthly financial reviews",
          icon: "trending-up",
          enabled: false,
          type: "monthly",
        },
        {
          id: "low-balance-alerts",
          title: "Low Balance Alerts",
          description: "Get notified when account balances are low",
          icon: "warning",
          enabled: false,
          type: "balance",
        },
        {
          id: "savings-reminders",
          title: "Savings Reminders",
          description: "Stay on track with your savings goals",
          icon: "diamond",
          enabled: false,
          type: "savings",
        },
      ];

      const savedSettings = await Promise.all(
        defaultSettings.map(async (setting) => {
          const savedValue = await AsyncStorage.getItem(
            `notification_${setting.id}`
          );
          const isEnabled = savedValue === "true";
          console.log(
            `Loaded from AsyncStorage: notification_${setting.id} = ${savedValue} (enabled: ${isEnabled})`
          );
          return {
            ...setting,
            enabled: isEnabled,
          };
        })
      );
      console.log("Final saved settings:", savedSettings);
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

      console.log(
        `Found ${scheduledNotifications.length} scheduled notifications, bill reminders: ${hasBillReminders}, budget reminders: ${hasBudgetReminders}`
      );

      // Check saved state and update if needed for bill reminders
      const savedBillValue = await AsyncStorage.getItem(
        `notification_bill-reminders`
      );
      const savedBillEnabled = savedBillValue === "true";

      console.log(
        `Bill reminder status check - saved: ${savedBillEnabled}, actual: ${hasBillReminders}`
      );

      // Only update if there are actual notifications and they don't match saved state
      // If saved is true but no notifications exist, keep the saved state (user wants them enabled)
      if (savedBillEnabled && !hasBillReminders) {
        console.log(
          `Saved state is true but no notifications found - keeping saved state`
        );
        // Don't update - keep the saved state
      } else if (savedBillEnabled !== hasBillReminders) {
        console.log(
          `Updating bill reminder state from ${savedBillEnabled} to ${hasBillReminders}`
        );
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
        console.log(`Bill reminder state matches, no update needed`);
      }

      // Check saved state and update if needed for budget reminders
      const savedBudgetValue = await AsyncStorage.getItem(
        `notification_budget-reminders`
      );
      const savedBudgetEnabled = savedBudgetValue === "true";

      console.log(
        `Budget reminder status check - saved: ${savedBudgetEnabled}, actual: ${hasBudgetReminders}`
      );

      if (savedBudgetEnabled && !hasBudgetReminders) {
        console.log(
          `Saved budget state is true but no notifications found - keeping saved state`
        );
        // Don't update - keep the saved state
      } else if (savedBudgetEnabled !== hasBudgetReminders) {
        console.log(
          `Updating budget reminder state from ${savedBudgetEnabled} to ${hasBudgetReminders}`
        );
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
        console.log(`Budget reminder state matches, no update needed`);
      }
    } catch (error) {
      console.error("Error checking reminder status:", error);
    }
  };

  const checkPermissions = async () => {
    const hasPermission = await notificationService.requestPermissions();
    setPermissionGranted(hasPermission);
  };

  const toggleSetting = async (settingId: string) => {
    console.log(`Toggling ${settingId} - current settings:`, settings);

    const updatedSettings = settings.map((setting) =>
      setting.id === settingId
        ? { ...setting, enabled: !setting.enabled }
        : setting
    );
    setSettings(updatedSettings);

    const setting = updatedSettings.find((s) => s.id === settingId);
    console.log(`New setting state for ${settingId}:`, setting?.enabled);

    // Save the setting state to AsyncStorage
    const storageKey = `notification_${settingId}`;
    const storageValue = setting?.enabled ? "true" : "false";
    await AsyncStorage.setItem(storageKey, storageValue);
    console.log(`Saved to AsyncStorage: ${storageKey} = ${storageValue}`);

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
      console.log(
        `Updated notification handler - badge enabled: ${badgeEnabled}`
      );
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
        case "goals":
          await notificationService.scheduleGoalReminder(
            "Emergency Fund",
            10000,
            7500
          );
          break;
        case "weekly":
          await notificationService.scheduleWeeklyReport();
          break;
        case "monthly":
          await notificationService.scheduleMonthlyReport();
          break;
        case "balance":
          await notificationService.scheduleLowBalanceAlert(
            "Checking Account",
            500
          );
          break;
        case "savings":
          await notificationService.scheduleSavingsReminder(5000, 3000);
          break;
      }
    } catch (error) {
      console.error("Error scheduling notification:", error);
      Alert.alert("Error", "Failed to schedule notification");
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

  const testNotification = async (setting: NotificationSetting) => {
    setLoading(true);
    try {
      switch (setting.type) {
        case "budget":
          if (user) {
            // Get current budget status and schedule a test reminder
            const budgetStatus =
              await budgetReminderService.getCurrentBudgetStatus(user.uid);
            console.log("Budget test notification data:", budgetStatus);
            await notificationService.scheduleNotification({
              id: `test-budget-${Date.now()}`,
              title: "💰 Budget Test",
              body: `Income: $${budgetStatus.totalIncome.toFixed(
                2
              )}, Expenses: $${budgetStatus.totalExpenses.toFixed(
                2
              )}, Remaining: $${budgetStatus.remainingBudget.toFixed(2)}`,
              data: { type: "test-budget" },
              trigger: { seconds: 5 } as any,
            });
          }
          break;
        case "bills":
          if (user) {
            // Schedule a test bill reminder for 10 seconds from now
            const testDate = new Date();
            testDate.setSeconds(testDate.getSeconds() + 10);
            await billReminderService.scheduleBillReminder(
              "Test Bill",
              testDate,
              150.0,
              false,
              0 // Due today
            );
          }
          break;
        case "goals":
          await notificationService.scheduleGoalReminder(
            "Test Goal",
            10000,
            7500
          );
          break;
        case "balance":
          await notificationService.scheduleLowBalanceAlert(
            "Test Account",
            500
          );
          break;
        case "savings":
          await notificationService.scheduleSavingsReminder(5000, 3000);
          break;
        default:
          await notificationService.scheduleNotification({
            id: `test-${Date.now()}`,
            title: "🧪 Test Notification",
            body: "This is a test notification from VectorFi!",
            data: { type: "test" },
            trigger: { seconds: 5 } as any,
          });
      }
      Alert.alert(
        "Success",
        "Test notification scheduled! Check your device in 5 seconds."
      );
    } catch (error) {
      console.error("Error testing notification:", error);
      Alert.alert("Error", "Failed to send test notification");
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    const granted = await notificationService.requestPermissions();
    setPermissionGranted(granted);

    if (!granted) {
      Alert.alert(
        "Permissions Required",
        "Please enable notifications in your device settings to receive financial reminders."
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#475569" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Notification Settings</Text>
            <Text style={styles.subtitle}>Loading...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#475569" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Notification Settings</Text>
            <Text style={styles.subtitle}>Manage your financial reminders</Text>
          </View>
        </View>

        {/* Permission Status */}
        <View style={styles.permissionCard}>
          <View style={styles.permissionHeader}>
            <Ionicons
              name={permissionGranted ? "checkmark-circle" : "alert-circle"}
              size={24}
              color={permissionGranted ? "#16a34a" : "#f59e0b"}
            />
            <Text style={styles.permissionTitle}>
              {permissionGranted
                ? "Notifications Enabled"
                : "Permissions Required"}
            </Text>
          </View>
          <Text style={styles.permissionDescription}>
            {permissionGranted
              ? "You'll receive financial reminders and updates"
              : "Enable notifications to get financial reminders and updates"}
          </Text>
          {!permissionGranted && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermissions}
            >
              <Text style={styles.permissionButtonText}>
                Enable Notifications
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Notification Settings */}
        <View style={styles.settingsContainer}>
          <Text style={styles.sectionTitle}>Notification Types</Text>

          {settings.map((setting) => (
            <View key={setting.id} style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIcon}>
                  <Ionicons name={setting.icon} size={20} color="#6366f1" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>{setting.title}</Text>
                  <Text style={styles.settingDescription}>
                    {setting.description}
                  </Text>
                </View>
              </View>

              <View style={styles.settingActions}>
                <TouchableOpacity
                  style={styles.testButton}
                  onPress={() => testNotification(setting)}
                  disabled={loading || !permissionGranted}
                >
                  <Text style={styles.testButtonText}>Test</Text>
                </TouchableOpacity>

                <Switch
                  value={setting.enabled}
                  onValueChange={() => toggleSetting(setting.id)}
                  disabled={!permissionGranted}
                  trackColor={{ false: "#e5e7eb", true: "#6366f1" }}
                  thumbColor={setting.enabled ? "#ffffff" : "#f3f4f6"}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => notificationService.cancelAllNotifications()}
          >
            <Ionicons name="close-circle" size={20} color="#ef4444" />
            <Text style={styles.actionButtonText}>
              Cancel All Notifications
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={async () => {
              const notifications =
                await notificationService.getScheduledNotifications();
              Alert.alert(
                "Scheduled Notifications",
                `You have ${notifications.length} scheduled notifications`
              );
            }}
          >
            <Ionicons name="list" size={20} color="#6366f1" />
            <Text style={styles.actionButtonText}>View Scheduled</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 8,
  },
  backButton: {
    marginRight: 20,
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "400",
  },
  permissionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
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
    color: "#111827",
    marginLeft: 8,
  },
  permissionDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  permissionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  settingsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  settingItem: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  settingIcon: {
    backgroundColor: "#f1f5f9",
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
  settingActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  testButton: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366f1",
  },
  quickActions: {
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 12,
  },
});
