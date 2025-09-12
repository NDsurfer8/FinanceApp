import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { transactionMatchingService } from "../services/transactionMatching";

interface TransactionStatusBadgeProps {
  transaction: any;
}

export const TransactionStatusBadge: React.FC<TransactionStatusBadgeProps> = ({
  transaction,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
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
            backgroundColor:
              status.status === "paid" ? "#dc2626" : status.statusColor + "20",
            borderColor:
              status.status === "paid" ? "#b91c1c" : status.statusColor,
          },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            {
              color: status.status === "paid" ? "#ffffff" : status.statusColor,
              fontFamily: status.status === "paid" ? "System" : undefined,
            },
          ]}
        >
          {status.status === "paid" ? t("common.paid") : status.statusText}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 2,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
    minWidth: 60,
    transform: [{ rotate: "-15deg" }],
  },
  icon: {
    marginRight: 2,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    textAlign: "center",
    textTransform: "uppercase",
  },
});
