import { Transaction, RecurringTransaction } from "./userData";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from "./transactionService";
import { billReminderService } from "./billReminders";
import { removeCommas } from "../utils/formatNumber";

export interface TransactionOperation {
  type: "create" | "update" | "delete" | "convert";
  transactionType: "regular" | "recurring";
  data: any;
  originalTransaction?: any;
  selectedMonth?: Date;
}

export interface TransactionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class TransactionManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async executeOperation(
    operation: TransactionOperation
  ): Promise<TransactionResult> {
    try {
      switch (operation.type) {
        case "create":
          return await this.createTransaction(operation);
        case "update":
          return await this.updateTransaction(operation);
        case "delete":
          return await this.deleteTransaction(operation);
        case "convert":
          return await this.convertTransaction(operation);
        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }
    } catch (error) {
      console.error("Transaction operation failed:", error);
      return {
        success: false,
        message: "Operation failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async createTransaction(
    operation: TransactionOperation
  ): Promise<TransactionResult> {
    const { data, selectedMonth } = operation;

    if (data.isRecurring) {
      // Create recurring transaction
      const recurringTransaction = {
        name: data.description,
        amount: parseFloat(removeCommas(data.amount)),
        type: data.type,
        category: data.category,
        frequency: data.frequency,
        startDate: new Date(data.date).getTime(),
        endDate: data.endDate ? new Date(data.endDate).getTime() : undefined,
        isActive: true,
        userId: this.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const recurringId = await createRecurringTransaction(
        recurringTransaction,
        selectedMonth
      );

      // Schedule bill reminders
      await billReminderService.scheduleAllBillReminders(this.userId);

      return {
        success: true,
        message: "Recurring transaction created successfully!",
        data: { recurringId, type: "recurring" },
      };
    } else {
      // Create regular transaction
      const transaction = {
        description: data.description,
        amount: parseFloat(removeCommas(data.amount)),
        category: data.category,
        type: data.type,
        date: new Date(data.date).getTime(),
        userId: this.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        date: new Date(data.date).getTime(),
        userId: this.userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const transactionId = await createTransaction(transaction);

      // Schedule bill reminders
      await billReminderService.scheduleAllBillReminders(this.userId);

      return {
        success: true,
        message: "Transaction created successfully!",
        data: { transactionId, type: "regular" },
      };
    }
  }

  private async updateTransaction(
    operation: TransactionOperation
  ): Promise<TransactionResult> {
    const { data, originalTransaction } = operation;

    if (!originalTransaction) {
      throw new Error("Original transaction is required for updates");
    }

    // Check if we're changing the recurring status
    const wasRecurring =
      originalTransaction.isRecurring ||
      originalTransaction.recurringTransactionId;
    const isRecurring = data.isRecurring;

    if (wasRecurring && !isRecurring) {
      // Convert recurring to regular
      return await this.convertRecurringToRegular(originalTransaction, data);
    } else if (!wasRecurring && isRecurring) {
      // Convert regular to recurring
      return await this.convertRegularToRecurring(
        originalTransaction,
        data,
        operation.selectedMonth
      );
    } else if (wasRecurring && isRecurring) {
      // Update existing recurring transaction
      return await this.updateRecurringTransaction(originalTransaction, data);
    } else {
      // Update regular transaction
      const updatedTransaction = {
        ...originalTransaction,
        description: data.description,
        amount: parseFloat(removeCommas(data.amount)),
        category: data.category,
        type: data.type,
        date: new Date(data.date).getTime(),
        updatedAt: Date.now(),
      };

      await updateTransaction(updatedTransaction);

      return {
        success: true,
        message: "Transaction updated successfully!",
        data: { transactionId: originalTransaction.id, type: "regular" },
      };
    }
  }

  private async deleteTransaction(
    operation: TransactionOperation
  ): Promise<TransactionResult> {
    const { originalTransaction } = operation;

    if (!originalTransaction) {
      throw new Error("Original transaction is required for deletion");
    }

    const isRecurring =
      originalTransaction.isRecurring ||
      originalTransaction.recurringTransactionId;

    if (isRecurring) {
      // Delete recurring transaction and all related transactions
      const recurringTransactionId =
        originalTransaction.recurringTransactionId || originalTransaction.id;
      await deleteRecurringTransaction(recurringTransactionId);

      return {
        success: true,
        message: "Recurring transaction and all future occurrences deleted!",
        data: { type: "recurring" },
      };
    } else {
      // Delete regular transaction
      await deleteTransaction(this.userId, originalTransaction.id);

      return {
        success: true,
        message: "Transaction deleted successfully!",
        data: { type: "regular" },
      };
    }
  }

  private async convertTransaction(
    operation: TransactionOperation
  ): Promise<TransactionResult> {
    // This is handled by the update method
    return await this.updateTransaction(operation);
  }

  private async convertRecurringToRegular(
    originalTransaction: any,
    data: any
  ): Promise<TransactionResult> {
    // Delete the recurring transaction
    const recurringTransactionId =
      originalTransaction.recurringTransactionId || originalTransaction.id;
    await deleteRecurringTransaction(recurringTransactionId);

    // Create new regular transaction
    const newTransaction = {
      description: data.description,
      amount: parseFloat(removeCommas(data.amount)),
      category: data.category,
      type: data.type,
      date: new Date(data.date).getTime(),
      userId: this.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const transactionId = await createTransaction(newTransaction);

    return {
      success: true,
      message: "Recurring transaction converted to regular transaction!",
      data: { transactionId, type: "regular" },
    };
  }

  private async convertRegularToRecurring(
    originalTransaction: any,
    data: any,
    selectedMonth?: Date
  ): Promise<TransactionResult> {
    // Delete the original transaction
    await deleteTransaction(this.userId, originalTransaction.id);

    // Create new recurring transaction
    const recurringTransaction = {
      name: data.description,
      amount: parseFloat(removeCommas(data.amount)),
      type: data.type,
      category: data.category,
      frequency: data.frequency,
      startDate: new Date(data.date).getTime(),
      endDate: data.endDate ? new Date(data.endDate).getTime() : undefined,
      isActive: true,
      userId: this.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const recurringId = await createRecurringTransaction(
      recurringTransaction,
      selectedMonth
    );

    return {
      success: true,
      message: "Transaction converted to recurring successfully!",
      data: { recurringId, type: "recurring" },
    };
  }

  private async updateRecurringTransaction(
    originalTransaction: any,
    data: any
  ): Promise<TransactionResult> {
    // Get the recurring transaction to update
    const { getUserRecurringTransactions } = await import("./userData");
    const recurringTransactions = await getUserRecurringTransactions(
      this.userId
    );
    const recurringTransactionId =
      originalTransaction.recurringTransactionId || originalTransaction.id;
    const currentRecurringTransaction = recurringTransactions.find(
      (rt) => rt.id === recurringTransactionId
    );

    if (!currentRecurringTransaction) {
      throw new Error("Recurring transaction not found");
    }

    // Update the recurring transaction
    const updatedRecurringTransaction = {
      ...currentRecurringTransaction,
      name: data.description,
      amount: parseFloat(removeCommas(data.amount)),
      type: data.type,
      category: data.category,
      frequency: data.frequency,
      startDate: new Date(data.date).getTime(),
      endDate: data.endDate ? new Date(data.endDate).getTime() : undefined,
      updatedAt: Date.now(),
    };

    await updateRecurringTransaction(updatedRecurringTransaction);

    return {
      success: true,
      message: "Recurring transaction updated successfully!",
      data: { recurringId: recurringTransactionId, type: "recurring" },
    };
  }
}
