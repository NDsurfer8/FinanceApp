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
      console.log(
        "🚀 [Budget Reminders] Starting to schedule all budget reminders for user:",
        userId
      );

      // Check if budget reminders are enabled before scheduling
      const budgetRemindersEnabled = await AsyncStorage.getItem(
        `notification_budget-reminders`
      );
      const isBudgetRemindersEnabled = budgetRemindersEnabled === "true";
      console.log(
        "⚙️ [Budget Reminders] Budget reminders enabled:",
        isBudgetRemindersEnabled
      );

      if (!isBudgetRemindersEnabled) {
        // If not enabled, just cancel existing reminders and return
        console.log(
          "❌ [Budget Reminders] Budget reminders disabled, cancelling existing reminders"
        );
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

      console.log(
        "📊 [Budget Reminders] Data loaded - Transactions:",
        transactions.length,
        "Goals:",
        goals.length,
        "Recurring:",
        recurringTransactions.length
      );

      // Cancel existing budget reminders
      await this.cancelAllBudgetReminders();

      // Calculate current month's budget status
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      console.log(
        "📅 [Budget Reminders] Current month/year:",
        currentMonth + 1,
        currentYear
      );

      const monthlyTransactions = transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        return (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      });

      console.log(
        "💳 [Budget Reminders] Monthly transactions count:",
        monthlyTransactions.length
      );

      // Calculate income including active recurring income for current month
      const individualIncome = monthlyTransactions
        .filter((t) => t.type === "income" && !t.recurringTransactionId)
        .reduce((sum, t) => sum + t.amount, 0);

      // Get active recurring income for current month
      const activeRecurringIncome = recurringTransactions
        .filter((rt) => rt.type === "income" && rt.isActive)
        .reduce((sum, rt) => sum + rt.amount, 0);

      const totalIncome = individualIncome + activeRecurringIncome;

      // Calculate expenses including all active recurring expenses (planned expenses)
      const individualExpenses = monthlyTransactions
        .filter((t) => t.type === "expense" && !t.recurringTransactionId)
        .reduce((sum, t) => sum + t.amount, 0);

      // Get all active recurring expenses for current month (planned expenses, regardless of payment status)
      const activeRecurringExpenses = recurringTransactions
        .filter((rt) => rt.type === "expense" && rt.isActive)
        .reduce((sum, rt) => sum + rt.amount, 0);

      const totalExpenses = individualExpenses + activeRecurringExpenses;
      console.log(
        "💸 [Budget Reminders] Individual expenses:",
        individualExpenses
      );
      console.log(
        "💸 [Budget Reminders] Active recurring expenses (planned):",
        activeRecurringExpenses
      );
      console.log("💸 [Budget Reminders] Total expenses:", totalExpenses);

      // Calculate remaining balance like in budget summary
      const netIncome = totalIncome - totalExpenses;
      const savingsPercent = budgetSettings?.savingsPercentage || 20;
      const debtPayoffPercent = budgetSettings?.debtPayoffPercentage || 5;
      const savingsAmount = totalIncome * (savingsPercent / 100);

      console.log("📊 [Budget Reminders] Net income:", netIncome);
      console.log(
        "💾 [Budget Reminders] Savings %:",
        savingsPercent,
        "Amount:",
        savingsAmount
      );

      // Calculate total goal contributions
      const totalGoalContributions = goals.reduce((total, goal) => {
        return total + goal.monthlyContribution;
      }, 0);

      const debtPayoffAmount = totalIncome * (debtPayoffPercent / 100);
      const discretionaryIncome =
        netIncome - savingsAmount - debtPayoffAmount - totalGoalContributions;
      const remainingBalance = discretionaryIncome;

      console.log(
        "🎯 [Budget Reminders] Goal contributions:",
        totalGoalContributions
      );
      console.log(
        "💳 [Budget Reminders] Debt payoff %:",
        debtPayoffPercent,
        "Amount:",
        debtPayoffAmount
      );
      console.log(
        "🧮 [Budget Reminders] Calculation: netIncome - savings - debt - goals"
      );
      console.log(
        "🧮 [Budget Reminders] Calculation:",
        netIncome,
        "-",
        savingsAmount,
        "-",
        debtPayoffAmount,
        "-",
        totalGoalContributions,
        "=",
        remainingBalance
      );

      console.log(
        "📅 [Budget Reminders] Scheduling budget reminders with safe to spend amount:",
        remainingBalance,
        "and total income:",
        totalIncome
      );

      // Schedule different types of budget reminders
      console.log(
        "📅 [Budget Reminders] Scheduling monthly budget reminder..."
      );
      await this.scheduleMonthlyBudgetReminder(remainingBalance, totalIncome);

      console.log("📅 [Budget Reminders] Scheduling weekly budget reminder...");
      await this.scheduleWeeklyBudgetReminder(remainingBalance, totalIncome);

      console.log("📅 [Budget Reminders] Scheduling daily budget reminder...");
      await this.scheduleDailyBudgetReminder(remainingBalance, totalIncome);

      // Schedule category-specific over-budget notifications (matches smart insights logic)
      console.log(
        "📅 [Budget Reminders] Scheduling category over-budget notifications..."
      );
      await this.scheduleCategoryOverBudgetNotifications(userId);

      // Schedule weekly budget check notification
      console.log("📅 [Budget Reminders] Scheduling weekly budget check...");
      await notificationService.scheduleWeeklyBudgetCheck();

      console.log(
        "✅ [Budget Reminders] All budget reminders scheduled successfully!"
      );
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
      // Check if budget reminders are enabled before scheduling
      const budgetRemindersEnabled = await AsyncStorage.getItem(
        `notification_budget-reminders`
      );
      const isBudgetRemindersEnabled = budgetRemindersEnabled === "true";

      if (!isBudgetRemindersEnabled) {
        return; // Budget reminders are disabled
      }
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
        id: `budget-reminder-monthly`,
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
    } catch (error) {
      console.error("Error scheduling monthly budget reminder:", error);
    }
  }

  // Schedule category-specific over-budget notifications
  async scheduleCategoryOverBudgetNotifications(userId: string): Promise<void> {
    try {
      // Check if budget reminders are enabled before scheduling
      const budgetRemindersEnabled = await AsyncStorage.getItem(
        `notification_budget-reminders`
      );
      const isBudgetRemindersEnabled = budgetRemindersEnabled === "true";

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
        } is over budget by $${category.overAmount.toFixed(
          2
        )} (spent $${category.spent.toFixed(2)} of $${category.limit.toFixed(
          2
        )}).`;
      } else {
        // Show specific categories when multiple
        const categoryDetails = overBudgetCategories
          .map(
            (cat) => `${cat.categoryName}: $${cat.overAmount.toFixed(2)} over`
          )
          .join(", ");
        body = `Over budget in ${
          overBudgetCategories.length
        } categories (${totalOverBudget.toFixed(2)} total): ${categoryDetails}`;
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

  // Schedule weekly budget reminder
  async scheduleWeeklyBudgetReminder(
    remainingBudget: number,
    budgetLimit: number
  ): Promise<void> {
    try {
      // Check if budget reminders are enabled before scheduling
      const budgetRemindersEnabled = await AsyncStorage.getItem(
        `notification_budget-reminders`
      );
      const isBudgetRemindersEnabled = budgetRemindersEnabled === "true";

      if (!isBudgetRemindersEnabled) {
        return; // Budget reminders are disabled
      }
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
        id: `budget-reminder-weekly`,
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
      console.log(
        "📅 [Daily Budget Reminder] Starting with safe to spend amount:",
        remainingBudget,
        "total income:",
        budgetLimit
      );

      // Check if budget reminders are enabled before scheduling
      const budgetRemindersEnabled = await AsyncStorage.getItem(
        `notification_budget-reminders`
      );
      const isBudgetRemindersEnabled = budgetRemindersEnabled === "true";

      if (!isBudgetRemindersEnabled) {
        console.log(
          "❌ [Daily Budget Reminder] Budget reminders disabled, skipping"
        );
        return; // Budget reminders are disabled
      }
      const now = new Date();
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();
      const daysLeft = daysInMonth - now.getDate();

      console.log(
        "📅 [Daily Budget Reminder] Days in month:",
        daysInMonth,
        "Days left:",
        daysLeft
      );

      if (daysLeft <= 0) {
        console.log("❌ [Daily Budget Reminder] End of month, skipping");
        return; // End of month
      }

      const dailyBudget = remainingBudget / daysLeft;
      const isOverBudget = remainingBudget < 0;

      console.log(
        "💰 [Daily Budget Reminder] Daily budget:",
        dailyBudget,
        "Is over budget:",
        isOverBudget
      );

      let title = "📅 Daily Budget";
      let body = `You have $${remainingBudget.toFixed(
        2
      )} safe to spend this month. Daily budget: $${dailyBudget.toFixed(2)}`;

      if (isOverBudget) {
        title = "⚠️ Daily Budget Alert";
        body = `You're over budget this month. Daily limit: $${Math.abs(
          dailyBudget
        ).toFixed(2)}`;
      }

      console.log("📱 [Daily Budget Reminder] Notification title:", title);
      console.log("📱 [Daily Budget Reminder] Notification body:", body);

      // Schedule for tomorrow morning
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(7, 0, 0, 0); // 7 AM

      console.log("⏰ [Daily Budget Reminder] Scheduling for:", tomorrow);

      await notificationService.scheduleNotification({
        id: `budget-reminder-daily`,
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
        "✅ [Daily Budget Reminder] Successfully scheduled daily budget reminder"
      );
    } catch (error) {
      console.error(
        "❌ [Daily Budget Reminder] Error scheduling daily budget reminder:",
        error
      );
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

      // Distribute recurring expenses across categories (this is a simplified approach)
      // In a real implementation, you'd want to track which recurring transactions belong to which categories
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
      console.log(
        "🔍 [Budget Reminders] Getting current budget status for user:",
        userId
      );

      const [transactions, budgetSettings, goals, recurringTransactions] =
        await Promise.all([
          getUserTransactions(userId),
          getUserBudgetSettings(userId),
          getUserGoals(userId),
          getUserRecurringTransactions(userId),
        ]);

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      console.log(
        "📅 [Budget Reminders] Current month/year:",
        currentMonth + 1,
        currentYear
      );

      const monthlyTransactions = transactions.filter((transaction: any) => {
        const transactionDate = new Date(transaction.date);
        return (
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear
        );
      });

      console.log(
        "💳 [Budget Reminders] Monthly transactions count:",
        monthlyTransactions.length
      );

      // Calculate income including active recurring income for current month (same logic as scheduleAllBudgetReminders)
      const individualIncome = monthlyTransactions
        .filter((t) => t.type === "income" && !t.recurringTransactionId)
        .reduce((sum, t) => sum + t.amount, 0);

      // Get active recurring income for current month
      const activeRecurringIncome = recurringTransactions
        .filter((rt) => rt.type === "income" && rt.isActive)
        .reduce((sum, rt) => sum + rt.amount, 0);

      const totalIncome = individualIncome + activeRecurringIncome;

      // Calculate expenses including all active recurring expenses (planned expenses)
      const individualExpenses = monthlyTransactions
        .filter((t) => t.type === "expense" && !t.recurringTransactionId)
        .reduce((sum, t) => sum + t.amount, 0);

      // Get all active recurring expenses for current month (planned expenses, regardless of payment status)
      const activeRecurringExpenses = recurringTransactions
        .filter((rt) => rt.type === "expense" && rt.isActive)
        .reduce((sum, rt) => sum + rt.amount, 0);

      const totalExpenses = individualExpenses + activeRecurringExpenses;

      console.log("💰 [Budget Reminders] Individual income:", individualIncome);
      console.log(
        "🔄 [Budget Reminders] Active recurring income:",
        activeRecurringIncome
      );
      console.log("💰 [Budget Reminders] Total income:", totalIncome);
      console.log(
        "💸 [Budget Reminders] Individual expenses:",
        individualExpenses
      );
      console.log(
        "💸 [Budget Reminders] Active recurring expenses (planned):",
        activeRecurringExpenses
      );
      console.log("💸 [Budget Reminders] Total expenses:", totalExpenses);

      // Calculate remaining balance like in budget summary
      const netIncome = totalIncome - totalExpenses;
      const savingsPercent = budgetSettings?.savingsPercentage || 20;
      const debtPayoffPercent = budgetSettings?.debtPayoffPercentage || 5;
      const savingsAmount = totalIncome * (savingsPercent / 100);

      console.log("📊 [Budget Reminders] Net income:", netIncome);
      console.log(
        "💾 [Budget Reminders] Savings %:",
        savingsPercent,
        "Amount:",
        savingsAmount
      );

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

      console.log(
        "🎯 [Budget Reminders] Goal contributions:",
        totalGoalContributions
      );
      console.log(
        "💳 [Budget Reminders] Debt payoff %:",
        debtPayoffPercent,
        "Amount:",
        debtPayoffAmount
      );
      console.log(
        "🧮 [Budget Reminders] Calculation: netIncome - savings - debt - goals"
      );
      console.log(
        "🧮 [Budget Reminders] Calculation:",
        netIncome,
        "-",
        savingsAmount,
        "-",
        debtPayoffAmount,
        "-",
        totalGoalContributions,
        "=",
        remainingBalance
      );

      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const daysLeft = daysInMonth - new Date().getDate();

      console.log("📅 [Budget Reminders] Days left in month:", daysLeft);

      const result = {
        totalIncome,
        totalExpenses,
        remainingBudget: remainingBalance,
        budgetLimit: totalIncome,
        daysLeft: Math.max(0, daysLeft),
      };

      console.log(
        "✅ [Budget Reminders] Final result (remainingBudget = safe to spend amount):",
        result
      );
      return result;
    } catch (error) {
      console.error(
        "❌ [Budget Reminders] Error getting budget status:",
        error
      );
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
