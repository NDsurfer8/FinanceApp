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
import * as Haptics from "expo-haptics";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  targetDate?: string;
  category: string;
}

interface BudgetSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  savingsPercentage: string;
  debtPayoffPercentage: string;
  onSavingsChange: (value: string) => void;
  onDebtChange: (value: string) => void;
  onSave: (localSavingsValue?: string, localDebtValue?: string) => void;
  hasUnsavedChanges: boolean;
  netIncome: number;
  totalExpenses: number;
  formatCurrency: (amount: number) => string;
  goals?: Goal[];
  onGoalContributionChange?: (goalId: string, contribution: number) => void;
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
  totalExpenses,
  formatCurrency,
  goals = [],
  onGoalContributionChange,
}) => {
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();
  const [localSavings, setLocalSavings] = useState(savingsPercentage);
  const [localDebt, setLocalDebt] = useState(debtPayoffPercentage);
  const [localGoals, setLocalGoals] = useState<Goal[]>(goals);
  const [originalGoals, setOriginalGoals] = useState<Goal[]>(goals);

  useEffect(() => {
    setLocalSavings(savingsPercentage);
    setLocalDebt(debtPayoffPercentage);
  }, [savingsPercentage, debtPayoffPercentage]);

  useEffect(() => {
    // Only update local goals if the modal is not visible
    // This prevents interference with goal editing in other screens
    if (!visible) {
      setLocalGoals(goals);
    }
  }, [goals, visible]);

  // Reset original goals when modal opens
  useEffect(() => {
    if (visible) {
      setOriginalGoals(goals);
    }
  }, [visible]); // Remove goals dependency to prevent updates after modal opens

  const netIncomeAmount = netIncome - totalExpenses;
  const savingsAmount =
    (netIncomeAmount * parseFloat(localSavings || "0")) / 100;
  const debtAmount = (netIncomeAmount * parseFloat(localDebt || "0")) / 100;

  // Calculate goals allocation
  const goalsAmount = localGoals.reduce(
    (sum, goal) => sum + goal.monthlyContribution,
    0
  );
  const goalsPercentage =
    netIncomeAmount > 0 ? (goalsAmount / netIncomeAmount) * 100 : 0;

  const totalAllocated =
    parseFloat(localSavings || "0") +
    parseFloat(localDebt || "0") +
    goalsPercentage;
  const remainingPercentage = 100 - totalAllocated;

  const handleGoalContributionChange = (
    goalId: string,
    contribution: number
  ) => {
    const updatedGoals = localGoals.map((goal) =>
      goal.id === goalId ? { ...goal, monthlyContribution: contribution } : goal
    );
    setLocalGoals(updatedGoals);
    // Don't save immediately - save when Done is pressed
  };

  const handleSavingsChange = (value: string) => {
    setLocalSavings(value);
    // Don't update parent immediately - only when Done is pressed
  };

  const handleDebtChange = (value: string) => {
    setLocalDebt(value);
    // Don't update parent immediately - only when Done is pressed
  };

  // Check if there are any changes (savings, debt, or goals)
  const hasChanges = () => {
    const savingsChanged = localSavings !== savingsPercentage;
    const debtChanged = localDebt !== debtPayoffPercentage;
    const goalsChanged =
      JSON.stringify(localGoals) !== JSON.stringify(originalGoals);

    return savingsChanged || debtChanged || goalsChanged;
  };

  const handleClose = () => {
    onClose();
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
            Budget Details
          </Text>
          <TouchableOpacity
            onPress={async () => {
              // Collect all changes that need to be saved
              const changesToSave = {
                savingsChanged: localSavings !== savingsPercentage,
                debtChanged: localDebt !== debtPayoffPercentage,
                goalChanges: [] as Array<{
                  goalId: string;
                  contribution: number;
                }>,
              };

              // Collect goal changes
              localGoals.forEach((goal) => {
                const originalGoal = originalGoals.find(
                  (og) => og.id === goal.id
                );
                if (
                  originalGoal &&
                  originalGoal.monthlyContribution !== goal.monthlyContribution
                ) {
                  changesToSave.goalChanges.push({
                    goalId: goal.id,
                    contribution: goal.monthlyContribution,
                  });
                }
              });

              // Save all changes together
              if (
                changesToSave.savingsChanged ||
                changesToSave.debtChanged ||
                changesToSave.goalChanges.length > 0
              ) {
                // Update local state first
                if (changesToSave.savingsChanged) {
                  onSavingsChange(localSavings);
                }
                if (changesToSave.debtChanged) {
                  onDebtChange(localDebt);
                }

                // Save goal changes
                changesToSave.goalChanges.forEach(
                  ({ goalId, contribution }) => {
                    onGoalContributionChange?.(goalId, contribution);
                  }
                );

                // Save budget settings to database with local values
                onSave(localSavings, localDebt);
              }

              onClose();
            }}
            style={{
              padding: 8,
              backgroundColor: hasChanges()
                ? colors.success
                : colors.surfaceSecondary,
              borderRadius: 8,
              opacity: hasChanges() ? 1 : 0.5,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: hasChanges() ? "white" : colors.textSecondary,
              }}
            >
              Done
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
                {localGoals.length > 0 && (
                  <View
                    style={{
                      width: `${goalsPercentage}%` as any,
                      backgroundColor: colors.info || "#3b82f6",
                      height: 24,
                    }}
                  />
                )}
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
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.success,
                      marginRight: 4,
                    }}
                  />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {localSavings}%
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.error,
                      marginRight: 4,
                    }}
                  />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {localDebt}%
                  </Text>
                </View>
                {localGoals.length > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.info || "#3b82f6",
                        marginRight: 4,
                      }}
                    />
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {goalsPercentage.toFixed(1)}%
                    </Text>
                  </View>
                )}
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.warning,
                      marginRight: 4,
                    }}
                  />
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    {remainingPercentage.toFixed(1)}%
                  </Text>
                </View>
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

          {/* Monthly Summary */}
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
                <Text style={{ color: colors.textSecondary }}>Income:</Text>
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
                <Text style={{ color: colors.textSecondary }}>Expenses:</Text>
                <Text style={{ color: colors.error, fontWeight: "600" }}>
                  -{formatCurrency(totalExpenses)}
                </Text>
              </View>
            </View>

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 8,
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  Net Income:
                </Text>
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  {formatCurrency(netIncome - totalExpenses)}
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

            {localGoals.length > 0 && (
              <View style={{ marginBottom: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: colors.textSecondary }}>
                    Financial Goals:
                  </Text>
                  <Text
                    style={{
                      color: colors.info || "#3b82f6",
                      fontWeight: "600",
                    }}
                  >
                    -{formatCurrency(goalsAmount)}
                  </Text>
                </View>
              </View>
            )}

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
                  {formatCurrency(
                    netIncomeAmount - savingsAmount - debtAmount - goalsAmount
                  )}
                </Text>
              </View>
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
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleSavingsChange(
                    Math.max(0, parseFloat(localSavings) - 5).toString()
                  );
                }}
                style={{
                  padding: 8,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: colors.textSecondary }}>-5%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleSavingsChange(
                    Math.min(100, parseFloat(localSavings) + 5).toString()
                  );
                }}
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
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleDebtChange(
                    Math.max(0, parseFloat(localDebt) - 5).toString()
                  );
                }}
                style={{
                  padding: 8,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: colors.textSecondary }}>-5%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleDebtChange(
                    Math.min(100, parseFloat(localDebt) + 5).toString()
                  );
                }}
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

          {/* Financial Goals */}
          {localGoals.length > 0 && (
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
                      backgroundColor: colors.info + "20",
                      padding: 8,
                      borderRadius: 8,
                      marginRight: 12,
                    }}
                  >
                    <Ionicons
                      name="flag"
                      size={16}
                      color={colors.info || "#3b82f6"}
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
                      Financial Goals
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                      }}
                    >
                      {formatCurrency(goalsAmount)} per month
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.info || "#3b82f6",
                  }}
                >
                  {goalsPercentage.toFixed(1)}%
                </Text>
              </View>

              {/* Goals List */}
              <View style={{ marginBottom: 16 }}>
                {localGoals.map((goal) => (
                  <View
                    key={goal.id}
                    style={{
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: colors.text,
                          }}
                        >
                          {goal.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.textSecondary,
                          }}
                        >
                          {formatCurrency(goal.currentAmount)} /{" "}
                          {formatCurrency(goal.targetAmount)}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: colors.info || "#3b82f6",
                        }}
                      >
                        {formatCurrency(goal.monthlyContribution)}
                      </Text>
                    </View>

                    {/* Progress Bar */}
                    <View
                      style={{
                        height: 6,
                        backgroundColor: colors.border,
                        borderRadius: 3,
                        marginBottom: 12,
                      }}
                    >
                      <View
                        style={{
                          width: `${
                            (goal.currentAmount / goal.targetAmount) * 100
                          }%`,
                          height: 6,
                          backgroundColor: colors.info || "#3b82f6",
                          borderRadius: 3,
                        }}
                      />
                    </View>

                    {/* Contribution Controls */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                        }}
                      >
                        Monthly Contribution:
                      </Text>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light
                            );
                            const newContribution = Math.max(
                              0,
                              goal.monthlyContribution - 50
                            );
                            handleGoalContributionChange(
                              goal.id,
                              newContribution
                            );
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            backgroundColor: colors.error + "20",
                            borderRadius: 16,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: colors.error + "40",
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={{
                              color: colors.error,
                              fontSize: 14,
                              fontWeight: "600",
                            }}
                          >
                            -
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            Haptics.impactAsync(
                              Haptics.ImpactFeedbackStyle.Light
                            );
                            const newContribution =
                              goal.monthlyContribution + 50;
                            handleGoalContributionChange(
                              goal.id,
                              newContribution
                            );
                          }}
                          style={{
                            width: 32,
                            height: 32,
                            backgroundColor: colors.success + "20",
                            borderRadius: 16,
                            alignItems: "center",
                            justifyContent: "center",
                            borderWidth: 1,
                            borderColor: colors.success + "40",
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={{
                              color: colors.success,
                              fontSize: 14,
                              fontWeight: "600",
                            }}
                          >
                            +
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Overall Goals Progress Bar - Only show if multiple goals */}
              {localGoals.length > 1 && (
                <View
                  style={{
                    height: 8,
                    backgroundColor: colors.border,
                    borderRadius: 4,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${Math.min(goalsPercentage, 100)}%` as any,
                      height: 8,
                      backgroundColor: colors.info || "#3b82f6",
                      borderRadius: 4,
                    }}
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};
