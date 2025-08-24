import { useState, useCallback } from "react";
import { Alert } from "react-native";
import {
  TransactionManager,
  TransactionOperation,
  TransactionResult,
} from "../services/transactionManager";
import { useData } from "../contexts/DataContext";
import { useZeroLoading } from "./useZeroLoading";

export const useTransactionOperations = (userId: string) => {
  const [loading, setLoading] = useState(false);
  const { refreshTransactions, refreshRecurringTransactions } = useData();
  const { transactions, updateDataOptimistically } = useZeroLoading();

  const transactionManager = new TransactionManager(userId);

  const executeOperation = useCallback(
    async (operation: TransactionOperation): Promise<TransactionResult> => {
      setLoading(true);

      try {
        const result = await transactionManager.executeOperation(operation);

        if (result.success) {
          // Refresh data context based on operation type
          if (operation.type === "delete" || operation.type === "convert") {
            // For deletions and conversions, refresh both
            await Promise.all([
              refreshTransactions(),
              refreshRecurringTransactions(),
            ]);
          } else if (operation.data?.isRecurring) {
            // For recurring transactions, refresh both
            await Promise.all([
              refreshTransactions(),
              refreshRecurringTransactions(),
            ]);
          } else {
            // For regular transactions, only refresh recurring to preserve optimistic updates
            await refreshRecurringTransactions();
          }
        }

        return result;
      } catch (error) {
        console.error("Transaction operation failed:", error);
        return {
          success: false,
          message: "Operation failed",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      } finally {
        setLoading(false);
      }
    },
    [userId, refreshTransactions, refreshRecurringTransactions]
  );

  const createTransaction = useCallback(
    async (data: any, selectedMonth?: Date): Promise<TransactionResult> => {
      const operation: TransactionOperation = {
        type: "create",
        transactionType: data.isRecurring ? "recurring" : "regular",
        data,
        selectedMonth,
      };

      // For recurring transactions, don't use optimistic updates as they're complex
      if (data.isRecurring) {
        return executeOperation(operation);
      }

      // Optimistic update for regular transaction creation
      const tempTransaction = {
        id: `temp-${Date.now()}`,
        description: data.description,
        amount: parseFloat(data.amount.replace(/,/g, "")),
        category: data.category,
        type: data.type,
        date: new Date(data.date).getTime(),
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Add temp transaction to UI immediately
      const updatedTransactions = [...transactions, tempTransaction];
      updateDataOptimistically({ transactions: updatedTransactions });

      try {
        const result = await transactionManager.executeOperation(operation);

        if (result.success) {
          // Replace temp transaction with real one
          const finalTransactions = updatedTransactions.map((t) =>
            t.id === tempTransaction.id
              ? { ...tempTransaction, id: result.data?.transactionId }
              : t
          );
          updateDataOptimistically({ transactions: finalTransactions });

          // Refresh to ensure consistency
          await refreshRecurringTransactions();
        } else {
          // Remove temp transaction on failure
          const revertedTransactions = transactions.filter(
            (t) => !t.id.startsWith("temp-")
          );
          updateDataOptimistically({ transactions: revertedTransactions });
        }

        return result;
      } catch (error) {
        // Remove temp transaction on error
        const revertedTransactions = transactions.filter(
          (t) => !t.id.startsWith("temp-")
        );
        updateDataOptimistically({ transactions: revertedTransactions });
        throw error;
      }
    },
    [
      transactions,
      updateDataOptimistically,
      executeOperation,
      refreshRecurringTransactions,
    ]
  );

  const updateTransaction = useCallback(
    async (
      originalTransaction: any,
      data: any,
      selectedMonth?: Date
    ): Promise<TransactionResult> => {
      const operation: TransactionOperation = {
        type: "update",
        transactionType: data.isRecurring ? "recurring" : "regular",
        data,
        originalTransaction,
        selectedMonth,
      };

      // Check if this is a simple regular transaction update (no recurring changes)
      const isSimpleUpdate =
        !data.isRecurring &&
        !originalTransaction.isRecurring &&
        !originalTransaction.recurringTransactionId;

      // Check if this is converting from recurring to non-recurring
      const isConvertingFromRecurring =
        !data.isRecurring &&
        (originalTransaction.isRecurring ||
          originalTransaction.recurringTransactionId);

      if (isSimpleUpdate) {
        // Optimistic update for simple regular transaction updates
        const updatedTransaction = {
          ...originalTransaction,
          description: data.description,
          amount: parseFloat(data.amount.replace(/,/g, "")),
          category: data.category,
          type: data.type,
          date: new Date(data.date).getTime(),
          updatedAt: Date.now(),
        };

        // Update UI immediately
        const updatedTransactions = transactions.map((t) =>
          t.id === originalTransaction.id ? updatedTransaction : t
        );
        updateDataOptimistically({ transactions: updatedTransactions });

        try {
          const result = await transactionManager.executeOperation(operation);

          if (result.success) {
            // Refresh to ensure consistency
            await refreshRecurringTransactions();
          } else {
            // Revert on failure
            updateDataOptimistically({ transactions });
          }

          return result;
        } catch (error) {
          // Revert on error
          updateDataOptimistically({ transactions });
          throw error;
        }
      } else if (isConvertingFromRecurring) {
        // Optimistic update for converting recurring to non-recurring
        const updatedTransaction = {
          ...originalTransaction,
          description: data.description,
          amount: parseFloat(data.amount.replace(/,/g, "")),
          category: data.category,
          type: data.type,
          date: new Date(data.date).getTime(),
          updatedAt: Date.now(),
          // Remove recurring properties
          isRecurring: false,
          recurringTransactionId: undefined,
        };

        // Update UI immediately to show it's no longer recurring
        const updatedTransactions = transactions.map((t) =>
          t.id === originalTransaction.id ? updatedTransaction : t
        );
        updateDataOptimistically({ transactions: updatedTransactions });

        try {
          const result = await transactionManager.executeOperation(operation);

          if (result.success) {
            // Only refresh recurring transactions to preserve the optimistic update
            await refreshRecurringTransactions();
          } else {
            // Revert on failure
            updateDataOptimistically({ transactions });
          }

          return result;
        } catch (error) {
          // Revert on error
          updateDataOptimistically({ transactions });
          throw error;
        }
      }

      // For other recurring transactions or conversions, use full refresh
      return executeOperation(operation);
    },
    [
      transactions,
      updateDataOptimistically,
      executeOperation,
      refreshRecurringTransactions,
    ]
  );

  const deleteTransaction = useCallback(
    async (transaction: any): Promise<TransactionResult> => {
      const operation: TransactionOperation = {
        type: "delete",
        transactionType:
          transaction.isRecurring || transaction.recurringTransactionId
            ? "recurring"
            : "regular",
        data: {},
        originalTransaction: transaction,
      };

      // Optimistic update for deletion
      const updatedTransactions = transactions.filter(
        (t) => t.id !== transaction.id
      );
      updateDataOptimistically({ transactions: updatedTransactions });

      try {
        const result = await transactionManager.executeOperation(operation);

        if (result.success) {
          // Refresh to ensure consistency
          await Promise.all([
            refreshTransactions(),
            refreshRecurringTransactions(),
          ]);
        } else {
          // Revert on failure
          updateDataOptimistically({ transactions });
        }

        return result;
      } catch (error) {
        // Revert on error
        updateDataOptimistically({ transactions });
        throw error;
      }
    },
    [
      transactions,
      updateDataOptimistically,
      executeOperation,
      refreshTransactions,
      refreshRecurringTransactions,
    ]
  );

  return {
    loading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    executeOperation,
  };
};
