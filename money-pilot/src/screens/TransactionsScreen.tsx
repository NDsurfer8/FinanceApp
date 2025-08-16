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
import { getUserTransactions, removeTransaction } from "../services/userData";

interface TransactionsScreenProps {
  navigation: any;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userTransactions = await getUserTransactions(user.uid);
      setTransactions(userTransactions);
    } catch (error) {
      console.error("Error loading transactions:", error);
      Alert.alert("Error", "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!user) return;
            try {
              await removeTransaction(user.uid, transactionId);
              await loadTransactions(); // Reload the list
              Alert.alert("Success", "Transaction deleted successfully");
            } catch (error) {
              console.error("Error deleting transaction:", error);
              Alert.alert("Error", "Failed to delete transaction");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
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
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#374151" }}>
            Transactions
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("AddTransaction")}
            style={{
              backgroundColor: "#6366f1",
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
              color="#fff"
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: "#fff", fontWeight: "600" }}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
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
            This Month
          </Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#6b7280", fontSize: 14 }}>Income</Text>
              <Text
                style={{ color: "#10b981", fontSize: 18, fontWeight: "600" }}
              >
                $
                {transactions
                  .filter((t) => t.type === "income")
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toFixed(2)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#6b7280", fontSize: 14 }}>Expenses</Text>
              <Text
                style={{ color: "#ef4444", fontSize: 18, fontWeight: "600" }}
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
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            Recent Transactions
          </Text>

          {loading ? (
            <Text
              style={{ color: "#6b7280", textAlign: "center", padding: 20 }}
            >
              Loading transactions...
            </Text>
          ) : transactions.length === 0 ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
              <Text
                style={{ color: "#6b7280", marginTop: 8, textAlign: "center" }}
              >
                No transactions yet
              </Text>
              <Text
                style={{ color: "#9ca3af", fontSize: 14, textAlign: "center" }}
              >
                Add your first transaction to get started
              </Text>
            </View>
          ) : (
            transactions
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              )
              .map((transaction) => (
                <View
                  key={transaction.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#f3f4f6",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "500" }}>
                      {transaction.description}
                    </Text>
                    <Text style={{ color: "#6b7280", fontSize: 14 }}>
                      {transaction.category} • {formatDate(transaction.date)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontWeight: "600",
                        fontSize: 16,
                        color:
                          transaction.type === "income" ? "#10b981" : "#ef4444",
                      }}
                    >
                      {transaction.type === "income" ? "+" : "-"}$
                      {transaction.amount.toFixed(2)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteTransaction(transaction.id)}
                      style={{ marginTop: 4 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#ef4444"
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
