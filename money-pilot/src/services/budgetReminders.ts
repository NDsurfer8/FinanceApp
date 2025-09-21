import { notificationService } from "./notifications";
import {
  getUserTransactions,
  getUserBudgetSettings,
  getUserGoals,
  getUserBudgetCategories,
  getUserRecurringTransactions,
} from "./userData";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Shared utility for creating budget notification content
export const createBudgetNotificationContent = (
  reminderType: "urgent" | "weekly" | "monthly",
  remainingBudget: number,
  daysLeft: number,
  totalIncome: number
): { title: string; body: string } => {
  let title = "💰 Budget Update";
  let body = "";

  if (reminderType === "urgent") {
    const isOverBudget = remainingBudget < 0;
    const isLowBudget = remainingBudget < totalIncome * 0.1;

    if (isOverBudget) {
      title = "⚠️ Budget Alert";
      body = `You're $${Math.abs(remainingBudget).toFixed(
        2
      )} over budget this month. Consider reducing expenses.`;
    } else {
      title = "⚠️ Low Budget Warning";
      body = `Only $${remainingBudget.toFixed(
        2
      )} left in your budget this month (${daysLeft} days remaining).`;
    }
  } else if (reminderType === "weekly") {
    const dailyBudget = remainingBudget / daysLeft;
    title = "📊 End of Month Budget Check";
    body = `You have $${remainingBudget.toFixed(
      2
    )} remaining this month. Daily budget: $${dailyBudget.toFixed(2)}`;
  } else if (reminderType === "monthly") {
    const weeklyBudget = remainingBudget / Math.ceil(daysLeft / 7);
    title = "💰 Monthly Budget Update";
    body = `You have $${remainingBudget.toFixed(
      2
    )} remaining this month. Weekly budget: $${weeklyBudget.toFixed(2)}`;
  }

  return { title, body };
};

// Shared utility for checking notification permissions
export const checkNotificationPermission = async (
  notificationType: string
): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(
      `notification_${notificationType}`
    );
    return enabled === "true";
  } catch (error) {
    console.error(`Error checking ${notificationType} permission:`, error);
    return false;
  }
};

export interface BudgetReminder {
  id: string;
  type: "monthly" | "weekly" | "daily";
  message: string;
  amount?: number;
}

export class BudgetReminderService {
  private static instance: BudgetReminderService;

  private constructor() {}

  static getInstance(): BudgetReminderService {
    if (!BudgetReminderService.instance) {
      BudgetReminderService.instance = new BudgetReminderService();
    }
    return BudgetReminderService.instance;
  }

  // Schedule all budget reminders for a user
  async scheduleAllBudgetReminders(userId: string): Promise<void> {
    try {
      // Check if budget reminders are enabled before scheduling
      const isBudgetRemindersEnabled = await checkNotificationPermission(
        "budget-reminders"
      );

      if (!isBudgetRemindersEnabled) {
        // If not enabled, just cancel existing reminders and return
        await this.cancelAllBudgetReminders();
        return;
      }

      // Get user's transactions, budget settings, goals, and recurring transactions
      const [transactions, budgetSettings, goals, recurringTransactions] =
        await Promise.all([
          getUserTransactions(userId),
          getUserBudgetSettings(userId),
          getUserGoals(userId),
          getUserRecurringTransactions(userId),
        ]);

      // Cancel existing budget reminders
      await this.cancelAllBudgetReminders();

      // Calculate current month's budget status
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const monthlyTransactions = transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        return (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      });

      // Calculate income including active recurring income for current month
      const individualIncome = monthlyTransactions
        .filter((t) => t.type === "income" && !t.recurringTransactionId)
        .reduce((sum, t) => sum + t.amount, 0);

      // Get active recurring income for current month
      const activeRecurringIncome = recurringTransactions
        .filter((rt) => rt.type === "income" && rt.isActive)
        .reduce((sum, rt) => sum + rt.amount, 0);

      const totalIncome = individualIncome + activeRecurringIncome;

      // Calculate expenses including all active recurring expenses (planned expenses, regardless of payment status)
      const individualExpenses = monthlyTransactions
        .filter((t) => t.type === "expense" && !t.recurringTransactionId)
        .reduce((sum, t) => sum + t.amount, 0);

      // Get all active recurring expenses for current month (planned expenses, regardless of payment status)
      const activeRecurringExpenses = recurringTransactions
        .filter((rt) => rt.type === "expense" && rt.isActive)
        .reduce((sum, rt) => sum + rt.amount, 0);

      const totalExpenses = individualExpenses + activeRecurringExpenses;

      // Calculate remaining balance like in budget summary
      const netIncome = totalIncome - totalExpenses;
      const savingsPercent = budgetSettings?.savingsPercentage || 20;
      const debtPayoffPercent = budgetSettings?.debtPayoffPercentage || 5;
      const savingsAmount = totalIncome * (savingsPercent / 100);

      // Calculate total goal contributions
      const totalGoalContributions = goals.reduce((total, goal) => {
        return total + goal.monthlyContribution;
      }, 0);

      const debtPayoffAmount = totalIncome * (debtPayoffPercent / 100);
      const discretionaryIncome =
        netIncome - savingsAmount - debtPayoffAmount - totalGoalContributions;
      const remainingBalance = discretionaryIncome;

      // Schedule different types of budget reminders using dynamic calculation
      await this.scheduleDynamicBudgetReminders(userId);

      // Schedule category-specific over-budget notifications (matches smart insights logic)
      await this.scheduleCategoryOverBudgetNotifications(userId);

      // Schedule weekly budget check notification
      await this.scheduleWeeklyBudgetCheck();
    } catch (error) {
      console.error("Error scheduling budget reminders:", error);
    }
  }

  // Schedule weekly budget check notification
  async scheduleWeeklyBudgetCheck(): Promise<string> {
    try {
      // Check if user has budget reminders enabled
      const isBudgetRemindersEnabled = await checkNotificationPermission(
        "budget-reminders"
      );

      if (!isBudgetRemindersEnabled) {
        return "";
      }

      // Check if we already have a weekly budget check scheduled
      const existingNotifications =
        await notificationService.getScheduledNotifications();
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

      const notificationId = await notificationService.scheduleNotification({
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
    } catch (error) {
      console.error("Error scheduling weekly budget check:", error);
      return "";
    }
  }

  // Reschedule the next weekly budget check (called after notification fires)
  async rescheduleWeeklyBudgetCheck(): Promise<string> {
    try {
      // Check if user still has budget reminders enabled
      const isBudgetRemindersEnabled = await checkNotificationPermission(
        "budget-reminders"
      );

      if (!isBudgetRemindersEnabled) {
        return "";
      }

      // Cancel existing weekly budget check
      const existingNotifications =
        await notificationService.getScheduledNotifications();
      const existingWeeklyCheck = existingNotifications.find(
        (notification) =>
          notification.content.data?.type === "weekly-budget-check"
      );

      if (existingWeeklyCheck) {
        await notificationService.cancelNotification(
          existingWeeklyCheck.identifier
        );
      }

      // Schedule the next one (7 days from now)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(10, 0, 0, 0);

      return await notificationService.scheduleNotification({
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
    } catch (error) {
      console.error("Error rescheduling weekly budget check:", error);
      return "";
    }
  }

  // Schedule category-specific over-budget notifications
  async scheduleCategoryOverBudgetNotifications(userId: string): Promise<void> {
    try {
      // Check if budget reminders are enabled before scheduling
      const isBudgetRemindersEnabled = await checkNotificationPermission(
        "budget-reminders"
      );

      if (!isBudgetRemindersEnabled) {
        return; // Budget reminders are disabled
      }

      // Cancel existing category over-budget notifications first
      await notificationService.cancelNotificationsByType(
        "category-over-budget"
      );

      const { overBudgetCategories, totalOverBudget } =
        await this.getCategoryOverBudgetStatus(userId);

      if (overBudgetCategories.length === 0) {
        return; // No over-budget categories
      }

      // Schedule notification for tomorrow morning
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM

      let title = "⚠️ Budget Alert";
      let body = "";

      if (overBudgetCategories.length === 1) {
        const category = overBudgetCategories[0];
        body = `${
          category.categoryName
        } is over budget by $${category.overAmount.toFixed(2)}.`;
      } else {
        body = `You're over budget in ${
          overBudgetCategories.length
        } categories by $${totalOverBudget.toFixed(2)} total.`;
      }

      // Use a consistent ID to prevent duplicates
      await notificationService.scheduleNotification({
        id: `category-over-budget-${userId}`,
        title,
        body,
        data: {
          type: "category-over-budget",
          overBudgetCategories,
          totalOverBudget,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(
            300, // Minimum 5 minute delay
            Math.floor((tomorrow.getTime() - Date.now()) / 1000)
          ),
        },
      });
    } catch (error) {
      console.error(
        "Error scheduling category over-budget notifications:",
        error
      );
    }
  }

  // Schedule smart budget reminders that calculate values at scheduling time
  async scheduleDynamicBudgetReminders(userId: string): Promise<void> {
    try {
      // Check if budget reminders are enabled before scheduling
      const isBudgetRemindersEnabled = await checkNotificationPermission(
        "budget-reminders"
      );

      if (!isBudgetRemindersEnabled) {
        return; // Budget reminders are disabled
      }

      // Cancel existing budget reminders first
      await this.cancelAllBudgetReminders();

      // Get current budget status to determine what type of reminder to send
      const budgetStatus = await this.getCurrentBudgetStatus(userId);
      const { remainingBudget, daysLeft, totalIncome, totalExpenses } =
        budgetStatus;

      if (daysLeft <= 0) return; // End of month

      // Determine the most appropriate reminder type based on current status
      const isOverBudget = remainingBudget < 0;
      const isNearEndOfMonth = daysLeft <= 7;
      const isLowBudget = remainingBudget < totalIncome * 0.1; // Less than 10% of income left

      let reminderType: "urgent" | "weekly" | "monthly" = "monthly";
      let triggerTime: Date;

      if (isOverBudget || isLowBudget) {
        // Urgent reminder - send tomorrow morning
        reminderType = "urgent";
        triggerTime = new Date();
        triggerTime.setDate(triggerTime.getDate() + 1);
        triggerTime.setHours(8, 0, 0, 0);
      } else if (isNearEndOfMonth) {
        // Weekly reminder for end of month
        reminderType = "weekly";
        triggerTime = new Date();
        triggerTime.setDate(triggerTime.getDate() + 1);
        triggerTime.setHours(9, 0, 0, 0);
      } else {
        // Monthly reminder - send in a week
        reminderType = "monthly";
        triggerTime = new Date();
        triggerTime.setDate(triggerTime.getDate() + 7);
        triggerTime.setHours(10, 0, 0, 0);
      }

      // Use shared utility to create notification content
      const { title, body } = createBudgetNotificationContent(
        reminderType,
        remainingBudget,
        daysLeft,
        totalIncome
      );

      // Schedule the single, smart reminder with dynamic calculation flag
      await notificationService.scheduleNotification({
        id: `budget-reminder-${reminderType}-${userId}`,
        title: "💰 Budget Update", // Placeholder title - will be calculated at notification time
        body: "Calculating your current budget status...", // Placeholder body - will be calculated at notification time
        data: {
          type: "dynamic-budget-reminder",
          userId,
          reminderType,
          needsCalculation: true,
          scheduledAt: Date.now(),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
        },
      });

      console.log(
        `Smart budget reminder scheduled: ${reminderType} for ${triggerTime.toLocaleDateString()}`
      );
    } catch (error) {
      console.error("Error scheduling smart budget reminders:", error);
    }
  }

  // Cancel all budget reminders
  async cancelAllBudgetReminders(): Promise<void> {
    try {
      const scheduledNotifications =
        await notificationService.getScheduledNotifications();

      for (const notification of scheduledNotifications) {
        const data = notification.content.data;
        if (
          data?.type === "budget-reminder" ||
          data?.type === "dynamic-budget-reminder" ||
          data?.type === "weekly-budget-check"
        ) {
          await notificationService.cancelNotification(notification.identifier);
        }
      }

      console.log("All budget reminders cancelled");
    } catch (error) {
      console.error("Error cancelling budget reminders:", error);
    }
  }

  // Reschedule budget reminders when financial data changes
  async rescheduleBudgetReminders(userId: string): Promise<void> {
    try {
      // Check if budget reminders are enabled
      const isBudgetRemindersEnabled = await checkNotificationPermission(
        "budget-reminders"
      );

      if (!isBudgetRemindersEnabled) {
        return;
      }

      // Cancel existing reminders and schedule new ones with updated data
      await this.scheduleDynamicBudgetReminders(userId);
      console.log("Budget reminders rescheduled with updated data");
    } catch (error) {
      console.error("Error rescheduling budget reminders:", error);
    }
  }

  // Update budget reminders when new transactions are added
  async updateBudgetRemindersOnTransactionChange(
    userId: string
  ): Promise<void> {
    try {
      // Check if budget reminders are enabled
      const isBudgetRemindersEnabled = await checkNotificationPermission(
        "budget-reminders"
      );

      if (!isBudgetRemindersEnabled) {
        return;
      }

      // Get current budget status to see if reminder type should change
      const budgetStatus = await this.getCurrentBudgetStatus(userId);
      const { remainingBudget, daysLeft, totalIncome } = budgetStatus;

      if (daysLeft <= 0) return; // End of month

      // Determine if we need to reschedule based on new budget status
      const isOverBudget = remainingBudget < 0;
      const isNearEndOfMonth = daysLeft <= 7;
      const isLowBudget = remainingBudget < totalIncome * 0.1;

      // Check if current scheduled reminder type matches new status
      const scheduledNotifications =
        await notificationService.getScheduledNotifications();
      const existingBudgetReminder = scheduledNotifications.find(
        (n) =>
          n.content.data?.type === "dynamic-budget-reminder" &&
          n.content.data?.userId === userId
      );

      if (existingBudgetReminder) {
        const currentReminderType =
          existingBudgetReminder.content.data?.reminderType;
        let shouldReschedule = false;

        // Determine if we need to reschedule based on urgency changes
        if (isOverBudget || isLowBudget) {
          shouldReschedule = currentReminderType !== "urgent";
        } else if (isNearEndOfMonth) {
          shouldReschedule = currentReminderType !== "weekly";
        } else {
          shouldReschedule = currentReminderType !== "monthly";
        }

        if (shouldReschedule) {
          console.log(
            `📊 Budget status changed, rescheduling reminder from ${currentReminderType} to new type`
          );
          await this.scheduleDynamicBudgetReminders(userId);
        } else {
          console.log(
            `📊 Budget status updated, keeping current ${currentReminderType} reminder`
          );
        }
      } else {
        // No existing reminder, schedule one
        await this.scheduleDynamicBudgetReminders(userId);
      }
    } catch (error) {
      console.error(
        "Error updating budget reminders on transaction change:",
        error
      );
    }
  }

  // Get category-specific over-budget status (matches smart insights logic)
  async getCategoryOverBudgetStatus(userId: string): Promise<{
    overBudgetCategories: Array<{
      categoryName: string;
      spent: number;
      limit: number;
      overAmount: number;
    }>;
    totalOverBudget: number;
  }> {
    try {
      const [transactions, budgetCategories, recurringTransactions] =
        await Promise.all([
          getUserTransactions(userId),
          getUserBudgetCategories(userId),
          getUserRecurringTransactions(userId),
        ]);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Filter transactions for current month (excluding those created from recurring transactions)
      const currentMonthTransactions = transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        return (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear &&
          transaction.type === "expense" &&
          !transaction.recurringTransactionId // Exclude transactions created from recurring transactions
        );
      });

      // Calculate spending by category
      const categorySpending: Record<string, number> = {};
      currentMonthTransactions.forEach((transaction) => {
        const category = transaction.category;
        categorySpending[category] =
          (categorySpending[category] || 0) + transaction.amount;
      });

      // Add all active recurring expenses for current month (planned expenses, regardless of payment status)
      const activeRecurringExpenses = recurringTransactions
        .filter((rt) => rt.type === "expense" && rt.isActive)
        .reduce((sum, rt) => sum + rt.amount, 0);

      // Distribute recurring expenses across categories (simplified approach)
      // This ensures all recurring expenses are counted in budget calculations
      recurringTransactions
        .filter((rt) => rt.type === "expense" && rt.isActive)
        .forEach((rt) => {
          const category = rt.category;
          categorySpending[category] =
            (categorySpending[category] || 0) + rt.amount;
        });

      // Check each budget category for over-budget spending
      const overBudgetCategories: Array<{
        categoryName: string;
        spent: number;
        limit: number;
        overAmount: number;
      }> = [];
      let totalOverBudget = 0;

      budgetCategories.forEach((category) => {
        const spent = categorySpending[category.name] || 0;

        if (spent > category.monthlyLimit && category.monthlyLimit > 0) {
          const overAmount = spent - category.monthlyLimit;
          totalOverBudget += overAmount;
          overBudgetCategories.push({
            categoryName: category.name,
            spent,
            limit: category.monthlyLimit,
            overAmount,
          });
        }
      });

      return {
        overBudgetCategories,
        totalOverBudget,
      };
    } catch (error) {
      console.error("Error getting category over-budget status:", error);
      return {
        overBudgetCategories: [],
        totalOverBudget: 0,
      };
    }
  }

  // Get current budget status
  async getCurrentBudgetStatus(userId: string): Promise<{
    totalIncome: number;
    totalExpenses: number;
    remainingBudget: number;
    budgetLimit: number;
    daysLeft: number;
  }> {
    try {
      const [transactions, budgetSettings, goals, recurringTransactions] =
        await Promise.all([
          getUserTransactions(userId),
          getUserBudgetSettings(userId),
          getUserGoals(userId),
          getUserRecurringTransactions(userId),
        ]);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const monthlyTransactions = transactions.filter((transaction: any) => {
        const transactionDate = new Date(transaction.date);
        return (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      });

      // Calculate income including active recurring income for current month
      const individualIncome = monthlyTransactions
        .filter((t: any) => t.type === "income" && !t.recurringTransactionId)
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      // Get active recurring income for current month
      const activeRecurringIncome = recurringTransactions
        .filter((rt) => rt.type === "income" && rt.isActive)
        .reduce((sum, rt) => sum + rt.amount, 0);

      const totalIncome = individualIncome + activeRecurringIncome;

      // Calculate expenses including all active recurring expenses (planned expenses, regardless of payment status)
      const individualExpenses = monthlyTransactions
        .filter((t: any) => t.type === "expense" && !t.recurringTransactionId)
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      // Get all active recurring expenses for current month (planned expenses, regardless of payment status)
      const activeRecurringExpenses = recurringTransactions
        .filter((rt) => rt.type === "expense" && rt.isActive)
        .reduce((sum, rt) => sum + rt.amount, 0);

      const totalExpenses = individualExpenses + activeRecurringExpenses;

      // Calculate remaining balance like in budget summary
      const netIncome = totalIncome - totalExpenses;
      const savingsPercent = budgetSettings?.savingsPercentage || 20;
      const debtPayoffPercent = budgetSettings?.debtPayoffPercentage || 5;
      const savingsAmount = totalIncome * (savingsPercent / 100);

      // Calculate total goal contributions
      const totalGoalContributions = goals.reduce(
        (total: number, goal: any) => {
          return total + goal.monthlyContribution;
        },
        0
      );

      const debtPayoffAmount = totalIncome * (debtPayoffPercent / 100);
      const discretionaryIncome =
        netIncome - savingsAmount - debtPayoffAmount - totalGoalContributions;
      const remainingBalance = discretionaryIncome;

      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const daysLeft = daysInMonth - new Date().getDate();

      return {
        totalIncome,
        totalExpenses,
        remainingBudget: remainingBalance,
        budgetLimit: totalIncome,
        daysLeft: Math.max(0, daysLeft),
      };
    } catch (error) {
      console.error("Error getting budget status:", error);
      return {
        totalIncome: 0,
        totalExpenses: 0,
        remainingBudget: 0,
        budgetLimit: 0,
        daysLeft: 0,
      };
    }
  }
}

export const budgetReminderService = BudgetReminderService.getInstance();
