import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
} from "react-native";

export const TransactionsScreen: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
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
            Quick Add
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              style={{
                backgroundColor: "#111827",
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>
                Add Transaction
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#e5e7eb",
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#111827", fontWeight: "600" }}>
                Import (CSV)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
            marginTop: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            Recent (sample)
          </Text>
          {[
            { note: "Groceries", amount: -92.35 },
            { note: "VA Education", amount: +3128 },
            { note: "Uber income", amount: +150 },
            { note: "Gas", amount: -56.1 },
          ].map((t, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 10,
              }}
            >
              <Text>{t.note}</Text>
              <Text
                style={{
                  fontWeight: "600",
                  color: t.amount >= 0 ? "#059669" : "#ef4444",
                }}
              >
                {t.amount >= 0 ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
