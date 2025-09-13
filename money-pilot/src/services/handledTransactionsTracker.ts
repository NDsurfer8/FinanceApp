import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Service to track which bank transactions have been handled (either saved or matched)
 * This prevents the import icon from showing transactions that were already processed
 */
class HandledTransactionsTracker {
  private readonly STORAGE_KEY_PREFIX = "handled_bank_transactions_";

  /**
   * Mark a bank transaction as handled
   */
  async markAsHandled(
    userId: string,
    bankTransactionId: string
  ): Promise<void> {
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${userId}`;
      const stored = await AsyncStorage.getItem(key);

      let handledTransactions = stored ? JSON.parse(stored) : [];

      // Add the transaction ID if not already present
      if (!handledTransactions.includes(bankTransactionId)) {
        handledTransactions.push(bankTransactionId);
        await AsyncStorage.setItem(key, JSON.stringify(handledTransactions));
      }
    } catch (error) {
      console.error("Error marking transaction as handled:", error);
    }
  }

  /**
   * Check if a bank transaction has been handled
   */
  async isHandled(userId: string, bankTransactionId: string): Promise<boolean> {
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${userId}`;
      const stored = await AsyncStorage.getItem(key);

      if (!stored) return false;

      const handledTransactions = JSON.parse(stored);
      return handledTransactions.includes(bankTransactionId);
    } catch (error) {
      console.error("Error checking if transaction is handled:", error);
      return false;
    }
  }

  /**
   * Get all handled transaction IDs for a user
   */
  async getHandledTransactions(userId: string): Promise<string[]> {
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${userId}`;
      const stored = await AsyncStorage.getItem(key);

      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error getting handled transactions:", error);
      return [];
    }
  }

  /**
   * Clear handled transactions for a user (useful for testing or reset)
   */
  async clearHandledTransactions(userId: string): Promise<void> {
    try {
      const key = `${this.STORAGE_KEY_PREFIX}${userId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("Error clearing handled transactions:", error);
    }
  }

  /**
   * Clean up old handled transactions (keep only last 3 months to prevent storage bloat)
   */
  async cleanupOldHandledTransactions(userId: string): Promise<void> {
    try {
      // For now, we'll keep all handled transactions
      // In the future, we could implement cleanup based on transaction dates
      // This would require storing timestamps with the transaction IDs
    } catch (error) {
      console.error("Error cleaning up old handled transactions:", error);
    }
  }
}

export const handledTransactionsTracker = new HandledTransactionsTracker();
