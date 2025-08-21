import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

  // Get push token
  async getPushToken(): Promise<string | null> {
    if (!this.expoPushToken) {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: "your-project-id", // Replace with your Expo project ID
        });
        this.expoPushToken = token.data;
        return token.data;
      } catch (error) {
        console.error("Error getting push token:", error);
        return null;
      }
    }
    return this.expoPushToken;
  }

  // Schedule a local notification
  async scheduleNotification(notification: NotificationData): Promise<string> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error("Notification permissions not granted");
    }

    // Don't schedule notifications when app is active/foreground
    // This prevents notifications from appearing while user is using the app
    if (this.isAppActive()) {
      console.log(
        "App is active, skipping notification scheduling:",
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
    return this.scheduleNotification({
      id: `budget-reminder-${Date.now()}`,
      title: "💰 Budget Reminder",
      body: `Don't forget to track your expenses! You have $${amount.toFixed(
        2
      )} remaining this month.`,
      data: { type: "budget-reminder", amount },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
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

  async scheduleGoalReminder(
    goalName: string,
    targetAmount: number,
    currentAmount: number
  ): Promise<string> {
    const progress = ((currentAmount / targetAmount) * 100).toFixed(1);
    return this.scheduleNotification({
      id: `goal-reminder-${Date.now()}`,
      title: "🎯 Goal Progress Update",
      body: `${goalName}: ${progress}% complete! Keep up the great work!`,
      data: { type: "goal-reminder", goalName, progress },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
      },
    });
  }

  async scheduleWeeklyReport(): Promise<string> {
    return this.scheduleNotification({
      id: `weekly-report-${Date.now()}`,
      title: "📊 Weekly Financial Report",
      body: "Your weekly financial summary is ready. Check your progress!",
      data: { type: "weekly-report" },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
      },
    });
  }

  async scheduleMonthlyReport(): Promise<string> {
    return this.scheduleNotification({
      id: `monthly-report-${Date.now()}`,
      title: "📈 Monthly Financial Review",
      body: "Time to review your monthly financial performance!",
      data: { type: "monthly-report" },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
      },
    });
  }

  async scheduleLowBalanceAlert(
    accountName: string,
    currentBalance: number
  ): Promise<string> {
    return this.scheduleNotification({
      id: `low-balance-${Date.now()}`,
      title: "⚠️ Low Balance Alert",
      body: `${accountName} balance is low: $${currentBalance.toFixed(2)}`,
      data: { type: "low-balance", accountName, balance: currentBalance },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
      },
    });
  }

  async scheduleSavingsReminder(
    targetAmount: number,
    currentAmount: number
  ): Promise<string> {
    const remaining = targetAmount - currentAmount;
    return this.scheduleNotification({
      id: `savings-reminder-${Date.now()}`,
      title: "💎 Savings Goal",
      body: `You're $${remaining.toFixed(2)} away from your savings goal!`,
      data: { type: "savings-reminder", remaining },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60,
      },
    });
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
    }
  };
}

export const notificationService = NotificationService.getInstance();
