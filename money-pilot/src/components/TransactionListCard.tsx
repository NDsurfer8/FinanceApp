import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../contexts/CurrencyContext";
import { HelpfulTooltip } from "./HelpfulTooltip";
import { Transaction, RecurringTransaction } from "../services/userData";
import { transactionMatchingService } from "../services/transactionMatching";
import { useAuth } from "../hooks/useAuth";
import { ref, update } from "firebase/database";
import { db } from "../services/firebase";
import { useData } from "../contexts/DataContext";
import {
  formatAmountWithFilteredCurrency,
  formatAmountWithoutSymbol,
} from "../utils/filteredCurrency";

interface TransactionListCardProps {
  title: string;
  icon: string;
  iconColor: string;
  transactions: Transaction[];
  projectedTransactions?: Transaction[];
  recurringTransactions?: RecurringTransaction[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onTransactionPress: (transaction: Transaction) => void;
  onAddTransaction: () => void;
  isFutureMonth?: boolean;
  formatDate: (date: number) => string;
  isRecurringTransaction: (transaction: Transaction) => boolean;
  filteredCurrency?: string | null;
}

export const TransactionListCard: React.FC<TransactionListCardProps> = ({
  title,
  icon,
  iconColor,
  transactions,
  projectedTransactions = [],
  recurringTransactions = [],
  isCollapsed,
  onToggleCollapse,
  onTransactionPress,
  onAddTransaction,
  isFutureMonth = false,
  formatDate,
  isRecurringTransaction,
  filteredCurrency = null,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { refreshTransactions, refreshRecurringTransactions } = useData();
  const { t } = useTranslation();
  const { formatCurrency, selectedCurrency } = useCurrency();

  // Helper function to get frequency from recurring transaction
  const getFrequencyFromRecurringTransaction = (
    transaction: Transaction
  ): string | null => {
    if (!transaction.recurringTransactionId || !recurringTransactions.length) {
      return null;
    }

    const recurringTx = recurringTransactions.find(
      (rt) => rt.id === transaction.recurringTransactionId
    );

    // Use originalFrequency for display, fallback to frequency if originalFrequency not available
    return recurringTx?.originalFrequency || recurringTx?.frequency || null;
  };

  // Check if a recurring transaction should show Mark Paid button
  const shouldShowMarkPaidButton = (transaction: Transaction): boolean => {
    // For actual transactions: show if it's a recurring expense that's not paid
    if (transaction.id && !transaction.id.startsWith("projected-")) {
      return (
        !!transaction.recurringTransactionId &&
        !transaction.status &&
        transaction.type === "expense"
      );
    }

    // For projected transactions: show if it's a recurring expense in the current month
    if (transaction.id?.startsWith("projected-")) {
      const currentDate = new Date();
      const transactionDate = new Date(transaction.date);

      // Show only for current month (not future months)
      const isCurrentMonth =
        transactionDate.getMonth() === currentDate.getMonth() &&
        transactionDate.getFullYear() === currentDate.getFullYear();

      return (
        !!transaction.recurringTransactionId &&
        transaction.type === "expense" &&
        isCurrentMonth
      );
    }

    return false;
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Helper function to translate category names
  const translateCategory = (category: string): string => {
    // Convert category to snake_case for translation keys
    const categoryKey = category.toLowerCase().replace(/\s+/g, "_");

    // Try expense categories first (most categories are expenses)
    const expenseKey = `categories.${categoryKey}`;
    const expenseTranslation = t(expenseKey, { defaultValue: "" });
    if (expenseTranslation && expenseTranslation !== expenseKey) {
      return expenseTranslation;
    }

    // Try income categories
    const incomeKey = `transactions.income_categories.${categoryKey}`;
    const incomeTranslation = t(incomeKey, { defaultValue: "" });
    if (incomeTranslation && incomeTranslation !== incomeKey) {
      return incomeTranslation;
    }

    // Return original category if no translation found
    return category;
  };

  // Get all transactions including projected ones
  const allTransactions = useMemo(() => {
    const baseTransactions = [...transactions];
    if (isFutureMonth) {
      baseTransactions.push(...projectedTransactions);
    }
    return baseTransactions;
  }, [transactions, projectedTransactions, isFutureMonth]);

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = new Set(allTransactions.map((t) => t.category));
    return ["all", ...Array.from(uniqueCategories).sort()];
  }, [allTransactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((transaction) => {
      const matchesSearch =
        transaction.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || transaction.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allTransactions, searchQuery, selectedCategory]);

  // Group transactions by category
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach((transaction) => {
      if (!groups[transaction.category]) {
        groups[transaction.category] = [];
      }
      groups[transaction.category].push(transaction);
    });
    return groups;
  }, [filteredTransactions]);

  // Calculate totals
  const totalAmount = useMemo(() => {
    return allTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [allTransactions]);

  const filteredTotalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        shadowColor: colors.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: isCollapsed ? 0 : 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View
            style={{
              backgroundColor: colors.surfaceSecondary,
              padding: 12,
              borderRadius: 12,
              marginRight: 12,
            }}
          >
            <Ionicons name={icon as any} size={20} color={iconColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.text,
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              {filteredTransactions.length}{" "}
              {t("transaction_list_card.transactions")} •{" "}
              {formatAmountWithFilteredCurrency(
                filteredTotalAmount,
                filteredCurrency,
                selectedCurrency
              )}
              {filteredCurrency && ` (${filteredCurrency})`}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onToggleCollapse}
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.surfaceSecondary,
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isCollapsed ? "chevron-down" : "chevron-up"}
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {!isCollapsed && (
        <>
          {/* Search and Filter */}
          <View style={{ marginBottom: 16 }}>
            <TextInput
              style={{
                backgroundColor: colors.surfaceSecondary,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: colors.text,
                marginBottom: 12,
              }}
              placeholder={t("transactions.search_transactions")}
              placeholderTextColor={colors.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {categories.length > 1 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      marginRight: 8,
                      backgroundColor:
                        selectedCategory === category
                          ? colors.primary
                          : colors.surfaceSecondary,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color:
                          selectedCategory === category
                            ? "white"
                            : colors.textSecondary,
                      }}
                    >
                      {category === "all"
                        ? t("transactions.all")
                        : translateCategory(category)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Transactions List */}
          {Object.keys(groupedTransactions).length > 0 ? (
            <View>
              {Object.entries(groupedTransactions).map(
                ([category, categoryTransactions]) => (
                  <View key={category} style={{ marginBottom: 16 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                        paddingHorizontal: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: colors.textSecondary,
                          textTransform: "capitalize",
                        }}
                      >
                        {translateCategory(category)}
                      </Text>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: colors.text,
                          }}
                        >
                          {formatAmountWithFilteredCurrency(
                            categoryTransactions.reduce(
                              (sum, t) => sum + t.amount,
                              0
                            ),
                            filteredCurrency,
                            selectedCurrency
                          )}
                        </Text>
                        {filteredCurrency && (
                          <Text
                            style={{
                              fontSize: 10,
                              color: colors.textSecondary,
                              marginTop: 2,
                            }}
                          >
                            {filteredCurrency}
                          </Text>
                        )}
                      </View>
                    </View>

                    {categoryTransactions.map((transaction, index) => (
                      <TouchableOpacity
                        key={`${transaction.id}-${transaction.date}-${index}`}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          backgroundColor: colors.surfaceSecondary,
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                        onPress={() => onTransactionPress(transaction)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 16,
                              color: colors.text,
                              fontWeight: "500",
                              marginBottom: 4,
                            }}
                          >
                            {transaction.description}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: colors.textSecondary,
                            }}
                          >
                            {formatDate(transaction.date)}
                          </Text>
                        </View>
                        <View
                          style={{
                            alignItems: "center",
                            justifyContent: "center",
                            marginRight: 8,
                          }}
                        >
                          {shouldShowMarkPaidButton(transaction) && (
                            <TouchableOpacity
                              style={{
                                backgroundColor: "#6b7280",
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                marginTop: 4,
                                opacity: 0.7,
                              }}
                              onPress={async () => {
                                if (user) {
                                  try {
                                    // Check if this is a projected transaction or actual transaction
                                    if (
                                      transaction.id?.startsWith("projected-")
                                    ) {
                                      // For projected transactions: create the actual transaction and mark as paid
                                      const { saveTransaction } = await import(
                                        "../services/userData"
                                      );

                                      const actualTransaction = {
                                        description: transaction.description,
                                        amount: transaction.amount,
                                        type: transaction.type,
                                        category: transaction.category,
                                        date: Date.now(), // Use current date when marked as paid
                                        userId: user.uid,
                                        recurringTransactionId:
                                          transaction.recurringTransactionId,
                                        // Don't set isManual: true since we want it marked as paid immediately
                                        // isManual: true would trigger markAsPending() in saveTransaction
                                        status: "paid" as const,
                                        matchedAt: Date.now(),
                                        createdAt: Date.now(),
                                      };

                                      const transactionId =
                                        await saveTransaction(
                                          actualTransaction
                                        );
                                      console.log(
                                        `✅ Created and marked projected transaction as paid: ${transactionId}`
                                      );

                                      // Update the recurring transaction's totalOccurrences
                                      if (transaction.recurringTransactionId) {
                                        const recurringRef = ref(
                                          db,
                                          `users/${user.uid}/recurringTransactions/${transaction.recurringTransactionId}`
                                        );
                                        const { get, update } = await import(
                                          "firebase/database"
                                        );
                                        const recurringSnapshot = await get(
                                          recurringRef
                                        );

                                        if (recurringSnapshot.exists()) {
                                          const recurringTx =
                                            recurringSnapshot.val();
                                          await update(recurringRef, {
                                            totalOccurrences:
                                              (recurringTx.totalOccurrences ||
                                                0) + 1,
                                            lastGeneratedDate: Date.now(),
                                          });
                                          console.log(
                                            `✅ Updated totalOccurrences for recurring transaction ${transaction.recurringTransactionId}`
                                          );
                                        }
                                      }
                                    } else if (transaction.id) {
                                      // For actual transactions: just mark as paid using updateTransaction
                                      const { updateTransaction } =
                                        await import("../services/userData");
                                      await updateTransaction({
                                        ...transaction,
                                        status: "paid",
                                        matchedAt: Date.now(),
                                      });
                                      console.log(
                                        `✅ Manually marked transaction ${transaction.id} as paid`
                                      );
                                    }

                                    // Refresh transactions and recurring transactions to update UI
                                    await refreshTransactions();
                                    await refreshRecurringTransactions();
                                  } catch (error) {
                                    console.error(
                                      "Error marking as paid:",
                                      error
                                    );
                                  }
                                }
                              }}
                            >
                              <Text
                                style={{
                                  color: "#f3f4f6",
                                  fontSize: 10,
                                  fontWeight: "500",
                                }}
                              >
                                {t("common.mark_paid")}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "flex-end",
                          }}
                        >
                          {(isRecurringTransaction(transaction) ||
                            transaction.id?.startsWith("projected-")) && (
                            <View
                              style={{
                                marginRight: 6,
                                justifyContent: "center",
                                alignItems: "center",
                                minWidth: 18,
                                height: 18,
                              }}
                            >
                              <Ionicons
                                name="repeat"
                                size={14}
                                color={
                                  transaction.type === "income"
                                    ? colors.success
                                    : colors.error
                                }
                              />
                              {(() => {
                                const frequency =
                                  getFrequencyFromRecurringTransaction(
                                    transaction
                                  );
                                return (
                                  frequency && (
                                    <Text
                                      style={{
                                        fontSize: 8,
                                        color: colors.textSecondary,
                                        marginTop: 1,
                                        textAlign: "center",
                                      }}
                                    >
                                      {frequency === "weekly"
                                        ? "W"
                                        : frequency === "biweekly"
                                        ? "BW"
                                        : frequency === "monthly"
                                        ? "M"
                                        : frequency === "quarterly"
                                        ? "Q"
                                        : frequency === "yearly"
                                        ? "Y"
                                        : "R"}
                                    </Text>
                                  )
                                );
                              })()}
                            </View>
                          )}
                          <Text
                            style={{
                              fontSize: 16,
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
                              filteredCurrency,
                              selectedCurrency
                            )}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              )}
            </View>
          ) : (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 40,
              }}
            >
              <Ionicons
                name="search-outline"
                size={48}
                color={colors.textSecondary}
                style={{ marginBottom: 12 }}
              />
              <Text
                style={{
                  fontSize: 16,
                  color: colors.textSecondary,
                  textAlign: "center",
                }}
              >
                {searchQuery || selectedCategory !== "all"
                  ? t("transactions.no_transactions_match_filters")
                  : t("transactions.no_transactions_yet")}
              </Text>
            </View>
          )}

          {/* Add Transaction Button */}
          <HelpfulTooltip
            tooltipId={
              title.toLowerCase().includes("expense")
                ? "expenses-section"
                : "income-section"
            }
            title={
              title.toLowerCase().includes("expense")
                ? t("transactions.track_your_expenses")
                : t("transactions.track_your_income")
            }
            description={
              title.toLowerCase().includes("expense")
                ? t("transactions.expenses_description")
                : t("transactions.income_description")
            }
            position="top"
            delay={title.toLowerCase().includes("expense") ? 3000 : 2000}
          >
            <TouchableOpacity
              onPress={onAddTransaction}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 12,
                marginTop: 16,
                backgroundColor: title.toLowerCase().includes("expense")
                  ? colors.error + "20"
                  : colors.surfaceSecondary,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: title.toLowerCase().includes("expense")
                  ? colors.error
                  : colors.border,
                borderStyle: "dashed",
              }}
            >
              <Ionicons
                name="add-circle"
                size={20}
                color={
                  title.toLowerCase().includes("expense")
                    ? colors.error
                    : colors.primary
                }
              />
              <Text
                style={{
                  color: title.toLowerCase().includes("expense")
                    ? colors.error
                    : colors.primary,
                  fontSize: 14,
                  fontWeight: "600",
                  marginLeft: 8,
                }}
              >
                {t("transaction_list_card.add_transaction", { title })}
              </Text>
            </TouchableOpacity>
          </HelpfulTooltip>
        </>
      )}
    </View>
  );
};
