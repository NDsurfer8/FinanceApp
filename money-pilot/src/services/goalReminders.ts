import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUserGoals } from "./userData";
import { notificationService } from "./notifications";

export class GoalReminderService {
  private static instance: GoalReminderService;

  static getInstance(): GoalReminderService {
    if (!GoalReminderService.instance) {
      GoalReminderService.instance = new GoalReminderService();
    }
    return GoalReminderService.instance;
  }

  // Schedule all goal reminders for a user
  async scheduleAllGoalReminders(userId: string): Promise<void> {
    try {
      // Check if goal reminders are enabled before scheduling
      const goalRemindersEnabled = await AsyncStorage.getItem(
        `notification_goal-reminders`
      );
      const isGoalRemindersEnabled = goalRemindersEnabled === "true";

      if (!isGoalRemindersEnabled) {
        return; // Goal reminders are disabled
      }

      // Get user's goals
      const goals = await getUserGoals(userId);

      if (goals.length === 0) {
        return;
      }

      // Cancel existing goal reminders first
      await this.cancelAllGoalReminders();

      // Schedule reminders for each goal
      for (const goal of goals) {
        await notificationService.scheduleGoalReminder(
          goal.name,
          goal.targetAmount,
          goal.currentAmount,
          new Date(goal.targetDate)
        );
      }
    } catch (error) {
      console.error("Error scheduling goal reminders:", error);
    }
  }

  // Cancel all goal reminders
  async cancelAllGoalReminders(): Promise<void> {
    try {
      // Cancel all notifications with goal-reminder type
      await notificationService.cancelNotificationsByType("goal-reminder");
    } catch (error) {
      console.error("Error cancelling goal reminders:", error);
    }
  }
}

export const goalReminderService = GoalReminderService.getInstance();
