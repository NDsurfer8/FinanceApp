import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import {
  getUserTransactions,
  removeTransaction,
  getUserRecurringTransactions,
  skipRecurringTransactionForMonth,
} from "../services/userData";
import { deleteRecurringTransaction } from "../services/transactionService";

interface TransactionsScreenProps {
  navigation: any;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  // Add focus listener to refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (user) {
        loadTransactions();
      }
    });

    return unsubscribe;
  }, [navigation, user]);

  const loadTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [userTransactions, userRecurringTransactions] = await Promise.all([
        getUserTransactions(user.uid),
        getUserRecurringTransactions(user.uid),
      ]);
      setTransactions(userTransactions);
      setRecurringTransactions(userRecurringTransactions);
    } catch (error) {
      console.error("Error loading transactions:", error);
      Alert.alert("Error", "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transaction: any) => {
    if (!user) return;

    const isRecurring = isRecurringTransaction(transaction);

    if (isRecurring) {
      // For recurring transactions, show options
      Alert.alert(
        "Delete Recurring Transaction",
        `"${transaction.description}" is a recurring transaction. What would you like to delete?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete This Occurrence Only",
            style: "default",
            onPress: async () => {
              try {
                // Delete the current transaction
                await removeTransaction(user.uid, transaction.id);

                // Find the recurring transaction and skip this month
                const recurringTransaction = recurringTransactions.find(
                  (recurring) =>
                    recurring.name === transaction.description &&
                    recurring.amount === transaction.amount &&
                    recurring.type === transaction.type &&
                    recurring.isActive
                );

                if (recurringTransaction?.id) {
                  const transactionDate = new Date(transaction.date);
                  const monthKey = `${transactionDate.getFullYear()}-${String(
                    transactionDate.getMonth() + 1
                  ).padStart(2, "0")}`;
                  await skipRecurringTransactionForMonth(
                    recurringTransaction.id,
                    monthKey
                  );
                }

                await loadTransactions();
                Alert.alert(
                  "Success",
                  "Transaction occurrence deleted and skipped for this month!"
                );
              } catch (error) {
                console.error("Error deleting transaction:", error);
                Alert.alert("Error", "Failed to delete transaction");
              }
            },
          },
          {
            text: "Delete All Future Occurrences",
            style: "destructive",
            onPress: async () => {
              try {
                // Find the recurring transaction and delete it
                const recurringTransaction = recurringTransactions.find(
                  (recurring) =>
                    recurring.name === transaction.description &&
                    recurring.amount === transaction.amount &&
                    recurring.type === transaction.type &&
                    recurring.isActive
                );

                if (recurringTransaction?.id) {
                  await deleteRecurringTransaction(recurringTransaction.id);
                  await loadTransactions();
                  Alert.alert(
                    "Success",
                    "Recurring transaction and all related transactions deleted successfully!"
                  );
                } else {
                  Alert.alert(
                    "Error",
                    "Could not find recurring transaction to delete"
                  );
                }
              } catch (error) {
                console.error("Error deleting recurring transaction:", error);
                Alert.alert("Error", "Failed to delete recurring transaction");
              }
            },
          },
        ]
      );
    } else {
      // For regular transactions, show simple delete confirmation
      Alert.alert(
        "Delete Transaction",
        `Are you sure you want to delete "${transaction.description}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await removeTransaction(user.uid, transaction.id);
                await loadTransactions();
                Alert.alert("Success", "Transaction deleted successfully");
              } catch (error) {
                console.error("Error deleting transaction:", error);
                Alert.alert("Error", "Failed to delete transaction");
              }
            },
          },
        ]
      );
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const isRecurringTransaction = (transaction: any) => {
    return recurringTransactions.some(
      (recurring) =>
        recurring.name === transaction.description &&
        recurring.amount === transaction.amount &&
        recurring.type === transaction.type &&
        recurring.isActive
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "700", color: colors.text }}>
            Transactions
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("AddTransaction")}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="add"
              size={20}
              color={colors.buttonText}
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: colors.buttonText, fontWeight: "600" }}>
              Add
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            shadowColor: colors.shadow,
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              marginBottom: 12,
              color: colors.text,
            }}
          >
            This Month
          </Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                Income
              </Text>
              <Text
                style={{
                  color: colors.success,
                  fontSize: 18,
                  fontWeight: "600",
                }}
              >
                $
                {transactions
                  .filter((t) => t.type === "income")
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(2)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                Expenses
              </Text>
              <Text
                style={{ color: colors.error, fontSize: 18, fontWeight: "600" }}
              >
                $
                {transactions
                  .filter((t) => t.type === "expense")
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Transactions List */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            shadowColor: colors.shadow,
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              marginBottom: 12,
              color: colors.text,
            }}
          >
            Recent Transactions
          </Text>

          {loading ? (
            <Text
              style={{
                color: colors.textSecondary,
                textAlign: "center",
                padding: 20,
              }}
            >
              Loading transactions...
            </Text>
          ) : transactions.length === 0 ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <Ionicons
                name="receipt-outline"
                size={48}
                color={colors.textTertiary}
              />
              <Text
                style={{
                  color: colors.textSecondary,
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                No transactions yet
              </Text>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                Add your first transaction to get started
              </Text>
            </View>
          ) : (
            transactions
              .sort((a, b) => b.date - a.date)
              .map((transaction) => (
                <View
                  key={transaction.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "500",
                        color: colors.text,
                      }}
                    >
                      {transaction.description}
                    </Text>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text
                        style={{ color: colors.textSecondary, fontSize: 14 }}
                      >
                        {transaction.category} • {formatDate(transaction.date)}
                      </Text>
                      {isRecurringTransaction(transaction) && (
                        <Ionicons
                          name="repeat"
                          size={12}
                          color={colors.primary}
                          style={{ marginLeft: 8 }}
                        />
                      )}
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontWeight: "600",
                        fontSize: 16,
                        color:
                          transaction.type === "income"
                            ? colors.success
                            : colors.error,
                      }}
                    >
                      {transaction.type === "income" ? "+" : "-"}$
                      {transaction.amount.toFixed(2)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteTransaction(transaction)}
                      style={{ marginTop: 4 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
