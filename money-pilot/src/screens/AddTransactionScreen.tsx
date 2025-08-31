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
  ActivityIndicator,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";
import { StandardHeader } from "../components/StandardHeader";
import { useZeroLoading } from "../hooks/useZeroLoading";
import { useData } from "../contexts/DataContext";
import {
  saveTransaction,
  updateTransaction,
  removeTransaction,
} from "../services/userData";
import { billReminderService } from "../services/billReminders";
import { useTransactionLimits } from "../hooks/useTransactionLimits";
import { usePaywall } from "../hooks/usePaywall";
import { formatNumberWithCommas, removeCommas } from "../utils/formatNumber";
import { timestampToDateString } from "../utils/dateUtils";

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
  frequency?: "weekly" | "biweekly" | "monthly";
}

export const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();
  const { transactions, updateDataOptimistically } = useZeroLoading();
  const { refreshRecurringTransactions, refreshTransactions } = useData();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
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
      return new Date(selectedMonth).getTime();
    }
    return Date.now();
  };

  const [formData, setFormData] = useState({
    description: editMode ? transaction?.description || "" : "",
    amount: editMode ? transaction?.amount?.toString() || "" : "",
    category: editMode ? transaction?.category || "" : "",
    type: editMode
      ? transaction?.type || initialType || "expense"
      : initialType || "expense",
    date: editMode
      ? typeof transaction?.date === "number"
        ? transaction.date
        : new Date(transaction?.date || Date.now()).getTime()
      : new Date(getInitialDate()).getTime(),
    isRecurring: editMode
      ? transaction?.isRecurring || transaction?.recurringTransactionId || false
      : false,
    frequency: editMode
      ? transaction?.frequency || "monthly"
      : ("monthly" as "weekly" | "biweekly" | "monthly"),
    endDate: editMode
      ? transaction?.endDate && typeof transaction.endDate === "number"
        ? transaction.endDate
        : transaction?.endDate
        ? new Date(transaction.endDate).getTime()
        : undefined
      : undefined,
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
        date: route.params.date
          ? typeof route.params.date === "number"
            ? route.params.date
            : new Date(route.params.date).getTime()
          : prev.date, // Use the date from bank transaction
      }));

      // Note: Bank suggestions may have biweekly/weekly frequencies, but we'll convert to monthly
      // when saving to ensure consistent monthly display and calculations
    }
  }, [route.params]);

  // Ensure recurring status is set when transaction has recurringTransactionId
  React.useEffect(() => {
    if (editMode && transaction?.recurringTransactionId) {
      setFormData((prev) => ({
        ...prev,
        isRecurring: true,
      }));
    }
  }, [editMode, transaction?.recurringTransactionId]);

  // Fetch associated recurring transaction data when editing
  React.useEffect(() => {
    const fetchRecurringTransactionData = async () => {
      if (editMode && transaction?.recurringTransactionId && user) {
        try {
          const { getUserRecurringTransactions } = await import(
            "../services/userData"
          );
          const recurringTransactions = await getUserRecurringTransactions(
            user.uid
          );
          const associatedRecurringTransaction = recurringTransactions.find(
            (rt) => rt.id === transaction.recurringTransactionId
          );

          if (associatedRecurringTransaction) {
            console.log(
              "Found associated recurring transaction:",
              associatedRecurringTransaction
            );
            setFormData((prev) => ({
              ...prev,
              frequency: associatedRecurringTransaction.frequency,
              endDate: associatedRecurringTransaction.endDate || undefined,
            }));
          }
        } catch (error) {
          console.error(
            "Error fetching associated recurring transaction:",
            error
          );
        }
      }
    };

    fetchRecurringTransactionData();
  }, [editMode, transaction?.recurringTransactionId, user]);

  // Date picker handlers
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      const timestamp = selectedDate.getTime(); // Save as timestamp
      setFormData({ ...formData, date: timestamp });
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      const timestamp = selectedDate.getTime(); // Save as timestamp
      setFormData({ ...formData, endDate: timestamp });
    }
  };

  const handleDatePickerDone = () => {
    setShowDatePicker(false);
  };

  const handleEndDatePickerDone = () => {
    setShowEndDatePicker(false);
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const openEndDatePicker = () => {
    setShowEndDatePicker(true);
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
        "Business",
        "Other",
      ];
    }
  };

  const categories = getCategories(formData.type);

  // Calculate monthly equivalent amount based on frequency
  const calculateMonthlyAmount = (
    amount: string,
    frequency: string
  ): number => {
    const numAmount = parseFloat(amount) || 0;
    switch (frequency) {
      case "weekly":
        return numAmount * 4; // 4 weeks in a month
      case "biweekly":
        return numAmount * 2; // 2 bi-weekly periods in a month
      case "monthly":
        return numAmount; // No multiplication needed
      default:
        return numAmount;
    }
  };

  // Get the monthly equivalent amount for display
  const monthlyEquivalentAmount =
    formData.isRecurring && formData.amount
      ? calculateMonthlyAmount(formData.amount, formData.frequency)
      : 0;

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
    // TEMPORARILY DISABLED - Commented out subscription checks for transactions
    /*
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
    */

    try {
      setLoading(true);

      if (editMode && transaction) {
        // Check if user is trying to make a non-recurring transaction recurring
        if (
          formData.isRecurring &&
          !transaction.isRecurring &&
          !transaction.recurringTransactionId
        ) {
          // Create recurring transaction and delete the original
          const { createRecurringTransaction } = await import(
            "../services/transactionService"
          );

          // Calculate the monthly equivalent amount for recurring transactions
          const monthlyAmount = calculateMonthlyAmount(
            formData.amount,
            formData.frequency
          );

          const recurringTransaction = {
            name: formData.description,
            amount: monthlyAmount, // Save the monthly equivalent amount
            type: formData.type as "income" | "expense",
            category: formData.category,
            frequency: formData.frequency,
            startDate: new Date(formData.date).getTime(),
            endDate: formData.endDate ? formData.endDate : undefined,
            isActive: true,
            userId: user.uid,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          // Remove the original transaction from UI
          const updatedTransactions = transactions.filter(
            (t) => t.id !== transaction.id
          );
          updateDataOptimistically({ transactions: updatedTransactions });

          // Delete original transaction and create recurring one
          await removeTransaction(user.uid, transaction.id);
          // Pass the selected month to create a transaction for that month
          const selectedMonthDate = selectedMonth
            ? new Date(selectedMonth)
            : undefined;
          await createRecurringTransaction(
            recurringTransaction,
            selectedMonthDate
          );

          // Refresh DataContext to update other screens and ensure consistency
          await Promise.all([
            refreshTransactions(),
            refreshRecurringTransactions(),
          ]);

          Alert.alert(
            "Success",
            "Transaction converted to recurring successfully!",
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
        } else if (
          !formData.isRecurring &&
          (transaction.isRecurring || transaction.recurringTransactionId)
        ) {
          // Convert recurring transaction to regular transaction
          const newTransaction = {
            id: Date.now().toString(),
            description: formData.description,
            amount: parseFloat(removeCommas(formData.amount)),
            category: formData.category,
            type: formData.type as "income" | "expense",
            date: new Date(formData.date).getTime(),
            userId: user.uid,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          // Remove the recurring transaction from UI
          const updatedTransactions = transactions.filter(
            (t) => t.id !== transaction.id
          );
          updateDataOptimistically({ transactions: updatedTransactions });

          console.log("Converted recurring to regular - removed from UI");

          // Delete recurring transaction and create regular one
          const { deleteRecurringTransaction } = await import(
            "../services/transactionService"
          );

          // Use recurringTransactionId if available, otherwise use transaction.id
          const recurringTransactionId =
            transaction.recurringTransactionId || transaction.id;
          await deleteRecurringTransaction(recurringTransactionId);
          const savedTransaction = await saveTransaction(newTransaction);

          console.log(
            "Converted recurring to regular - created new transaction with ID:",
            savedTransaction
          );

          // Add the new transaction to UI
          const finalTransactions = [
            ...updatedTransactions,
            { ...newTransaction, id: savedTransaction },
          ];
          updateDataOptimistically({ transactions: finalTransactions });

          console.log(
            "Converted recurring to regular - added new transaction to UI"
          );

          // Only refresh recurring transactions to update limits, preserve optimistic transaction updates
          await refreshRecurringTransactions();

          console.log(
            "Converted recurring to regular - refreshed recurring transactions only"
          );

          Alert.alert(
            "Success",
            "Recurring transaction converted to regular transaction!",
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
        } else if (
          formData.isRecurring &&
          (transaction.isRecurring || transaction.recurringTransactionId)
        ) {
          // Update existing recurring transaction
          const { updateRecurringTransaction } = await import(
            "../services/transactionService"
          );

          // Get the recurring transaction ID
          const recurringTransactionId =
            transaction.recurringTransactionId || transaction.id;

          // Get the current recurring transaction to update it
          const { getUserRecurringTransactions } = await import(
            "../services/userData"
          );
          const recurringTransactions = await getUserRecurringTransactions(
            user.uid
          );
          const currentRecurringTransaction = recurringTransactions.find(
            (rt) => rt.id === recurringTransactionId
          );

          if (!currentRecurringTransaction) {
            Alert.alert("Error", "Recurring transaction not found");
            return;
          }

          // Calculate the monthly equivalent amount for recurring transactions
          const monthlyAmount = calculateMonthlyAmount(
            formData.amount,
            formData.frequency
          );

          // For bank suggestions, always save as monthly frequency to ensure consistent display
          const finalFrequency = route.params?.fromBankSuggestion
            ? "monthly"
            : formData.frequency;

          // Update the recurring transaction
          const updatedRecurringTransaction = {
            ...currentRecurringTransaction,
            name: formData.description,
            amount: monthlyAmount, // Save the monthly equivalent amount
            type: formData.type as "income" | "expense",
            category: formData.category,
            frequency: finalFrequency, // Use monthly for bank suggestions
            startDate: new Date(formData.date).getTime(),
            endDate: formData.endDate ? formData.endDate : undefined,
            updatedAt: Date.now(),
          };

          await updateRecurringTransaction(updatedRecurringTransaction);

          // Optimistic update - update the transaction to reflect the new recurring transaction ID
          const updatedTransactions = transactions.map((t) => {
            if (t.id === transaction.id) {
              return {
                ...t,
                description: formData.description,
                amount: monthlyAmount, // Show the monthly equivalent amount
                category: formData.category,
                type: formData.type as "income" | "expense",
                date: new Date(formData.date).getTime(),
                recurringTransactionId: recurringTransactionId, // Keep the recurring transaction ID
                updatedAt: Date.now(),
              };
            }
            return t;
          });
          updateDataOptimistically({ transactions: updatedTransactions });

          // Refresh DataContext to update both transactions and recurring transactions
          await Promise.all([
            refreshTransactions(),
            refreshRecurringTransactions(),
          ]);

          Alert.alert(
            "Success",
            "Recurring transaction updated successfully!",
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
        } else {
          // Regular update (no change in recurring status)
          const updatedTransaction = {
            ...transaction,
            description: formData.description,
            amount: parseFloat(removeCommas(formData.amount)),
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
        }
      } else if (formData.isRecurring) {
        // Create recurring transaction
        const { createRecurringTransaction } = await import(
          "../services/transactionService"
        );

        // Calculate the monthly equivalent amount for recurring transactions
        const monthlyAmount = calculateMonthlyAmount(
          formData.amount,
          formData.frequency
        );

        // For bank suggestions, always save as monthly frequency to ensure consistent display
        const finalFrequency = route.params?.fromBankSuggestion
          ? "monthly"
          : formData.frequency;

        const recurringTransaction = {
          name: formData.description,
          amount: monthlyAmount, // Save the monthly equivalent amount
          type: formData.type as "income" | "expense",
          category: formData.category,
          frequency: finalFrequency, // Use monthly for bank suggestions
          startDate: new Date(formData.date).getTime(),
          endDate: formData.endDate ? formData.endDate : undefined,
          isActive: true,
          userId: user.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Pass the selected month to create a transaction for that month
        const selectedMonthDate = selectedMonth
          ? new Date(selectedMonth)
          : undefined;
        await createRecurringTransaction(
          recurringTransaction,
          selectedMonthDate
        );

        // Refresh both to ensure the newly created transaction appears
        await Promise.all([
          refreshTransactions(),
          refreshRecurringTransactions(),
        ]);

        console.log("Recurring transaction created, refreshing DataContext...");
        console.log("Refreshed transactions and recurring transactions");

        Alert.alert("Success", "Recurring transaction created successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        // Create regular transaction
        const newTransaction = {
          id: Date.now().toString(),
          description: formData.description,
          amount: parseFloat(removeCommas(formData.amount)),
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

    setDeleteLoading(true);

    try {
      // Check if this is a recurring transaction
      const isRecurringTransaction =
        transaction.isRecurring || transaction.recurringTransactionId;

      if (isRecurringTransaction) {
        // Show confirmation for deleting recurring transaction
        Alert.alert(
          "Delete Recurring Transaction",
          "This will delete the recurring transaction and all future occurrences. This action cannot be undone.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                setDeleteLoading(false);
              },
            },
            {
              text: "Delete Recurring & All Future",
              style: "destructive",
              onPress: async () => {
                try {
                  // Optimistic update - remove all related transactions
                  const recurringTransactionId =
                    transaction.recurringTransactionId || transaction.id;
                  const updatedTransactions = transactions.filter(
                    (t) =>
                      t.recurringTransactionId !== recurringTransactionId &&
                      t.id !== transaction.id
                  );
                  updateDataOptimistically({
                    transactions: updatedTransactions,
                  });

                  // Delete the recurring transaction and all its generated transactions
                  const { deleteRecurringTransaction } = await import(
                    "../services/transactionService"
                  );
                  await deleteRecurringTransaction(recurringTransactionId);

                  // Refresh DataContext to update transaction limits and ensure consistency
                  await Promise.all([
                    refreshTransactions(),
                    refreshRecurringTransactions(),
                  ]);

                  Alert.alert(
                    "Success",
                    "Recurring transaction and all future occurrences deleted!",
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                  );
                } catch (error) {
                  console.error("Error deleting recurring transaction:", error);
                  Alert.alert(
                    "Error",
                    "Failed to delete recurring transaction. Please try again."
                  );
                } finally {
                  setDeleteLoading(false);
                }
              },
            },
          ]
        );
      } else {
        // Regular transaction deletion
        Alert.alert(
          "Delete Confirmation",
          "Are you sure you want to delete this transaction? This action cannot be undone.",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                setDeleteLoading(false);
              },
            },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  // Optimistic update
                  const updatedTransactions = transactions.filter(
                    (t) => t.id !== transaction.id
                  );
                  updateDataOptimistically({
                    transactions: updatedTransactions,
                  });

                  // Delete from database
                  await removeTransaction(user.uid, transaction.id);

                  // Refresh DataContext to update transaction limits and ensure consistency
                  await Promise.all([
                    refreshTransactions(),
                    refreshRecurringTransactions(),
                  ]);

                  Alert.alert("Success", "Transaction deleted successfully!", [
                    { text: "OK", onPress: () => navigation.goBack() },
                  ]);
                } catch (error) {
                  console.error("Error deleting transaction:", error);
                  Alert.alert(
                    "Error",
                    "Failed to delete transaction. Please try again."
                  );
                } finally {
                  setDeleteLoading(false);
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Error in delete confirmation:", error);
      setDeleteLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <StandardHeader
            title={
              editMode
                ? translate("edit", isFriendlyMode)
                : translate("addTransaction", isFriendlyMode).split(" ")[0] +
                  " " +
                  (formData.type === "income"
                    ? translate("income", isFriendlyMode)
                    : translate("expenses", isFriendlyMode))
            }
            onBack={() => navigation.goBack()}
          />

          {/* Limit Indicator - Only show if not unlimited */}
          {/* TEMPORARILY DISABLED - Commented out all transaction limit displays
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
          */}

          {/* Form Fields */}
          {/* Type Selection */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Type
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor:
                    formData.type === "expense" ? colors.error : colors.border,
                  backgroundColor:
                    formData.type === "expense" ? colors.error : "transparent",
                  alignItems: "center",
                }}
                onPress={() =>
                  setFormData({
                    ...formData,
                    type: "expense",
                    category: "",
                  })
                }
              >
                <Text
                  style={{
                    color: formData.type === "expense" ? "white" : colors.text,
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
                  borderWidth: 1,
                  borderColor:
                    formData.type === "income" ? colors.primary : colors.border,
                  backgroundColor:
                    formData.type === "income" ? colors.primary : "transparent",
                  alignItems: "center",
                }}
                onPress={() =>
                  setFormData({ ...formData, type: "income", category: "" })
                }
              >
                <Text
                  style={{
                    color: formData.type === "income" ? "white" : colors.text,
                    fontWeight: "600",
                  }}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Description
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.card,
              }}
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              placeholder="Enter description"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Amount */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              $ Amount
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.card,
              }}
              value={formatNumberWithCommas(formData.amount)}
              onChangeText={(text) => {
                const cleanValue = removeCommas(text);
                setFormData({ ...formData, amount: cleanValue });
              }}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            {/* Monthly Equivalent Amount Display */}
            {formData.isRecurring &&
              formData.amount &&
              monthlyEquivalentAmount > 0 && (
                <View
                  style={{
                    marginTop: 8,
                    padding: 12,
                    backgroundColor: colors.primary + "20",
                    borderRadius: 8,
                    borderLeftWidth: 4,
                    borderLeftColor: colors.primary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.primary,
                      fontWeight: "600",
                      marginBottom: 4,
                    }}
                  >
                    📅 Monthly Equivalent
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      color: colors.text,
                      fontWeight: "700",
                    }}
                  >
                    $
                    {formatNumberWithCommas(monthlyEquivalentAmount.toFixed(2))}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {formData.frequency === "weekly" &&
                      `($${formData.amount} × 4 weeks)`}
                    {formData.frequency === "biweekly" &&
                      `($${formData.amount} × 2 bi-weekly periods)`}
                    {formData.frequency === "monthly" &&
                      `($${formData.amount} × 1 month)`}
                  </Text>
                </View>
              )}
          </View>

          {/* Category */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 8 }}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    marginRight: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor:
                      formData.category === category
                        ? colors.primary
                        : colors.border,
                    backgroundColor:
                      formData.category === category
                        ? colors.primary
                        : "transparent",
                  }}
                  onPress={() => setFormData({ ...formData, category })}
                >
                  <Text
                    style={{
                      color:
                        formData.category === category ? "white" : colors.text,
                      fontSize: 14,
                    }}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Date */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Date
            </Text>
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: colors.card,
              }}
              onPress={openDatePicker}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: formData.date ? colors.text : colors.textSecondary,
                }}
              >
                {formData.date
                  ? timestampToDateString(formData.date)
                  : "Select Date"}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Recurring Transaction Toggle */}
          <View style={{ marginBottom: 20 }}>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 12,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                backgroundColor: colors.card,
              }}
              onPress={() =>
                setFormData({ ...formData, isRecurring: !formData.isRecurring })
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="repeat"
                  size={20}
                  color={
                    formData.isRecurring ? colors.primary : colors.textSecondary
                  }
                />
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  Recurring Transaction
                </Text>
              </View>
              <View
                style={{
                  width: 40,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: formData.isRecurring
                    ? colors.primary
                    : colors.border,
                  justifyContent: "center",
                  alignItems: formData.isRecurring ? "flex-end" : "flex-start",
                  paddingHorizontal: 2,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "white",
                  }}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Recurring Options */}
          {formData.isRecurring && (
            <>
              {/* Frequency */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.text,
                    marginBottom: 8,
                  }}
                >
                  Frequency
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {["weekly", "biweekly", "monthly"].map((frequency) => (
                    <TouchableOpacity
                      key={frequency}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        marginRight: 8,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor:
                          formData.frequency === frequency
                            ? colors.primary
                            : colors.border,
                        backgroundColor:
                          formData.frequency === frequency
                            ? colors.primary
                            : "transparent",
                      }}
                      onPress={() =>
                        setFormData({ ...formData, frequency: frequency })
                      }
                    >
                      <Text
                        style={{
                          color:
                            formData.frequency === frequency
                              ? "white"
                              : colors.text,
                          fontSize: 14,
                          textTransform: "capitalize",
                        }}
                      >
                        {frequency}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* End Date */}
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.text,
                    marginBottom: 8,
                  }}
                >
                  End Date (Optional)
                </Text>
                <TouchableOpacity
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: colors.card,
                  }}
                  onPress={openEndDatePicker}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: formData.endDate
                        ? colors.text
                        : colors.textSecondary,
                    }}
                  >
                    {formData.endDate
                      ? new Date(formData.endDate).toISOString().split("T")[0]
                      : "Select End Date (Optional)"}
                  </Text>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Action Buttons */}
          <View style={{ marginTop: 20, gap: 12 }}>
            {/* Save Button */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: 18,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                shadowColor: colors.primary,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}
              onPress={handleSave}
              disabled={loading}
            >
              {loading && (
                <ActivityIndicator
                  size="small"
                  color="white"
                  style={{ marginRight: 8 }}
                />
              )}
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                {editMode ? "Update" : "Save"} Transaction
              </Text>
            </TouchableOpacity>

            {/* Delete Button (only in edit mode) */}
            {editMode && (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.error + "20",
                  padding: 18,
                  borderRadius: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.error,
                }}
                onPress={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading && (
                  <ActivityIndicator
                    size="small"
                    color={colors.error}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text
                  style={{
                    color: colors.error,
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  Delete Transaction
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              width: "90%",
              maxWidth: 400,
              shadowColor: colors.shadow,
              shadowOpacity: 0.25,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            }}
            onStartShouldSetResponder={() => true}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Select Date
            </Text>
            <View
              style={{
                alignItems: "center",
                marginVertical: 10,
              }}
            >
              <DateTimePicker
                value={new Date(formData.date)}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  width: "100%",
                }}
                textColor={colors.text}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: colors.border,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                onPress={() => setShowDatePicker(false)}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                onPress={handleDatePickerDone}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* End Date Picker Modal */}
      <Modal
        visible={showEndDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEndDatePicker(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setShowEndDatePicker(false)}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              width: "90%",
              maxWidth: 400,
              shadowColor: colors.shadow,
              shadowOpacity: 0.25,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            }}
            onStartShouldSetResponder={() => true}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Select End Date
            </Text>
            <View
              style={{
                alignItems: "center",
                marginVertical: 10,
              }}
            >
              <DateTimePicker
                value={
                  formData.endDate ? new Date(formData.endDate) : new Date()
                }
                mode="date"
                display="spinner"
                onChange={handleEndDateChange}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  width: "100%",
                }}
                textColor={colors.text}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: colors.border,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                onPress={() => setShowEndDatePicker(false)}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                onPress={handleEndDatePickerDone}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
