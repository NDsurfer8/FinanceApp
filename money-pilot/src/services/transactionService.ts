import { ref, set, get, push, update, remove } from "firebase/database";
import { db } from "./firebase";
import { Transaction, RecurringTransaction } from "./userData";

// ===== REGULAR TRANSACTIONS CRUD =====

export const createTransaction = async (
  transaction: Omit<Transaction, "id">
): Promise<string> => {
  try {
    const transactionsRef = ref(db, `users/${transaction.userId}/transactions`);
    const newTransactionRef = push(transactionsRef);
    const transactionId = newTransactionRef.key;

    if (!transactionId) {
      throw new Error("Failed to generate transaction ID");
    }

    const transactionData = {
      ...transaction,
      id: transactionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log("Creating transaction with data:", transactionData);

    await set(newTransactionRef, transactionData);

    console.log("Transaction created successfully with ID:", transactionId);
    return transactionId;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw error;
  }
};

export const getTransactions = async (
  userId: string
): Promise<Transaction[]> => {
  try {
    const transactionsRef = ref(db, `users/${userId}/transactions`);
    const snapshot = await get(transactionsRef);

    if (snapshot.exists()) {
      const transactions: Transaction[] = [];
      snapshot.forEach((childSnapshot) => {
        transactions.push(childSnapshot.val());
      });
      return transactions.sort((a, b) => b.date - a.date);
    }
    return [];
  } catch (error) {
    console.error("Error getting transactions:", error);
    throw error;
  }
};

export const getTransactionsForMonth = async (
  userId: string,
  month: Date
): Promise<Transaction[]> => {
  try {
    const allTransactions = await getTransactions(userId);
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    return allTransactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= monthStart && transactionDate <= monthEnd;
    });
  } catch (error) {
    console.error("Error getting transactions for month:", error);
    throw error;
  }
};

export const updateTransaction = async (
  transaction: Transaction
): Promise<void> => {
  try {
    if (!transaction.id) {
      throw new Error("Transaction ID is required for update");
    }

    const transactionRef = ref(
      db,
      `users/${transaction.userId}/transactions/${transaction.id}`
    );
    await update(transactionRef, {
      ...transaction,
      updatedAt: Date.now(),
    });

    console.log("Transaction updated successfully");
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw error;
  }
};

export const deleteTransaction = async (
  userId: string,
  transactionId: string
): Promise<void> => {
  try {
    const transactionRef = ref(
      db,
      `users/${userId}/transactions/${transactionId}`
    );
    await remove(transactionRef);
    console.log("Transaction deleted successfully");
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
};

// ===== RECURRING TRANSACTIONS CRUD =====

export const createRecurringTransaction = async (
  recurringTransaction: Omit<RecurringTransaction, "id">
): Promise<string> => {
  try {
    const recurringTransactionRef = ref(db, "recurringTransactions");
    const newRecurringTransactionRef = push(recurringTransactionRef);
    const transactionId = newRecurringTransactionRef.key;

    if (!transactionId) {
      throw new Error("Failed to generate recurring transaction ID");
    }

    // Remove undefined values before saving
    const transactionToSave = { ...recurringTransaction };
    if (transactionToSave.endDate === undefined) {
      delete transactionToSave.endDate;
    }

    await set(newRecurringTransactionRef, {
      ...transactionToSave,
      id: transactionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("Recurring transaction created successfully");

    // Create the first transaction for the current month if it should occur
    const currentMonth = new Date();
    const monthStart = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const monthEnd = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    const startDate = new Date(recurringTransaction.startDate);

    // Always create a transaction for the current month if the recurring transaction is active
    // and the start date is not in the future
    const shouldCreateFirstTransaction =
      recurringTransaction.isActive &&
      startDate.getTime() <= monthEnd.getTime();

    console.log("Debug recurring transaction creation:", {
      startDate: startDate.toISOString(),
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      shouldCreate: shouldCreateFirstTransaction,
      startDateTimestamp: recurringTransaction.startDate,
      isActive: recurringTransaction.isActive,
    });

    if (shouldCreateFirstTransaction) {
      // Use the start date as the transaction date for the first occurrence
      const firstTransaction: Transaction = {
        description: recurringTransaction.name,
        amount: recurringTransaction.amount,
        type: recurringTransaction.type,
        category: recurringTransaction.category,
        date: startDate.getTime(),
        userId: recurringTransaction.userId,
        recurringTransactionId: transactionId, // Reference to the recurring transaction
      };

      await createTransaction(firstTransaction);
      console.log(
        "First transaction created for current month with ID:",
        transactionId
      );
    }

    return transactionId;
  } catch (error) {
    console.error("Error creating recurring transaction:", error);
    throw error;
  }
};

export const getRecurringTransactions = async (
  userId: string
): Promise<RecurringTransaction[]> => {
  try {
    const recurringTransactionsRef = ref(db, "recurringTransactions");
    const snapshot = await get(recurringTransactionsRef);

    if (snapshot.exists()) {
      const recurringTransactions = snapshot.val();
      return Object.values(recurringTransactions).filter(
        (transaction: any) => transaction.userId === userId
      ) as RecurringTransaction[];
    }

    return [];
  } catch (error) {
    console.error("Error getting recurring transactions:", error);
    throw error;
  }
};

export const updateRecurringTransaction = async (
  recurringTransaction: RecurringTransaction
): Promise<void> => {
  try {
    if (!recurringTransaction.id) {
      throw new Error("Recurring transaction ID is required for update");
    }

    const recurringTransactionRef = ref(
      db,
      `recurringTransactions/${recurringTransaction.id}`
    );

    // Remove undefined values before updating
    const transactionToUpdate = { ...recurringTransaction };
    if (transactionToUpdate.endDate === undefined) {
      delete transactionToUpdate.endDate;
    }

    await update(recurringTransactionRef, {
      ...transactionToUpdate,
      updatedAt: Date.now(),
    });

    console.log("Recurring transaction updated successfully");

    // Check if we need to create a transaction for the current month
    // This handles cases where a recurring transaction is activated or modified
    if (recurringTransaction.isActive) {
      const currentMonth = new Date();
      const shouldCreateTransaction = checkIfTransactionShouldOccur(
        recurringTransaction,
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      );

      if (shouldCreateTransaction) {
        // Check if transaction already exists for this month
        const existingTransactions = await getTransactionsForMonth(
          recurringTransaction.userId,
          currentMonth
        );

        const transactionExists = existingTransactions.some(
          (transaction) =>
            transaction.description === recurringTransaction.name &&
            transaction.amount === recurringTransaction.amount &&
            transaction.type === recurringTransaction.type
        );

        if (!transactionExists) {
          const transactionDate = getNextOccurrenceDate(
            recurringTransaction,
            new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
          );

          const newTransaction: Transaction = {
            description: recurringTransaction.name,
            amount: recurringTransaction.amount,
            type: recurringTransaction.type,
            category: recurringTransaction.category,
            date: transactionDate.getTime(),
            userId: recurringTransaction.userId,
            recurringTransactionId: recurringTransaction.id, // Reference to the recurring transaction
          };

          await createTransaction(newTransaction);
          console.log("Transaction created for current month after update");
        }
      }
    }
  } catch (error) {
    console.error("Error updating recurring transaction:", error);
    throw error;
  }
};

export const deleteRecurringTransaction = async (
  recurringTransactionId: string
): Promise<void> => {
  try {
    // First, get the recurring transaction to find the user ID
    const recurringTransactionRef = ref(
      db,
      `recurringTransactions/${recurringTransactionId}`
    );
    const recurringSnapshot = await get(recurringTransactionRef);

    if (!recurringSnapshot.exists()) {
      throw new Error("Recurring transaction not found");
    }

    const recurringTransaction = recurringSnapshot.val();
    const userId = recurringTransaction.userId;

    // Get all transactions for this user
    const transactionsRef = ref(db, `users/${userId}/transactions`);
    const transactionsSnapshot = await get(transactionsRef);

    if (transactionsSnapshot.exists()) {
      const transactions = transactionsSnapshot.val();
      const transactionIdsToDelete: string[] = [];

      // Find all transactions that reference this recurring transaction
      Object.keys(transactions).forEach((transactionId) => {
        const transaction = transactions[transactionId];
        if (transaction.recurringTransactionId === recurringTransactionId) {
          transactionIdsToDelete.push(transactionId);
        }
      });

      // Delete all related transactions
      for (const transactionId of transactionIdsToDelete) {
        const transactionRef = ref(
          db,
          `users/${userId}/transactions/${transactionId}`
        );
        await remove(transactionRef);
      }

      console.log(
        `Deleted ${transactionIdsToDelete.length} related transactions`
      );
    }

    // Finally, delete the recurring transaction itself
    await remove(recurringTransactionRef);
    console.log("Recurring transaction deleted successfully");
  } catch (error) {
    console.error("Error deleting recurring transaction:", error);
    throw error;
  }
};

// ===== FUTURE MONTH PROJECTIONS =====

export const getProjectedTransactionsForMonth = async (
  userId: string,
  targetMonth: Date
): Promise<{ actual: Transaction[]; projected: Transaction[] }> => {
  try {
    // Get actual transactions for the month
    const actualTransactions = await getTransactionsForMonth(
      userId,
      targetMonth
    );

    // Get recurring transactions
    const recurringTransactions = await getRecurringTransactions(userId);

    const projectedTransactions: Transaction[] = [];
    const targetMonthStart = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      1
    );
    const targetMonthEnd = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0
    );

    for (const recurringTransaction of recurringTransactions) {
      if (!recurringTransaction.isActive) continue;

      // Check if this recurring transaction should occur in the target month
      const shouldOccur = checkIfTransactionShouldOccur(
        recurringTransaction,
        targetMonthStart,
        targetMonthEnd
      );

      if (shouldOccur) {
        // Check if it already exists as an actual transaction
        const alreadyExists = actualTransactions.some(
          (transaction) =>
            transaction.description === recurringTransaction.name &&
            transaction.amount === recurringTransaction.amount &&
            transaction.type === recurringTransaction.type
        );

        if (!alreadyExists) {
          // Create projected transaction
          const transactionDate = getNextOccurrenceDate(
            recurringTransaction,
            targetMonthStart
          );

          const projectedTransaction: Transaction = {
            id: `projected-${recurringTransaction.id}-${targetMonth.getTime()}`,
            amount: recurringTransaction.amount,
            type: recurringTransaction.type,
            category: recurringTransaction.category,
            description: `${recurringTransaction.name} (Projected)`,
            date: transactionDate.getTime(),
            userId: userId,
          };

          projectedTransactions.push(projectedTransaction);
        }
      }
    }

    return {
      actual: actualTransactions,
      projected: projectedTransactions,
    };
  } catch (error) {
    console.error("Error getting projected transactions:", error);
    throw error;
  }
};

// ===== UTILITY FUNCTIONS =====

export const generateTransactionsForMonth = async (
  userId: string,
  targetMonth: Date
): Promise<void> => {
  try {
    const recurringTransactions = await getRecurringTransactions(userId);
    const targetMonthStart = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      1
    );
    const targetMonthEnd = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0
    );

    for (const recurringTransaction of recurringTransactions) {
      if (!recurringTransaction.isActive) continue;

      // Check if transaction should occur in target month
      const shouldGenerate = checkIfTransactionShouldOccur(
        recurringTransaction,
        targetMonthStart,
        targetMonthEnd
      );

      if (shouldGenerate) {
        // Check if transaction already exists for this month
        const existingTransactions = await getTransactionsForMonth(
          userId,
          targetMonth
        );

        const transactionExists = existingTransactions.some(
          (transaction) =>
            transaction.description === recurringTransaction.name &&
            transaction.amount === recurringTransaction.amount &&
            transaction.type === recurringTransaction.type
        );

        if (!transactionExists) {
          // Generate the transaction
          const transactionDate = getNextOccurrenceDate(
            recurringTransaction,
            targetMonthStart
          );

          const newTransaction: Transaction = {
            description: recurringTransaction.name,
            amount: recurringTransaction.amount,
            type: recurringTransaction.type,
            category: recurringTransaction.category,
            date: transactionDate.getTime(),
            userId: userId,
            recurringTransactionId: recurringTransaction.id, // Reference to the recurring transaction
          };

          await createTransaction(newTransaction);
          console.log(
            `Generated transaction: ${
              recurringTransaction.name
            } for ${targetMonth.toLocaleDateString()}`
          );
        }
      }
    }
  } catch (error) {
    console.error("Error generating transactions for month:", error);
    throw error;
  }
};

// ===== HELPER FUNCTIONS =====

const checkIfTransactionShouldOccur = (
  recurringTransaction: RecurringTransaction,
  monthStart: Date,
  monthEnd: Date
): boolean => {
  const startDate = new Date(recurringTransaction.startDate);

  if (startDate > monthEnd) return false;

  if (
    recurringTransaction.endDate &&
    new Date(recurringTransaction.endDate) < monthStart
  ) {
    return false;
  }

  // Check if this month is in the skipped months list
  const monthKey = `${monthStart.getFullYear()}-${String(
    monthStart.getMonth() + 1
  ).padStart(2, "0")}`;
  if (
    recurringTransaction.skippedMonths &&
    recurringTransaction.skippedMonths.includes(monthKey)
  ) {
    return false;
  }

  switch (recurringTransaction.frequency) {
    case "weekly":
      return monthStart >= startDate;
    case "biweekly":
      const weeksSinceStart = Math.floor(
        (monthStart.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      return weeksSinceStart >= 0 && weeksSinceStart % 2 === 0;
    case "monthly":
      const monthsSinceStart =
        (monthStart.getFullYear() - startDate.getFullYear()) * 12 +
        (monthStart.getMonth() - startDate.getMonth());
      return monthsSinceStart >= 0;
    case "quarterly":
      const quarterlyMonthsSinceStart =
        (monthStart.getFullYear() - startDate.getFullYear()) * 12 +
        (monthStart.getMonth() - startDate.getMonth());
      return (
        quarterlyMonthsSinceStart >= 0 && quarterlyMonthsSinceStart % 3 === 0
      );
    case "yearly":
      const yearsSinceStart =
        monthStart.getFullYear() - startDate.getFullYear();
      return yearsSinceStart >= 0;
    default:
      return false;
  }
};

const getNextOccurrenceDate = (
  recurringTransaction: RecurringTransaction,
  monthStart: Date
): Date => {
  const startDate = new Date(recurringTransaction.startDate);

  switch (recurringTransaction.frequency) {
    case "weekly":
      return new Date(monthStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "biweekly":
      return new Date(monthStart.getTime() + 14 * 24 * 60 * 60 * 1000);
    case "monthly":
      const dayOfMonth = startDate.getDate();
      const lastDayOfMonth = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
        0
      ).getDate();
      const actualDay = Math.min(dayOfMonth, lastDayOfMonth);
      return new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        actualDay
      );
    case "quarterly":
      const quarterDayOfMonth = startDate.getDate();
      const quarterLastDayOfMonth = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
        0
      ).getDate();
      const quarterActualDay = Math.min(
        quarterDayOfMonth,
        quarterLastDayOfMonth
      );
      return new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        quarterActualDay
      );
    case "yearly":
      const yearlyDayOfMonth = startDate.getDate();
      const yearlyLastDayOfMonth = new Date(
        monthStart.getFullYear(),
        startDate.getMonth() + 1,
        0
      ).getDate();
      const yearlyActualDay = Math.min(yearlyDayOfMonth, yearlyLastDayOfMonth);
      return new Date(
        monthStart.getFullYear(),
        startDate.getMonth(),
        yearlyActualDay
      );
    default:
      return monthStart;
  }
};
