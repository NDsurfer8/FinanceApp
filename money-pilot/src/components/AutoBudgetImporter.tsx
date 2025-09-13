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
import { useTranslation } from "react-i18next";
import { useCurrency } from "../contexts/CurrencyContext";
import { saveTransaction } from "../services/userData";
import { formatAmountWithoutSymbol } from "../utils/filteredCurrency";
import { mapPlaidCategoryToBudgetCategory } from "../utils/plaidCategoryMapping";
import { categorizeTransactionEnhanced } from "../utils/categorize";
import { overrideStore } from "../services/merchantOverrideStore";

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
  confidence: number;
  reason: string;
  originalTransaction: any;
}

export const AutoBudgetImporter: React.FC<AutoBudgetImporterProps> = ({
  isVisible,
  onClose,
  onSuccess,
  selectedMonth,
  onDataRefresh,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    transactions,
    refreshTransactions,
    bankTransactions,
    refreshBankData,
    isBankConnected,
    bankAccounts,
  } = useData();
  const { formatCurrency, selectedCurrency } = useCurrency();

  const [categorizedTransactions, setCategorizedTransactions] = useState<
    CategorizedTransaction[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({
    currentTransaction: "",
    startTime: 0,
    processedCount: 0,
    totalCount: 0,
  });

  // Process bank transactions when modal becomes visible
  useEffect(() => {
    if (isVisible) {
      if (!isBankConnected) {
        // Clear any existing transactions if no bank is connected
        setCategorizedTransactions([]);
        return;
      }

      if (bankTransactions.length > 0) {
        processBankTransactions(bankTransactions);
      } else {
        // If no bank transactions, try to refresh bank data
        refreshBankData();
      }
    }
  }, [isVisible, bankTransactions, selectedMonth, isBankConnected]);

  // Enhanced categorization using the new system
  const categorizeTransaction = async (
    transaction: any
  ): Promise<{
    category: string;
    type: "income" | "expense";
    confidence: number;
    reason: string;
  }> => {
    if (!user?.uid) {
      return {
        category: "Other Expenses",
        type: "expense",
        confidence: 0,
        reason: "no_user",
      };
    }

    try {
      const result = await categorizeTransactionEnhanced(
        transaction,
        user.uid,
        overrideStore
      );
      return result;
    } catch (error) {
      console.error("Error in enhanced categorization:", error);
      // Fallback to simple categorization
      const amount = transaction.amount;
      const type = amount < 0 ? "income" : "expense";
      return {
        category: "Other Expenses",
        type,
        confidence: 0.3,
        reason: "fallback_error",
      };
    }
  };

  // Process bank transactions and categorize them
  const processBankTransactions = async (bankTransactions: any[]) => {
    if (!user?.uid || !selectedMonth) return;

    setIsLoading(true);
    try {
      const targetMonth = selectedMonth.getMonth();
      const targetYear = selectedMonth.getFullYear();

      // Get unique banks from bank accounts
      const getUniqueBanks = () => {
        const banks = new Set<string>();
        bankAccounts.forEach((account: any) => {
          if (account.institution) {
            banks.add(account.institution);
          }
        });
        return Array.from(banks);
      };

      // Filter transactions for the selected month only (no bank filtering)
      const monthlyTransactions = bankTransactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        const isCorrectMonth =
          transactionDate.getMonth() === targetMonth &&
          transactionDate.getFullYear() === targetYear;

        return isCorrectMonth;
      });

      // Filter out already imported transactions
      const isTransactionAlreadyImported = async (bankTransaction: any) => {
        if (!user?.uid) return false;

        // Check if it already exists as a saved transaction
        return transactions.some((existingTransaction) => {
          // Check if this bank transaction was already imported
          if (existingTransaction.bankTransactionId === bankTransaction.id) {
            return true;
          }
          // Check if this is a duplicate based on amount, date, and description
          const existingDate = new Date(existingTransaction.date);
          const bankDate = new Date(bankTransaction.date);
          const sameDate =
            existingDate.toDateString() === bankDate.toDateString();
          const sameAmount =
            Math.abs(
              existingTransaction.amount - Math.abs(bankTransaction.amount)
            ) < 0.01;
          const sameDescription =
            existingTransaction.description.toLowerCase() ===
            bankTransaction.name.toLowerCase();

          return sameDate && sameAmount && sameDescription;
        });
      };

      // Filter out already imported transactions (async)
      const newTransactions = [];
      for (const transaction of monthlyTransactions) {
        const isAlreadyImported = await isTransactionAlreadyImported(
          transaction
        );
        if (!isAlreadyImported) {
          newTransactions.push(transaction);
        }
      }

      // Categorize each transaction using the enhanced system
      const categorized = await Promise.all(
        newTransactions.map(async (transaction) => {
          const result = await categorizeTransaction(transaction);

          return {
            id: transaction.id,
            name: transaction.name,
            amount: Math.abs(transaction.amount),
            date: transaction.date,
            category: result.category,
            type: result.type,
            isSelected: result.confidence >= 0.6, // Auto-select if confident
            confidence: result.confidence,
            reason: result.reason,
            originalTransaction: transaction,
          };
        })
      );

      setCategorizedTransactions(categorized);
    } catch (error) {
      console.error("Error processing bank transactions:", error);
      Alert.alert(
        t("auto_budget_importer.error"),
        t("auto_budget_importer.processing_error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Save selected transactions
  const handleSaveTransactions = async () => {
    if (!user?.uid) return;

    const selectedTransactions = categorizedTransactions.filter(
      (t) => t.isSelected
    );
    if (selectedTransactions.length === 0) {
      Alert.alert(
        t("auto_budget_importer.no_selection"),
        t("auto_budget_importer.select_transactions")
      );
      return;
    }

    const startTime = Date.now();
    setIsSaving(true);
    setSaveProgress({
      currentTransaction: "",
      startTime: startTime,
      processedCount: 0,
      totalCount: selectedTransactions.length,
    });

    let savedCount = 0;
    let matchedCount = 0;

    try {
      for (let i = 0; i < selectedTransactions.length; i++) {
        const transaction = selectedTransactions[i];
        setSaveProgress({
          currentTransaction: transaction.name,
          startTime: startTime,
          processedCount: i,
          totalCount: selectedTransactions.length,
        });

        try {
          // Check for transaction matches before saving
          const { transactionMatchingService } = await import(
            "../services/transactionMatching"
          );
          const isMatch = await transactionMatchingService.checkForMatches(
            user.uid,
            transaction.originalTransaction
          );

          if (isMatch) {
            console.log(`✅ Transaction matched: ${transaction.name}`);
            matchedCount++;
            savedCount++; // Count matched transactions as "saved" for UI purposes

            // Transaction was matched with existing recurring transaction
          } else {
            // Save the transaction if no match found
            const transactionData = {
              description: transaction.name,
              amount: transaction.amount,
              type: transaction.type,
              category: transaction.category,
              date: new Date(transaction.date).getTime(),
              userId: user.uid,
              bankTransactionId: transaction.id,
              isAutoImported: true,
              createdAt: Date.now(),
            };

            await saveTransaction(transactionData);
            savedCount++;

            // Transaction was saved successfully
          }
        } catch (error) {
          console.error(`Error saving transaction ${transaction.name}:`, error);
        }
      }

      // Show success message
      const totalProcessed = savedCount + matchedCount;
      Alert.alert(
        t("auto_budget_importer.success"),
        t("auto_budget_importer.transactions_imported", {
          count: totalProcessed,
        }),
        [
          {
            text: t("common.ok"),
            onPress: () => {
              onDataRefresh?.();
              onSuccess?.(totalProcessed);
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error saving transactions:", error);
      Alert.alert(
        t("auto_budget_importer.error"),
        t("auto_budget_importer.save_error")
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = categorizedTransactions.filter(
    (t) => t.isSelected
  ).length;
  const totalCount = categorizedTransactions.length;

  if (!user?.uid || !isBankConnected) {
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
              borderRadius: 20,
              padding: 24,
              margin: 20,
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.text,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {!user?.uid
                ? t("auto_budget_importer.not_authenticated")
                : t("auto_budget_importer.no_bank_connected")}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              {!user?.uid
                ? t("auto_budget_importer.login_required")
                : t("auto_budget_importer.connect_bank_description")}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {t("common.close")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
          paddingTop: 8, // Minimal padding to maximize transaction space
        }}
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "98%", // Even more height for transactions
            minHeight: "80%", // Higher minimum height
          }}
        >
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 24,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                {t("auto_budget_importer.title")}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: colors.surfaceSecondary,
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={{ flex: 1, padding: 20 }}>
              {isLoading ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text
                    style={{
                      marginTop: 16,
                      fontSize: 16,
                      color: colors.textSecondary,
                    }}
                  >
                    {t("auto_budget_importer.processing")}
                  </Text>
                </View>
              ) : categorizedTransactions.length === 0 ? (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={64}
                    color={colors.success}
                    style={{ marginBottom: 16 }}
                  />
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: colors.text,
                      textAlign: "center",
                      marginBottom: 8,
                    }}
                  >
                    {t("auto_budget_importer.all_imported")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      textAlign: "center",
                    }}
                  >
                    {t("auto_budget_importer.no_new_transactions")}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Action Bar with Select All/Deselect All */}
                  {categorizedTransactions.length > 0 && (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        backgroundColor: colors.surfaceSecondary,
                        borderRadius: 12,
                        marginBottom: 12,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          setCategorizedTransactions((prev) =>
                            prev.map((t) => ({ ...t, isSelected: true }))
                          );
                        }}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          backgroundColor: colors.primary + "20",
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colors.primary,
                          marginRight: 8,
                        }}
                      >
                        <Ionicons
                          name="checkmark-done-circle-outline"
                          size={16}
                          color={colors.primary}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: colors.primary,
                          }}
                        >
                          {t("auto_budget_importer.select_all")}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setCategorizedTransactions((prev) =>
                            prev.map((t) => ({ ...t, isSelected: false }))
                          );
                        }}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          backgroundColor: colors.error + "20",
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colors.error,
                          marginLeft: 8,
                        }}
                      >
                        <Ionicons
                          name="close-circle-outline"
                          size={16}
                          color={colors.error}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: colors.error,
                          }}
                        >
                          {t("auto_budget_importer.deselect_all")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Transactions List */}
                  <ScrollView style={{ flex: 1 }}>
                    {categorizedTransactions.map((transaction, index) => (
                      <TouchableOpacity
                        key={`${transaction.id}-${index}`}
                        onPress={() => {
                          setCategorizedTransactions((prev) =>
                            prev.map((t, i) =>
                              i === index
                                ? { ...t, isSelected: !t.isSelected }
                                : t
                            )
                          );
                        }}
                        style={{
                          backgroundColor: colors.surfaceSecondary,
                          borderRadius: 12,
                          padding: 16,
                          marginBottom: 12,
                          borderWidth: 2,
                          borderColor: transaction.isSelected
                            ? colors.primary
                            : colors.border,
                        }}
                        activeOpacity={0.7}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 8,
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
                              {new Date(transaction.date).toLocaleDateString()}
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 4,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: colors.textSecondary,
                                  marginRight: 8,
                                }}
                              >
                                {transaction.category}
                              </Text>
                              <View
                                style={{
                                  backgroundColor: colors.primary + "20",
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 10,
                                    color: colors.primary,
                                    fontWeight: "600",
                                  }}
                                >
                                  {Math.round(transaction.confidence * 100)}%
                                </Text>
                              </View>
                            </View>
                            <Text
                              style={{
                                fontSize: 10,
                                color: colors.textSecondary,
                                fontStyle: "italic",
                              }}
                            >
                              {transaction.reason}
                            </Text>
                          </View>
                          <View
                            style={{
                              alignItems: "flex-end",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 18,
                                fontWeight: "700",
                                color:
                                  transaction.type === "income"
                                    ? colors.success
                                    : colors.error,
                              }}
                            >
                              {transaction.type === "income" ? "+" : "-"}
                              {formatAmountWithoutSymbol(
                                transaction.amount,
                                null,
                                selectedCurrency
                              )}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* Import Progress Info - Compact */}
                  {isSaving && (
                    <View
                      style={{
                        backgroundColor: colors.surfaceSecondary,
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: colors.primary + "30",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: colors.text,
                            flex: 1,
                            marginRight: 8,
                          }}
                          numberOfLines={1}
                        >
                          {saveProgress.currentTransaction}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.textSecondary,
                          }}
                        >
                          {saveProgress.processedCount + 1}/
                          {saveProgress.totalCount}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: colors.textSecondary,
                          }}
                        >
                          {saveProgress.totalCount -
                            saveProgress.processedCount}{" "}
                          {t("auto_budget_importer.transactions_remaining")}
                        </Text>
                        {saveProgress.startTime > 0 &&
                          saveProgress.processedCount > 0 && (
                            <Text
                              style={{
                                fontSize: 11,
                                color: colors.primary,
                                fontWeight: "500",
                              }}
                            >
                              {(() => {
                                const elapsed =
                                  (Date.now() - saveProgress.startTime) / 1000;
                                const avgTimePerTransaction =
                                  elapsed / saveProgress.processedCount;
                                const remainingTransactions =
                                  saveProgress.totalCount -
                                  saveProgress.processedCount;
                                const estimatedRemaining = Math.max(
                                  0,
                                  remainingTransactions * avgTimePerTransaction
                                );
                                return estimatedRemaining > 0
                                  ? `${Math.ceil(estimatedRemaining)}s ${t(
                                      "auto_budget_importer.remaining"
                                    )}`
                                  : t("auto_budget_importer.almost_done");
                              })()}
                            </Text>
                          )}
                      </View>
                    </View>
                  )}

                  {/* Add Button */}
                  <TouchableOpacity
                    onPress={handleSaveTransactions}
                    disabled={isSaving || selectedCount === 0}
                    style={{
                      backgroundColor:
                        selectedCount === 0
                          ? colors.surfaceSecondary
                          : colors.primary,
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: "center",
                      marginTop: 12,
                      opacity: selectedCount === 0 ? 0.5 : 1,
                    }}
                  >
                    {isSaving ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <ActivityIndicator
                          size="small"
                          color="white"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={{
                            color: "white",
                            fontSize: 16,
                            fontWeight: "600",
                          }}
                        >
                          {t("auto_budget_importer.adding_transactions")}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={{
                          color: "white",
                          fontSize: 16,
                          fontWeight: "600",
                        }}
                      >
                        {t("auto_budget_importer.add_selected", {
                          count: selectedCount,
                        })}
                      </Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};
