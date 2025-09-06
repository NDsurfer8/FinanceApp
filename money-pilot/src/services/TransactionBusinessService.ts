import { Transaction, RecurringTransaction } from './userData';
import { TransactionActionsService, RecurringTransactionTemplate } from './TransactionActionsService';

export interface TransactionOperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class TransactionBusinessService {
  /**
   * Converts a regular transaction to a recurring transaction
   */
  static async convertToRecurring(
    transaction: Transaction,
    template: RecurringTransactionTemplate,
    userId: string,
    selectedMonth?: Date
  ): Promise<TransactionOperationResult> {
    try {
      const { createRecurringTransaction } = await import('./transactionService');
      const { removeTransaction } = await import('./userData');

      // Remove the original transaction from database
      await removeTransaction(userId, transaction.id);

      // Create the recurring transaction
      const recurringTransactionId = await createRecurringTransaction(
        template,
        selectedMonth
      );

      return {
        success: true,
        message: TransactionActionsService.getSuccessMessage('convert'),
        data: { recurringTransactionId }
      };
    } catch (error) {
      console.error('Error converting to recurring:', error);
      return {
        success: false,
        message: 'Failed to convert transaction to recurring',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Updates a recurring transaction (either template or month override)
   */
  static async updateRecurringTransaction(
    transaction: Transaction,
    formData: {
      description: string;
      amount: string;
      category: string;
      type: 'income' | 'expense';
      frequency: 'weekly' | 'biweekly' | 'monthly';
      date: number;
      endDate?: number;
    },
    userId: string,
    isFutureMonth: boolean,
    monthKey: string
  ): Promise<TransactionOperationResult> {
    try {
      const { updateRecurringTransaction } = await import('./transactionService');
      const { getUserRecurringTransactions } = await import('./userData');

      // Get the recurring transaction ID
      const recurringTransactionId = transaction.recurringTransactionId || transaction.id;

      // Get the current recurring transaction
      const recurringTransactions = await getUserRecurringTransactions(userId);
      const currentRecurringTransaction = recurringTransactions.find(
        (rt) => rt.id === recurringTransactionId
      );

      if (!currentRecurringTransaction) {
        return {
          success: false,
          message: 'Recurring transaction not found',
          error: 'NOT_FOUND'
        };
      }

      let updatedRecurringTransaction: RecurringTransaction;

      if (isFutureMonth) {
        // Create month-specific override
        const monthOverrides = currentRecurringTransaction.monthOverrides || {};
        const monthlyAmount = TransactionActionsService.calculateMonthlyAmount(
          formData.amount,
          formData.frequency
        );

        monthOverrides[monthKey] = {
          amount: monthlyAmount,
          category: formData.category,
          name: formData.description,
        };

        updatedRecurringTransaction = {
          ...currentRecurringTransaction,
          monthOverrides,
          updatedAt: Date.now(),
        };
      } else {
        // Update the template (affects all future projections)
        const monthlyAmount = TransactionActionsService.calculateMonthlyAmount(
          formData.amount,
          formData.frequency
        );

        updatedRecurringTransaction = {
          ...currentRecurringTransaction,
          name: formData.description,
          amount: monthlyAmount,
          type: formData.type,
          category: formData.category,
          frequency: formData.frequency,
          endDate: formData.endDate,
          updatedAt: Date.now(),
        };
      }

      await updateRecurringTransaction(updatedRecurringTransaction);

      return {
        success: true,
        message: TransactionActionsService.getSuccessMessage(
          'update',
          isFutureMonth,
          monthKey
        ),
        data: { updatedRecurringTransaction }
      };
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      return {
        success: false,
        message: 'Failed to update recurring transaction',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Stops future recurring transactions by setting an end date
   */
  static async stopFutureRecurring(
    transaction: Transaction,
    userId: string
  ): Promise<TransactionOperationResult> {
    try {
      const { updateRecurringTransactionEndDate } = await import('./transactionService');

      const recurringTransactionId = transaction.recurringTransactionId || transaction.id;
      
      // Set end date to the end of the current month being edited
      const editDate = new Date(transaction.date);
      const endOfMonth = new Date(editDate.getFullYear(), editDate.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      await updateRecurringTransactionEndDate(userId, recurringTransactionId, endOfMonth.getTime());

      return {
        success: true,
        message: TransactionActionsService.getSuccessMessage('stopFuture'),
        data: { endDate: endOfMonth.getTime() }
      };
    } catch (error) {
      console.error('Error stopping future recurring:', error);
      return {
        success: false,
        message: 'Failed to stop future recurring transactions',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Deletes a recurring transaction or month override
   */
  static async deleteRecurringTransaction(
    transaction: Transaction,
    userId: string,
    isFutureMonth: boolean,
    monthKey: string
  ): Promise<TransactionOperationResult> {
    try {
      const recurringTransactionId = transaction.recurringTransactionId || transaction.id;

      if (isFutureMonth) {
        // Delete only the month override
        const { deleteMonthOverride } = await import('./transactionService');
        await deleteMonthOverride(userId, recurringTransactionId, monthKey);

        return {
          success: true,
          message: TransactionActionsService.getSuccessMessage('delete', true, monthKey),
          data: { deletedMonthKey: monthKey }
        };
      } else {
        // Delete the entire recurring transaction
        const { deleteRecurringTransaction } = await import('./transactionService');
        await deleteRecurringTransaction(recurringTransactionId, userId);

        return {
          success: true,
          message: TransactionActionsService.getSuccessMessage('delete'),
          data: { deletedRecurringId: recurringTransactionId }
        };
      }
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      return {
        success: false,
        message: 'Failed to delete recurring transaction',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Creates a new recurring transaction from scratch
   */
  static async createNewRecurringTransaction(
    template: RecurringTransactionTemplate
  ): Promise<TransactionOperationResult> {
    try {
      const { createRecurringTransaction } = await import('./transactionService');

      const recurringTransactionId = await createRecurringTransaction(
        template,
        undefined // Don't create initial transaction for new recurring transactions
      );

      return {
        success: true,
        message: TransactionActionsService.getSuccessMessage('create'),
        data: { recurringTransactionId }
      };
    } catch (error) {
      console.error('Error creating recurring transaction:', error);
      return {
        success: false,
        message: 'Failed to create recurring transaction',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Converts a recurring transaction back to a regular transaction
   */
  static async convertToRegular(
    transaction: Transaction,
    formData: {
      description: string;
      amount: string;
      category: string;
      type: 'income' | 'expense';
      date: number;
    },
    userId: string
  ): Promise<TransactionOperationResult> {
    try {
      const { deleteRecurringTransaction } = await import('./transactionService');
      const { saveTransaction } = await import('./userData');

      // Create new regular transaction
      const newTransaction = {
        id: Date.now().toString(),
        description: formData.description,
        amount: parseFloat(formData.amount.replace(/,/g, '')),
        category: formData.category,
        type: formData.type,
        date: formData.date,
        userId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Delete the recurring transaction
      const recurringTransactionId = transaction.recurringTransactionId || transaction.id;
      await deleteRecurringTransaction(recurringTransactionId, userId);

      // Save the new regular transaction
      const savedTransactionId = await saveTransaction(newTransaction);

      return {
        success: true,
        message: 'Recurring transaction converted to regular transaction!',
        data: { 
          newTransactionId: savedTransactionId,
          deletedRecurringId: recurringTransactionId
        }
      };
    } catch (error) {
      console.error('Error converting to regular:', error);
      return {
        success: false,
        message: 'Failed to convert recurring transaction to regular',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
