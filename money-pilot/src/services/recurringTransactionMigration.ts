import {
  getUserRecurringTransactions,
  updateRecurringTransaction,
} from "./userData";
import { RecurringTransaction } from "./userData";

// Migration utility for transitioning to smart recurring transaction system
export class RecurringTransactionMigration {
  // Migrate existing recurring transactions to include new fields
  static async migrateToSmartSystem(userId: string): Promise<{
    migrated: number;
    errors: number;
  }> {
    try {
      console.log(
        "Starting migration to smart recurring transaction system..."
      );

      const recurringTransactions = await getUserRecurringTransactions(userId);
      let migrated = 0;
      let errors = 0;

      for (const recurring of recurringTransactions) {
        try {
          // Calculate new fields
          const now = Date.now();
          const lastGeneratedDate = recurring.lastGeneratedDate || now;
          const nextDueDate = this.calculateNextDueDate(recurring, new Date());
          const totalOccurrences = recurring.totalOccurrences || 0;

          // Update recurring transaction with new fields
          await updateRecurringTransaction({
            ...recurring,
            lastGeneratedDate,
            nextDueDate,
            totalOccurrences,
            updatedAt: now,
          });

          migrated++;
        } catch (error) {
          console.error(
            `Error migrating recurring transaction ${recurring.name}:`,
            error
          );
          errors++;
        }
      }

      return { migrated, errors };
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  }

  // Calculate next due date for existing recurring transactions
  private static calculateNextDueDate(
    recurring: RecurringTransaction,
    fromDate: Date
  ): number {
    const startDate = new Date(recurring.startDate);

    switch (recurring.frequency) {
      case "weekly":
        return new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000).getTime();
      case "biweekly":
        return new Date(
          fromDate.getTime() + 14 * 24 * 60 * 60 * 1000
        ).getTime();
      case "monthly":
        const nextMonth = new Date(fromDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth.getTime();
      case "quarterly":
        const nextQuarter = new Date(fromDate);
        nextQuarter.setMonth(nextQuarter.getMonth() + 3);
        return nextQuarter.getTime();
      case "yearly":
        const nextYear = new Date(fromDate);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        return nextYear.getTime();
      default:
        return fromDate.getTime();
    }
  }

  // Clean up old recurring transaction instances (optional)
  static async cleanupOldInstances(userId: string): Promise<{
    cleaned: number;
    errors: number;
  }> {
    try {
      console.log("Starting cleanup of old recurring transaction instances...");

      // This is optional and should be done carefully
      // You might want to keep some historical data
      // For now, we'll just log what would be cleaned

      console.log("Cleanup completed. No instances removed (safety mode)");
      return { cleaned: 0, errors: 0 };
    } catch (error) {
      console.error("Cleanup failed:", error);
      throw error;
    }
  }

  // Validate migration results
  static async validateMigration(userId: string): Promise<{
    valid: number;
    invalid: number;
    details: string[];
  }> {
    try {
      const recurringTransactions = await getUserRecurringTransactions(userId);
      let valid = 0;
      let invalid = 0;
      const details: string[] = [];

      for (const recurring of recurringTransactions) {
        const hasRequiredFields =
          recurring.lastGeneratedDate !== undefined &&
          recurring.nextDueDate !== undefined &&
          recurring.totalOccurrences !== undefined;

        if (hasRequiredFields) {
          valid++;
        } else {
          invalid++;
          details.push(`Missing fields for: ${recurring.name}`);
        }
      }

      return { valid, invalid, details };
    } catch (error) {
      console.error("Validation failed:", error);
      throw error;
    }
  }
}

// Export migration functions for easy access
export const migrateRecurringTransactions =
  RecurringTransactionMigration.migrateToSmartSystem;
export const cleanupOldInstances =
  RecurringTransactionMigration.cleanupOldInstances;
export const validateMigration =
  RecurringTransactionMigration.validateMigration;
