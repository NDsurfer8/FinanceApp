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
import { useZeroLoading } from "../hooks/useZeroLoading";
import { saveTransaction } from "../services/userData";
import { billReminderService } from "../services/billReminders";
import { useTransactionLimits } from "../hooks/useTransactionLimits";
import { usePaywall } from "../hooks/usePaywall";
import { plaidService } from "../services/plaid";

interface AddTransactionScreenProps {
  navigation: any;
  route: any;
}

export const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { transactions, updateDataOptimistically } = useZeroLoading();
  const [loading, setLoading] = useState(false);
  const { type: initialType, selectedMonth } = route.params || {};
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
    description: "",
    amount: "",
    category: "",
    type: initialType || "expense", // Use the passed type or default to expense
    date: getInitialDate(),
    isRecurring: false,
    frequency: "monthly" as
      | "weekly"
      | "biweekly"
      | "monthly"
      | "quarterly"
      | "yearly",
    endDate: "",
  });
  const [bankSuggestions, setBankSuggestions] = useState<any[]>([]);
  const [showBankSuggestions, setShowBankSuggestions] = useState(false);
  const [isBankConnected, setIsBankConnected] = useState(false);

  // Handle route params for bank suggestions
  React.useEffect(() => {
    if (route.params?.showBankSuggestions && route.params?.suggestions) {
      setBankSuggestions(route.params.suggestions);
      setShowBankSuggestions(true);
    }

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

  // Check bank connection status and load suggestions
  React.useEffect(() => {
    const checkBankConnection = async () => {
      try {
        const connected = await plaidService.isBankConnected();
        setIsBankConnected(connected);

        if (connected && bankSuggestions.length === 0) {
          // Load bank suggestions if not already provided
          await loadBankSuggestions();
        }
      } catch (error) {
        console.error("Failed to check bank connection:", error);
        setIsBankConnected(false);
      }
    };

    checkBankConnection();
  }, []);

  // Load bank suggestions
  const loadBankSuggestions = async () => {
    try {
      // Get transactions from the last 6 months to analyze patterns
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const transactions = await plaidService.getTransactions(
        startDate,
        endDate
      );

      // Analyze recurring patterns
      const suggestions = analyzeRecurringPatterns(transactions);
      setBankSuggestions(suggestions);
    } catch (error) {
      console.error("Failed to load bank suggestions:", error);
    }
  };

  // Analyze bank transactions to find recurring patterns
  const analyzeRecurringPatterns = (transactions: any[]) => {
    const patterns: { [key: string]: any[] } = {};
    const suggestions: any[] = [];

    // Group transactions by merchant name and amount
    transactions.forEach((transaction) => {
      const key = `${transaction.name}_${Math.abs(transaction.amount)}`;
      if (!patterns[key]) {
        patterns[key] = [];
      }
      patterns[key].push(transaction);
    });

    // Find transactions that appear multiple times (potential recurring)
    Object.entries(patterns).forEach(([key, transactions]) => {
      if (transactions.length >= 2) {
        const firstTransaction = transactions[0];
        const sortedTransactions = transactions.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Calculate frequency
        const frequency = calculateFrequency(sortedTransactions);

        if (frequency) {
          suggestions.push({
            name: firstTransaction.name,
            amount: Math.abs(firstTransaction.amount),
            category: firstTransaction.category?.[0] || "Other",
            frequency,
            lastOccurrence: new Date(
              sortedTransactions[sortedTransactions.length - 1].date
            ),
            occurrences: transactions.length,
            type: firstTransaction.amount > 0 ? "income" : "expense",
          });
        }
      }
    });

    return suggestions.sort((a, b) => b.occurrences - a.occurrences);
  };

  // Calculate frequency based on transaction dates
  const calculateFrequency = (transactions: any[]) => {
    if (transactions.length < 2) return null;

    const dates = transactions.map((t) => new Date(t.date).getTime());
    const intervals = [];

    for (let i = 1; i < dates.length; i++) {
      intervals.push(dates[i] - dates[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const days = avgInterval / (1000 * 60 * 60 * 24);

    // Determine frequency based on average interval
    if (days >= 25 && days <= 35) return "monthly";
    if (days >= 13 && days <= 15) return "biweekly";
    if (days >= 6 && days <= 8) return "weekly";
    if (days >= 85 && days <= 95) return "quarterly";
    if (days >= 350 && days <= 380) return "yearly";

    return null;
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

  const categories = getCategories(formData.type);

  const handleImportCSV = () => {
    Alert.alert(
      "Import CSV",
      "This feature will allow you to import transactions from a CSV file. The CSV should have columns: date, description, amount, category, type (income/expense).",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Coming Soon", style: "default" },
      ]
    );
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

    // Check transaction limits
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

    try {
      setLoading(true);

      if (formData.isRecurring) {
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
        const transaction = {
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
        const newTransaction = { ...transaction, id: `temp-${Date.now()}` };
        const updatedTransactions = [...transactions, newTransaction];
        updateDataOptimistically({ transactions: updatedTransactions });

        // Save to database in background
        const savedTransaction = await saveTransaction(transaction);

        // Update with real ID from database
        const finalTransactions = updatedTransactions.map((t) =>
          t.id === newTransaction.id ? { ...t, id: savedTransaction } : t
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

      // Revert optimistic update on error if it was a regular transaction
      if (!formData.isRecurring) {
        const revertedTransactions = transactions.filter(
          (t) => t.id !== `temp-${Date.now()}`
        );
        updateDataOptimistically({ transactions: revertedTransactions });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
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
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: "600", color: "#374151" }}>
              {formData.type === "income" ? "Add Income" : "Add Expense"}
            </Text>
          </View>

          {/* Limit Indicator - Only show if not unlimited */}
          {formData.type === "income"
            ? !getIncomeSourceLimitInfo().isUnlimited && (
                <View
                  style={{
                    backgroundColor: "#fef3c7",
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
                      color="#d97706"
                    />
                    <Text
                      style={{ marginLeft: 8, color: "#d97706", fontSize: 14 }}
                    >
                      {`${getIncomeSourceLimitInfo().current}/${
                        getIncomeSourceLimitInfo().limit
                      } income sources used`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={presentPaywall}>
                    <Text
                      style={{
                        color: "#d97706",
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
                    backgroundColor: "#fef3c7",
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
                      color="#d97706"
                    />
                    <Text
                      style={{ marginLeft: 8, color: "#d97706", fontSize: 14 }}
                    >
                      {`${getTransactionLimitInfo().current}/${
                        getTransactionLimitInfo().limit
                      } transactions used`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={presentPaywall}>
                    <Text
                      style={{
                        color: "#d97706",
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      Upgrade
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

          {/* Import CSV Button */}
          <TouchableOpacity
            style={{
              backgroundColor: "#f3f4f6",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleImportCSV}
          >
            <Ionicons
              name="document-text-outline"
              size={20}
              color="#6b7280"
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: "#6b7280", fontSize: 16, fontWeight: "500" }}>
              Import from CSV
            </Text>
          </TouchableOpacity>

          {/* Bank Suggestions Section */}
          {isBankConnected && (
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="repeat" size={20} color="#1d4ed8" />
                  <Text
                    style={{ fontSize: 16, fontWeight: "600", marginLeft: 8 }}
                  >
                    Bank Recurring Suggestions
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowBankSuggestions(!showBankSuggestions)}
                >
                  <Ionicons
                    name={showBankSuggestions ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>

              {showBankSuggestions && (
                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#6b7280",
                      marginBottom: 12,
                      lineHeight: 20,
                    }}
                  >
                    Tap on a suggestion to pre-fill the form with bank data.
                  </Text>

                  {bankSuggestions.length > 0 ? (
                    bankSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={`${suggestion.name}_${suggestion.amount}_${index}`}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingVertical: 12,
                          paddingHorizontal: 16,
                          backgroundColor: "#f8fafc",
                          borderRadius: 12,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: "#e5e7eb",
                        }}
                        onPress={() => {
                          setFormData({
                            ...formData,
                            description: suggestion.name,
                            amount: suggestion.amount.toString(),
                            category: suggestion.category,
                            type: suggestion.type,
                            isRecurring: true,
                            frequency: suggestion.frequency,
                          });
                          setShowBankSuggestions(false);
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              color: "#374151",
                              marginBottom: 2,
                            }}
                          >
                            {suggestion.name}
                          </Text>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: "#6b7280",
                                marginRight: 8,
                              }}
                            >
                              {suggestion.frequency} • {suggestion.occurrences}{" "}
                              times
                            </Text>
                            <View
                              style={{
                                backgroundColor:
                                  suggestion.type === "income"
                                    ? "#dcfce7"
                                    : "#fee2e2",
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: "600",
                                  color:
                                    suggestion.type === "income"
                                      ? "#16a34a"
                                      : "#dc2626",
                                }}
                              >
                                {suggestion.type}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "700",
                              color:
                                suggestion.type === "income"
                                  ? "#16a34a"
                                  : "#dc2626",
                            }}
                          >
                            ${suggestion.amount.toFixed(2)}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              marginTop: 2,
                            }}
                          >
                            {suggestion.category}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View
                      style={{
                        padding: 16,
                        alignItems: "center",
                        backgroundColor: "#f8fafc",
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        borderStyle: "dashed",
                      }}
                    >
                      <Ionicons
                        name="information-circle"
                        size={24}
                        color="#6b7280"
                      />
                      <Text
                        style={{
                          color: "#6b7280",
                          textAlign: "center",
                          fontSize: 14,
                          marginTop: 8,
                        }}
                      >
                        No recurring patterns found in your bank data yet.
                      </Text>
                      <Text
                        style={{
                          color: "#6b7280",
                          textAlign: "center",
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        More transactions will help us identify patterns.
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Type Selector */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
              Transaction Type
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor:
                    formData.type === "expense" ? "#ef4444" : "#f3f4f6",
                  alignItems: "center",
                }}
                onPress={() =>
                  setFormData({ ...formData, type: "expense", category: "" })
                }
              >
                <Text
                  style={{
                    color: formData.type === "expense" ? "#fff" : "#6b7280",
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
                    formData.type === "income" ? "#10b981" : "#f3f4f6",
                  alignItems: "center",
                }}
                onPress={() =>
                  setFormData({ ...formData, type: "income", category: "" })
                }
              >
                <Text
                  style={{
                    color: formData.type === "income" ? "#fff" : "#6b7280",
                    fontWeight: "600",
                  }}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 16,
              shadowColor: "#000",
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
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
                  backgroundColor: formData.isRecurring ? "#6366f1" : "#f8fafc",
                  borderWidth: 1,
                  borderColor: formData.isRecurring ? "#6366f1" : "#e5e7eb",
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
                  color={formData.isRecurring ? "#fff" : "#6b7280"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: formData.isRecurring ? "#fff" : "#374151",
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
                    borderTopColor: "#e5e7eb",
                  }}
                >
                  {/* Frequency Dropdown */}
                  <View style={{ marginBottom: 16 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "500",
                        marginBottom: 4,
                        color: "#6b7280",
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
                                ? "#6366f1"
                                : "#f3f4f6",
                          }}
                          onPress={() =>
                            setFormData({ ...formData, frequency: freq as any })
                          }
                        >
                          <Text
                            style={{
                              color:
                                formData.frequency === freq
                                  ? "#fff"
                                  : "#374151",
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
                        color: "#6b7280",
                      }}
                    >
                      End Date (Optional)
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: "#d1d5db",
                        borderRadius: 6,
                        padding: 8,
                        fontSize: 14,
                      }}
                      placeholder="YYYY-MM-DD (leave empty for no end date)"
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

            {/* Amount */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
              >
                Amount
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                }}
                placeholder="0.00"
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
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
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
                        formData.category === category ? "#6366f1" : "#f3f4f6",
                      marginRight: 8,
                      minWidth: 80,
                      alignItems: "center",
                    }}
                    onPress={() => setFormData({ ...formData, category })}
                  >
                    <Text
                      style={{
                        color:
                          formData.category === category ? "#fff" : "#374151",
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
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
              >
                Description
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
                placeholder="Enter description..."
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
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
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
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                }}
                placeholder={
                  formData.type === "expense"
                    ? "Due Date (YYYY-MM-DD)"
                    : formData.type === "income"
                    ? "Payment Date (YYYY-MM-DD)"
                    : "Date (YYYY-MM-DD)"
                }
                value={formData.date}
                onChangeText={(text) =>
                  setFormData({ ...formData, date: text })
                }
                autoCorrect={false}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={{
              backgroundColor: "#6366f1",
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginTop: 24,
            }}
            onPress={handleSave}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              {formData.isRecurring ? "Create Recurring" : "Save"}{" "}
              {formData.type === "income" ? "Income" : "Expense"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
