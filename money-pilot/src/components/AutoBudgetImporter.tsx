import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "../hooks/useAuth";
import { useData } from "../contexts/DataContext";
import { useTheme } from "../contexts/ThemeContext";
import { saveTransaction } from "../services/userData";
import { formatCurrency } from "../utils/formatNumber";

interface AutoBudgetImporterProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess?: (count: number) => void;
  selectedMonth?: Date; // Add selected month prop
  onDataRefresh?: () => void; // Add callback to refresh data
}

interface CategorizedTransaction {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  type: "income" | "expense";
  isSelected: boolean;
  originalTransaction: any;
}

export const AutoBudgetImporter: React.FC<AutoBudgetImporterProps> = ({
  isVisible,
  onClose,
  onSuccess,
  selectedMonth,
  onDataRefresh,
}) => {
  const { user } = useAuth();
  const { bankTransactions, transactions, isBankConnected } = useData();
  const { colors } = useTheme();

  // Helper function to format month
  const formatMonth = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Helper function to check if a bank transaction already exists in budget
  const isTransactionAlreadyImported = (bankTransaction: any): boolean => {
    const bankDate = new Date(bankTransaction.date);
    const bankAmount = Math.abs(bankTransaction.amount);
    const bankName = bankTransaction.name?.toLowerCase() || "";

    return transactions.some((budgetTransaction: any) => {
      const budgetDate = new Date(budgetTransaction.date);
      const budgetAmount = Math.abs(budgetTransaction.amount);
      const budgetName = budgetTransaction.description?.toLowerCase() || "";

      // Check if dates are within 1 day of each other (to account for timezone differences)
      const dateDiff = Math.abs(bankDate.getTime() - budgetDate.getTime());
      const oneDayInMs = 24 * 60 * 60 * 1000;

      // Check if amounts match (within $0.01 tolerance for rounding differences)
      const amountDiff = Math.abs(bankAmount - budgetAmount);

      // Check if names are similar (basic fuzzy matching)
      const nameSimilarity =
        bankName.includes(budgetName) || budgetName.includes(bankName);

      return dateDiff <= oneDayInMs && amountDiff <= 0.01 && nameSimilarity;
    });
  };

  const [categorizedTransactions, setCategorizedTransactions] = useState<
    CategorizedTransaction[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({
    current: 0,
    total: 0,
    currentTransaction: "",
    startTime: 0,
  });

  // Smart categorization rules
  const categorizeTransaction = (
    transaction: any
  ): { category: string; type: "income" | "expense" } => {
    const name = transaction.name?.toLowerCase() || "";
    const amount = transaction.amount;

    // Income patterns (Plaid: negative = income, positive = expense)
    if (amount < 0) {
      if (
        name.includes("deposit") ||
        name.includes("transfer") ||
        name.includes("salary") ||
        name.includes("payroll") ||
        name.includes("direct deposit")
      ) {
        return { category: "Salary", type: "income" };
      }
      if (name.includes("refund") || name.includes("return")) {
        return { category: "Refund", type: "income" };
      }
      return { category: "Other Income", type: "income" };
    }

    // Expense patterns (Plaid: positive = expense, negative = income)
    if (amount > 0) {
      // Food & Dining
      if (
        name.includes("restaurant") ||
        name.includes("mcdonalds") ||
        name.includes("starbucks") ||
        name.includes("uber eats") ||
        name.includes("doordash") ||
        name.includes("grubhub")
      ) {
        return { category: "Food & Dining", type: "expense" };
      }

      // Transportation
      if (
        name.includes("uber") ||
        name.includes("lyft") ||
        name.includes("gas") ||
        name.includes("shell") ||
        name.includes("exxon") ||
        name.includes("chevron")
      ) {
        return { category: "Transportation", type: "expense" };
      }

      // Shopping
      if (
        name.includes("amazon") ||
        name.includes("walmart") ||
        name.includes("target") ||
        name.includes("costco") ||
        name.includes("best buy")
      ) {
        return { category: "Shopping", type: "expense" };
      }

      // Bills & Utilities
      if (
        name.includes("electric") ||
        name.includes("water") ||
        name.includes("gas") ||
        name.includes("internet") ||
        name.includes("phone") ||
        name.includes("netflix") ||
        name.includes("spotify") ||
        name.includes("hulu")
      ) {
        return { category: "Bills & Utilities", type: "expense" };
      }

      // Healthcare
      if (
        name.includes("pharmacy") ||
        name.includes("cvs") ||
        name.includes("walgreens") ||
        name.includes("doctor") ||
        name.includes("medical")
      ) {
        return { category: "Healthcare", type: "expense" };
      }

      // Entertainment
      if (
        name.includes("movie") ||
        name.includes("theater") ||
        name.includes("concert") ||
        name.includes("game") ||
        name.includes("ticket")
      ) {
        return { category: "Entertainment", type: "expense" };
      }

      return { category: "Other Expenses", type: "expense" };
    }

    return { category: "Other", type: "expense" };
  };

  // Process bank transactions and categorize them
  useEffect(() => {
    if (isVisible && bankTransactions.length > 0) {
      // Filter transactions for selected month (or current month if not provided)
      const targetMonth = selectedMonth || new Date();
      const targetMonthNumber = targetMonth.getMonth();
      const targetYear = targetMonth.getFullYear();

      const targetMonthTransactions = bankTransactions.filter(
        (transaction: any) => {
          const transactionDate = new Date(transaction.date);
          return (
            transactionDate.getMonth() === targetMonthNumber &&
            transactionDate.getFullYear() === targetYear
          );
        }
      );

      // Count how many transactions are already imported
      const alreadyImportedCount = targetMonthTransactions.filter(
        (transaction: any) => isTransactionAlreadyImported(transaction)
      ).length;

      const categorized = targetMonthTransactions
        .filter((transaction: any) => {
          // Filter out transactions that are already in budget
          return !isTransactionAlreadyImported(transaction);
        })
        .map((transaction: any) => {
          const { category, type } = categorizeTransaction(transaction);
          return {
            id: transaction.id,
            name: transaction.name,
            amount: Math.abs(transaction.amount),
            date: transaction.date,
            category,
            type,
            isSelected: true,
            originalTransaction: transaction,
          };
        });

      setCategorizedTransactions(categorized);
    }
  }, [isVisible, bankTransactions, selectedMonth]);

  const toggleTransactionSelection = (transactionId: string) => {
    setCategorizedTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId ? { ...t, isSelected: !t.isSelected } : t
      )
    );
  };

  const selectAll = () => {
    setCategorizedTransactions((prev) =>
      prev.map((t) => ({ ...t, isSelected: true }))
    );
  };

  const deselectAll = () => {
    setCategorizedTransactions((prev) =>
      prev.map((t) => ({ ...t, isSelected: false }))
    );
  };

  const saveSelectedTransactions = async () => {
    if (!user?.uid) return;

    const selectedTransactions = categorizedTransactions.filter(
      (t) => t.isSelected
    );
    if (selectedTransactions.length === 0) {
      Alert.alert(
        "No Transactions Selected",
        "Please select at least one transaction to import."
      );
      return;
    }

    setIsSaving(true);
    setSaveProgress({
      current: 0,
      total: selectedTransactions.length,
      currentTransaction: "",
      startTime: Date.now(),
    });

    try {
      let savedCount = 0;
      let failedCount = 0;
      const failedTransactions: string[] = [];

      for (let i = 0; i < selectedTransactions.length; i++) {
        const transaction = selectedTransactions[i];

        // Update progress
        setSaveProgress((prev) => ({
          ...prev,
          current: i + 1,
          currentTransaction: transaction.name,
        }));

        try {
          const newTransaction = {
            userId: user.uid,
            description: String(transaction.name),
            amount: Math.abs(transaction.amount), // Always store as positive
            category: transaction.category,
            date: new Date(transaction.date).getTime(),
            type: transaction.type,
            createdAt: Date.now(),
          };

          await saveTransaction(newTransaction);
          savedCount++;

          // Small delay to prevent overwhelming the server and show progress
          if (i < selectedTransactions.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(`Error saving transaction ${transaction.name}:`, error);
          failedCount++;
          failedTransactions.push(transaction.name);
        }
      }

      // Show detailed results
      if (savedCount > 0 && failedCount === 0) {
        // All succeeded
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Success!",
          `Successfully imported ${savedCount} transactions to your budget.`,
          [
            {
              text: "OK",
              onPress: () => {
                onDataRefresh?.(); // Refresh data to update import button count
                onSuccess?.(savedCount);
                onClose();
              },
            },
          ]
        );
      } else if (savedCount > 0 && failedCount > 0) {
        // Partial success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Partial Success",
          `Imported ${savedCount} transactions successfully.\n\n${failedCount} transactions failed to save (likely due to temporary connection issues).\n\nYou can try importing the failed transactions again.`,
          [
            {
              text: "OK",
              onPress: () => {
                onDataRefresh?.(); // Refresh data to update import button count
                onSuccess?.(savedCount);
                onClose();
              },
            },
          ]
        );
      } else {
        // All failed
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Import Failed",
          `Failed to import any transactions. This might be due to:\n\n• Temporary connection issues\n• Authentication problems\n• Server maintenance\n\nPlease try again in a few moments.`,
          [
            {
              text: "OK",
              onPress: () => onClose(),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error saving transactions:", error);
      Alert.alert(
        "Error",
        "Failed to save transactions. Please check your connection and try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = categorizedTransactions.filter(
    (t) => t.isSelected
  ).length;
  const totalCount = categorizedTransactions.length;

  if (!isBankConnected) {
    return (
      <Modal visible={isVisible} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              padding: 24,
              borderRadius: 20,
              margin: 20,
              maxWidth: 400,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <View
              style={{
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.primaryLight,
                  padding: 16,
                  borderRadius: 16,
                  marginBottom: 16,
                }}
              >
                <Ionicons
                  name="card-outline"
                  size={32}
                  color={colors.primary}
                />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                No Bank Connected
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: "center",
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                Connect your bank account to automatically import transactions
                into your budget.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: colors.primary,
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  fontWeight: "600",
                  fontSize: 16,
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Progress Overlay */}
        {isSaving && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 24,
                margin: 20,
                alignItems: "center",
                minWidth: 280,
              }}
            >
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginBottom: 16 }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                Importing Transactions...
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginBottom: 16,
                  textAlign: "center",
                }}
              >
                {saveProgress.current} of {saveProgress.total}
                {saveProgress.startTime > 0 && saveProgress.current > 0 && (
                  <Text style={{ fontSize: 12 }}>
                    {"\n"}
                    {Math.round(
                      (((Date.now() - saveProgress.startTime) /
                        saveProgress.current) *
                        (saveProgress.total - saveProgress.current)) /
                        1000
                    )}
                    s remaining
                  </Text>
                )}
              </Text>
              {saveProgress.currentTransaction && (
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    textAlign: "center",
                    fontStyle: "italic",
                    marginBottom: 16,
                  }}
                  numberOfLines={2}
                >
                  Saving: {saveProgress.currentTransaction}
                </Text>
              )}
              <View
                style={{
                  width: "100%",
                  height: 4,
                  backgroundColor: colors.border,
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${
                      (saveProgress.current / saveProgress.total) * 100
                    }%`,
                    height: "100%",
                    backgroundColor: colors.primary,
                    borderRadius: 2,
                  }}
                />
              </View>
            </View>
          </View>
        )}

        {/* Modal Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 20,
            paddingTop: 60,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
            }}
          >
            Import{" "}
            {selectedMonth ? formatMonth(selectedMonth) : "Current Month"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Summary */}
        <View
          style={{
            padding: 20,
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 8,
            }}
          >
            Smart Import Summary
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              marginBottom: 16,
              fontSize: 14,
            }}
          >
            {totalCount} current month transactions • {selectedCount} selected
          </Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={selectAll}
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                flex: 1,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Select All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={deselectAll}
              style={{
                backgroundColor: colors.surface,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                flex: 1,
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 14,
                  fontWeight: "600",
                }}
              >
                Deselect All
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transactions List */}
        <ScrollView style={{ flex: 1, padding: 16, paddingHorizontal: 16 }}>
          {categorizedTransactions.length === 0 ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 40,
                paddingHorizontal: 20,
              }}
            >
              <Ionicons
                name="calendar"
                size={48}
                color={colors.textSecondary}
                style={{ marginBottom: 16 }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                No Current Month Transactions
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                There are no bank transactions for the current month to import.
                Check back when you have new transactions!
              </Text>
            </View>
          ) : (
            categorizedTransactions.map((transaction) => (
              <TouchableOpacity
                key={transaction.id}
                onPress={() => toggleTransactionSelection(transaction.id)}
                style={{
                  backgroundColor: colors.surface,
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 12,
                  borderWidth: 2,
                  borderColor: transaction.isSelected
                    ? colors.primary
                    : colors.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: colors.text,
                        marginBottom: 4,
                      }}
                    >
                      {transaction.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                        marginBottom: 4,
                      }}
                    >
                      {transaction.category} •{" "}
                      {new Date(transaction.date).toLocaleDateString()}
                    </Text>
                    <View
                      style={{
                        backgroundColor:
                          transaction.type === "income"
                            ? colors.successLight
                            : colors.errorLight,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 4,
                        alignSelf: "flex-start",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color:
                            transaction.type === "income"
                              ? colors.success
                              : colors.error,
                        }}
                      >
                        {transaction.type === "income" ? "Income" : "Expense"}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        color:
                          transaction.type === "income"
                            ? colors.success
                            : colors.error,
                        marginBottom: 8,
                      }}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(String(transaction.amount))}
                    </Text>
                    <Ionicons
                      name={
                        transaction.isSelected
                          ? "checkmark-circle"
                          : "ellipse-outline"
                      }
                      size={24}
                      color={
                        transaction.isSelected
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Save Button */}
        <View
          style={{
            padding: 16,
            paddingHorizontal: 16,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <TouchableOpacity
            onPress={saveSelectedTransactions}
            disabled={isSaving || selectedCount === 0}
            style={{
              backgroundColor:
                selectedCount > 0 ? colors.primary : colors.border,
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
            }}
          >
            {isSaving ? (
              <ActivityIndicator
                size="small"
                color={colors.buttonText}
                style={{ marginRight: 8 }}
              />
            ) : (
              <Ionicons
                name="save"
                size={20}
                color={colors.buttonText}
                style={{ marginRight: 8 }}
              />
            )}
            <Text
              style={{
                color: colors.buttonText,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {isSaving
                ? "Saving..."
                : `Save ${selectedCount} Transaction${
                    selectedCount !== 1 ? "s" : ""
                  }`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
