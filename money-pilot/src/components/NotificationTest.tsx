import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { notificationService } from "../services/notifications";

interface NotificationTestProps {
  title?: string;
  showTitle?: boolean;
}

export const NotificationTest: React.FC<NotificationTestProps> = ({
  title = "Test Notifications",
  showTitle = true,
}) => {
  const testBudgetReminder = async () => {
    try {
      await notificationService.scheduleBudgetReminder(
        new Date(Date.now() + 5000), // 5 seconds from now
        1000
      );
      console.log("Budget reminder scheduled");
    } catch (error) {
      console.error("Error scheduling budget reminder:", error);
    }
  };

  const testBillReminder = async () => {
    try {
      await notificationService.scheduleBillReminder(
        "Test Bill",
        new Date(Date.now() + 5000),
        150
      );
      console.log("Bill reminder scheduled");
    } catch (error) {
      console.error("Error scheduling bill reminder:", error);
    }
  };

  const testGoalReminder = async () => {
    try {
      await notificationService.scheduleGoalReminder("Test Goal", 10000, 7500);
      console.log("Goal reminder scheduled");
    } catch (error) {
      console.error("Error scheduling goal reminder:", error);
    }
  };

  const testLowBalanceAlert = async () => {
    try {
      await notificationService.scheduleLowBalanceAlert("Test Account", 500);
      console.log("Low balance alert scheduled");
    } catch (error) {
      console.error("Error scheduling low balance alert:", error);
    }
  };

  const testSavingsReminder = async () => {
    try {
      await notificationService.scheduleSavingsReminder(5000, 3000);
      console.log("Savings reminder scheduled");
    } catch (error) {
      console.error("Error scheduling savings reminder:", error);
    }
  };

  return (
    <View style={styles.container}>
      {showTitle && <Text style={styles.title}>{title}</Text>}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testBudgetReminder}>
          <Text style={styles.buttonText}>💰 Budget</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testBillReminder}>
          <Text style={styles.buttonText}>📅 Bill</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testGoalReminder}>
          <Text style={styles.buttonText}>🎯 Goal</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testLowBalanceAlert}>
          <Text style={styles.buttonText}>⚠️ Balance</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={testSavingsReminder}>
          <Text style={styles.buttonText}>💎 Savings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  button: {
    backgroundColor: "#6366f1",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
});
