import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import {
  getUserGoals,
  saveGoal,
  updateGoal,
  removeGoal,
  FinancialGoal as FinancialGoalType,
} from "../services/userData";

interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  targetDate: string;
  category: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
}

interface GoalTrackingScreenProps {
  navigation: any;
}

export const GoalTrackingScreen: React.FC<GoalTrackingScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "",
    monthlyContribution: "",
    targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    category: "savings",
    priority: "medium" as const,
  });

  const goalCategories = [
    {
      key: "emergency",
      label: "Emergency Fund",
      icon: "shield-checkmark",
      color: "#d97706",
    },
    { key: "vacation", label: "Vacation", icon: "airplane", color: "#3b82f6" },
    {
      key: "downpayment",
      label: "Down Payment",
      icon: "home",
      color: "#16a34a",
    },
    { key: "car", label: "New Car", icon: "car", color: "#8b5cf6" },
    { key: "wedding", label: "Wedding", icon: "heart", color: "#ec4899" },
    { key: "education", label: "Education", icon: "school", color: "#f59e0b" },
    {
      key: "retirement",
      label: "Retirement",
      icon: "trending-up",
      color: "#10b981",
    },
    { key: "other", label: "Other", icon: "star", color: "#6b7280" },
  ];

  const priorityColors = {
    high: "#dc2626",
    medium: "#d97706",
    low: "#16a34a",
  };

  const loadGoals = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userGoals = await getUserGoals(user.uid);
      setGoals(userGoals);
    } catch (error) {
      console.error("Error loading goals:", error);
      Alert.alert("Error", "Failed to load goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadGoals();
      }
    }, [user])
  );

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const calculateProgress = (goal: FinancialGoal) => {
    return goal.targetAmount > 0
      ? (goal.currentAmount / goal.targetAmount) * 100
      : 0;
  };

  const calculateMonthsToGoal = (goal: FinancialGoal) => {
    const remaining = goal.targetAmount - goal.currentAmount;
    if (goal.monthlyContribution <= 0) return Infinity;
    return Math.ceil(remaining / goal.monthlyContribution);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "#16a34a";
    if (progress >= 75) return "#d97706";
    if (progress >= 50) return "#f59e0b";
    return "#dc2626";
  };

  const getProgressStatus = (progress: number) => {
    if (progress >= 100) return "Completed!";
    if (progress >= 75) return "Almost There";
    if (progress >= 50) return "Halfway There";
    if (progress >= 25) return "Getting Started";
    return "Just Starting";
  };

  const handleAddGoal = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to add goals");
      return;
    }

    if (
      !newGoal.name ||
      !newGoal.targetAmount ||
      !newGoal.monthlyContribution
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      const goal: FinancialGoalType = {
        name: newGoal.name,
        targetAmount: parseFloat(newGoal.targetAmount),
        currentAmount: parseFloat(newGoal.currentAmount) || 0,
        monthlyContribution: parseFloat(newGoal.monthlyContribution),
        targetDate: newGoal.targetDate,
        category: newGoal.category,
        priority: newGoal.priority,
        userId: user.uid,
      };

      await saveGoal(goal);
      await loadGoals(); // Reload goals from database
      setShowAddModal(false);
      setNewGoal({
        name: "",
        targetAmount: "",
        currentAmount: "",
        monthlyContribution: "",
        targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        category: "savings",
        priority: "medium",
      });
      Alert.alert("Success", "Goal added successfully!");
    } catch (error) {
      console.error("Error adding goal:", error);
      Alert.alert("Error", "Failed to add goal. Please try again.");
    }
  };

  const handleUpdateGoal = async (goalId: string, newAmount: number) => {
    if (!user) return;

    try {
      const goalToUpdate = goals.find((goal) => goal.id === goalId);
      if (!goalToUpdate) return;

      const updatedGoal: FinancialGoalType = {
        ...goalToUpdate,
        currentAmount: newAmount,
        userId: user.uid,
      };

      await updateGoal(updatedGoal);
      await loadGoals(); // Reload goals from database
      Alert.alert("Success", "Goal updated successfully!");
    } catch (error) {
      console.error("Error updating goal:", error);
      Alert.alert("Error", "Failed to update goal. Please try again.");
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!user) return;

    Alert.alert("Delete Goal", "Are you sure you want to delete this goal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeGoal(user.uid, goalId);
            await loadGoals(); // Reload goals from database
            Alert.alert("Success", "Goal deleted successfully!");
          } catch (error) {
            console.error("Error deleting goal:", error);
            Alert.alert("Error", "Failed to delete goal. Please try again.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ fontSize: 16, color: "#6b7280" }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View>
            <Text style={{ fontSize: 28, fontWeight: "800", color: "#1f2937" }}>
              Financial Goals
            </Text>
            <Text style={{ fontSize: 16, color: "#6b7280", marginTop: 4 }}>
              Track your progress
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={{
              backgroundColor: "#6366f1",
              padding: 12,
              borderRadius: 12,
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Goals Summary */}
        {goals.length > 0 && (
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
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 20,
                color: "#1f2937",
              }}
            >
              Goals Summary
            </Text>

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}
                >
                  Total Goals
                </Text>
                <Text
                  style={{ fontSize: 18, fontWeight: "700", color: "#374151" }}
                >
                  {goals.length}
                </Text>
              </View>
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}
                >
                  Total Target
                </Text>
                <Text
                  style={{ fontSize: 18, fontWeight: "700", color: "#16a34a" }}
                >
                  {formatCurrency(
                    goals.reduce((sum, goal) => sum + goal.targetAmount, 0)
                  )}
                </Text>
              </View>
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{ fontSize: 14, color: "#6b7280", marginBottom: 4 }}
                >
                  Total Saved
                </Text>
                <Text
                  style={{ fontSize: 18, fontWeight: "700", color: "#d97706" }}
                >
                  {formatCurrency(
                    goals.reduce((sum, goal) => sum + goal.currentAmount, 0)
                  )}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Goals List */}
        {goals.length === 0 ? (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 40,
              alignItems: "center",
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <Ionicons
              name="flag-outline"
              size={48}
              color="#6b7280"
              style={{ marginBottom: 16 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 8,
              }}
            >
              No Goals Yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#6b7280",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              Start by adding your first financial goal
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={{
                backgroundColor: "#6366f1",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Add Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          goals.map((goal) => {
            const progress = calculateProgress(goal);
            const monthsToGoal = calculateMonthsToGoal(goal);
            const category = goalCategories.find(
              (cat) => cat.key === goal.category
            );

            return (
              <View
                key={goal.id}
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
                {/* Goal Header */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: `${category?.color}20`,
                        padding: 8,
                        borderRadius: 10,
                        marginRight: 12,
                      }}
                    >
                      <Ionicons
                        name={category?.icon as any}
                        size={20}
                        color={category?.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "700",
                          color: "#374151",
                        }}
                      >
                        {goal.name}
                      </Text>
                      <Text style={{ fontSize: 14, color: "#6b7280" }}>
                        {category?.label}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        backgroundColor: `${priorityColors[goal.priority]}20`,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                        marginRight: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: priorityColors[goal.priority],
                          textTransform: "uppercase",
                        }}
                      >
                        {goal.priority}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteGoal(goal.id)}>
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#dc2626"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={{ marginBottom: 16 }}>
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
                        backgroundColor: getProgressColor(progress),
                        width: `${Math.min(progress, 100)}%`,
                      }}
                    />
                  </View>
                </View>

                {/* Progress Info */}
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "800",
                      color: getProgressColor(progress),
                      marginBottom: 4,
                    }}
                  >
                    {formatCurrency(goal.currentAmount)}
                  </Text>
                  <Text
                    style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}
                  >
                    {getProgressStatus(progress)}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#6b7280" }}>
                    {progress.toFixed(1)}% of{" "}
                    {formatCurrency(goal.targetAmount)}
                  </Text>
                </View>

                {/* Goal Details */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#6b7280",
                        marginBottom: 4,
                      }}
                    >
                      Target
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#374151",
                      }}
                    >
                      {formatCurrency(goal.targetAmount)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#6b7280",
                        marginBottom: 4,
                      }}
                    >
                      Monthly
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#16a34a",
                      }}
                    >
                      {formatCurrency(goal.monthlyContribution)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: "#6b7280",
                        marginBottom: 4,
                      }}
                    >
                      {monthsToGoal === Infinity ? "No Date" : "Months Left"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: "#d97706",
                      }}
                    >
                      {monthsToGoal === Infinity ? "∞" : monthsToGoal}
                    </Text>
                  </View>
                </View>

                {/* Quick Update Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: "#f3f4f6",
                    padding: 12,
                    borderRadius: 12,
                    marginTop: 16,
                    alignItems: "center",
                  }}
                  onPress={() => {
                    Alert.prompt(
                      "Update Progress",
                      `Current amount: ${formatCurrency(goal.currentAmount)}`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Update",
                          onPress: (value) => {
                            const newAmount = parseFloat(value || "0");
                            if (!isNaN(newAmount)) {
                              handleUpdateGoal(goal.id, newAmount);
                            }
                          },
                        },
                      ],
                      "plain-text",
                      goal.currentAmount.toString()
                    );
                  }}
                >
                  <Text style={{ color: "#374151", fontWeight: "600" }}>
                    Update Progress
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Add Goal Modal */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddModal(false)}
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
                width: "90%",
                maxWidth: 400,
                maxHeight: "85%",
              }}
            >
              <View style={{ padding: 24, paddingBottom: 0 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    marginBottom: 20,
                    color: "#1f2937",
                  }}
                >
                  Add New Goal
                </Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24 }}
              >
                {/* Goal Name */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
                  >
                    Goal Name *
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: "#d1d5db",
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                    }}
                    value={newGoal.name}
                    onChangeText={(text) =>
                      setNewGoal({ ...newGoal, name: text })
                    }
                    placeholder="e.g., Emergency Fund"
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
                    {goalCategories.map((category) => (
                      <TouchableOpacity
                        key={category.key}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor:
                            newGoal.category === category.key
                              ? category.color
                              : "#f3f4f6",
                          marginRight: 8,
                          minWidth: 80,
                          alignItems: "center",
                        }}
                        onPress={() =>
                          setNewGoal({ ...newGoal, category: category.key })
                        }
                      >
                        <Text
                          style={{
                            color:
                              newGoal.category === category.key
                                ? "#fff"
                                : "#374151",
                            fontSize: 14,
                            fontWeight: "500",
                          }}
                        >
                          {category.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Target Amount */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
                  >
                    Target Amount *
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: "#d1d5db",
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                    }}
                    value={newGoal.targetAmount}
                    onChangeText={(text) =>
                      setNewGoal({ ...newGoal, targetAmount: text })
                    }
                    keyboardType="numeric"
                    placeholder="5000"
                  />
                </View>

                {/* Current Amount */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
                  >
                    Current Amount
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: "#d1d5db",
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                    }}
                    value={newGoal.currentAmount}
                    onChangeText={(text) =>
                      setNewGoal({ ...newGoal, currentAmount: text })
                    }
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>

                {/* Monthly Contribution */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
                  >
                    Monthly Contribution *
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: "#d1d5db",
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                    }}
                    value={newGoal.monthlyContribution}
                    onChangeText={(text) =>
                      setNewGoal({ ...newGoal, monthlyContribution: text })
                    }
                    keyboardType="numeric"
                    placeholder="500"
                  />
                </View>

                {/* Priority */}
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
                  >
                    Priority
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {(["high", "medium", "low"] as const).map((priority) => (
                      <TouchableOpacity
                        key={priority}
                        style={{
                          flex: 1,
                          padding: 12,
                          borderRadius: 8,
                          backgroundColor:
                            newGoal.priority === priority
                              ? priorityColors[priority]
                              : "#f3f4f6",
                          alignItems: "center",
                        }}
                        onPress={() => setNewGoal({ ...newGoal, priority })}
                      >
                        <Text
                          style={{
                            color:
                              newGoal.priority === priority
                                ? "#fff"
                                : "#374151",
                            fontWeight: "600",
                            textTransform: "capitalize",
                          }}
                        >
                          {priority}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Target Date */}
                <View style={{ marginBottom: 24 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}
                  >
                    Target Date
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: "#d1d5db",
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 16,
                    }}
                    value={newGoal.targetDate}
                    onChangeText={(text) =>
                      setNewGoal({ ...newGoal, targetDate: text })
                    }
                    placeholder="YYYY-MM-DD"
                  />
                </View>

                {/* Buttons */}
                <View
                  style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}
                >
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: "#f3f4f6",
                    }}
                    onPress={() => setShowAddModal(false)}
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
                      backgroundColor: "#6366f1",
                    }}
                    onPress={handleAddGoal}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color: "#fff",
                        fontWeight: "600",
                      }}
                    >
                      Add Goal
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};
