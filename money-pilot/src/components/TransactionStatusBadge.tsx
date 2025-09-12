import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { transactionMatchingService } from "../services/transactionMatching";

interface TransactionStatusBadgeProps {
  transaction: any;
}

export const TransactionStatusBadge: React.FC<TransactionStatusBadgeProps> = ({
  transaction,
}) => {
  const { colors } = useTheme();
  const status = transactionMatchingService.getTransactionStatus(transaction);

  if (status.status === "normal") {
    return null; // Don't show badge for normal bank transactions
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.badge,
          {
            backgroundColor: status.statusColor + "20",
            borderColor: status.statusColor,
          },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            {
              color: status.statusColor,
            },
          ]}
        >
          {status.statusText}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "500",
  },
});
