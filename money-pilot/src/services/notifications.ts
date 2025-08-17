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
        seconds: Math.max(
          1,
          Math.floor((reminderDate.getTime() - Date.now()) / 1000)
        ),
      } as any,
    });
  }

  // Schedule multiple bill reminders for a user
  async scheduleAllBillReminders(userId: string): Promise<void> {
    try {
      // Import the userData functions
      const { getUserTransactions, getUserRecurringTransactions } =
        await import("./userData");

      // Get all transactions and recurring transactions
      const [transactions, recurringTransactions] = await Promise.all([
        getUserTransactions(userId),
        getUserRecurringTransactions(userId),
      ]);

      // Cancel existing bill reminders
      await this.cancelBillReminders();

      // Schedule reminders for regular transactions with due dates
      for (const transaction of transactions) {
        if (transaction.type === "expense" && transaction.date) {
          const dueDate = new Date(transaction.date);
          const now = new Date();

          // Only schedule if due date is in the future
          if (dueDate > now) {
            await this.scheduleBillReminder(
              transaction.description,
              dueDate,
              transaction.amount,
              3 // 3 days before
            );

            // Also schedule a day-of reminder
            await this.scheduleNotification({
              id: `bill-due-today-${
                transaction.description
              }-${dueDate.getTime()}`,
              title: "🚨 Bill Due Today",
              body: `${
                transaction.description
              } is due today! Amount: $${transaction.amount.toFixed(2)}`,
              data: {
                type: "bill-due-today",
                billName: transaction.description,
                amount: transaction.amount,
                dueDate: dueDate.toISOString(),
              },
              trigger: {
                seconds: Math.max(
                  1,
                  Math.floor((dueDate.getTime() - Date.now()) / 1000)
                ),
              } as any,
            });
          }
        }
      }

      // Schedule reminders for recurring transactions
      for (const recurring of recurringTransactions) {
        if (recurring.type === "expense" && recurring.isActive) {
          // Calculate next occurrence
          const nextOccurrence = this.calculateNextOccurrence(recurring);
          if (nextOccurrence) {
            await this.scheduleBillReminder(
              recurring.name,
              nextOccurrence,
              recurring.amount,
              3 // 3 days before
            );
          }
        }
      }

      console.log("All bill reminders scheduled successfully");
    } catch (error) {
      console.error("Error scheduling bill reminders:", error);
    }
  }

  // Calculate next occurrence for recurring transactions
  private calculateNextOccurrence(recurringTransaction: any): Date | null {
    const now = new Date();
    const startDate = new Date(recurringTransaction.startDate);

    if (startDate > now) {
      return startDate;
    }

    if (recurringTransaction.endDate) {
      const endDate = new Date(recurringTransaction.endDate);
      if (endDate < now) {
        return null; // Recurring transaction has ended
      }
    }

    // Calculate next occurrence based on frequency
    let nextDate = new Date(startDate);

    while (nextDate <= now) {
      switch (recurringTransaction.frequency) {
        case "weekly":
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case "biweekly":
          nextDate.setDate(nextDate.getDate() + 14);
          break;
        case "monthly":
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        case "quarterly":
          nextDate.setMonth(nextDate.getMonth() + 3);
          break;
        case "yearly":
          nextDate.setFullYear(nextDate.getFullYear() + 1);
          break;
        default:
          return null;
      }
    }

    return nextDate;
  }

  // Cancel all bill reminders
  async cancelBillReminders(): Promise<void> {
    try {
      const scheduledNotifications = await this.getScheduledNotifications();

      for (const notification of scheduledNotifications) {
        const data = notification.content.data;
        if (data?.type === "bill-reminder" || data?.type === "bill-due-today") {
          await this.cancelNotification(notification.identifier);
        }
      }

      console.log("All bill reminders cancelled");
    } catch (error) {
      console.error("Error cancelling bill reminders:", error);
    }
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
