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
  const { bankTransactions, transactions, isBankConnected, connectedBanks } =
    useData();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { formatCurrency, selectedCurrency } = useCurrency();

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
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>("all");
  const [saveProgress, setSaveProgress] = useState({
    current: 0,
    total: 0,
    currentTransaction: "",
    startTime: 0,
  });

  // Enhanced categorization rules for better credit card transaction categorization
  const categorizeTransaction = (
    transaction: any
  ): { category: string; type: "income" | "expense" } => {
    const name = transaction.name?.toLowerCase() || "";
    const amount = transaction.amount;

    // First, try to use Plaid's new personal_finance_category if available
    if (transaction.personal_finance_category?.primary) {
      const plaidCategory = transaction.personal_finance_category.primary;
      const mappedCategory = mapPlaidCategoryToBudgetCategory(plaidCategory);

      // Determine type based on amount (Plaid: negative = income, positive = expense)
      const type = amount < 0 ? "income" : "expense";

      return { category: mappedCategory, type };
    }

    // Fallback to enhanced logic when Plaid categories aren't available
    // Income patterns (Plaid: negative = income, positive = expense)
    if (amount < 0) {
      if (
        name.includes("deposit") ||
        name.includes("transfer") ||
        name.includes("salary") ||
        name.includes("payroll") ||
        name.includes("direct deposit") ||
        name.includes("payroll") ||
        name.includes("refund") ||
        name.includes("return") ||
        name.includes("credit")
      ) {
        return { category: "Salary", type: "income" };
      }
      return { category: "Other Income", type: "income" };
    }

    // Enhanced expense patterns for better credit card categorization
    if (amount > 0) {
      // Food & Dining - Enhanced patterns
      if (
        name.includes("restaurant") ||
        name.includes("mcdonalds") ||
        name.includes("starbucks") ||
        name.includes("uber eats") ||
        name.includes("doordash") ||
        name.includes("grubhub") ||
        name.includes("pizza") ||
        name.includes("burger") ||
        name.includes("cafe") ||
        name.includes("coffee") ||
        name.includes("deli") ||
        name.includes("food") ||
        name.includes("grocery") ||
        name.includes("supermarket") ||
        name.includes("kroger") ||
        name.includes("safeway") ||
        name.includes("whole foods") ||
        name.includes("trader joe") ||
        name.includes("albertsons") ||
        name.includes("publix") ||
        name.includes("wegmans") ||
        name.includes("dining") ||
        name.includes("kitchen") ||
        name.includes("grill") ||
        name.includes("bar") ||
        name.includes("pub") ||
        name.includes("tavern")
      ) {
        return { category: "Food", type: "expense" };
      }

      // Transportation - Enhanced patterns
      if (
        name.includes("uber") ||
        name.includes("lyft") ||
        name.includes("gas") ||
        name.includes("shell") ||
        name.includes("exxon") ||
        name.includes("chevron") ||
        name.includes("bp") ||
        name.includes("mobil") ||
        name.includes("speedway") ||
        name.includes("7-eleven") ||
        name.includes("parking") ||
        name.includes("toll") ||
        name.includes("metro") ||
        name.includes("bus") ||
        name.includes("train") ||
        name.includes("taxi") ||
        name.includes("car") ||
        name.includes("auto") ||
        name.includes("vehicle") ||
        name.includes("fuel") ||
        name.includes("petrol")
      ) {
        return { category: "Transportation", type: "expense" };
      }

      // Shopping - Enhanced patterns
      if (
        name.includes("amazon") ||
        name.includes("walmart") ||
        name.includes("target") ||
        name.includes("costco") ||
        name.includes("best buy") ||
        name.includes("home depot") ||
        name.includes("lowes") ||
        name.includes("macy") ||
        name.includes("nordstrom") ||
        name.includes("gap") ||
        name.includes("old navy") ||
        name.includes("h&m") ||
        name.includes("zara") ||
        name.includes("uniqlo") ||
        name.includes("apple") ||
        name.includes("google") ||
        name.includes("microsoft") ||
        name.includes("shop") ||
        name.includes("store") ||
        name.includes("retail") ||
        name.includes("outlet") ||
        name.includes("mall")
      ) {
        return { category: "Shopping", type: "expense" };
      }

      // Bills & Utilities - Enhanced patterns
      if (
        name.includes("electric") ||
        name.includes("water") ||
        name.includes("gas") ||
        name.includes("internet") ||
        name.includes("phone") ||
        name.includes("netflix") ||
        name.includes("spotify") ||
        name.includes("hulu") ||
        name.includes("disney") ||
        name.includes("youtube") ||
        name.includes("prime") ||
        name.includes("cable") ||
        name.includes("wifi") ||
        name.includes("broadband") ||
        name.includes("utility") ||
        name.includes("bill") ||
        name.includes("payment") ||
        name.includes("subscription") ||
        name.includes("membership") ||
        name.includes("insurance") ||
        name.includes("rent") ||
        name.includes("mortgage") ||
        name.includes("hoa")
      ) {
        return { category: "Utilities", type: "expense" };
      }

      // Healthcare - Enhanced patterns
      if (
        name.includes("pharmacy") ||
        name.includes("cvs") ||
        name.includes("walgreens") ||
        name.includes("doctor") ||
        name.includes("medical") ||
        name.includes("hospital") ||
        name.includes("clinic") ||
        name.includes("dental") ||
        name.includes("vision") ||
        name.includes("health") ||
        name.includes("wellness") ||
        name.includes("fitness") ||
        name.includes("gym") ||
        name.includes("yoga") ||
        name.includes("spa") ||
        name.includes("massage")
      ) {
        return { category: "Health", type: "expense" };
      }

      // Entertainment - Enhanced patterns
      if (
        name.includes("movie") ||
        name.includes("theater") ||
        name.includes("concert") ||
        name.includes("game") ||
        name.includes("ticket") ||
        name.includes("cinema") ||
        name.includes("amc") ||
        name.includes("regal") ||
        name.includes("entertainment") ||
        name.includes("fun") ||
        name.includes("leisure") ||
        name.includes("recreation") ||
        name.includes("sports") ||
        name.includes("golf") ||
        name.includes("bowling") ||
        name.includes("arcade") ||
        name.includes("casino") ||
        name.includes("bar") ||
        name.includes("club")
      ) {
        return { category: "Entertainment", type: "expense" };
      }

      // Business & Professional - New category
      if (
        name.includes("office") ||
        name.includes("business") ||
        name.includes("professional") ||
        name.includes("consulting") ||
        name.includes("legal") ||
        name.includes("accounting") ||
        name.includes("software") ||
        name.includes("adobe") ||
        name.includes("microsoft") ||
        name.includes("slack") ||
        name.includes("zoom") ||
        name.includes("meeting") ||
        name.includes("conference") ||
        name.includes("training") ||
        name.includes("education") ||
        name.includes("course") ||
        name.includes("book") ||
        name.includes("supply") ||
        name.includes("equipment")
      ) {
        return { category: "Business", type: "expense" };
      }

      return { category: "Other Expenses", type: "expense" };
    }

    return { category: "Other Expenses", type: "expense" };
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
          const isCorrectMonth =
            transactionDate.getMonth() === targetMonthNumber &&
            transactionDate.getFullYear() === targetYear;

          // Apply bank filter
          const isCorrectBank =
            selectedBankFilter === "all" ||
            transaction.institution === selectedBankFilter;

          return isCorrectMonth && isCorrectBank;
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
  }, [isVisible, bankTransactions, selectedMonth, selectedBankFilter]);

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
        t("budget.no_transactions_selected"),
        t("budget.select_at_least_one_transaction")
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
            // Preserve source account information for filtering
            sourceAccountId: transaction.originalTransaction?.account_id,
            sourceInstitution: transaction.originalTransaction?.institution,
            sourceItemId: transaction.originalTransaction?.itemId,
            isAutoImported: true,
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
          t("common.success"),
          t("budget.import_success_message", { count: savedCount }),
          [
            {
              text: t("common.ok"),
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
          t("budget.partial_success"),
          t("budget.partial_success_message", {
            saved: savedCount,
            failed: failedCount,
          }),
          [
            {
              text: t("common.ok"),
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
          t("auto_budget_importer.import_failed"),
          t("auto_budget_importer.import_failed_description"),
          [
            {
              text: t("common.ok"),
              onPress: () => onClose(),
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error saving transactions:", error);
      Alert.alert(
        t("auto_budget_importer.error_saving_transactions"),
        t("auto_budget_importer.error_saving_description")
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
                {t("auto_budget_importer.no_bank_connected")}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: "center",
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {t("auto_budget_importer.connect_bank_description")}
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
                {t("auto_budget_importer.close")}
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
                {t("auto_budget_importer.importing_transactions")}
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
                    {t("auto_budget_importer.s_remaining")}
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
                  {t("auto_budget_importer.saving")}{" "}
                  {saveProgress.currentTransaction}
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
            {t("auto_budget_importer.import")}{" "}
            {selectedMonth
              ? formatMonth(selectedMonth)
              : t("auto_budget_importer.current_month")}
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
            {t("auto_budget_importer.smart_import_summary")}
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

          {/* Bank Filter */}
          {connectedBanks.length > 1 && (
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                {t("auto_budget_importer.filter_by_bank")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 8 }}
              >
                <TouchableOpacity
                  onPress={() => setSelectedBankFilter("all")}
                  style={{
                    backgroundColor:
                      selectedBankFilter === "all"
                        ? colors.primary
                        : colors.card,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor:
                      selectedBankFilter === "all"
                        ? colors.primary
                        : colors.border,
                  }}
                >
                  <Text
                    style={{
                      color:
                        selectedBankFilter === "all" ? "white" : colors.text,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {t("auto_budget_importer.all_banks")}
                  </Text>
                </TouchableOpacity>
                {connectedBanks.map((bank: any) => (
                  <TouchableOpacity
                    key={bank.name}
                    onPress={() => setSelectedBankFilter(bank.name)}
                    style={{
                      backgroundColor:
                        selectedBankFilter === bank.name
                          ? colors.primary
                          : colors.card,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor:
                        selectedBankFilter === bank.name
                          ? colors.primary
                          : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selectedBankFilter === bank.name
                            ? "white"
                            : colors.text,
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      {bank.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

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
                {t("auto_budget_importer.select_all")}
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
                {t("auto_budget_importer.deselect_all")}
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
                {t("auto_budget_importer.no_current_month_transactions")}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {t("auto_budget_importer.no_transactions_description")}
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
                        {transaction.type === "income"
                          ? t("auto_budget_importer.income")
                          : t("auto_budget_importer.expense")}
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
                      {formatAmountWithoutSymbol(
                        transaction.amount,
                        null, // No filtered currency in auto-import
                        selectedCurrency
                      )}
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
                ? t("auto_budget_importer.saving_transactions")
                : selectedCount === 1
                ? t("auto_budget_importer.save_transactions", {
                    count: selectedCount,
                  })
                : t("auto_budget_importer.save_transactions_plural", {
                    count: selectedCount,
                  })}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};
