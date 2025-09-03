import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: any;
  trigger?: Notifications.NotificationTriggerInput;
}

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private badgeCount: number = 0;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Check if app is currently active/foreground
  private isAppActive(): boolean {
    return AppState.currentState === "active";
  }

  // Update notification handler based on user preferences
  async updateNotificationHandler(badgeEnabled: boolean): Promise<void> {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: badgeEnabled,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      console.log(
        `Notification handler updated - badge enabled: ${badgeEnabled}`
      );
    } catch (error) {
      console.error("Error updating notification handler:", error);
    }
  }

  // Badge count management
  async setBadgeCount(count: number): Promise<void> {
    try {
      this.badgeCount = Math.max(0, count);
      await Notifications.setBadgeCountAsync(this.badgeCount);

      // Persist badge count to AsyncStorage
      await AsyncStorage.setItem("app_badge_count", this.badgeCount.toString());

      console.log(`Badge count set to: ${this.badgeCount}`);
    } catch (error) {
      console.error("Error setting badge count:", error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      this.badgeCount = await Notifications.getBadgeCountAsync();
      return this.badgeCount;
    } catch (error) {
      console.error("Error getting badge count:", error);
      return this.badgeCount;
    }
  }

  async incrementBadge(): Promise<void> {
    this.badgeCount++;
    await this.setBadgeCount(this.badgeCount);
  }

  async decrementBadge(): Promise<void> {
    this.badgeCount = Math.max(0, this.badgeCount - 1);
    await this.setBadgeCount(this.badgeCount);
  }

  async clearBadge(): Promise<void> {
    this.badgeCount = 0;
    await this.setBadgeCount(0);
  }

  // Load persisted badge count
  async loadPersistedBadgeCount(): Promise<void> {
    try {
      const persistedCount = await AsyncStorage.getItem("app_badge_count");
      if (persistedCount) {
        this.badgeCount = parseInt(persistedCount, 10) || 0;
        await Notifications.setBadgeCountAsync(this.badgeCount);
        console.log(`Loaded persisted badge count: ${this.badgeCount}`);
      }
    } catch (error) {
      console.error("Error loading persisted badge count:", error);
    }
  }

  // Request permissions
  async requestPermissions(): Promise<boolean> {
    if (Device.isDevice) {
      // Set up Android notification channel first (required for permissions)
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        });
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return false;
      }

      return true;
    } else {
      console.log("Must use physical device for Push Notifications");
      return false;
    }
  }

  // Get push token for push notifications
  async getPushToken(): Promise<string | null> {
    if (!this.expoPushToken) {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      try {
        // Get the Expo push token for this device
        // Use the correct project ID from Constants as per Expo docs
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;

        if (!projectId) {
          throw new Error("Project ID not found in app configuration");
        }

        const token = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        this.expoPushToken = token.data;

        // Store the token for future use
        await AsyncStorage.setItem("expo_push_token", token.data);

        console.log("Expo push token obtained:", token.data);
        return token.data;
      } catch (error) {
        console.error("Error getting push token:", error);
        return null;
      }
    }
    return this.expoPushToken;
  }

  // Initialize push notifications
  async initializePushNotifications(): Promise<void> {
    try {
      // Set up notification handler for when app is in foreground
      // This should be set BEFORE requesting permissions
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Get push token (this will also set up permissions)
      await this.getPushToken();

      console.log("Push notifications initialized successfully");
    } catch (error) {
      console.error("Error initializing push notifications:", error);
    }
  }

  // Enhanced scheduleNotification that automatically handles push notifications
  // Expo automatically sends push notifications when app is closed
  async scheduleNotificationWithPush(
    notification: NotificationData
  ): Promise<string> {
    try {
      // Expo automatically handles both local and push notifications
      // No need for Firebase storage or backend processing
      return await this.scheduleNotification(notification);
    } catch (error) {
      console.error("Error scheduling notification:", error);
      throw error;
    }
  }

  // Schedule a local notification
  async scheduleNotification(notification: NotificationData): Promise<string> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error("Notification permissions not granted");
    }

    // For immediate notifications (like webhooks), always send them
    // For scheduled notifications, respect app state
    if (notification.trigger && this.isAppActive()) {
      console.log(
        "App is active, skipping scheduled notification:",
        notification.title
      );
      return "";
    }

    console.log(
      `Scheduling notification: ${
        notification.title
      } (App active: ${this.isAppActive()})`
    );

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: "default",
      },
      trigger: notification.trigger || null,
    });

    console.log(`Notification scheduled with ID: ${notificationId}`);
    return notificationId;
  }

  // Cancel a specific notification
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  // Get all scheduled notifications
  async getScheduledNotifications(): Promise<
    Notifications.NotificationRequest[]
  > {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Financial notification types with proper trigger types
  async scheduleBudgetReminder(date: Date, amount: number): Promise<string> {
    // Schedule for next month on the 1st at 9 AM
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(9, 0, 0, 0);

    return this.scheduleNotification({
      id: `budget-reminder-${Date.now()}`,
      title: "💰 Budget Reminder",
      body: `Don't forget to track your expenses! You have $${amount.toFixed(
        2
      )} remaining this month.`,
      data: { type: "budget-reminder", amount },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextMonth,
      },
    });
  }

  async scheduleBillReminder(
    billName: string,
    dueDate: Date,
    amount: number,
    reminderDays: number = 3
  ): Promise<string> {
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDays);

    // Don't schedule if the reminder date is in the past
    if (reminderDate <= new Date()) {
      console.log(
        `Bill reminder for ${billName} would be in the past, skipping`
      );
      return "";
    }

    return this.scheduleNotification({
      id: `bill-reminder-${billName}-${dueDate.getTime()}`,
      title: "📅 Bill Due Soon",
      body: `${billName} is due in ${reminderDays} day${
        reminderDays > 1 ? "s" : ""
      }. Amount: $${amount.toFixed(2)}`,
      data: {
        type: "bill-reminder",
        billName,
        amount,
        dueDate: dueDate.toISOString(),
        reminderDays,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(
          300, // Minimum 5 minute delay
          Math.floor((reminderDate.getTime() - Date.now()) / 1000)
        ),
      },
    });
  }

  async scheduleLowBalanceAlert(
    accountName: string,
    currentBalance: number
  ): Promise<string> {
    // Schedule for tomorrow at 9 AM to avoid immediate panic
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    return this.scheduleNotification({
      id: `low-balance-${Date.now()}`,
      title: "⚠️ Low Balance Alert",
      body: `${accountName} balance is low: $${currentBalance.toFixed(2)}`,
      data: { type: "low-balance", accountName, balance: currentBalance },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: tomorrow,
      },
    });
  }

  async scheduleGoalReminder(
    goalName: string,
    targetAmount: number,
    currentAmount: number,
    targetDate: Date
  ): Promise<string[]> {
    const progress = ((currentAmount / targetAmount) * 100).toFixed(1);
    const notificationIds: string[] = [];

    // Calculate reminder dates: 1 month, 1 week, and 1 day before target
    const oneMonthBefore = new Date(targetDate);
    oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);
    oneMonthBefore.setHours(10, 0, 0, 0);

    const oneWeekBefore = new Date(targetDate);
    oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
    oneWeekBefore.setHours(10, 0, 0, 0);

    const oneDayBefore = new Date(targetDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(10, 0, 0, 0);

    // Only schedule if the reminder dates are in the future
    const now = new Date();

    if (oneMonthBefore > now) {
      const id = await this.scheduleNotification({
        id: `goal-reminder-month-${Date.now()}`,
        title: "🎯 Goal Progress Update - 1 Month Left",
        body: `${goalName}: ${progress}% complete! You have 1 month to reach your target.`,
        data: {
          type: "goal-reminder",
          goalName,
          progress,
          reminderType: "month",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneMonthBefore,
        },
      });
      notificationIds.push(id);
    }

    if (oneWeekBefore > now) {
      const id = await this.scheduleNotification({
        id: `goal-reminder-week-${Date.now()}`,
        title: "🎯 Goal Progress Update - 1 Week Left",
        body: `${goalName}: ${progress}% complete! Final push to reach your target.`,
        data: {
          type: "goal-reminder",
          goalName,
          progress,
          reminderType: "week",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneWeekBefore,
        },
      });
      notificationIds.push(id);
    }

    if (oneDayBefore > now) {
      const id = await this.scheduleNotification({
        id: `goal-reminder-day-${Date.now()}`,
        title: "🎯 Goal Progress Update - 1 Day Left",
        body: `${goalName}: ${progress}% complete! Tomorrow is your target date!`,
        data: {
          type: "goal-reminder",
          goalName,
          progress,
          reminderType: "day",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneDayBefore,
        },
      });
      notificationIds.push(id);
    }

    return notificationIds;
  }

  // Webhook notification methods for real-time updates
  async notifyNewTransactions(transactionCount: number): Promise<string> {
    const notification = {
      id: `webhook-transactions-${Date.now()}`,
      title: "🔄 New Transactions Available",
      body: `${transactionCount} new transaction${
        transactionCount !== 1 ? "s" : ""
      } have been synced from your bank.`,
      data: {
        type: "webhook-transactions",
        transactionCount,
        timestamp: Date.now(),
      },
      trigger: null, // Send immediately
    };

    // Expo automatically handles both local and push notifications
    return this.scheduleNotificationWithPush(notification);
  }

  async notifyNewAccounts(accountCount: number): Promise<string> {
    const notification = {
      id: `webhook-accounts-${Date.now()}`,
      title: "🏦 New Accounts Detected",
      body: `${accountCount} new account${
        accountCount !== 1 ? "s" : ""
      } have been found in your bank connection.`,
      data: {
        type: "webhook-accounts",
        accountCount,
        timestamp: Date.now(),
      },
      trigger: null, // Send immediately
    };

    // Expo automatically handles both local and push notifications
    return this.scheduleNotificationWithPush(notification);
  }

  async notifyBankConnectionIssue(
    issueType: string,
    message: string
  ): Promise<string> {
    const notification = {
      id: `webhook-issue-${Date.now()}`,
      title: "⚠️ Bank Connection Issue",
      body: message,
      data: {
        type: "webhook-issue",
        issueType,
        message,
        timestamp: Date.now(),
      },
      trigger: null, // Send immediately
    };

    // Expo automatically handles both local and push notifications
    return this.scheduleNotificationWithPush(notification);
  }

  // Setup notification listeners
  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (
      response: Notifications.NotificationResponse
    ) => void
  ) {
    const notificationListener = Notifications.addNotificationReceivedListener(
      onNotificationReceived || this.handleNotificationReceived
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener(
        onNotificationResponse || this.handleNotificationResponse
      );

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }

  private handleNotificationReceived = async (
    notification: Notifications.Notification
  ) => {
    console.log("Notification received:", notification);

    // Increment badge count when notification is received
    try {
      await this.incrementBadge();
    } catch (error) {
      console.error("Error incrementing badge:", error);
    }
  };

  private handleNotificationResponse = async (
    response: Notifications.NotificationResponse
  ) => {
    console.log("Notification response:", response);

    // Clear badge when notification is tapped
    try {
      await this.clearBadge();
    } catch (error) {
      console.error("Error clearing badge:", error);
    }

    // Handle notification tap - navigate to appropriate screen
    const data = response.notification.request.content.data;

    switch (data?.type) {
      case "budget-reminder":
        // Navigate to budget screen
        console.log("Navigating to budget screen");
        break;
      case "bill-reminder":
        // Navigate to bills/expenses screen
        console.log("Navigating to transactions screen");
        break;
      case "goal-reminder":
        // Navigate to goals screen
        console.log("Navigating to goals screen");
        break;
      case "weekly-report":
        // Navigate to reports screen
        console.log("Navigating to reports screen");
        break;
      case "monthly-report":
        // Navigate to reports screen
        console.log("Navigating to reports screen");
        break;
      case "low-balance":
        // Navigate to accounts screen
        console.log("Navigating to accounts screen");
        break;
      case "savings-reminder":
        // Navigate to savings/goals screen
        console.log("Navigating to goals screen");
        break;
      case "webhook-transactions":
        // Navigate to bank transactions screen
        console.log("Navigating to bank transactions screen");
        break;
      case "webhook-accounts":
        // Navigate to bank transactions screen to see new accounts
        console.log("Navigating to bank transactions screen");
        break;

      case "goal-reminder":
        // Navigate to goals screen
        console.log("Navigating to goals screen");
        break;
      case "webhook-issue":
        // Navigate to settings or bank connection screen
        console.log("Navigating to bank connection settings");
        break;
    }
  };
}

export const notificationService = NotificationService.getInstance();
