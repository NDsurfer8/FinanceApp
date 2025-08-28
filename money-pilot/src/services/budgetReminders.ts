import { notificationService } from "./notifications";
import {
  getUserTransactions,
  getUserBudgetSettings,
  getUserGoals,
} from "./userData";
import * as Notifications from "expo-notifications";

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
      console.log("Scheduling budget reminders for user:", userId);

      // Get user's transactions, budget settings, and goals
      const [transactions, budgetSettings, goals] = await Promise.all([
        getUserTransactions(userId),
        getUserBudgetSettings(userId),
        getUserGoals(userId),
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

      const totalIncome = monthlyTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpenses = monthlyTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      // Calculate remaining balance like in budget summary
      const netIncome = totalIncome - totalExpenses;
      const savingsPercent = budgetSettings?.savingsPercentage || 20;
      const debtPayoffPercent = budgetSettings?.debtPayoffPercentage || 5;
      const savingsAmount = totalIncome * (savingsPercent / 100);

      // Calculate total goal contributions
      const totalGoalContributions = goals.reduce((total, goal) => {
        return total + goal.monthlyContribution;
      }, 0);

      const discretionaryIncome =
        netIncome - savingsAmount - totalGoalContributions;
      const debtPayoffAmount = discretionaryIncome * (debtPayoffPercent / 100);
      const remainingBalance = discretionaryIncome - debtPayoffAmount;

      // Schedule different types of budget reminders
      await this.scheduleMonthlyBudgetReminder(remainingBalance, totalIncome);
      await this.scheduleWeeklyBudgetReminder(remainingBalance, totalIncome);
      await this.scheduleDailyBudgetReminder(remainingBalance, totalIncome);

      console.log("All budget reminders scheduled successfully");
    } catch (error) {
      console.error("Error scheduling budget reminders:", error);
    }
  }

  // Schedule monthly budget reminder
  async scheduleMonthlyBudgetReminder(
    remainingBudget: number,
    budgetLimit: number
  ): Promise<void> {
    try {
      const now = new Date();
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();
      const daysLeft = daysInMonth - now.getDate();

      if (daysLeft <= 0) return; // End of month

      const dailyBudget = remainingBudget / daysLeft;
      const isOverBudget = remainingBudget < 0;
      const isNearLimit =
        budgetLimit > 0 && remainingBudget < budgetLimit * 0.2; // Less than 20% left

      let title = "💰 Budget Update";
      let body = `You have $${remainingBudget.toFixed(
        2
      )} remaining this month.`;

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
      }

      // Schedule for tomorrow morning
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM

      await notificationService.scheduleNotification({
        id: `budget-monthly-${tomorrow.getTime()}`,
        title,
        body,
        data: {
          type: "budget-reminder",
          reminderType: "monthly",
          remainingBudget,
          budgetLimit,
          daysLeft,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(
            300, // Minimum 5 minute delay
            Math.floor((tomorrow.getTime() - Date.now()) / 1000)
          ),
        },
      });

      console.log(
        `Scheduled monthly budget reminder for ${tomorrow.toLocaleDateString()}`
      );
    } catch (error) {
      console.error("Error scheduling monthly budget reminder:", error);
    }
  }

  // Schedule weekly budget reminder
  async scheduleWeeklyBudgetReminder(
    remainingBudget: number,
    budgetLimit: number
  ): Promise<void> {
    try {
      const now = new Date();
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();
      const daysLeft = daysInMonth - now.getDate();

      if (daysLeft <= 0) return; // End of month

      // Calculate weekly budget (remaining budget for the rest of the month)
      const weeksLeft = Math.ceil(daysLeft / 7);
      const weeklyBudget = remainingBudget / weeksLeft;
      const isOverBudget = remainingBudget < 0;

      let title = "📊 Weekly Budget Check";
      let body = `You have $${remainingBudget.toFixed(
        2
      )} remaining this month. Weekly budget: $${weeklyBudget.toFixed(2)}`;

      if (isOverBudget) {
        title = "⚠️ Weekly Budget Alert";
        body = `You're over budget this month. Consider reducing expenses.`;
      }

      // Schedule for tomorrow morning
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0); // 8 AM

      await notificationService.scheduleNotification({
        id: `budget-weekly-${tomorrow.getTime()}`,
        title,
        body,
        data: {
          type: "budget-reminder",
          reminderType: "weekly",
          remainingBudget,
          weeklyBudget,
          weeksLeft,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(
            300, // Minimum 5 minute delay
            Math.floor((tomorrow.getTime() - Date.now()) / 1000)
          ),
        },
      });

      console.log(
        `Scheduled weekly budget reminder for ${tomorrow.toLocaleDateString()}`
      );
    } catch (error) {
      console.error("Error scheduling weekly budget reminder:", error);
    }
  }

  // Schedule daily budget reminder
  async scheduleDailyBudgetReminder(
    remainingBudget: number,
    budgetLimit: number
  ): Promise<void> {
    try {
      const now = new Date();
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();
      const daysLeft = daysInMonth - now.getDate();

      if (daysLeft <= 0) return; // End of month

      const dailyBudget = remainingBudget / daysLeft;
      const isOverBudget = remainingBudget < 0;

      let title = "📅 Daily Budget";
      let body = `You have $${remainingBudget.toFixed(
        2
      )} remaining this month. Daily budget: $${dailyBudget.toFixed(2)}`;

      if (isOverBudget) {
        title = "⚠️ Daily Budget Alert";
        body = `You're over budget this month. Daily limit: $${Math.abs(
          dailyBudget
        ).toFixed(2)}`;
      }

      // Schedule for tomorrow morning
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(7, 0, 0, 0); // 7 AM

      await notificationService.scheduleNotification({
        id: `budget-daily-${tomorrow.getTime()}`,
        title,
        body,
        data: {
          type: "budget-reminder",
          reminderType: "daily",
          remainingBudget,
          dailyBudget,
          daysLeft,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(
            300, // Minimum 5 minute delay
            Math.floor((tomorrow.getTime() - Date.now()) / 1000)
          ),
        },
      });

      console.log(
        `Scheduled daily budget reminder for ${tomorrow.toLocaleDateString()}`
      );
    } catch (error) {
      console.error("Error scheduling daily budget reminder:", error);
    }
  }

  // Cancel all budget reminders
  async cancelAllBudgetReminders(): Promise<void> {
    try {
      const scheduledNotifications =
        await notificationService.getScheduledNotifications();

      for (const notification of scheduledNotifications) {
        const data = notification.content.data;
        if (data?.type === "budget-reminder") {
          await notificationService.cancelNotification(notification.identifier);
        }
      }

      console.log("All budget reminders cancelled");
    } catch (error) {
      console.error("Error cancelling budget reminders:", error);
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
      const [transactions, budgetSettings, goals] = await Promise.all([
        getUserTransactions(userId),
        getUserBudgetSettings(userId),
        getUserGoals(userId),
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

      const totalIncome = monthlyTransactions
        .filter((t: any) => t.type === "income")
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const totalExpenses = monthlyTransactions
        .filter((t: any) => t.type === "expense")
        .reduce((sum: number, t: any) => sum + t.amount, 0);

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

      const discretionaryIncome =
        netIncome - savingsAmount - totalGoalContributions;
      const debtPayoffAmount = discretionaryIncome * (debtPayoffPercent / 100);
      const remainingBalance = discretionaryIncome - debtPayoffAmount;

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
