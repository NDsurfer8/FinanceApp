import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import {
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
  createRecurringTransaction,
  getRecurringTransactions,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  getProjectedTransactionsForMonth,
  generateTransactionsForMonth,
} from "../services/transactionService";
import { Transaction, RecurringTransaction } from "../services/userData";

export const TransactionCRUDExample: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<
    RecurringTransaction[]
  >([]);
  const [projectedTransactions, setProjectedTransactions] = useState<
    Transaction[]
  >([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Form states
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editingRecurring, setEditingRecurringTransaction] =
    useState<RecurringTransaction | null>(null);

  // Transaction form
  const [transactionForm, setTransactionForm] = useState({
    description: "",
    amount: "",
    type: "expense" as "income" | "expense",
    category: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Recurring transaction form
  const [recurringForm, setRecurringForm] = useState({
    name: "",
    amount: "",
    type: "expense" as "income" | "expense",
    category: "",
    frequency: "monthly" as
      | "weekly"
      | "biweekly"
      | "monthly"
      | "quarterly"
      | "yearly",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    isActive: true,
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [userTransactions, userRecurringTransactions] = await Promise.all([
        getTransactions(user.uid),
        getRecurringTransactions(user.uid),
      ]);

      setTransactions(userTransactions);
      setRecurringTransactions(userRecurringTransactions);

      // Load projected transactions for current month
      const { projected } = await getProjectedTransactionsForMonth(
        user.uid,
        selectedMonth
      );
      setProjectedTransactions(projected);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data");
    }
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      description: "",
      amount: "",
      type: "expense",
      category: "",
      date: new Date().toISOString().split("T")[0],
    });
    setEditingTransaction(null);
  };

  const resetRecurringForm = () => {
    setRecurringForm({
      name: "",
      amount: "",
      type: "expense",
      category: "",
      frequency: "monthly",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      isActive: true,
    });
    setEditingRecurringTransaction(null);
  };

  // ===== TRANSACTION CRUD OPERATIONS =====

  const handleCreateTransaction = async () => {
    if (!user) return;

    if (
      !transactionForm.description ||
      !transactionForm.amount ||
      !transactionForm.category
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      const newTransaction = {
        description: transactionForm.description,
        amount: parseFloat(transactionForm.amount),
        type: transactionForm.type,
        category: transactionForm.category,
        date: new Date(transactionForm.date).getTime(),
        userId: user.uid,
      };

      await createTransaction(newTransaction);
      Alert.alert("Success", "Transaction created successfully!");
      resetTransactionForm();
      setShowTransactionForm(false);
      loadData();
    } catch (error) {
      console.error("Error creating transaction:", error);
      Alert.alert("Error", "Failed to create transaction");
    }
  };

  const handleUpdateTransaction = async () => {
    if (!user || !editingTransaction) return;

    try {
      const updatedTransaction = {
        ...editingTransaction,
        description: transactionForm.description,
        amount: parseFloat(transactionForm.amount),
        type: transactionForm.type,
        category: transactionForm.category,
        date: new Date(transactionForm.date).getTime(),
      };

      await updateTransaction(updatedTransaction);
      Alert.alert("Success", "Transaction updated successfully!");
      resetTransactionForm();
      setShowTransactionForm(false);
      loadData();
    } catch (error) {
      console.error("Error updating transaction:", error);
      Alert.alert("Error", "Failed to update transaction");
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!user) return;

    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTransaction(user.uid, transactionId);
              Alert.alert("Success", "Transaction deleted successfully!");
              loadData();
            } catch (error) {
              console.error("Error deleting transaction:", error);
              Alert.alert("Error", "Failed to delete transaction");
            }
          },
        },
      ]
    );
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      description: transaction.description,
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      date: new Date(transaction.date).toISOString().split("T")[0],
    });
    setShowTransactionForm(true);
  };

  // ===== RECURRING TRANSACTION CRUD OPERATIONS =====

  const handleCreateRecurringTransaction = async () => {
    if (!user) return;

    if (
      !recurringForm.name ||
      !recurringForm.amount ||
      !recurringForm.category
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      const newRecurringTransaction = {
        name: recurringForm.name,
        amount: parseFloat(recurringForm.amount),
        type: recurringForm.type,
        category: recurringForm.category,
        frequency: recurringForm.frequency,
        startDate: new Date(recurringForm.startDate).getTime(),
        endDate: recurringForm.endDate
          ? new Date(recurringForm.endDate).getTime()
          : undefined,
        isActive: recurringForm.isActive,
        userId: user.uid,
      };

      await createRecurringTransaction(newRecurringTransaction);
      Alert.alert("Success", "Recurring transaction created successfully!");
      resetRecurringForm();
      setShowRecurringForm(false);
      loadData();
    } catch (error) {
      console.error("Error creating recurring transaction:", error);
      Alert.alert("Error", "Failed to create recurring transaction");
    }
  };

  const handleUpdateRecurringTransaction = async () => {
    if (!user || !editingRecurring) return;

    try {
      const updatedRecurringTransaction = {
        ...editingRecurring,
        name: recurringForm.name,
        amount: parseFloat(recurringForm.amount),
        type: recurringForm.type,
        category: recurringForm.category,
        frequency: recurringForm.frequency,
        startDate: new Date(recurringForm.startDate).getTime(),
        endDate: recurringForm.endDate
          ? new Date(recurringForm.endDate).getTime()
          : undefined,
        isActive: recurringForm.isActive,
      };

      await updateRecurringTransaction(updatedRecurringTransaction);
      Alert.alert("Success", "Recurring transaction updated successfully!");
      resetRecurringForm();
      setShowRecurringForm(false);
      loadData();
    } catch (error) {
      console.error("Error updating recurring transaction:", error);
      Alert.alert("Error", "Failed to update recurring transaction");
    }
  };

  const handleDeleteRecurringTransaction = async (
    recurringTransactionId: string
  ) => {
    Alert.alert(
      "Delete Recurring Transaction",
      "Are you sure you want to delete this recurring transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRecurringTransaction(recurringTransactionId);
              Alert.alert(
                "Success",
                "Recurring transaction deleted successfully!"
              );
              loadData();
            } catch (error) {
              console.error("Error deleting recurring transaction:", error);
              Alert.alert("Error", "Failed to delete recurring transaction");
            }
          },
        },
      ]
    );
  };

  const handleEditRecurringTransaction = (
    recurringTransaction: RecurringTransaction
  ) => {
    setEditingRecurringTransaction(recurringTransaction);
    setRecurringForm({
      name: recurringTransaction.name,
      amount: recurringTransaction.amount.toString(),
      type: recurringTransaction.type,
      category: recurringTransaction.category,
      frequency: recurringTransaction.frequency,
      startDate: new Date(recurringTransaction.startDate)
        .toISOString()
        .split("T")[0],
      endDate: recurringTransaction.endDate
        ? new Date(recurringTransaction.endDate).toISOString().split("T")[0]
        : "",
      isActive: recurringTransaction.isActive,
    });
    setShowRecurringForm(true);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const handleGenerateTransactionsForCurrentMonth = async () => {
    if (!user) return;

    try {
      await generateTransactionsForMonth(user.uid, new Date());
      Alert.alert("Success", "Transactions generated for current month!");
      loadData();
    } catch (error) {
      console.error("Error generating transactions:", error);
      Alert.alert("Error", "Failed to generate transactions");
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to use this feature</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Transaction CRUD Example</Text>

      {/* Transaction Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Regular Transactions</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetTransactionForm();
              setShowTransactionForm(true);
            }}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {transactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionName}>
                {transaction.description}
              </Text>
              <Text style={styles.transactionDetails}>
                {transaction.category} • {formatDate(transaction.date)}
              </Text>
            </View>
            <View style={styles.transactionActions}>
              <Text
                style={[
                  styles.transactionAmount,
                  {
                    color:
                      transaction.type === "income" ? "#16a34a" : "#dc2626",
                  },
                ]}
              >
                {formatCurrency(transaction.amount)}
              </Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEditTransaction(transaction)}
              >
                <Ionicons name="pencil" size={16} color="#6366f1" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteTransaction(transaction.id!)}
              >
                <Ionicons name="trash" size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Recurring Transaction Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recurring Transactions</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetRecurringForm();
              setShowRecurringForm(true);
            }}
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {recurringTransactions.map((recurringTransaction) => (
          <View key={recurringTransaction.id} style={styles.transactionItem}>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionName}>
                {recurringTransaction.name}
              </Text>
              <Text style={styles.transactionDetails}>
                {recurringTransaction.category} •{" "}
                {recurringTransaction.frequency}
              </Text>
            </View>
            <View style={styles.transactionActions}>
              <Text
                style={[
                  styles.transactionAmount,
                  {
                    color:
                      recurringTransaction.type === "income"
                        ? "#16a34a"
                        : "#dc2626",
                  },
                ]}
              >
                {formatCurrency(recurringTransaction.amount)}
              </Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() =>
                  handleEditRecurringTransaction(recurringTransaction)
                }
              >
                <Ionicons name="pencil" size={16} color="#6366f1" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() =>
                  handleDeleteRecurringTransaction(recurringTransaction.id!)
                }
              >
                <Ionicons name="trash" size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Projected Transactions Section */}
      {projectedTransactions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Projected Transactions (Next Month)
          </Text>
          {projectedTransactions.map((transaction) => (
            <View
              key={transaction.id}
              style={[styles.transactionItem, { opacity: 0.7 }]}
            >
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionName}>
                  {transaction.description}
                </Text>
                <Text style={styles.transactionDetails}>
                  {transaction.category} • {formatDate(transaction.date)}
                </Text>
              </View>
              <View style={styles.transactionActions}>
                <Text
                  style={[
                    styles.transactionAmount,
                    {
                      color:
                        transaction.type === "income" ? "#16a34a" : "#dc2626",
                    },
                  ]}
                >
                  {formatCurrency(transaction.amount)}
                </Text>
                <Ionicons name="time-outline" size={16} color="#6366f1" />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Generate Transactions Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Generate Transactions</Text>
        </View>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={handleGenerateTransactionsForCurrentMonth}
        >
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.generateButtonText}>
            Generate Current Month Transactions
          </Text>
        </TouchableOpacity>
        <Text style={styles.generateDescription}>
          This will create actual transactions for all active recurring
          transactions that should occur this month.
        </Text>
      </View>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTransaction ? "Edit Transaction" : "Create Transaction"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Description"
              value={transactionForm.description}
              onChangeText={(text) =>
                setTransactionForm({ ...transactionForm, description: text })
              }
            />

            <TextInput
              style={styles.input}
              placeholder="Amount"
              value={transactionForm.amount}
              onChangeText={(text) =>
                setTransactionForm({ ...transactionForm, amount: text })
              }
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Category"
              value={transactionForm.category}
              onChangeText={(text) =>
                setTransactionForm({ ...transactionForm, category: text })
              }
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowTransactionForm(false);
                  resetTransactionForm();
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={
                  editingTransaction
                    ? handleUpdateTransaction
                    : handleCreateTransaction
                }
              >
                <Text style={styles.buttonText}>
                  {editingTransaction ? "Update" : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Recurring Transaction Form Modal */}
      {showRecurringForm && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingRecurring
                ? "Edit Recurring Transaction"
                : "Create Recurring Transaction"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Name"
              value={recurringForm.name}
              onChangeText={(text) =>
                setRecurringForm({ ...recurringForm, name: text })
              }
            />

            <TextInput
              style={styles.input}
              placeholder="Amount"
              value={recurringForm.amount}
              onChangeText={(text) =>
                setRecurringForm({ ...recurringForm, amount: text })
              }
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Category"
              value={recurringForm.category}
              onChangeText={(text) =>
                setRecurringForm({ ...recurringForm, category: text })
              }
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowRecurringForm(false);
                  resetRecurringForm();
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={
                  editingRecurring
                    ? handleUpdateRecurringTransaction
                    : handleCreateRecurringTransaction
                }
              >
                <Text style={styles.buttonText}>
                  {editingRecurring ? "Update" : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  addButton: {
    backgroundColor: "#6366f1",
    padding: 8,
    borderRadius: 8,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  transactionDetails: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
  transactionActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  editButton: {
    padding: 4,
    marginRight: 4,
  },
  deleteButton: {
    padding: 4,
  },
  modal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: "#6b7280",
  },
  saveButton: {
    backgroundColor: "#6366f1",
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    color: "#dc2626",
    textAlign: "center",
    marginTop: 50,
  },
  generateButton: {
    backgroundColor: "#10b981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  generateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  generateDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    fontStyle: "italic",
  },
});
