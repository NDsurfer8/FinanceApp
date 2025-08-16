import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

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

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
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

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        sound: "default",
      },
      trigger: notification.trigger || null,
    });

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

  // Financial notification types
  async scheduleBudgetReminder(date: Date, amount: number): Promise<string> {
    return this.scheduleNotification({
      id: `budget-reminder-${Date.now()}`,
      title: "💰 Budget Reminder",
      body: `Don't forget to track your expenses! You have $${amount.toFixed(
        2
      )} remaining this month.`,
      data: { type: "budget-reminder", amount },
      trigger: null, // Immediate for testing
    });
  }

  async scheduleBillReminder(
    billName: string,
    dueDate: Date,
    amount: number
  ): Promise<string> {
    return this.scheduleNotification({
      id: `bill-reminder-${Date.now()}`,
      title: "📅 Bill Due Soon",
      body: `${billName} is due in 3 days. Amount: $${amount.toFixed(2)}`,
      data: { type: "bill-reminder", billName, amount },
      trigger: null, // Immediate for testing
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
      trigger: null, // Immediate for testing
    });
  }

  async scheduleWeeklyReport(): Promise<string> {
    return this.scheduleNotification({
      id: `weekly-report-${Date.now()}`,
      title: "📊 Weekly Financial Report",
      body: "Your weekly financial summary is ready. Check your progress!",
      data: { type: "weekly-report" },
      trigger: null, // Immediate for testing
    });
  }

  async scheduleMonthlyReport(): Promise<string> {
    return this.scheduleNotification({
      id: `monthly-report-${Date.now()}`,
      title: "📈 Monthly Financial Review",
      body: "Time to review your monthly financial performance!",
      data: { type: "monthly-report" },
      trigger: null, // Immediate for testing
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
      trigger: null, // Immediate
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
      trigger: null, // Immediate for testing
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

  private handleNotificationReceived = (
    notification: Notifications.Notification
  ) => {
    console.log("Notification received:", notification);
  };

  private handleNotificationResponse = (
    response: Notifications.NotificationResponse
  ) => {
    console.log("Notification response:", response);
    // Handle notification tap - navigate to appropriate screen
    const data = response.notification.request.content.data;

    switch (data?.type) {
      case "budget-reminder":
        // Navigate to budget screen
        break;
      case "bill-reminder":
        // Navigate to bills/expenses screen
        break;
      case "goal-reminder":
        // Navigate to goals screen
        break;
      case "weekly-report":
        // Navigate to reports screen
        break;
      case "monthly-report":
        // Navigate to reports screen
        break;
      case "low-balance":
        // Navigate to accounts screen
        break;
      case "savings-reminder":
        // Navigate to savings/goals screen
        break;
    }
  };
}

export const notificationService = NotificationService.getInstance();
