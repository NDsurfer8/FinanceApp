import { Transaction, RecurringTransaction } from "./userData";

export interface TransactionActions {
  canDelete: boolean;
  canStopFuture: boolean;
  canModify: boolean;
  availableActions: string[];
  deleteButtonText: string;
  stopFutureButtonText: string;
}

export interface MonthOverrideData {
  amount: number;
  category: string;
  name: string;
}

export interface RecurringTransactionTemplate {
  name: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  frequency: "weekly" | "biweekly" | "monthly";
  startDate: number;
  endDate?: number;
  isActive: boolean;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export class TransactionActionsService {
  /**
   * Determines what actions are available for a transaction
   */
  static getAvailableActions(
    transaction: Transaction,
    originalRecurringData?: {
      amount: number;
      category: string;
      name: string;
    } | null,
    isEditMode: boolean = false
  ): TransactionActions {
    const isRecurring =
      transaction.isRecurring || transaction.recurringTransactionId;
    const hasEndDate = transaction.endDate;

    // Check if transaction has been modified from original (only for recurring transactions)
    const isModified = isRecurring
      ? this.isTransactionModified(transaction, originalRecurringData)
      : false;

    // Determine available actions
    const canDelete = isEditMode; // Always show delete button in edit mode
    const canStopFuture = isEditMode && isRecurring && !hasEndDate;
    const canModify = isEditMode;

    const availableActions: string[] = [];
    if (canDelete) availableActions.push("delete");
    if (canStopFuture) availableActions.push("stopFuture");
    if (canModify) availableActions.push("modify");

    // Get button text
    const deleteButtonText = this.getButtonText("delete", isRecurring, false);
    const stopFutureButtonText = this.getButtonText("stopFuture");

    return {
      canDelete,
      canStopFuture,
      canModify,
      availableActions,
      deleteButtonText,
      stopFutureButtonText,
    };
  }

  /**
   * Checks if a transaction has been modified from its original recurring template
   */
  static isTransactionModified(
    transaction: Transaction,
    originalRecurringData?: {
      amount: number;
      category: string;
      name: string;
    } | null
  ): boolean {
    // If no original data, transaction is not modified
    if (!originalRecurringData || !transaction.amount) return false;

    const currentAmount =
      typeof transaction.amount === "string"
        ? parseFloat(transaction.amount)
        : transaction.amount;

    return (
      currentAmount !== originalRecurringData.amount ||
      transaction.category !== originalRecurringData.category ||
      transaction.description !== originalRecurringData.name
    );
  }

  /**
   * Determines if a transaction is in a future month
   */
  static isFutureMonth(transactionDate: number): boolean {
    const editDate = new Date(transactionDate);
    const currentDate = new Date();
    return editDate > currentDate;
  }

  /**
   * Generates a month key for overrides (e.g., "2024-12")
   */
  static generateMonthKey(date: number): string {
    const editDate = new Date(date);
    return `${editDate.getFullYear()}-${String(
      editDate.getMonth() + 1
    ).padStart(2, "0")}`;
  }

  /**
   * Calculates monthly equivalent amount based on frequency
   */
  static calculateMonthlyAmount(
    amount: string | number,
    frequency: string
  ): number {
    const numAmount =
      typeof amount === "string" ? parseFloat(amount) || 0 : amount;

    switch (frequency) {
      case "weekly":
        return numAmount * 4; // 4 weeks in a month
      case "biweekly":
        return numAmount * 2; // 2 bi-weekly periods in a month
      case "monthly":
        return numAmount; // No multiplication needed
      default:
        return numAmount;
    }
  }

  /**
   * Creates a recurring transaction template from form data
   */
  static createRecurringTemplate(
    formData: {
      description: string;
      amount: string;
      category: string;
      type: "income" | "expense";
      frequency: "weekly" | "biweekly" | "monthly";
      date: number;
      endDate?: number;
    },
    userId: string
  ): RecurringTransactionTemplate {
    const monthlyAmount = this.calculateMonthlyAmount(
      formData.amount,
      formData.frequency
    );

    return {
      name: formData.description,
      amount: monthlyAmount,
      type: formData.type,
      category: formData.category,
      frequency: formData.frequency,
      startDate: formData.date,
      endDate: formData.endDate,
      isActive: true,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Determines the appropriate success message based on action and context
   */
  static getSuccessMessage(
    action: "create" | "update" | "delete" | "stopFuture" | "convert",
    isFutureMonth: boolean = false,
    monthKey?: string
  ): string {
    switch (action) {
      case "create":
        return "Recurring transaction created! It will appear in future months.";
      case "update":
        return isFutureMonth
          ? `Recurring transaction updated for ${monthKey}! This change only affects this specific month.`
          : "Recurring transaction updated! Future occurrences will reflect these changes.";
      case "delete":
        return isFutureMonth
          ? "Custom amount deleted! This month will use the standard recurring amount."
          : "Recurring transaction deleted! All future recurring transactions will stop.";
      case "stopFuture":
        return "Future recurring transactions stopped! Your custom amounts are preserved.";
      case "convert":
        return "Transaction converted to recurring successfully!";
      default:
        return "Action completed successfully!";
    }
  }

  /**
   * Gets the appropriate button text based on action and context
   */
  static getButtonText(
    action: "delete" | "stopFuture",
    isRecurring: boolean = false,
    isFutureMonth: boolean = false
  ): string {
    switch (action) {
      case "delete":
        if (isRecurring) {
          return isFutureMonth ? "Delete Custom Amount" : "Delete Recurring";
        } else {
          return "Delete";
        }
      case "stopFuture":
        return "Stop Future Recurring";
      default:
        return "Action";
    }
  }
}
