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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";
import { StandardHeader } from "../components/StandardHeader";
import { useTransactionOperations } from "../hooks/useTransactionOperations";
import { useTransactionLimits } from "../hooks/useTransactionLimits";
import { usePaywall } from "../hooks/usePaywall";
import { formatNumberWithCommas, removeCommas } from "../utils/formatNumber";

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

export const AddTransactionScreenNew: React.FC<AddTransactionScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();
  const { createTransaction, updateTransaction, deleteTransaction, loading } =
    useTransactionOperations(user?.uid || "");
  const [deleteLoading, setDeleteLoading] = useState(false);
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
    isRecurring: editMode
      ? transaction?.isRecurring || transaction?.recurringTransactionId || false
      : false,
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

  // Ensure recurring status is set when transaction has recurringTransactionId
  React.useEffect(() => {
    if (editMode && transaction?.recurringTransactionId) {
      setFormData((prev) => ({
        ...prev,
        isRecurring: true,
      }));
    }
  }, [editMode, transaction?.recurringTransactionId]);

  const getCategories = (type: string) => {
    if (type === "income") {
      return ["Salary", "Freelance", "Investment", "Business", "Other Income"];
    } else {
      return [
        "Food & Dining",
        "Transportation",
        "Housing",
        "Utilities",
        "Entertainment",
        "Healthcare",
        "Shopping",
        "Education",
        "Travel",
        "Other",
      ];
    }
  };

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
      const selectedMonthDate = selectedMonth
        ? new Date(selectedMonth)
        : undefined;

      if (editMode && transaction) {
        // Update existing transaction
        const result = await updateTransaction(
          transaction,
          formData,
          selectedMonthDate
        );

        if (result.success) {
          Alert.alert("Success", result.message, [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
        } else {
          Alert.alert("Error", result.error || "Failed to update transaction");
        }
      } else {
        // Create new transaction
        const result = await createTransaction(formData, selectedMonthDate);

        if (result.success) {
          Alert.alert("Success", result.message, [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
        } else {
          Alert.alert("Error", result.error || "Failed to create transaction");
        }
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
      Alert.alert("Error", "Failed to save transaction. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!user || !editMode || !transaction) {
      Alert.alert("Error", "Cannot delete transaction");
      return;
    }

    setDeleteLoading(true);

    try {
      const result = await deleteTransaction(transaction);

      if (result.success) {
        Alert.alert("Success", result.message, [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Error", result.error || "Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      Alert.alert("Error", "Failed to delete transaction. Please try again.");
    } finally {
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
                        fontSize: 14,
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
                        fontSize: 14,
                        fontWeight: "600",
                      }}
                    >
                      Upgrade
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

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
                    formData.type === "income" ? colors.primary : colors.border,
                  backgroundColor:
                    formData.type === "income" ? colors.primary : "transparent",
                  alignItems: "center",
                }}
                onPress={() => setFormData({ ...formData, type: "income" })}
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
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor:
                    formData.type === "expense"
                      ? colors.primary
                      : colors.border,
                  backgroundColor:
                    formData.type === "expense"
                      ? colors.primary
                      : "transparent",
                  alignItems: "center",
                }}
                onPress={() => setFormData({ ...formData, type: "expense" })}
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
            </View>
          </View>

          {/* Description */}
          <View style={{ marginBottom: 20 }}>
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
                borderRadius: 8,
                padding: 12,
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
          <View style={{ marginBottom: 20 }}>
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
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.card,
              }}
              value={formData.amount}
              onChangeText={(text) => {
                const formatted = formatNumberWithCommas(text);
                setFormData({ ...formData, amount: formatted });
              }}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
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
              {getCategories(formData.type).map((category) => (
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
                  onPress={() =>
                    setFormData({ ...formData, category: category })
                  }
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
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.card,
              }}
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textSecondary}
            />
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
                  {["weekly", "biweekly", "monthly", "quarterly", "yearly"].map(
                    (frequency) => (
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
                    )
                  )}
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
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                    color: colors.text,
                    backgroundColor: colors.card,
                  }}
                  value={formData.endDate}
                  onChangeText={(text) =>
                    setFormData({ ...formData, endDate: text })
                  }
                  placeholder="YYYY-MM-DD (leave empty for no end date)"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </>
          )}

          {/* Action Buttons */}
          <View style={{ marginTop: 20, gap: 12 }}>
            {/* Save Button */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: 16,
                borderRadius: 8,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
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
                  fontWeight: "600",
                }}
              >
                {editMode ? "Update" : "Save"} Transaction
              </Text>
            </TouchableOpacity>

            {/* Delete Button (only in edit mode) */}
            {editMode && (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.error,
                  padding: 16,
                  borderRadius: 8,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                }}
                onPress={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading && (
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
                    fontWeight: "600",
                  }}
                >
                  Delete Transaction
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
