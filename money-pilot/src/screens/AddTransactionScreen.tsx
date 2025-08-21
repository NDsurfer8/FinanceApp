import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import { useZeroLoading } from "../hooks/useZeroLoading";
import {
  saveTransaction,
  updateTransaction,
  removeTransaction,
} from "../services/userData";
import { billReminderService } from "../services/billReminders";
import { useTransactionLimits } from "../hooks/useTransactionLimits";
import { usePaywall } from "../hooks/usePaywall";

interface AddTransactionScreenProps {
  navigation: any;
  route: any;
}

interface RouteParams {
  type?: "income" | "expense";
  selectedMonth?: string;
  editMode?: boolean;
  transaction?: any;
  fromBankSuggestion?: boolean;
  description?: string;
  amount?: string;
  category?: string;
  isRecurring?: boolean;
  frequency?: string;
}

export const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { transactions, updateDataOptimistically } = useZeroLoading();
  const [loading, setLoading] = useState(false);
  const {
    type: initialType,
    selectedMonth,
    editMode,
    transaction,
  } = (route.params as RouteParams) || {};
  const {
    canAddTransaction,
    canAddIncomeSource,
    getTransactionLimitInfo,
    getIncomeSourceLimitInfo,
  } = useTransactionLimits();
  const { presentPaywall } = usePaywall();

  // Use selectedMonth if provided, otherwise use today's date
  const getInitialDate = () => {
    if (selectedMonth) {
      const date = new Date(selectedMonth);
      return date.toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  };

  const [formData, setFormData] = useState({
    description: editMode ? transaction?.description || "" : "",
    amount: editMode ? transaction?.amount?.toString() || "" : "",
    category: editMode ? transaction?.category || "" : "",
    type: editMode
      ? transaction?.type || initialType || "expense"
      : initialType || "expense",
    date: editMode ? transaction?.date || getInitialDate() : getInitialDate(),
    isRecurring: editMode ? transaction?.isRecurring || false : false,
    frequency: editMode
      ? transaction?.frequency || "monthly"
      : ("monthly" as
          | "weekly"
          | "biweekly"
          | "monthly"
          | "quarterly"
          | "yearly"),
    endDate: editMode ? transaction?.endDate || "" : "",
  });

  // Handle route params for bank suggestions
  React.useEffect(() => {
    // Handle pre-filled data from bank suggestions
    if (route.params?.fromBankSuggestion) {
      setFormData((prev) => ({
        ...prev,
        description: route.params.description || prev.description,
        amount: route.params.amount || prev.amount,
        category: route.params.category || prev.category,
        type: route.params.type || prev.type,
        isRecurring: route.params.isRecurring || prev.isRecurring,
        frequency: route.params.frequency || prev.frequency,
      }));
    }
  }, [route.params]);

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

  const categories = getCategories(formData.type);

  const handleSave = async () => {
    if (!formData.description || !formData.amount || !formData.category) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to save transactions");
      return;
    }

    // Check transaction limits (only for new transactions, not edits)
    if (!editMode) {
      if (formData.type === "income") {
        if (!canAddIncomeSource()) {
          const limitInfo = getIncomeSourceLimitInfo();
          // Only show upgrade alert if not unlimited (i.e., not subscribed)
          if (!limitInfo.isUnlimited) {
            Alert.alert(
              "Income Source Limit Reached",
              `You've reached your limit of ${limitInfo.limit} income source${
                limitInfo.limit !== 1 ? "s" : ""
              } on the free plan.\n\nUpgrade to Premium for unlimited income sources!`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Upgrade to Premium", onPress: presentPaywall },
              ]
            );
          }
          return;
        }
      } else {
        if (!canAddTransaction()) {
          const limitInfo = getTransactionLimitInfo();
          // Only show upgrade alert if not unlimited (i.e., not subscribed)
          if (!limitInfo.isUnlimited) {
            Alert.alert(
              "Transaction Limit Reached",
              `You've reached your limit of ${limitInfo.limit} transactions on the free plan.\n\nUpgrade to Premium for unlimited transactions!`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Upgrade to Premium", onPress: presentPaywall },
              ]
            );
          }
          return;
        }
      }
    }

    try {
      setLoading(true);

      if (editMode && transaction) {
        // Update existing transaction
        const updatedTransaction = {
          ...transaction,
          description: formData.description,
          amount: parseFloat(formData.amount),
          category: formData.category,
          type: formData.type as "income" | "expense",
          date: new Date(formData.date).getTime(),
          updatedAt: Date.now(),
        };

        // Optimistic update
        const updatedTransactions = transactions.map((t) =>
          t.id === transaction.id ? updatedTransaction : t
        );
        updateDataOptimistically({ transactions: updatedTransactions });

        // Update in database
        await updateTransaction(updatedTransaction);

        Alert.alert("Success", "Transaction updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else if (formData.isRecurring) {
        // Create recurring transaction
        const { createRecurringTransaction } = await import(
          "../services/transactionService"
        );

        const recurringTransaction = {
          name: formData.description,
          amount: parseFloat(formData.amount),
          type: formData.type as "income" | "expense",
          category: formData.category,
          frequency: formData.frequency,
          startDate: new Date(formData.date).getTime(),
          endDate:
            formData.endDate && formData.endDate.trim() !== ""
              ? new Date(formData.endDate).getTime()
              : undefined,
          isActive: true,
          userId: user.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await createRecurringTransaction(recurringTransaction);
        Alert.alert("Success", "Recurring transaction created successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        // Create regular transaction
        const newTransaction = {
          id: Date.now().toString(),
          description: formData.description,
          amount: parseFloat(formData.amount),
          category: formData.category,
          type: formData.type as "income" | "expense",
          date: new Date(formData.date).getTime(), // Convert to timestamp
          userId: user.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Optimistic update - add to UI immediately
        const tempTransaction = { ...newTransaction, id: `temp-${Date.now()}` };
        const updatedTransactions = [...transactions, tempTransaction];
        updateDataOptimistically({ transactions: updatedTransactions });

        // Save to database in background
        const savedTransaction = await saveTransaction(newTransaction);

        // Update with real ID from database
        const finalTransactions = updatedTransactions.map((t) =>
          t.id === tempTransaction.id ? { ...t, id: savedTransaction } : t
        );
        updateDataOptimistically({ transactions: finalTransactions });

        // Refresh bill reminders when a new transaction is added
        if (user) {
          await billReminderService.scheduleAllBillReminders(user.uid);
        }

        Alert.alert("Success", "Transaction saved successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
      Alert.alert("Error", "Failed to save transaction. Please try again.");

      // Revert optimistic update on error
      if (!editMode && !formData.isRecurring) {
        const revertedTransactions = transactions.filter(
          (t) => !t.id.startsWith("temp-")
        );
        updateDataOptimistically({ transactions: revertedTransactions });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !editMode || !transaction) {
      Alert.alert("Error", "Cannot delete transaction");
      return;
    }

    Alert.alert(
      "Delete Confirmation",
      "Are you sure you want to delete this transaction? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Optimistic update
              const updatedTransactions = transactions.filter(
                (t) => t.id !== transaction.id
              );
              updateDataOptimistically({ transactions: updatedTransactions });

              // Delete from database
              await removeTransaction(user.uid, transaction.id);

              Alert.alert("Success", "Transaction deleted successfully!", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error("Error deleting transaction:", error);
              Alert.alert(
                "Error",
                "Failed to delete transaction. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 20, fontWeight: "600", color: colors.text }}
            >
              {editMode ? "Edit" : "Add"}{" "}
              {formData.type === "income" ? "Income" : "Expense"}
            </Text>
          </View>

          {/* Limit Indicator - Only show if not unlimited */}
          {formData.type === "income"
            ? !getIncomeSourceLimitInfo().isUnlimited && (
                <View
                  style={{
                    backgroundColor: colors.warningLight,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color={colors.warning}
                    />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: colors.warning,
                        fontSize: 14,
                      }}
                    >
                      {`${getIncomeSourceLimitInfo().current}/${
                        getIncomeSourceLimitInfo().limit
                      } income sources used`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={presentPaywall}>
                    <Text
                      style={{
                        color: colors.warning,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      Upgrade
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            : !getTransactionLimitInfo().isUnlimited && (
                <View
                  style={{
                    backgroundColor: colors.warningLight,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color={colors.warning}
                    />
                    <Text
                      style={{
                        marginLeft: 8,
                        color: colors.warning,
                        fontSize: 14,
                      }}
                    >
                      {`${getTransactionLimitInfo().current}/${
                        getTransactionLimitInfo().limit
                      } transactions used`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={presentPaywall}>
                    <Text
                      style={{
                        color: colors.warning,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      Upgrade
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

          {/* Form */}
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
            {/* Transaction Type */}
            <View style={{ marginBottom: 20 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  marginBottom: 12,
                  color: colors.text,
                }}
              >
                Transaction Type
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor:
                      formData.type === "expense"
                        ? colors.error
                        : colors.surfaceSecondary,
                    alignItems: "center",
                  }}
                  onPress={() =>
                    setFormData({ ...formData, type: "expense", category: "" })
                  }
                >
                  <Text
                    style={{
                      color:
                        formData.type === "expense"
                          ? colors.buttonText
                          : colors.textSecondary,
                      fontWeight: "600",
                    }}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor:
                      formData.type === "income"
                        ? colors.success
                        : colors.surfaceSecondary,
                    alignItems: "center",
                  }}
                  onPress={() =>
                    setFormData({ ...formData, type: "income", category: "" })
                  }
                >
                  <Text
                    style={{
                      color:
                        formData.type === "income"
                          ? colors.buttonText
                          : colors.textSecondary,
                      fontWeight: "600",
                    }}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                Amount
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.text,
                }}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={formData.amount}
                onChangeText={(text) =>
                  setFormData({ ...formData, amount: text })
                }
                keyboardType="decimal-pad"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Category */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                Category
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor:
                        formData.category === category
                          ? colors.primary
                          : colors.surfaceSecondary,
                      marginRight: 8,
                      minWidth: 80,
                      alignItems: "center",
                    }}
                    onPress={() => setFormData({ ...formData, category })}
                  >
                    <Text
                      style={{
                        color:
                          formData.category === category
                            ? colors.buttonText
                            : colors.text,
                        fontSize: 14,
                        fontWeight: "500",
                      }}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Description */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                Description
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  minHeight: 80,
                  textAlignVertical: "top",
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.text,
                }}
                placeholder="Enter description..."
                placeholderTextColor={colors.textSecondary}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                autoCorrect={false}
                multiline
                returnKeyType="done"
              />
            </View>

            {/* Date */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                {formData.type === "expense"
                  ? "Due Date"
                  : formData.type === "income"
                  ? "Payment Date"
                  : "Date"}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.text,
                }}
                placeholder={
                  formData.type === "expense"
                    ? "Due Date (YYYY-MM-DD)"
                    : formData.type === "income"
                    ? "Payment Date (YYYY-MM-DD)"
                    : "Date (YYYY-MM-DD)"
                }
                placeholderTextColor={colors.textSecondary}
                value={formData.date}
                onChangeText={(text) =>
                  setFormData({ ...formData, date: text })
                }
                autoCorrect={false}
                returnKeyType="done"
              />
            </View>

            {/* Recurring Option */}
            <View style={{ marginBottom: 20 }}>
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  backgroundColor: formData.isRecurring
                    ? colors.primary
                    : colors.background,
                  borderWidth: 1,
                  borderColor: formData.isRecurring
                    ? colors.primary
                    : colors.border,
                }}
                onPress={() =>
                  setFormData({
                    ...formData,
                    isRecurring: !formData.isRecurring,
                  })
                }
              >
                <Ionicons
                  name="repeat"
                  size={18}
                  color={
                    formData.isRecurring
                      ? colors.buttonText
                      : colors.textSecondary
                  }
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: formData.isRecurring
                      ? colors.buttonText
                      : colors.text,
                  }}
                >
                  {formData.isRecurring
                    ? "Recurring Transaction"
                    : "Make Recurring"}
                </Text>
              </TouchableOpacity>

              {formData.isRecurring && (
                <View
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  {/* Frequency Dropdown */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "500",
                        marginBottom: 4,
                        color: colors.textSecondary,
                      }}
                    >
                      Frequency
                    </Text>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                    >
                      {["monthly"].map((freq) => (
                        <TouchableOpacity
                          key={freq}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4,
                            backgroundColor:
                              formData.frequency === freq
                                ? colors.primary
                                : colors.surfaceSecondary,
                          }}
                          onPress={() =>
                            setFormData({ ...formData, frequency: freq as any })
                          }
                        >
                          <Text
                            style={{
                              color:
                                formData.frequency === freq
                                  ? colors.buttonText
                                  : colors.text,
                              fontSize: 12,
                              fontWeight: "500",
                            }}
                          >
                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* End Date (Optional) */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "500",
                        marginBottom: 4,
                        color: colors.textSecondary,
                      }}
                    >
                      End Date (Optional)
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 6,
                        padding: 8,
                        fontSize: 14,
                        backgroundColor: colors.surfaceSecondary,
                        color: colors.text,
                      }}
                      placeholder="YYYY-MM-DD (leave empty for no end date)"
                      placeholderTextColor={colors.textSecondary}
                      value={formData.endDate}
                      onChangeText={(text) =>
                        setFormData({ ...formData, endDate: text })
                      }
                      autoCorrect={false}
                      returnKeyType="done"
                    />
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginTop: 24,
            }}
            onPress={handleSave}
          >
            <Text
              style={{
                color: colors.buttonText,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {editMode
                ? "Update"
                : formData.isRecurring
                ? "Create Recurring"
                : "Save"}{" "}
              {formData.type === "income" ? "Income" : "Expense"}
            </Text>
          </TouchableOpacity>

          {/* Delete Button (only show in edit mode) */}
          {editMode && (
            <TouchableOpacity
              style={{
                backgroundColor: colors.error,
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
                marginTop: 12,
              }}
              onPress={handleDelete}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Delete {formData.type === "income" ? "Income" : "Expense"}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
