import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface EmergencyFundTrackerProps {
  currentBalance: number;
  monthlyExpenses: number;
  onUpdateBalance: (newBalance: number) => void;
  onUpdateTarget: (newTarget: number) => void;
  onUpdateContribution: (newContribution: number) => void;
}

export const EmergencyFundTracker: React.FC<EmergencyFundTrackerProps> = ({
  currentBalance,
  monthlyExpenses,
  onUpdateBalance,
  onUpdateTarget,
  onUpdateContribution,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [targetMonths, setTargetMonths] = useState("6");
  const [monthlyContribution, setMonthlyContribution] = useState("500");
  const [newBalance, setNewBalance] = useState(currentBalance.toString());

  const targetAmount = monthlyExpenses * parseFloat(targetMonths || "6");
  const progress = targetAmount > 0 ? (currentBalance / targetAmount) * 100 : 0;
  const remaining = targetAmount - currentBalance;

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  const handleSave = () => {
    const balance = parseFloat(newBalance) || 0;
    const target = parseFloat(targetMonths) * monthlyExpenses;
    const contribution = parseFloat(monthlyContribution) || 0;

    onUpdateBalance(balance);
    onUpdateTarget(target);
    onUpdateContribution(contribution);
    setShowModal(false);
  };

  const getProgressColor = () => {
    if (progress >= 100) return "#16a34a";
    if (progress >= 75) return "#d97706";
    if (progress >= 50) return "#f59e0b";
    return "#dc2626";
  };

  const getProgressStatus = () => {
    if (progress >= 100) return "Fully Funded!";
    if (progress >= 75) return "Almost There";
    if (progress >= 50) return "Halfway There";
    if (progress >= 25) return "Getting Started";
    return "Just Starting";
  };

  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              backgroundColor: "#fef3c7",
              padding: 8,
              borderRadius: 10,
              marginRight: 12,
            }}
          >
            <Ionicons name="shield-checkmark" size={20} color="#d97706" />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#d97706" }}>
            Emergency Fund
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowModal(true)}>
          <Ionicons name="settings-outline" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={{ marginBottom: 20 }}>
        <View
          style={{
            height: 8,
            backgroundColor: "#f3f4f6",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              backgroundColor: getProgressColor(),
              width: `${Math.min(progress, 100)}%`,
            }}
          />
        </View>
      </View>

      {/* Current Status */}
      <View style={{ alignItems: "center", marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "800",
            color: getProgressColor(),
            marginBottom: 4,
          }}
        >
          {formatCurrency(currentBalance)}
        </Text>
        <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>
          {getProgressStatus()}
        </Text>
        <Text style={{ fontSize: 12, color: "#6b7280" }}>
          {formatPercentage(progress)} of {parseFloat(targetMonths)}-month
          target
        </Text>
      </View>

      {/* Details */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>
            Target
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#374151" }}>
            {formatCurrency(targetAmount)}
          </Text>
        </View>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>
            Remaining
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#dc2626" }}>
            {formatCurrency(remaining)}
          </Text>
        </View>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}>
            Monthly
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#16a34a" }}>
            {formatCurrency(parseFloat(monthlyContribution) || 0)}
          </Text>
        </View>
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 24,
              width: "90%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 20,
                color: "#1f2937",
              }}
            >
              Emergency Fund Settings
            </Text>

            {/* Current Balance */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
              >
                Current Balance
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                }}
                value={newBalance}
                onChangeText={setNewBalance}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>

            {/* Target Months */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
              >
                Target (months of expenses)
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                }}
                value={targetMonths}
                onChangeText={setTargetMonths}
                keyboardType="numeric"
                placeholder="6"
              />
              <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                Target:{" "}
                {formatCurrency(
                  monthlyExpenses * parseFloat(targetMonths || "6")
                )}
              </Text>
            </View>

            {/* Monthly Contribution */}
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
              >
                Monthly Contribution
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: "#d1d5db",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                }}
                value={monthlyContribution}
                onChangeText={setMonthlyContribution}
                keyboardType="numeric"
                placeholder="500"
              />
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: "#f3f4f6",
                }}
                onPress={() => setShowModal(false)}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: "#6b7280",
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: "#d97706",
                }}
                onPress={handleSave}
              >
                <Text
                  style={{
                    textAlign: "center",
                    color: "#fff",
                    fontWeight: "600",
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const formatPercentage = (percentage: number) => {
  return `${percentage.toFixed(1)}%`;
};
