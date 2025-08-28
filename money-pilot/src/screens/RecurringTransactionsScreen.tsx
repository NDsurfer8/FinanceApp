import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import {
  getUserRecurringTransactions,
  deleteRecurringTransaction,
  RecurringTransaction,
} from "../services/userData";
import {
  createRecurringTransaction,
  updateRecurringTransaction,
} from "../services/transactionService";

interface RecurringTransactionsScreenProps {
  navigation: any;
  route: any;
}

export const RecurringTransactionsScreen: React.FC<
  RecurringTransactionsScreenProps
> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { selectedMonth } = route.params || {};

  // Use selectedMonth if provided, otherwise use today's date
  const getInitialDate = () => {
    if (selectedMonth) {
      const date = new Date(selectedMonth);
      return date.toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  };

  const [recurringTransactions, setRecurringTransactions] = useState<
    RecurringTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<RecurringTransaction | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [editingAmount, setEditingAmount] = useState("");
  const [formData, setFormData] = useState({
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
    startDate: getInitialDate(),
    endDate: "",
    isActive: true,
  });

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

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      type: "expense",
      category: "",
      frequency: "monthly",
      startDate: getInitialDate(),
      endDate: "",
      isActive: true,
    });
    setEditingTransaction(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (transaction: RecurringTransaction) => {
    setEditingTransaction(transaction);
    setFormData({
      name: transaction.name,
      amount: transaction.amount.toString(),
      type: transaction.type,
      category: transaction.category,
      frequency: transaction.frequency,
      startDate: new Date(transaction.startDate).toISOString().split("T")[0],
      endDate: transaction.endDate
        ? new Date(transaction.endDate).toISOString().split("T")[0]
        : "",
      isActive: transaction.isActive,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!user) return;

    if (
      !formData.name.trim() ||
      !formData.amount.trim() ||
      !formData.category.trim()
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    try {
      console.log("Form data startDate:", formData.startDate);
      console.log(
        "Parsed startDate timestamp:",
        new Date(formData.startDate).getTime()
      );
      console.log(
        "Parsed startDate ISO:",
        new Date(formData.startDate).toISOString()
      );

      const recurringTransaction: RecurringTransaction = {
        name: formData.name.trim(),
        amount: amount,
        type: formData.type,
        category: formData.category.trim(),
        frequency: formData.frequency,
        startDate: new Date(formData.startDate).getTime(),
        endDate:
          formData.endDate && formData.endDate.trim() !== ""
            ? new Date(formData.endDate).getTime()
            : undefined,
        isActive: formData.isActive,
        userId: user.uid,
        createdAt: editingTransaction?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };

      if (editingTransaction?.id) {
        await updateRecurringTransaction({
          ...recurringTransaction,
          id: editingTransaction.id,
        });
        Alert.alert("Success", "Recurring transaction updated successfully!");
      } else {
        await createRecurringTransaction(recurringTransaction);
        Alert.alert("Success", "Recurring transaction created successfully!");
      }

      setModalVisible(false);
      resetForm();
      await loadRecurringTransactions();

      // Force navigation back to trigger refresh
      navigation.goBack();
    } catch (error) {
      console.error("Error saving recurring transaction:", error);
      Alert.alert("Error", "Failed to save recurring transaction");
    }
  };

  const handleDelete = async (transaction: RecurringTransaction) => {
    if (!transaction.id) return;

    setDeleteLoading(transaction.id);

    try {
      Alert.alert(
        "Delete Recurring Transaction",
        `Are you sure you want to delete "${transaction.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await deleteRecurringTransaction(transaction.id!);
                Alert.alert(
                  "Success",
                  "Recurring transaction deleted successfully!"
                );
                await loadRecurringTransactions();
              } catch (error) {
                console.error("Error deleting recurring transaction:", error);
                Alert.alert("Error", "Failed to delete recurring transaction");
              } finally {
                setDeleteLoading(null);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in delete confirmation:", error);
      setDeleteLoading(null);
    }
  };

  const handleEditTransaction = (transaction: RecurringTransaction) => {
    setEditingTransactionId(transaction.id || null);
    setEditingAmount(transaction.amount.toString());
  };

  const handleSaveTransactionEdit = async () => {
    if (!user || !editingTransactionId) return;

    const newAmount = parseFloat(editingAmount);
    if (isNaN(newAmount) || newAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    try {
      // Find the transaction to update
      const transactionToUpdate = recurringTransactions.find(
        (t) => t.id === editingTransactionId
      );
      if (!transactionToUpdate) {
        Alert.alert("Error", "Transaction not found");
        return;
      }

      const updatedTransaction = {
        ...transactionToUpdate,
        amount: newAmount,
        updatedAt: Date.now(),
      };

      // Optimistic update - update UI immediately
      const updatedTransactions = recurringTransactions.map((t) =>
        t.id === editingTransactionId ? updatedTransaction : t
      );
      setRecurringTransactions(updatedTransactions);

      // Save to database in background
      await updateRecurringTransaction(updatedTransaction);

      // Reset editing state
      setEditingTransactionId(null);
      setEditingAmount("");

      Alert.alert("Success", "Transaction amount updated successfully!");
    } catch (error) {
      console.error("Error updating transaction:", error);
      Alert.alert("Error", "Failed to update transaction amount");

      // Revert optimistic update on error
      await loadRecurringTransactions();
    }
  };

  const handleCancelEdit = () => {
    setEditingTransactionId(null);
    setEditingAmount("");
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recurring Transactions</Text>
          <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Active</Text>
            <Text style={styles.summaryValue}>
              {recurringTransactions.filter((t) => t.isActive).length}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={styles.summaryValue}>
              {
                recurringTransactions.filter(
                  (t) => t.type === "income" && t.isActive
                ).length
              }
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={styles.summaryValue}>
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
            <Ionicons name="repeat" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Recurring Transactions</Text>
            <Text style={styles.emptySubtitle}>
              Set up recurring income and expenses to automate your financial
              tracking
            </Text>
            <TouchableOpacity onPress={openAddModal} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Add Your First One</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.transactionsContainer}>
            {recurringTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionInfo}>
                    <View style={styles.categoryIcon}>
                      <Ionicons
                        name={getCategoryIcon(transaction.category) as any}
                        size={20}
                        color={
                          transaction.type === "income" ? "#16a34a" : "#dc2626"
                        }
                      />
                    </View>
                    <View style={styles.transactionDetails}>
                      <Text style={styles.transactionName}>
                        {transaction.name}
                      </Text>
                      <Text style={styles.transactionCategory}>
                        {transaction.category}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionAmount}>
                    {editingTransactionId === transaction.id ? (
                      <View style={{ alignItems: "flex-end" }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <TextInput
                            style={{
                              fontSize: 16,
                              fontWeight: "700",
                              color:
                                transaction.type === "income"
                                  ? "#16a34a"
                                  : "#dc2626",
                              marginRight: 8,
                              borderBottomWidth: 1,
                              borderBottomColor:
                                transaction.type === "income"
                                  ? "#16a34a"
                                  : "#dc2626",
                              paddingHorizontal: 4,
                              minWidth: 80,
                              textAlign: "right",
                            }}
                            value={editingAmount}
                            onChangeText={setEditingAmount}
                            keyboardType="numeric"
                            autoFocus
                          />
                          <TouchableOpacity
                            onPress={handleSaveTransactionEdit}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              backgroundColor: "#dcfce7",
                              marginRight: 4,
                            }}
                          >
                            <Ionicons
                              name="checkmark"
                              size={14}
                              color="#16a34a"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleCancelEdit}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              backgroundColor: "#fee2e2",
                            }}
                          >
                            <Ionicons name="close" size={14} color="#dc2626" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.frequencyText}>
                          {getFrequencyLabel(transaction.frequency)}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={() => handleEditTransaction(transaction)}
                        >
                          <Text
                            style={[
                              styles.amountText,
                              {
                                color:
                                  transaction.type === "income"
                                    ? "#16a34a"
                                    : "#dc2626",
                              },
                            ]}
                          >
                            {transaction.type === "income" ? "+" : "-"}
                            {formatCurrency(transaction.amount)}
                          </Text>
                        </TouchableOpacity>
                        <Text style={styles.frequencyText}>
                          {getFrequencyLabel(transaction.frequency)}
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.transactionFooter}>
                  <View style={styles.statusContainer}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: transaction.isActive
                            ? "#16a34a"
                            : "#6b7280",
                        },
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {transaction.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      onPress={() => openEditModal(transaction)}
                      style={styles.editButton}
                    >
                      <Ionicons name="pencil" size={16} color="#6366f1" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(transaction)}
                      style={[
                        styles.deleteButton,
                        { opacity: deleteLoading === transaction.id ? 0.6 : 1 },
                      ]}
                      disabled={deleteLoading === transaction.id}
                    >
                      {deleteLoading === transaction.id ? (
                        <ActivityIndicator size="small" color="#dc2626" />
                      ) : (
                        <Ionicons name="trash" size={16} color="#dc2626" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingTransaction
                ? "Edit Recurring Transaction"
                : "Add Recurring Transaction"}
            </Text>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.modalSaveButton, { opacity: loading ? 0.6 : 1 }]}
              disabled={loading}
            >
              {loading ? (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <ActivityIndicator
                    size="small"
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.modalSaveText}>Saving...</Text>
                </View>
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Transaction Type */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Type</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.type === "income" && styles.typeButtonActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, type: "income", category: "" })
                  }
                >
                  <Ionicons
                    name="trending-up"
                    size={20}
                    color={formData.type === "income" ? "#fff" : "#16a34a"}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.type === "income" && styles.typeButtonTextActive,
                    ]}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.type === "expense" && styles.typeButtonActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, type: "expense", category: "" })
                  }
                >
                  <Ionicons
                    name="trending-down"
                    size={20}
                    color={formData.type === "expense" ? "#fff" : "#dc2626"}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.type === "expense" &&
                        styles.typeButtonTextActive,
                    ]}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Name */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Name *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholder="e.g., Salary, Rent, Netflix"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Amount */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Amount *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.amount}
                onChangeText={(text) =>
                  setFormData({ ...formData, amount: text })
                }
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>

            {/* Category */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Category *</Text>
              <View style={styles.categorySelector}>
                {getCategories(formData.type).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      formData.category === category &&
                        styles.categoryButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, category })}
                  >
                    <Ionicons
                      name={getCategoryIcon(category) as any}
                      size={16}
                      color={
                        formData.category === category ? "#fff" : "#6b7280"
                      }
                    />
                    <Text
                      style={[
                        styles.categoryButtonText,
                        formData.category === category &&
                          styles.categoryButtonTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Frequency */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Frequency</Text>
              <View style={styles.frequencySelector}>
                {["weekly", "biweekly", "monthly", "quarterly", "yearly"].map(
                  (freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyButton,
                        formData.frequency === freq &&
                          styles.frequencyButtonActive,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, frequency: freq as any })
                      }
                    >
                      <Text
                        style={[
                          styles.frequencyButtonText,
                          formData.frequency === freq &&
                            styles.frequencyButtonTextActive,
                        ]}
                      >
                        {getFrequencyLabel(freq)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            {/* Start Date */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Start Date</Text>
              <TextInput
                style={styles.textInput}
                value={formData.startDate}
                onChangeText={(text) =>
                  setFormData({ ...formData, startDate: text })
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* End Date (Optional) */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>End Date (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.endDate}
                onChangeText={(text) =>
                  setFormData({ ...formData, endDate: text })
                }
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* Active Status */}
            <View style={styles.formSection}>
              <View style={styles.switchContainer}>
                <Text style={styles.formLabel}>Active</Text>
                <TouchableOpacity
                  style={[
                    styles.switch,
                    formData.isActive && styles.switchActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, isActive: !formData.isActive })
                  }
                >
                  <View
                    style={[
                      styles.switchThumb,
                      formData.isActive && styles.switchThumbActive,
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
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
    color: "#1f2937",
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
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
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
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyButton: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  transactionsContainer: {
    gap: 16,
  },
  transactionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
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
    backgroundColor: "#f3f4f6",
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
    color: "#1f2937",
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 14,
    color: "#6b7280",
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
    color: "#6b7280",
  },
  transactionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
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
    color: "#6b7280",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6366f1",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1f2937",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  typeSelector: {
    flexDirection: "row",
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    gap: 8,
  },
  typeButtonActive: {
    borderColor: "#6366f1",
    backgroundColor: "#6366f1",
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  typeButtonTextActive: {
    color: "#fff",
  },
  frequencySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  frequencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  frequencyButtonActive: {
    borderColor: "#6366f1",
    backgroundColor: "#6366f1",
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  frequencyButtonTextActive: {
    color: "#fff",
  },
  categorySelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
    gap: 6,
  },
  categoryButtonActive: {
    borderColor: "#6366f1",
    backgroundColor: "#6366f1",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  categoryButtonTextActive: {
    color: "#fff",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switch: {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
    padding: 2,
  },
  switchActive: {
    backgroundColor: "#6366f1",
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  switchThumbActive: {
    transform: [{ translateX: 24 }],
  },
});
