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
}

export const AddTransactionScreen: React.FC<AddTransactionScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "",
    type: "expense", // "income" or "expense"
    date: new Date().toISOString().split("T")[0], // Today's date
  });

  const categories = [
    "Housing",
    "Food",
    "Transport",
    "Health",
    "Entertainment",
    "Shopping",
    "Utilities",
    "Insurance",
    "Other",
  ];

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
        type: formData.type,
        date: formData.date,
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
              Add Transaction
            </Text>
          </View>

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
                onPress={() => setFormData({ ...formData, type: "expense" })}
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
                onPress={() => setFormData({ ...formData, type: "income" })}
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
            {/* Description */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
              >
                Description *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                }}
                placeholder="Enter description"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Amount */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
              >
                Amount *
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
                Category *
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 12,
                }}
              >
                <Text style={{ fontSize: 16, color: "#6b7280" }}>
                  {formData.category || "Select category"}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 16,
                      backgroundColor:
                        formData.category === category ? "#6366f1" : "#f3f4f6",
                    }}
                    onPress={() => setFormData({ ...formData, category })}
                  >
                    <Text
                      style={{
                        color:
                          formData.category === category ? "#fff" : "#374151",
                        fontSize: 14,
                      }}
                    >
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
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
              Save Transaction
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
