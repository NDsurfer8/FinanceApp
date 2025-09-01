import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import {
  getUserRecurringTransactions,
  deleteRecurringTransaction,
  RecurringTransaction,
} from "../services/userData";

interface RecurringTransactionsScreenProps {
  navigation: any;
  route: any;
}

export const RecurringTransactionsScreen: React.FC<
  RecurringTransactionsScreenProps
> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { selectedMonth } = route.params || {};

  const [recurringTransactions, setRecurringTransactions] = useState<
    RecurringTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);

  const loadRecurringTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const transactions = await getUserRecurringTransactions(user.uid);
      setRecurringTransactions(transactions);
    } catch (error) {
      console.error("Error loading recurring transactions:", error);
      Alert.alert("Error", "Failed to load recurring transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadRecurringTransactions();
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadRecurringTransactions();
      }
    }, [user])
  );

  const openAddModal = () => {
    navigation.navigate("AddTransaction", {
      type: "expense", // Default to expense, user can change
      editMode: false,
      isRecurringTransaction: true,
    });
  };

  const openEditModal = (transaction: RecurringTransaction) => {
    navigation.navigate("AddTransaction", {
      type: transaction.type,
      editMode: true,
      transaction: {
        ...transaction,
        // Convert recurring transaction to regular transaction format
        id: transaction.id,
        description: transaction.name,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        date: transaction.startDate,
        recurringTransactionId: transaction.id,
        // Add any other fields needed by AddTransactionScreen
      },
      isRecurringTransaction: true,
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case "weekly":
        return "Weekly";
      case "biweekly":
        return "Bi-weekly";
      case "monthly":
        return "Monthly";
      case "quarterly":
        return "Quarterly";
      case "yearly":
        return "Yearly";
      default:
        return frequency;
    }
  };

  const getCategories = (type: string) => {
    if (type === "income") {
      return [
        "Salary",
        "VA Disability",
        "Social Security",
        "Freelance",
        "Business",
        "Investment",
        "Rental Income",
        "Side Hustle",
        "Bonus",
        "Commission",
        "Tips",
        "Gift",
        "Refund",
        "Other Income",
      ];
    } else {
      return [
        "Rent",
        "Car Payment",
        "Insurance",
        "Utilities",
        "Internet",
        "Phone",
        "Subscriptions",
        "Credit Card",
        "Loan Payment",
        "Food",
        "Transport",
        "Health",
        "Entertainment",
        "Shopping",
        "Other",
      ];
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryIcons: { [key: string]: string } = {
      Salary: "cash",
      "VA Disability": "medical",
      "Social Security": "shield-checkmark",
      Freelance: "laptop",
      Business: "briefcase",
      Investment: "trending-up",
      "Rental Income": "home",
      "Side Hustle": "construct",
      Bonus: "gift",
      Commission: "card",
      Tips: "cash",
      Gift: "gift",
      Refund: "refresh",
      "Other Income": "ellipsis-horizontal",
      Rent: "home",
      "Car Payment": "car",
      Insurance: "shield-checkmark",
      Utilities: "flash",
      Internet: "wifi",
      Phone: "call",
      Subscriptions: "card",
      "Credit Card": "card",
      "Loan Payment": "card",
      Food: "restaurant",
      Transport: "car",
      Health: "medical",
      Entertainment: "game-controller",
      Shopping: "bag",
      Other: "ellipsis-horizontal",
    };
    return categoryIcons[category] || "ellipsis-horizontal";
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Recurring Transactions
          </Text>
          <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View
            style={[styles.summaryCard, { backgroundColor: colors.surface }]}
          >
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Active
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {recurringTransactions.filter((t) => t.isActive).length}
            </Text>
          </View>
          <View
            style={[styles.summaryCard, { backgroundColor: colors.surface }]}
          >
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Income
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {
                recurringTransactions.filter(
                  (t) => t.type === "income" && t.isActive
                ).length
              }
            </Text>
          </View>
          <View
            style={[styles.summaryCard, { backgroundColor: colors.surface }]}
          >
            <Text
              style={[styles.summaryLabel, { color: colors.textSecondary }]}
            >
              Expenses
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {
                recurringTransactions.filter(
                  (t) => t.type === "expense" && t.isActive
                ).length
              }
            </Text>
          </View>
        </View>

        {/* Recurring Transactions List */}
        {recurringTransactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="repeat" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Recurring Transactions
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textSecondary }]}
            >
              Set up recurring income and expenses to automate your financial
              tracking
            </Text>
            <TouchableOpacity
              onPress={openAddModal}
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            >
              <Text
                style={[styles.emptyButtonText, { color: colors.buttonText }]}
              >
                Add Your First One
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.transactionsContainer}>
            {recurringTransactions.map((transaction) => (
              <View
                key={transaction.id}
                style={[
                  styles.transactionCard,
                  { backgroundColor: colors.surface },
                ]}
              >
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionInfo}>
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: colors.surfaceSecondary },
                      ]}
                    >
                      <Ionicons
                        name={getCategoryIcon(transaction.category) as any}
                        size={20}
                        color={
                          transaction.type === "income"
                            ? colors.success
                            : colors.error
                        }
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text
                        style={[styles.transactionName, { color: colors.text }]}
                      >
                        {transaction.name}
                      </Text>
                      <Text
                        style={[
                          styles.transactionCategory,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {transaction.category}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionAmount}>
                    <Text
                      style={[
                        styles.amountText,
                        {
                          color:
                            transaction.type === "income"
                              ? colors.success
                              : colors.error,
                        },
                      ]}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </Text>
                    <Text
                      style={[
                        styles.frequencyText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {getFrequencyLabel(transaction.frequency)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.transactionFooter,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: transaction.isActive
                            ? colors.success
                            : colors.textSecondary,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {transaction.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      onPress={() => openEditModal(transaction)}
                      style={[
                        styles.editButton,
                        { backgroundColor: colors.surfaceSecondary },
                      ]}
                    >
                      <Ionicons
                        name="pencil"
                        size={16}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  addButton: {
    padding: 8,
  },
  summaryContainer: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  transactionsContainer: {
    gap: 16,
  },
  transactionCard: {
    borderRadius: 16,
    padding: 16,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  transactionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent", // Will be overridden with theme colors
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 14,
  },
  transactionAmount: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  frequencyText: {
    fontSize: 12,
  },
  transactionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "transparent", // Will be overridden with theme colors
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "transparent", // Will be overridden with theme colors
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: "transparent", // Will be overridden with theme colors
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "transparent", // Will be overridden with theme colors
  },
});
