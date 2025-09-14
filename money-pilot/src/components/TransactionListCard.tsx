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
    // Don't show if already optimistically marked as paid
    if (optimisticallyPaid.has(transaction.id || "")) {
      console.log(`🔍 Button hidden - optimistically paid: ${transaction.id}`);
      return false;
    }

    // For actual transactions: show if it's a recurring expense that's not paid
    if (transaction.id && !transaction.id.startsWith("projected-")) {
      const shouldShow =
        !!transaction.recurringTransactionId &&
        transaction.status !== "paid" &&
        transaction.type === "expense";
      console.log(
        `🔍 Actual transaction ${
          transaction.id
        }: recurringId=${!!transaction.recurringTransactionId}, status=${
          transaction.status
        }, type=${transaction.type}, shouldShow=${shouldShow}`
      );
      return shouldShow;
    }

    // For projected transactions: show if it's a recurring expense in the current month
    if (transaction.id?.startsWith("projected-")) {
      const currentDate = new Date();
      const transactionDate = new Date(transaction.date);

      // Show only for current month (not future months)
      const isCurrentMonth =
        transactionDate.getMonth() === currentDate.getMonth() &&
        transactionDate.getFullYear() === currentDate.getFullYear();

      const shouldShow =
        !!transaction.recurringTransactionId &&
        transaction.type === "expense" &&
        isCurrentMonth;
      console.log(
        `🔍 Projected transaction ${
          transaction.id
        }: recurringId=${!!transaction.recurringTransactionId}, type=${
          transaction.type
        }, isCurrentMonth=${isCurrentMonth}, shouldShow=${shouldShow}`
      );
      return shouldShow;
    }

    console.log(`🔍 No conditions met for ${transaction.id}, returning false`);
    return false;
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [optimisticallyPaid, setOptimisticallyPaid] = useState<Set<string>>(
    new Set()
  );

  // Clear optimistic state when transactions refresh and we have new data
  React.useEffect(() => {
    // Only clear optimistic state for transactions that are now actually marked as paid
    if (transactions.length > 0 && optimisticallyPaid.size > 0) {
      const newOptimisticallyPaid = new Set(optimisticallyPaid);

      // Remove from optimistic state any transactions that are now actually marked as paid
      optimisticallyPaid.forEach((transactionId) => {
        const transaction = transactions.find((t) => t.id === transactionId);
        if (transaction && transaction.status === "paid") {
          newOptimisticallyPaid.delete(transactionId);
          console.log(
            `🔍 Removed ${transactionId} from optimistic state - now actually paid`
          );
        }
      });

      // Only update if there are changes
      if (newOptimisticallyPaid.size !== optimisticallyPaid.size) {
        setOptimisticallyPaid(newOptimisticallyPaid);
      }
    }
  }, [transactions, optimisticallyPaid]);

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
    } else {
      // For current month, only add projected transactions that haven't been optimistically paid
      const filteredProjected = projectedTransactions.filter(
        (projected) => !optimisticallyPaid.has(projected.id || "")
      );
      baseTransactions.push(...filteredProjected);
    }

    return baseTransactions;
  }, [transactions, projectedTransactions, isFutureMonth, optimisticallyPaid]);

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
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.8}
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

                    {categoryTransactions.map((transaction, index) => {
                      const frequency =
                        getFrequencyFromRecurringTransaction(transaction);
                      const isRecurring =
                        transaction.recurringTransactionId ||
                        transaction.id?.startsWith("projected-");

                      return (
                        <TouchableOpacity
                          key={`${transaction.id}-${transaction.date}-${index}`}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            paddingVertical: 16,
                            paddingHorizontal: 16,
                            backgroundColor: colors.surfaceSecondary,
                            borderRadius: 12,
                            marginBottom: 8,
                            shadowColor: colors.shadow,
                            shadowOpacity: 0.08,
                            shadowRadius: 6,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: 3,
                          }}
                          onPress={() => onTransactionPress(transaction)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 6,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 16,
                                  color: colors.text,
                                  fontWeight: "600",
                                  flex: 1,
                                }}
                                numberOfLines={1}
                              >
                                {transaction.description}
                              </Text>

                              {/* Simple recurring indicator */}
                              {isRecurring && (
                                <View
                                  style={{
                                    marginLeft: 8,
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    backgroundColor: colors.primary + "15",
                                    borderRadius: 4,
                                    flexDirection: "row",
                                    alignItems: "center",
                                  }}
                                >
                                  <Ionicons
                                    name="repeat"
                                    size={10}
                                    color={colors.primary}
                                    style={{ marginRight: 2 }}
                                  />
                                  <Text
                                    style={{
                                      fontSize: 9,
                                      color: colors.primary,
                                      fontWeight: "600",
                                    }}
                                  >
                                    {frequency || "R"}
                                  </Text>
                                </View>
                              )}
                            </View>

                            <Text
                              style={{
                                fontSize: 13,
                                color: colors.textSecondary,
                                fontWeight: "500",
                              }}
                            >
                              {formatDate(transaction.date)}
                            </Text>
                          </View>
                          <View
                            style={{
                              alignItems: "flex-end",
                              justifyContent: "center",
                            }}
                          >
                            {/* Mark Paid Button */}
                            {shouldShowMarkPaidButton(transaction) && (
                              <TouchableOpacity
                                style={{
                                  backgroundColor: "#48484A",
                                  paddingHorizontal: 10,
                                  paddingVertical: 6,
                                  borderRadius: 8,
                                  marginBottom: 8,
                                  shadowColor: "#48484A",
                                  shadowOpacity: 0.2,
                                  shadowRadius: 4,
                                  shadowOffset: { width: 0, height: 2 },
                                  elevation: 2,
                                }}
                                onPress={async (e) => {
                                  e.stopPropagation();
                                  if (user && transaction.id) {
                                    // Optimistically update UI immediately
                                    setOptimisticallyPaid(
                                      (prev) =>
                                        new Set([...prev, transaction.id!])
                                    );

                                    try {
                                      // Check if this is a projected transaction or actual transaction
                                      if (
                                        transaction.id?.startsWith("projected-")
                                      ) {
                                        // For projected transactions: create the actual transaction and mark as paid
                                        const { saveTransaction } =
                                          await import("../services/userData");

                                        const actualTransaction = {
                                          description: transaction.description,
                                          amount: transaction.amount,
                                          type: transaction.type,
                                          category: transaction.category,
                                          date: transaction.date,
                                          userId: user.uid,
                                          recurringTransactionId:
                                            transaction.recurringTransactionId,
                                          status: "paid" as const,
                                          matchedAt: Date.now(),
                                          createdAt: Date.now(),
                                        };

                                        await saveTransaction(
                                          actualTransaction
                                        );

                                        // Update the recurring transaction's totalOccurrences
                                        if (
                                          transaction.recurringTransactionId
                                        ) {
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
                                          }
                                        }
                                      } else if (transaction.id) {
                                        // For actual transactions: just mark as paid
                                        const { updateTransaction } =
                                          await import("../services/userData");
                                        await updateTransaction({
                                          ...transaction,
                                          status: "paid",
                                          matchedAt: Date.now(),
                                        });
                                      }

                                      // Refresh data to update smart insights immediately
                                      await refreshTransactions();
                                      await refreshRecurringTransactions();
                                    } catch (error) {
                                      console.error(
                                        "Error marking as paid:",
                                        error
                                      );
                                      // Revert optimistic update on error
                                      setOptimisticallyPaid((prev) => {
                                        const newSet = new Set(prev);
                                        newSet.delete(transaction.id!);
                                        return newSet;
                                      });
                                    }
                                  }
                                }}
                              >
                                <Text
                                  style={{
                                    color: colors.buttonText,
                                    fontSize: 11,
                                    fontWeight: "600",
                                  }}
                                >
                                  Mark Paid
                                </Text>
                              </TouchableOpacity>
                            )}

                            {/* Amount */}
                            <Text
                              style={{
                                fontSize: 18,
                                fontWeight: "700",
                                color:
                                  transaction.type === "income"
                                    ? colors.success
                                    : colors.error,
                                textAlign: "right",
                              }}
                              numberOfLines={1}
                              adjustsFontSizeToFit={true}
                              minimumFontScale={0.8}
                            >
                              {transaction.type === "income" ? "+" : "-"}
                              {formatAmountWithFilteredCurrency(
                                transaction.amount,
                                filteredCurrency,
                                selectedCurrency
                              )}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )
              )}
            </View>
          ) : (
            <View
              style={{
                alignItems: "center",
                paddingVertical: 40,
                paddingHorizontal: 20,
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: colors.surfaceSecondary,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Ionicons
                  name="search-outline"
                  size={32}
                  color={colors.textSecondary}
                />
              </View>
              <Text
                style={{
                  fontSize: 18,
                  color: colors.text,
                  fontWeight: "600",
                  textAlign: "center",
                  marginBottom: 8,
                }}
              >
                {searchQuery || selectedCategory !== "all"
                  ? "No transactions found"
                  : "No transactions yet"}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {searchQuery || selectedCategory !== "all"
                  ? "Try adjusting your search or filters"
                  : "Add your first transaction to get started"}
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
