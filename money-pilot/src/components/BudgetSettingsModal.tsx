import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";

interface BudgetSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  savingsPercentage: string;
  debtPayoffPercentage: string;
  onSavingsChange: (value: string) => void;
  onDebtChange: (value: string) => void;
  onSave: () => void;
  hasUnsavedChanges: boolean;
  netIncome: number;
  formatCurrency: (amount: number) => string;
}

export const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({
  visible,
  onClose,
  savingsPercentage,
  debtPayoffPercentage,
  onSavingsChange,
  onDebtChange,
  onSave,
  hasUnsavedChanges,
  netIncome,
  formatCurrency,
}) => {
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();
  const [localSavings, setLocalSavings] = useState(savingsPercentage);
  const [localDebt, setLocalDebt] = useState(debtPayoffPercentage);

  useEffect(() => {
    setLocalSavings(savingsPercentage);
    setLocalDebt(debtPayoffPercentage);
  }, [savingsPercentage, debtPayoffPercentage]);

  const savingsAmount = (netIncome * parseFloat(localSavings || "0")) / 100;
  const debtAmount = (netIncome * parseFloat(localDebt || "0")) / 100;
  const totalAllocated =
    parseFloat(localSavings || "0") + parseFloat(localDebt || "0");
  const remainingPercentage = 100 - totalAllocated;

  const handleSave = () => {
    if (totalAllocated > 100) {
      Alert.alert("Invalid Allocation", "Total allocation cannot exceed 100%.");
      return;
    }

    onSavingsChange(localSavings);
    onDebtChange(localDebt);
    onSave();
    onClose();
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to close?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Close", style: "destructive", onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  const getRecommendation = () => {
    if (totalAllocated < 20) {
      return {
        type: "warning",
        message:
          "Consider saving at least 20% of your income for financial security.",
        icon: "warning-outline",
        color: colors.warning,
      };
    } else if (totalAllocated > 80) {
      return {
        type: "info",
        message:
          "You're allocating a high percentage. Make sure to leave room for discretionary spending.",
        icon: "information-circle-outline",
        color: colors.info || "#3b82f6",
      };
    } else {
      return {
        type: "success",
        message:
          "Great allocation! You're balancing savings, debt payoff, and spending well.",
        icon: "checkmark-circle-outline",
        color: colors.success,
      };
    }
  };

  const recommendation = getRecommendation();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 20,
            paddingTop: 60,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <TouchableOpacity onPress={handleClose} style={{ padding: 8 }}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
            }}
          >
            Budget Settings
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!hasUnsavedChanges || totalAllocated > 100}
            style={{
              padding: 8,
              opacity: hasUnsavedChanges && totalAllocated <= 100 ? 1 : 0.5,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color:
                  hasUnsavedChanges && totalAllocated <= 100
                    ? colors.primary
                    : colors.textSecondary,
              }}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, padding: 20 }}>
          {/* Allocation Overview */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.text,
                marginBottom: 16,
              }}
            >
              Monthly Allocation
            </Text>

            {/* Visual Allocation Bar */}
            <View style={{ marginBottom: 20 }}>
              <View
                style={{
                  height: 24,
                  backgroundColor: colors.border,
                  borderRadius: 12,
                  overflow: "hidden",
                  flexDirection: "row",
                }}
              >
                <View
                  style={{
                    width: `${localSavings}%` as any,
                    backgroundColor: colors.success,
                    height: 24,
                  }}
                />
                <View
                  style={{
                    width: `${localDebt}%` as any,
                    backgroundColor: colors.error,
                    height: 24,
                  }}
                />
                <View
                  style={{
                    width: `${remainingPercentage}%` as any,
                    backgroundColor: colors.warning,
                    height: 24,
                  }}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}
              >
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Savings: {localSavings}%
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Debt: {localDebt}%
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Available: {remainingPercentage.toFixed(1)}%
                </Text>
              </View>
            </View>

            {/* Recommendation */}
            <View
              style={{
                backgroundColor: recommendation.color + "10",
                borderRadius: 8,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Ionicons
                name={recommendation.icon as any}
                size={16}
                color={recommendation.color}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  flex: 1,
                }}
              >
                {recommendation.message}
              </Text>
            </View>
          </View>

          {/* Savings Slider */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    backgroundColor: colors.successLight,
                    padding: 8,
                    borderRadius: 8,
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name="trending-up"
                    size={16}
                    color={colors.success}
                  />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    Savings
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                    }}
                  >
                    {formatCurrency(savingsAmount)} per month
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.success,
                }}
              >
                {localSavings}%
              </Text>
            </View>

            <View
              style={{
                height: 8,
                backgroundColor: colors.border,
                borderRadius: 4,
                position: "relative",
              }}
            >
              <View
                style={{
                  width: `${localSavings}%` as any,
                  height: 8,
                  backgroundColor: colors.success,
                  borderRadius: 4,
                }}
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  setLocalSavings(
                    Math.max(0, parseFloat(localSavings) - 5).toString()
                  )
                }
                style={{
                  padding: 8,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: colors.textSecondary }}>-5%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setLocalSavings(
                    Math.min(100, parseFloat(localSavings) + 5).toString()
                  )
                }
                style={{
                  padding: 8,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: colors.textSecondary }}>+5%</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Debt Payoff Slider */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    backgroundColor: colors.errorLight,
                    padding: 8,
                    borderRadius: 8,
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name="card-outline"
                    size={16}
                    color={colors.error}
                  />
                </View>
                <View>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    Debt Payoff
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                    }}
                  >
                    {formatCurrency(debtAmount)} per month
                  </Text>
                </View>
              </View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.error,
                }}
              >
                {localDebt}%
              </Text>
            </View>

            <View
              style={{
                height: 8,
                backgroundColor: colors.border,
                borderRadius: 4,
                position: "relative",
              }}
            >
              <View
                style={{
                  width: `${localDebt}%` as any,
                  height: 8,
                  backgroundColor: colors.error,
                  borderRadius: 4,
                }}
              />
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 8,
              }}
            >
              <TouchableOpacity
                onPress={() =>
                  setLocalDebt(
                    Math.max(0, parseFloat(localDebt) - 5).toString()
                  )
                }
                style={{
                  padding: 8,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: colors.textSecondary }}>-5%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setLocalDebt(
                    Math.min(100, parseFloat(localDebt) + 5).toString()
                  )
                }
                style={{
                  padding: 8,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: colors.textSecondary }}>+5%</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 12,
              }}
            >
              Monthly Summary
            </Text>

            <View style={{ marginBottom: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: colors.textSecondary }}>Net Income:</Text>
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  {formatCurrency(netIncome)}
                </Text>
              </View>
            </View>

            <View style={{ marginBottom: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: colors.textSecondary }}>Savings:</Text>
                <Text style={{ color: colors.success, fontWeight: "600" }}>
                  -{formatCurrency(savingsAmount)}
                </Text>
              </View>
            </View>

            <View style={{ marginBottom: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: colors.textSecondary }}>
                  Debt Payoff:
                </Text>
                <Text style={{ color: colors.error, fontWeight: "600" }}>
                  -{formatCurrency(debtAmount)}
                </Text>
              </View>
            </View>

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 8,
                marginTop: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  Available for Spending:
                </Text>
                <Text style={{ color: colors.warning, fontWeight: "700" }}>
                  {formatCurrency(netIncome - savingsAmount - debtAmount)}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};
