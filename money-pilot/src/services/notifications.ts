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
      }
    } catch (error) {
      console.error("Error loading persisted badge count:", error);
    }
  }

  // Check permissions without requesting them
  async checkPermissions(): Promise<boolean> {
    if (Device.isDevice) {
      const { status } = await Notifications.getPermissionsAsync();
      return status === "granted";
    } else {
      return false;
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
        return false;
      }

      return true;
    } else {
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

        // Expo push token obtained
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
      console.warn(
        "Notification permissions not granted, skipping notification"
      );
      return "";
    }

    // For immediate notifications (like webhooks), always send them
    // For scheduled notifications, only skip if it's an immediate trigger (seconds: 0)
    if (
      notification.trigger &&
      this.isAppActive() &&
      "type" in notification.trigger &&
      notification.trigger.type ===
        Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL &&
      "seconds" in notification.trigger &&
      notification.trigger.seconds === 0
    ) {
      return "";
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

  // Cancel notifications by type
  async cancelNotificationsByType(type: string): Promise<void> {
    try {
      // Get all scheduled notifications
      const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync();

      // Filter notifications by type and cancel them
      const notificationsToCancel = scheduledNotifications.filter(
        (notification) => notification.content.data?.type === type
      );

      for (const notification of notificationsToCancel) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    } catch (error) {
      console.error(`Error cancelling notifications of type ${type}:`, error);
    }
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

  // Schedule dynamic budget reminder that calculates values when sent
  async scheduleDynamicBudgetReminder(
    userId: string,
    reminderType: "daily" | "weekly" | "monthly",
    triggerTime: Date
  ): Promise<string> {
    return this.scheduleNotification({
      id: `budget-reminder-${reminderType}-${userId}`,
      title: "💰 Budget Update",
      body: "Calculating your current budget status...",
      data: {
        type: "dynamic-budget-reminder",
        userId,
        reminderType,
        needsCalculation: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
      },
    });
  }

  // Calculate and send dynamic budget reminder with current values
  private async calculateAndSendDynamicBudgetReminder(
    userId: string,
    reminderType: "daily" | "weekly" | "monthly"
  ): Promise<void> {
    try {
      // Import budget reminder service to get current status
      const { budgetReminderService } = await import("./budgetReminders");

      // Get current budget status
      const budgetStatus = await budgetReminderService.getCurrentBudgetStatus(
        userId
      );

      const { remainingBudget, daysLeft } = budgetStatus;

      let title = "💰 Budget Update";
      let body = "";

      if (reminderType === "daily") {
        const dailyBudget = daysLeft > 0 ? remainingBudget / daysLeft : 0;
        const isOverBudget = remainingBudget < 0;

        if (isOverBudget) {
          title = "⚠️ Daily Budget Alert";
          body = `You're over budget this month. Daily limit: $${Math.abs(
            dailyBudget
          ).toFixed(2)}`;
        } else {
          title = "📅 Daily Budget";
          body = `You have $${remainingBudget.toFixed(
            2
          )} remaining this month. Daily budget: $${dailyBudget.toFixed(2)}`;
        }
      } else if (reminderType === "weekly") {
        const weeksLeft = Math.ceil(daysLeft / 7);
        const weeklyBudget = weeksLeft > 0 ? remainingBudget / weeksLeft : 0;
        const isOverBudget = remainingBudget < 0;

        if (isOverBudget) {
          title = "⚠️ Weekly Budget Alert";
          body = `You're over budget this month. Consider reducing expenses.`;
        } else {
          title = "📊 Weekly Budget Check";
          body = `You have $${remainingBudget.toFixed(
            2
          )} remaining this month. Weekly budget: $${weeklyBudget.toFixed(2)}`;
        }
      } else if (reminderType === "monthly") {
        const isOverBudget = remainingBudget < 0;
        const isNearLimit =
          budgetStatus.budgetLimit > 0 &&
          remainingBudget < budgetStatus.budgetLimit * 0.2;

        if (isOverBudget) {
          title = "⚠️ Budget Alert";
          body = `You're $${Math.abs(remainingBudget).toFixed(
            2
          )} over budget this month.`;
        } else if (isNearLimit) {
          title = "⚠️ Budget Warning";
          body = `Only $${remainingBudget.toFixed(
            2
          )} left in your budget this month.`;
        } else {
          title = "💰 Budget Update";
          body = `You have $${remainingBudget.toFixed(
            2
          )} remaining this month.`;
        }
      }

      // Send the actual notification with current values
      await this.scheduleNotification({
        id: `budget-reminder-${reminderType}-${userId}-${Date.now()}`,
        title,
        body,
        data: {
          type: "budget-reminder",
          reminderType,
          remainingBudget,
          daysLeft,
          calculatedAt: Date.now(),
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error("Error calculating dynamic budget reminder:", error);
    }
  }

  async scheduleWeeklyBudgetCheck(): Promise<string> {
    // Check if user has budget reminders enabled
    const budgetRemindersEnabled = await AsyncStorage.getItem(
      `notification_budget-reminders`
    );
    const isBudgetRemindersEnabled = budgetRemindersEnabled === "true";

    if (!isBudgetRemindersEnabled) {
      return "";
    }

    // Check if we already have a weekly budget check scheduled
    const existingNotifications = await this.getScheduledNotifications();
    const existingWeeklyCheck = existingNotifications.find(
      (notification) =>
        notification.content.data?.type === "weekly-budget-check"
    );

    if (existingWeeklyCheck) {
      return existingWeeklyCheck.identifier;
    }

    // Schedule for next Sunday at 10 AM
    const now = new Date();
    const nextSunday = new Date(now);

    // Find next Sunday (or today if it's Sunday and before 10 AM)
    const isTodaySunday = now.getDay() === 0;
    const isBefore10AM = now.getHours() < 10;

    if (isTodaySunday && isBefore10AM) {
      // Today is Sunday and it's before 10 AM, schedule for today
      nextSunday.setHours(10, 0, 0, 0);
    } else {
      // Find next Sunday
      const daysUntilSunday = (7 - now.getDay()) % 7;
      nextSunday.setDate(
        now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday)
      );
      nextSunday.setHours(10, 0, 0, 0);
    }

    const notificationId = await this.scheduleNotification({
      id: `weekly-budget-check-${Date.now()}`,
      title: "📊 Weekly Budget Check",
      body: "Time to review your budget progress! See how you're doing this month.",
      data: {
        type: "weekly-budget-check",
        shouldReschedule: true, // Flag to reschedule after firing
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextSunday,
      },
    });

    return notificationId;
  }

  // Reschedule the next weekly budget check (called after notification fires)
  async rescheduleWeeklyBudgetCheck(): Promise<string> {
    // Check if user still has budget reminders enabled
    const budgetRemindersEnabled = await AsyncStorage.getItem(
      `notification_budget-reminders`
    );
    const isBudgetRemindersEnabled = budgetRemindersEnabled === "true";

    if (!isBudgetRemindersEnabled) {
      return "";
    }

    // Cancel existing weekly budget check
    const existingNotifications = await this.getScheduledNotifications();
    const existingWeeklyCheck = existingNotifications.find(
      (notification) =>
        notification.content.data?.type === "weekly-budget-check"
    );

    if (existingWeeklyCheck) {
      await this.cancelNotification(existingWeeklyCheck.identifier);
    }

    // Schedule the next one (7 days from now)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(10, 0, 0, 0);

    return this.scheduleNotification({
      id: `weekly-budget-check-${Date.now()}`,
      title: "📊 Weekly Budget Check",
      body: "Time to review your budget progress! See how you're doing this month.",
      data: {
        type: "weekly-budget-check",
        shouldReschedule: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: nextWeek,
      },
    });
  }

  // Cancel all weekly budget check notifications
  async cancelWeeklyBudgetCheck(): Promise<void> {
    const existingNotifications = await this.getScheduledNotifications();
    const weeklyBudgetChecks = existingNotifications.filter(
      (notification) =>
        notification.content.data?.type === "weekly-budget-check"
    );

    for (const notification of weeklyBudgetChecks) {
      await this.cancelNotification(notification.identifier);
    }
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
    // Check if low balance alerts are enabled before scheduling
    const lowBalanceAlertsEnabled = await AsyncStorage.getItem(
      `notification_low-balance-alerts`
    );
    const isLowBalanceAlertsEnabled = lowBalanceAlertsEnabled === "true";

    if (!isLowBalanceAlertsEnabled) {
      return ""; // Return empty string if not enabled
    }

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
    // Check if goal reminders are enabled before scheduling
    const goalRemindersEnabled = await AsyncStorage.getItem(
      `notification_goal-reminders`
    );
    const isGoalRemindersEnabled = goalRemindersEnabled === "true";

    if (!isGoalRemindersEnabled) {
      return []; // Return empty array if not enabled
    }

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
  async notifyNewTransactions(transactionCount: number = 1): Promise<string> {
    const notification = {
      id: `webhook-transactions-${Date.now()}`,
      title: "🔄 New Transactions Available",
      body:
        transactionCount === 1
          ? "1 new transaction has been synced from your bank."
          : `${transactionCount} new transactions have been synced from your bank.`,
      data: {
        type: "webhook-transactions",
        timestamp: Date.now(),
        transactionCount,
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
    // Increment badge count when notification is received
    try {
      await this.incrementBadge();
    } catch (error) {
      console.error("Error incrementing badge:", error);
    }

    // Handle dynamic budget reminder calculations
    const data = notification.request.content.data;
    if (data?.type === "dynamic-budget-reminder" && data?.needsCalculation) {
      try {
        const userId = data.userId as string;
        const reminderType = data.reminderType as
          | "daily"
          | "weekly"
          | "monthly";
        await this.calculateAndSendDynamicBudgetReminder(userId, reminderType);
      } catch (error) {
        console.error("Error calculating dynamic budget reminder:", error);
      }
    }
  };

  private handleNotificationResponse = async (
    response: Notifications.NotificationResponse
  ) => {
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
      case "dynamic-budget-reminder":
        // Navigate to budget screen
        break;
      case "category-over-budget":
        // Navigate to budget categories screen to review over-budget categories
        break;
      case "weekly-budget-check":
        // Navigate to dashboard to review budget progress
        // Reschedule the next weekly notification
        if (data?.shouldReschedule) {
          this.rescheduleWeeklyBudgetCheck().catch((error) =>
            console.error("Error rescheduling weekly budget check:", error)
          );
        }
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
      case "webhook-transactions":
        // Navigate to bank transactions screen
        break;
      case "webhook-accounts":
        // Navigate to bank transactions screen to see new accounts
        break;

      case "goal-reminder":
        // Navigate to goals screen
        break;
      case "webhook-issue":
        // Navigate to settings or bank connection screen
        break;
    }
  };
}

export const notificationService = NotificationService.getInstance();
