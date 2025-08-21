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
import { useTheme } from "../contexts/ThemeContext";
import { useZeroLoading } from "../hooks/useZeroLoading";
import {
  saveGoal,
  updateGoal,
  removeGoal,
  FinancialGoal,
} from "../services/userData";
import { useTransactionLimits } from "../hooks/useTransactionLimits";
import { usePaywall } from "../hooks/usePaywall";

interface AddGoalScreenProps {
  navigation: any;
  route: any;
}

interface RouteParams {
  editMode?: boolean;
  goal?: FinancialGoal;
}

export const AddGoalScreen: React.FC<AddGoalScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { goals, updateDataOptimistically, refreshInBackground } =
    useZeroLoading();
  const { canAddGoal, getGoalLimitInfo } = useTransactionLimits();
  const { presentPaywall } = usePaywall();
  const { editMode, goal } = route.params as RouteParams;
  const [loading, setLoading] = useState(false);

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

  const [formData, setFormData] = useState({
    name: editMode ? goal?.name || "" : "",
    targetAmount: editMode ? goal?.targetAmount?.toString() || "" : "",
    currentAmount: editMode ? goal?.currentAmount?.toString() || "" : "",
    monthlyContribution: editMode
      ? goal?.monthlyContribution?.toString() || ""
      : "",
    targetDate: editMode
      ? goal?.targetDate ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0]
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
    category: editMode ? goal?.category || "savings" : "savings",
    priority: editMode
      ? goal?.priority || "medium"
      : ("medium" as "medium" | "high" | "low"),
  });

  const handleSave = async () => {
    if (
      !formData.name ||
      !formData.targetAmount ||
      !formData.currentAmount ||
      !formData.monthlyContribution
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to save goals");
      return;
    }

    // Check goal limits (only for new goals, not edits)
    if (!editMode) {
      if (!canAddGoal()) {
        const limitInfo = getGoalLimitInfo();
        if (!limitInfo.isUnlimited) {
          Alert.alert(
            "Goal Limit Reached",
            `You've reached your limit of ${limitInfo.limit} goals on the free plan.\n\nUpgrade to Premium for unlimited goals!`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Upgrade to Premium", onPress: presentPaywall },
            ]
          );
        }
        return;
      }
    }

    try {
      setLoading(true);

      if (editMode && goal) {
        // Update existing goal
        const updatedGoal = {
          ...goal,
          name: formData.name,
          targetAmount: parseFloat(formData.targetAmount),
          currentAmount: parseFloat(formData.currentAmount),
          monthlyContribution: parseFloat(formData.monthlyContribution),
          targetDate: formData.targetDate,
          category: formData.category,
          priority: formData.priority,
          updatedAt: Date.now(),
        };

        // Optimistic update
        const updatedGoals = goals.map((g) =>
          g.id === goal.id ? updatedGoal : g
        );
        updateDataOptimistically({ goals: updatedGoals });

        // Update in database
        await updateGoal(updatedGoal);

        Alert.alert("Success", "Goal updated successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        // Create new goal
        const newGoal = {
          id: `temp-${Date.now()}`,
          name: formData.name,
          targetAmount: parseFloat(formData.targetAmount),
          currentAmount: parseFloat(formData.currentAmount),
          monthlyContribution: parseFloat(formData.monthlyContribution),
          targetDate: formData.targetDate,
          category: formData.category,
          priority: formData.priority,
          userId: user.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Optimistic update - add to UI immediately
        const updatedGoals = [...goals, newGoal];
        updateDataOptimistically({ goals: updatedGoals });

        // Save to database in background
        const savedGoalId = await saveGoal(newGoal);

        // Update with real ID from database
        const finalGoals = updatedGoals.map((g) =>
          g.id === newGoal.id ? { ...g, id: savedGoalId } : g
        );
        updateDataOptimistically({ goals: finalGoals });

        Alert.alert("Success", "Goal saved successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error("Error saving goal:", error);
      Alert.alert("Error", "Failed to save goal. Please try again.");

      // Revert optimistic update on error
      if (!editMode) {
        const revertedGoals = goals.filter((g) => !g.id.startsWith("temp-"));
        updateDataOptimistically({ goals: revertedGoals });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !editMode || !goal) {
      Alert.alert("Error", "Cannot delete goal");
      return;
    }

    Alert.alert(
      "Delete Confirmation",
      "Are you sure you want to delete this goal? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Optimistic update
              const updatedGoals = goals.filter((g) => g.id !== goal.id);
              updateDataOptimistically({ goals: updatedGoals });

              // Delete from database
              await removeGoal(user.uid, goal.id);

              Alert.alert("Success", "Goal deleted successfully!", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error("Error deleting goal:", error);
              Alert.alert("Error", "Failed to delete goal. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text
              style={{ fontSize: 20, fontWeight: "600", color: colors.text }}
            >
              {editMode ? "Edit" : "Add"} Goal
            </Text>
          </View>

          {/* Form */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              shadowColor: colors.shadow,
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            {/* Goal Name */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                Goal Name *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.text,
                }}
                placeholder="e.g., Emergency Fund"
                placeholderTextColor={colors.textSecondary}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />
            </View>

            {/* Category */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                Category *
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {goalCategories.map((category) => (
                  <TouchableOpacity
                    key={category.key}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor:
                        formData.category === category.key
                          ? category.color + "20"
                          : colors.surfaceSecondary,
                      borderWidth: 1,
                      borderColor:
                        formData.category === category.key
                          ? category.color
                          : colors.border,
                    }}
                    onPress={() =>
                      setFormData({ ...formData, category: category.key })
                    }
                  >
                    <Text
                      style={{
                        color:
                          formData.category === category.key
                            ? category.color
                            : colors.text,
                        fontSize: 14,
                        fontWeight: "500",
                      }}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Target Amount */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                Target Amount *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.text,
                }}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={formData.targetAmount}
                onChangeText={(text) =>
                  setFormData({ ...formData, targetAmount: text })
                }
                keyboardType="decimal-pad"
              />
            </View>

            {/* Current Amount */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                Current Amount *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.text,
                }}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={formData.currentAmount}
                onChangeText={(text) =>
                  setFormData({ ...formData, currentAmount: text })
                }
                keyboardType="decimal-pad"
              />
            </View>

            {/* Monthly Contribution */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                Monthly Contribution *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.text,
                }}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={formData.monthlyContribution}
                onChangeText={(text) =>
                  setFormData({ ...formData, monthlyContribution: text })
                }
                keyboardType="decimal-pad"
              />
            </View>

            {/* Target Date */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                Target Date *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.text,
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={formData.targetDate}
                onChangeText={(text) =>
                  setFormData({ ...formData, targetDate: text })
                }
              />
            </View>

            {/* Priority */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                  color: colors.text,
                }}
              >
                Priority *
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["low", "medium", "high"] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor:
                        formData.priority === priority
                          ? priorityColors[priority] + "20"
                          : colors.surfaceSecondary,
                      borderWidth: 1,
                      borderColor:
                        formData.priority === priority
                          ? priorityColors[priority]
                          : colors.border,
                    }}
                    onPress={() => setFormData({ ...formData, priority })}
                  >
                    <Text
                      style={{
                        color:
                          formData.priority === priority
                            ? priorityColors[priority]
                            : colors.text,
                        fontSize: 14,
                        fontWeight: "500",
                        textTransform: "capitalize",
                      }}
                    >
                      {priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              borderRadius: 12,
              padding: 16,
              alignItems: "center",
              marginTop: 24,
            }}
            onPress={handleSave}
            disabled={loading}
          >
            <Text
              style={{
                color: colors.buttonText,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {editMode ? "Update" : "Save"} Goal
            </Text>
          </TouchableOpacity>

          {/* Delete Button (only show in edit mode) */}
          {editMode && (
            <TouchableOpacity
              style={{
                backgroundColor: colors.error,
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
                marginTop: 12,
              }}
              onPress={handleDelete}
              disabled={loading}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Delete Goal
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
