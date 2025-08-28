import { notificationService } from "./notifications";
import { getUserTransactions, getUserRecurringTransactions } from "./userData";
import * as Notifications from "expo-notifications";

export interface BillReminder {
  id: string;
  billName: string;
  dueDate: Date;
  amount: number;
  reminderDays: number;
  isRecurring: boolean;
}

export class BillReminderService {
  private static instance: BillReminderService;

  private constructor() {}

  static getInstance(): BillReminderService {
    if (!BillReminderService.instance) {
      BillReminderService.instance = new BillReminderService();
    }
    return BillReminderService.instance;
  }

  // Schedule all bill reminders for a user
  async scheduleAllBillReminders(userId: string): Promise<void> {
    try {
      console.log("Scheduling bill reminders for user:", userId);

      // Get all transactions and recurring transactions
      const [transactions, recurringTransactions] = await Promise.all([
        getUserTransactions(userId),
        getUserRecurringTransactions(userId),
      ]);

      console.log(
        `Found ${transactions.length} transactions and ${recurringTransactions.length} recurring transactions`
      );

      // Cancel existing bill reminders first
      await this.cancelAllBillReminders();

      // Schedule reminders for regular transactions with due dates
      for (const transaction of transactions) {
        console.log(
          `Checking transaction: ${transaction.description}, type: ${transaction.type}, date: ${transaction.date}`
        );

        if (transaction.type === "expense" && transaction.date) {
          const dueDate = new Date(transaction.date);
          const now = new Date();

          console.log(
            `Transaction ${
              transaction.description
            }: dueDate=${dueDate.toLocaleDateString()}, now=${now.toLocaleDateString()}, dueDate > now = ${
              dueDate > now
            }`
          );

          // Only schedule if due date is in the future
          if (dueDate > now) {
            console.log(
              `Scheduling reminder for transaction: ${transaction.description}`
            );
            await this.scheduleBillReminder(
              transaction.description,
              dueDate,
              transaction.amount,
              false
            );
          } else {
            console.log(
              `Skipping transaction ${transaction.description} - due date is not in the future`
            );
          }
        } else {
          console.log(
            `Skipping transaction ${transaction.description} - not an expense or no date`
          );
        }
      }

      // Schedule reminders for recurring transactions
      for (const recurring of recurringTransactions) {
        if (recurring.type === "expense" && recurring.isActive) {
          const nextOccurrence = this.calculateNextOccurrence(recurring);
          if (nextOccurrence) {
            await this.scheduleBillReminder(
              recurring.name,
              nextOccurrence,
              recurring.amount,
              true
            );
          }
        }
      }

      console.log("All bill reminders scheduled successfully");
    } catch (error) {
      console.error("Error scheduling bill reminders:", error);
    }
  }

  // Schedule a single bill reminder
  async scheduleBillReminder(
    billName: string,
    dueDate: Date,
    amount: number,
    isRecurring: boolean = false,
    reminderDays: number = 3
  ): Promise<void> {
    try {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - reminderDays);

      // Check if bill is due today or overdue
      const isDueToday = dueDate.toDateString() === new Date().toDateString();
      const isOverdue = dueDate < new Date();
      const isDueSoon =
        dueDate.getTime() - new Date().getTime() <= 7 * 24 * 60 * 60 * 1000; // Within 7 days

      if (
        reminderDate <= new Date() &&
        !isDueToday &&
        !isOverdue &&
        !isDueSoon
      ) {
        return;
      }

      // Calculate seconds until reminder with minimum delay
      const secondsUntilReminder = Math.max(
        300, // Minimum 5 minute delay to prevent immediate firing
        Math.floor((reminderDate.getTime() - Date.now()) / 1000)
      );

      if (isDueToday || isOverdue) {
        // Send notification for bills due today or overdue with minimum delay
        await notificationService.scheduleNotification({
          id: `bill-reminder-${billName}-${dueDate.getTime()}`,
          title: isOverdue ? "🚨 Overdue Bill!" : "🚨 Bill Due Today!",
          body: `${billName} ${
            isOverdue ? "was due" : "is due today"
          }! Amount: $${amount.toFixed(2)}`,
          data: {
            type: "bill-reminder",
            billName,
            amount,
            dueDate: dueDate.toISOString(),
            reminderDays,
            isRecurring,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilReminder,
          },
        });
      } else {
        // For future bills, schedule with delay
        await notificationService.scheduleNotification({
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
            isRecurring,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilReminder,
          },
        });
      }

      // Also schedule a day-of reminder with minimum delay
      if (isDueToday || isOverdue) {
        const secondsUntilDue = Math.max(
          300, // Minimum 5 minute delay
          Math.floor((dueDate.getTime() - Date.now()) / 1000)
        );

        await notificationService.scheduleNotification({
          id: `bill-due-today-${billName}-${dueDate.getTime()}`,
          title: "🚨 Bill Due Today",
          body: `${billName} is due today! Amount: $${amount.toFixed(2)}`,
          data: {
            type: "bill-due-today",
            billName,
            amount,
            dueDate: dueDate.toISOString(),
            isRecurring,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilDue,
          },
        });
      }

      console.log(
        `Scheduled reminders for ${billName} due ${dueDate.toLocaleDateString()}`
      );
    } catch (error) {
      console.error(`Error scheduling reminder for ${billName}:`, error);
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
  async cancelAllBillReminders(): Promise<void> {
    try {
      const scheduledNotifications =
        await notificationService.getScheduledNotifications();

      for (const notification of scheduledNotifications) {
        const data = notification.content.data;
        if (data?.type === "bill-reminder" || data?.type === "bill-due-today") {
          await notificationService.cancelNotification(notification.identifier);
        }
      }

      console.log("All bill reminders cancelled");
    } catch (error) {
      console.error("Error cancelling bill reminders:", error);
    }
  }

  // Get upcoming bills for a user
  async getUpcomingBills(
    userId: string,
    daysAhead: number = 30
  ): Promise<BillReminder[]> {
    try {
      const [transactions, recurringTransactions] = await Promise.all([
        getUserTransactions(userId),
        getUserRecurringTransactions(userId),
      ]);

      const upcomingBills: BillReminder[] = [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

      // Add regular transactions
      for (const transaction of transactions) {
        if (transaction.type === "expense" && transaction.date) {
          const dueDate = new Date(transaction.date);
          if (dueDate >= new Date() && dueDate <= cutoffDate) {
            upcomingBills.push({
              id: transaction.id || `transaction-${transaction.date}`,
              billName: transaction.description,
              dueDate,
              amount: transaction.amount,
              reminderDays: 3,
              isRecurring: false,
            });
          }
        }
      }

      // Add recurring transactions
      for (const recurring of recurringTransactions) {
        if (recurring.type === "expense" && recurring.isActive) {
          const nextOccurrence = this.calculateNextOccurrence(recurring);
          if (nextOccurrence && nextOccurrence <= cutoffDate) {
            upcomingBills.push({
              id: recurring.id || `recurring-${recurring.name}`,
              billName: recurring.name,
              dueDate: nextOccurrence,
              amount: recurring.amount,
              reminderDays: 3,
              isRecurring: true,
            });
          }
        }
      }

      // Sort by due date
      return upcomingBills.sort(
        (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
      );
    } catch (error) {
      console.error("Error getting upcoming bills:", error);
      return [];
    }
  }
}

export const billReminderService = BillReminderService.getInstance();
