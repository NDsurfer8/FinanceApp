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
import { saveTransaction } from "../services/userData";

interface AddTransactionScreenProps {
  navigation: any;
  route: any;
}

export const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { type: initialType, selectedMonth } = route.params || {};

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
  });

  const getCategories = (type: string) => {
    if (type === "income") {
      return [
        "Salary",
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

    try {
      const transaction = {
        id: Date.now().toString(),
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        type: formData.type as "income" | "expense",
        date: new Date(formData.date).getTime(), // Convert to timestamp
        userId: user.uid,
        createdAt: new Date().toISOString(),
      };

      await saveTransaction(transaction);
      Alert.alert("Success", "Transaction saved successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("Error saving transaction:", error);
      Alert.alert("Error", "Failed to save transaction. Please try again.");
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
                Date
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                }}
                placeholder="YYYY-MM-DD"
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
              Save {formData.type === "income" ? "Income" : "Expense"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
