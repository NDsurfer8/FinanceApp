import {
  ref,
  get,
  set,
  update,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { db } from "./firebase";
import { Transaction } from "./userData";

export interface TransactionMatch {
  manualTransactionId: string;
  bankTransactionId: string;
  matchType: "auto" | "manual";
  matchConfidence: number; // 0-100
  matchedAt: number;
  matchedBy?: string; // userId if manually matched
}

export interface PendingTransaction {
  id: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  date: number;
  type: "income" | "expense";
  status: "paid"; // Only "paid" when matched with bank transaction
  expectedDate?: number;
  bankTransactionId?: string;
  createdAt: number;
  isManual: true;
}

class TransactionMatchingService {
  private readonly MATCH_TOLERANCE_DAYS = 14; // Days to look for matches
  private readonly AMOUNT_TOLERANCE = 1.0; // Dollar-level matching (within $1)
  private readonly MIN_MATCH_CONFIDENCE = 60; // Minimum confidence for auto-matching

  /**
   * Find a transaction by ID across all months
   */
  private async findTransactionById(
    userId: string,
    transactionId: string
  ): Promise<Transaction | null> {
    try {
      const { getUserTransactions } = await import("./userData");
      const transactions = await getUserTransactions(userId);
      return transactions.find((t) => t.id === transactionId) || null;
    } catch (error) {
      console.error("Error finding transaction by ID:", error);
      return null;
    }
  }

  /**
   * Mark a manual transaction as paid when created (no pending status)
   */
  async markAsPaid(transaction: any): Promise<void> {
    if (!transaction.isManual) return;

    const updates = {
      status: "paid",
      matchedAt: Date.now(),
    };

    // Find the correct month for this transaction
    const transactionDate = new Date(transaction.date);
    const month = transactionDate.toISOString().slice(0, 7); // YYYY-MM format

    const transactionRef = ref(
      db,
      `users/${transaction.userId}/transactions/${month}/${transaction.id}`
    );
    await update(transactionRef, updates);
  }

  /**
   * Check for potential matches when a new bank transaction is imported
   * If a match is found, mark the manual transaction as paid and prevent bank transaction from being saved
   */
  async checkForMatches(
    userId: string,
    bankTransaction: any
  ): Promise<boolean> {
    try {
      console.log(
        `🔍 Checking for matches for bank transaction: ${bankTransaction.name} - $${bankTransaction.amount}`
      );

      // Get all transactions that can be matched for this user
      const matchableTransactions = await this.getMatchableTransactions(userId);
      console.log(
        `📋 Found ${matchableTransactions.length} matchable transactions`
      );

      for (const matchableTransaction of matchableTransactions) {
        console.log(
          `🔍 Checking matchable: ${matchableTransaction.description} - $${matchableTransaction.amount}`
        );

        const match = await this.evaluateMatch(
          matchableTransaction,
          bankTransaction
        );

        if (match) {
          console.log(`🎯 Match found! Confidence: ${match.matchConfidence}%`);

          if (match.matchConfidence >= this.MIN_MATCH_CONFIDENCE) {
            // Auto-match and mark transaction as paid
            await this.autoMatch(userId, match);
            console.log(
              `✅ Matched transaction ${match.manualTransactionId} with bank transaction ${match.bankTransactionId}`
            );
            return true; // Indicate that this bank transaction should not be saved
          } else {
            console.log(
              `⚠️ Match confidence too low: ${match.matchConfidence}% < ${this.MIN_MATCH_CONFIDENCE}%`
            );
          }
        } else {
          console.log(
            `❌ No match found for: ${matchableTransaction.description}`
          );
        }
      }
    } catch (error) {
      console.error("Error checking for transaction matches:", error);
    }

    console.log(
      `💾 Bank transaction will be saved normally: ${bankTransaction.name}`
    );
    return false; // Bank transaction should be saved normally
  }

  /**
   * Get all transactions that can be matched with bank transactions
   * This includes both manual transactions and recurring transactions
   */
  private async getMatchableTransactions(
    userId: string
  ): Promise<PendingTransaction[]> {
    const matchableTransactions: PendingTransaction[] = [];

    console.log(
      "📋 Looking for transactions that can be matched with bank transactions"
    );

    // First, get all manual transactions that can be matched
    const { getUserTransactions } = await import("./userData");
    const allTransactions = await getUserTransactions(userId);

    // Add manual transactions that don't have a bankTransactionId yet
    const manualTransactions = allTransactions.filter(
      (t) => t.isManual && !t.bankTransactionId && t.status !== "paid"
    );

    console.log(
      `📋 Found ${manualTransactions.length} manual transactions that can be matched`
    );

    for (const transaction of manualTransactions) {
      const matchableTransaction: PendingTransaction = {
        id: transaction.id!,
        userId: transaction.userId,
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category,
        date: transaction.date,
        type: transaction.type,
        status: "paid", // Will be "paid" when matched
        expectedDate: transaction.date,
        createdAt: transaction.createdAt || Date.now(),
        isManual: true,
      };
      matchableTransactions.push(matchableTransaction);
    }

    // Also check recurring transactions that should be matched
    const recurringTransactionsRef = ref(
      db,
      `users/${userId}/recurringTransactions`
    );
    const recurringSnapshot = await get(recurringTransactionsRef);

    if (recurringSnapshot.exists()) {
      const recurringTransactions = recurringSnapshot.val();
      console.log(
        `📋 Checking ${
          Object.keys(recurringTransactions).length
        } recurring transactions for matching`
      );

      for (const [id, recurringTx] of Object.entries(recurringTransactions)) {
        const rt = recurringTx as any;
        console.log(
          `📋 Recurring ${id}: name=${rt.name}, amount=${rt.amount}, isActive=${rt.isActive}, nextDueDate=${rt.nextDueDate}`
        );

        // If recurring transaction is active, it should be available for matching
        // Use whichever date (startDate or nextDueDate) is closer to current date
        if (rt.isActive) {
          const now = new Date().getTime();
          const startDate = rt.startDate || rt.createdAt;
          const nextDueDate = rt.nextDueDate;

          // Calculate which date is closer to now
          const startDateDiff = Math.abs(now - startDate);
          const nextDueDateDiff = Math.abs(now - nextDueDate);

          const closestDate =
            startDateDiff < nextDueDateDiff ? startDate : nextDueDate;
          const dateType =
            startDateDiff < nextDueDateDiff ? "startDate" : "nextDueDate";

          console.log(
            `✅ Found active recurring transaction: ${
              rt.name
            } (using ${dateType}: ${new Date(closestDate).toDateString()})`
          );

          // Create a virtual pending transaction for matching
          const virtualPendingTransaction: PendingTransaction = {
            id: `recurring_${id}`,
            userId: rt.userId,
            description: rt.name,
            amount: rt.amount,
            category: rt.category,
            date: closestDate,
            type: rt.type,
            status: "paid", // Will be "paid" when matched with bank transaction
            expectedDate: closestDate,
            createdAt: rt.createdAt,
            isManual: true,
          };

          matchableTransactions.push(virtualPendingTransaction);
        }
      }
    } else {
      console.log("📋 No recurring transactions found in database");
    }

    console.log(
      `📋 Returning ${matchableTransactions.length} matchable transactions`
    );
    return matchableTransactions;
  }

  /**
   * Evaluate if a pending transaction matches a bank transaction
   */
  private async evaluateMatch(
    pendingTransaction: PendingTransaction,
    bankTransaction: any
  ): Promise<TransactionMatch | null> {
    // Check amount match (exact)
    const amountDiff = Math.abs(
      pendingTransaction.amount - Math.abs(bankTransaction.amount)
    );
    console.log(
      `  Amount difference: $${amountDiff} (tolerance: $${this.AMOUNT_TOLERANCE})`
    );

    if (amountDiff > this.AMOUNT_TOLERANCE) {
      console.log(
        `❌ Amount mismatch: $${amountDiff} > $${this.AMOUNT_TOLERANCE}`
      );
      return null;
    }

    // Check date proximity (within tolerance days)
    const bankDate = new Date(bankTransaction.date).getTime();
    const pendingDate =
      pendingTransaction.expectedDate || pendingTransaction.date;
    const daysDifference =
      Math.abs(bankDate - pendingDate) / (1000 * 60 * 60 * 24);

    console.log(
      `  Date difference: ${daysDifference.toFixed(1)} days (tolerance: ${
        this.MATCH_TOLERANCE_DAYS
      } days)`
    );

    if (daysDifference > this.MATCH_TOLERANCE_DAYS) {
      console.log(
        `❌ Date mismatch: ${daysDifference.toFixed(1)} days > ${
          this.MATCH_TOLERANCE_DAYS
        } days`
      );
      return null;
    }

    // Calculate match confidence
    const confidence = this.calculateMatchConfidence(
      pendingTransaction,
      bankTransaction
    );

    console.log(`✅ Match criteria met! Confidence: ${confidence}%`);

    return {
      manualTransactionId: pendingTransaction.id,
      bankTransactionId:
        bankTransaction.transaction_id ||
        bankTransaction.id ||
        `bank_${Date.now()}`,
      matchType: "auto",
      matchConfidence: confidence,
      matchedAt: Date.now(),
    };
  }

  /**
   * Calculate match confidence based on various factors
   */
  private calculateMatchConfidence(
    pendingTransaction: PendingTransaction,
    bankTransaction: any
  ): number {
    let confidence = 70; // Higher base confidence for amount match (primary factor)

    // Date proximity bonus (helpful but not critical)
    const bankDate = new Date(bankTransaction.date).getTime();
    const pendingDate =
      pendingTransaction.expectedDate || pendingTransaction.date;
    const daysDifference =
      Math.abs(bankDate - pendingDate) / (1000 * 60 * 60 * 24);

    if (daysDifference <= 1) confidence += 20;
    else if (daysDifference <= 3) confidence += 15;
    else if (daysDifference <= 7) confidence += 10;
    else if (daysDifference <= 14) confidence += 5;

    // Category similarity bonus (helpful but not required)
    const categorySimilarity = this.calculateCategorySimilarity(
      pendingTransaction.category,
      bankTransaction.category || ""
    );
    confidence += categorySimilarity * 10; // Reduced weight for category

    // Description similarity bonus (helpful but not required)
    const descriptionSimilarity = this.calculateDescriptionSimilarity(
      pendingTransaction.description,
      bankTransaction.name
    );
    confidence += descriptionSimilarity * 10; // Reduced weight for description

    return Math.min(confidence, 100);
  }

  /**
   * Calculate similarity between two categories
   */
  private calculateCategorySimilarity(cat1: string, cat2: string): number {
    if (!cat1 || !cat2) return 0;

    const normalized1 = cat1.toLowerCase().trim();
    const normalized2 = cat2.toLowerCase().trim();

    // Exact match
    if (normalized1 === normalized2) return 1.0;

    // Check if one contains the other
    if (
      normalized1.includes(normalized2) ||
      normalized2.includes(normalized1)
    ) {
      return 0.8;
    }

    // Check for common words
    const words1 = normalized1.split(/\s+/);
    const words2 = normalized2.split(/\s+/);
    const commonWords = words1.filter((word) => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);

    return commonWords.length / totalWords;
  }

  /**
   * Calculate similarity between two descriptions
   */
  private calculateDescriptionSimilarity(desc1: string, desc2: string): number {
    if (!desc1 || !desc2) return 0;

    const words1 = desc1.toLowerCase().split(/\s+/);
    const words2 = desc2.toLowerCase().split(/\s+/);

    const commonWords = words1.filter((word) => words2.includes(word));
    const totalWords = Math.max(words1.length, words2.length);

    return commonWords.length / totalWords;
  }

  /**
   * Process matches and auto-match high confidence ones
   */
  private async processMatches(
    userId: string,
    matches: TransactionMatch[]
  ): Promise<void> {
    for (const match of matches) {
      if (match.matchConfidence >= this.MIN_MATCH_CONFIDENCE) {
        // Auto-match high confidence matches
        await this.autoMatch(userId, match);
      } else {
        // Store potential match for user review
        await this.storePotentialMatch(userId, match);
      }
    }
  }

  /**
   * Automatically match transactions - mark manual transaction as paid
   */
  private async autoMatch(
    userId: string,
    match: TransactionMatch
  ): Promise<void> {
    try {
      // Check if this is a virtual pending transaction from a recurring transaction
      if (match.manualTransactionId.startsWith("recurring_")) {
        // Extract the recurring transaction ID
        const recurringId = match.manualTransactionId.replace("recurring_", "");

        // Get the recurring transaction details
        const recurringRef = ref(
          db,
          `users/${userId}/recurringTransactions/${recurringId}`
        );
        const recurringSnapshot = await get(recurringRef);

        if (recurringSnapshot.exists()) {
          const recurringTx = recurringSnapshot.val();

          // Create the actual transaction and mark it as paid
          const { saveTransaction } = await import("./userData");
          const actualTransaction = {
            description: recurringTx.name,
            amount: recurringTx.amount,
            type: recurringTx.type,
            category: recurringTx.category,
            date: Date.now(), // Use current date (when bank transaction occurred)
            userId: userId,
            recurringTransactionId: recurringId,
            isManual: true,
            status: "paid" as const,
            bankTransactionId: match.bankTransactionId,
            matchedAt: match.matchedAt,
            createdAt: Date.now(),
          };

          const transactionId = await saveTransaction(actualTransaction);

          // The transaction is already saved with the correct status via saveTransaction
          // No need for additional update since saveTransaction handles the new structure

          // Update the recurring transaction's next due date
          const nextDueDate = new Date(recurringTx.nextDueDate);
          if (recurringTx.frequency === "monthly") {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          } else if (recurringTx.frequency === "weekly") {
            nextDueDate.setDate(nextDueDate.getDate() + 7);
          } else if (recurringTx.frequency === "biweekly") {
            nextDueDate.setDate(nextDueDate.getDate() + 14);
          }

          await update(recurringRef, {
            nextDueDate: nextDueDate.getTime(),
            lastGeneratedDate: Date.now(),
            totalOccurrences: (recurringTx.totalOccurrences || 0) + 1,
          });

          console.log(
            `Auto-matched recurring transaction ${recurringId} with bank transaction ${match.bankTransactionId}, created actual transaction ${transactionId}`
          );
        }
      } else {
        // Update existing manual transaction status using the updateTransaction function
        // which handles the new date-based structure
        const { updateTransaction } = await import("./userData");
        const existingTransaction = await this.findTransactionById(
          userId,
          match.manualTransactionId
        );
        if (existingTransaction) {
          await updateTransaction({
            ...existingTransaction,
            status: "paid",
            bankTransactionId: match.bankTransactionId,
            matchedAt: match.matchedAt,
          });
        }

        console.log(
          `Auto-matched transaction ${match.manualTransactionId} with bank transaction ${match.bankTransactionId}`
        );
      }

      // Match record is not needed - all important data is stored in the transaction itself
    } catch (error) {
      console.error("Error auto-matching transactions:", error);
    }
  }

  /**
   * Store potential match for user review
   */
  private async storePotentialMatch(
    userId: string,
    match: TransactionMatch
  ): Promise<void> {
    try {
      const potentialMatchRef = ref(
        db,
        `users/${userId}/potentialMatches/${match.manualTransactionId}`
      );
      await set(potentialMatchRef, match);
    } catch (error) {
      console.error("Error storing potential match:", error);
    }
  }

  /**
   * Manually match transactions (user confirms)
   */
  async manualMatch(
    userId: string,
    manualTransactionId: string,
    bankTransactionId: string
  ): Promise<void> {
    try {
      const match: TransactionMatch = {
        manualTransactionId,
        bankTransactionId,
        matchType: "manual",
        matchConfidence: 100,
        matchedAt: Date.now(),
        matchedBy: userId,
      };

      // Update manual transaction status using the updateTransaction function
      const { updateTransaction } = await import("./userData");
      const existingTransaction = await this.findTransactionById(
        userId,
        manualTransactionId
      );
      if (existingTransaction) {
        await updateTransaction({
          ...existingTransaction,
          status: "paid",
          bankTransactionId,
          matchedAt: match.matchedAt,
        });
      }

      // Match record is not needed - all important data is stored in the transaction itself

      // Remove from potential matches
      const potentialMatchRef = ref(
        db,
        `users/${userId}/potentialMatches/${manualTransactionId}`
      );
      await set(potentialMatchRef, null);
    } catch (error) {
      console.error("Error manually matching transactions:", error);
      throw error;
    }
  }

  /**
   * Get potential matches for user review
   */
  async getPotentialMatches(userId: string): Promise<TransactionMatch[]> {
    try {
      const potentialMatchesRef = ref(db, `users/${userId}/potentialMatches`);
      const snapshot = await get(potentialMatchesRef);

      if (!snapshot.exists()) return [];

      const matches = snapshot.val();
      return Object.values(matches) as TransactionMatch[];
    } catch (error) {
      console.error("Error getting potential matches:", error);
      return [];
    }
  }

  /**
   * Dismiss a potential match (user says it's not a match)
   */
  async dismissMatch(
    userId: string,
    manualTransactionId: string
  ): Promise<void> {
    try {
      const potentialMatchRef = ref(
        db,
        `users/${userId}/potentialMatches/${manualTransactionId}`
      );
      await set(potentialMatchRef, null);
    } catch (error) {
      console.error("Error dismissing match:", error);
      throw error;
    }
  }

  /**
   * Mark a pending transaction as cancelled
   */
  async markAsCancelled(userId: string, transactionId: string): Promise<void> {
    try {
      const { updateTransaction } = await import("./userData");
      const existingTransaction = await this.findTransactionById(
        userId,
        transactionId
      );
      if (existingTransaction) {
        await updateTransaction({
          ...existingTransaction,
          status: "paid",
        });
      }
    } catch (error) {
      console.error("Error marking transaction as cancelled:", error);
      throw error;
    }
  }

  /**
   * Fix existing transactions that have bankTransactionId but wrong status
   */
  async fixTransactionStatuses(userId: string): Promise<void> {
    try {
      const transactionsRef = ref(db, `users/${userId}/transactions`);
      const snapshot = await get(transactionsRef);

      if (snapshot.exists()) {
        // Iterate through each month
        snapshot.forEach((monthSnapshot) => {
          const month = monthSnapshot.key;
          const transactions = monthSnapshot.val();
          const updates: any = {};

          for (const [id, transaction] of Object.entries(transactions)) {
            const tx = transaction as any;
            // If transaction has bankTransactionId but status is not "paid", fix it
            if (tx.bankTransactionId && tx.status !== "paid") {
              console.log(
                `🔧 Fixing transaction ${id} in ${month}: status=${tx.status} -> paid`
              );
              updates[`${id}/status`] = "paid";
            }
          }

          if (Object.keys(updates).length > 0) {
            const monthRef = ref(db, `users/${userId}/transactions/${month}`);
            update(monthRef, updates);
            console.log(
              `✅ Fixed ${
                Object.keys(updates).length
              } transaction statuses in ${month}`
            );
          }
        });
      }
    } catch (error) {
      console.error("Error fixing transaction statuses:", error);
    }
  }

  /**
   * Get transaction status for display
   * Only show "paid" status for transactions created from recurring transactions
   */
  getTransactionStatus(transaction: any): {
    status: "paid" | "normal";
    statusText: string;
    statusColor: string;
  } {
    // Only show "paid" status for transactions that were created from recurring transactions
    // Individual transactions are usually already paid when entered, so they don't need a "paid" status
    if (transaction.recurringTransactionId && transaction.status === "paid") {
      return {
        status: "paid",
        statusText: "Paid",
        statusColor: "#10b981", // green
      };
    }

    // All other transactions (bank transactions, individual manual transactions) show as normal
    return {
      status: "normal",
      statusText: transaction.isManual ? "Manual" : "Bank Transaction",
      statusColor: transaction.isManual ? "#6b7280" : "#10b981", // gray for manual, green for bank
    };
  }
}

export const transactionMatchingService = new TransactionMatchingService();
