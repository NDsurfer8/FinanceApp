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
  ActivityIndicator,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
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
import { formatNumberWithCommas, removeCommas } from "../utils/formatNumber";
import { useTransactionLimits } from "../hooks/useTransactionLimits";
import { usePaywall } from "../hooks/usePaywall";
import { StandardHeader } from "../components/StandardHeader";

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
  const { goals, updateDataOptimistically } = useZeroLoading();
  const { canAddGoal, getGoalLimitInfo } = useTransactionLimits();
  const { presentPaywall } = usePaywall();
  const { editMode = false, goal = undefined } =
    (route.params as RouteParams) || {};
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  // Initialize with a default date (1 year from now)
  const getDefaultDate = () => {
    const defaultDate = new Date();
    defaultDate.setFullYear(defaultDate.getFullYear() + 1);
    return defaultDate;
  };

  const [formData, setFormData] = useState({
    name: editMode && goal ? goal.name || "" : "",
    targetAmount: editMode && goal ? goal.targetAmount?.toString() || "" : "",
    currentAmount: editMode && goal ? goal.currentAmount?.toString() || "" : "",
    monthlyContribution:
      editMode && goal ? goal.monthlyContribution?.toString() || "" : "",
    targetDate:
      editMode && goal && goal.targetDate
        ? new Date(goal.targetDate)
        : getDefaultDate(),
    category: editMode && goal ? goal.category || "emergency" : "emergency",
    priority:
      editMode && goal
        ? goal.priority || "medium"
        : ("medium" as "medium" | "high" | "low"),
  });

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setFormData({
        ...formData,
        targetDate: selectedDate,
      });
    }
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateForStorage = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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

    try {
      setLoading(true);

      if (editMode && goal && goal.id) {
        // Update existing goal
        const updatedGoal = {
          ...goal,
          name: formData.name,
          targetAmount: parseFloat(removeCommas(formData.targetAmount)),
          currentAmount: parseFloat(removeCommas(formData.currentAmount)),
          monthlyContribution: parseFloat(
            removeCommas(formData.monthlyContribution)
          ),
          targetDate: formatDateForStorage(formData.targetDate),
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
          targetAmount: parseFloat(removeCommas(formData.targetAmount)),
          currentAmount: parseFloat(removeCommas(formData.currentAmount)),
          monthlyContribution: parseFloat(
            removeCommas(formData.monthlyContribution)
          ),
          targetDate: formatDateForStorage(formData.targetDate),
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
    if (!user || !editMode || !goal || !goal.id) {
      Alert.alert("Error", "Cannot delete goal");
      return;
    }

    setDeleteLoading(true);

    try {
      Alert.alert(
        "Delete Confirmation",
        "Are you sure you want to delete this goal? This action cannot be undone.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setDeleteLoading(false);
            },
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                // Optimistic update
                const updatedGoals = goals.filter((g) => g.id !== goal.id);
                updateDataOptimistically({ goals: updatedGoals });

                // Delete from database
                await removeGoal(user.uid, goal.id!);

                Alert.alert("Success", "Goal deleted successfully!", [
                  { text: "OK", onPress: () => navigation.goBack() },
                ]);
              } catch (error) {
                console.error("Error deleting goal:", error);
                Alert.alert(
                  "Error",
                  "Failed to delete goal. Please try again."
                );
              } finally {
                setDeleteLoading(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in delete confirmation:", error);
      setDeleteLoading(false);
    }
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
          <StandardHeader
            title={`${editMode ? "Edit" : "Add"} Goal`}
            onBack={() => navigation.goBack()}
          />

          {/* Form Fields */}
          {/* Goal Description */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Goal Description *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.card,
              }}
              placeholder="e.g., Emergency Fund"
              placeholderTextColor={colors.textSecondary}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          {/* Category */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 12,
              }}
            >
              Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 8 }}
            >
              {goalCategories.map((category) => (
                <TouchableOpacity
                  key={category.key}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    marginRight: 12,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      formData.category === category.key
                        ? category.color
                        : colors.border,
                    backgroundColor:
                      formData.category === category.key
                        ? category.color + "20"
                        : "transparent",
                    alignItems: "center",
                    flexDirection: "row",
                    minWidth: 120,
                  }}
                  onPress={() =>
                    setFormData({ ...formData, category: category.key })
                  }
                >
                  <Ionicons
                    name={category.icon as any}
                    size={18}
                    color={
                      formData.category === category.key
                        ? category.color
                        : colors.textSecondary
                    }
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color:
                        formData.category === category.key
                          ? category.color
                          : colors.text,
                    }}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Target Amount */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Goal Target Amount *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.card,
              }}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={formatNumberWithCommas(formData.targetAmount)}
              onChangeText={(text) => {
                const cleanValue = removeCommas(text);
                setFormData({ ...formData, targetAmount: cleanValue });
              }}
              keyboardType="numeric"
            />
          </View>

          {/* Current Amount */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Current Amount Saved *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.card,
              }}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={formatNumberWithCommas(formData.currentAmount)}
              onChangeText={(text) => {
                const cleanValue = removeCommas(text);
                setFormData({ ...formData, currentAmount: cleanValue });
              }}
              keyboardType="numeric"
            />
          </View>

          {/* Monthly Contribution */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Monthly Contribution *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: colors.text,
                backgroundColor: colors.card,
              }}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={formatNumberWithCommas(formData.monthlyContribution)}
              onChangeText={(text) => {
                const cleanValue = removeCommas(text);
                setFormData({ ...formData, monthlyContribution: cleanValue });
              }}
              keyboardType="numeric"
            />
          </View>

          {/* Target Date */}
          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Target Achievement Date
            </Text>
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: colors.card,
              }}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: colors.text,
                  flex: 1,
                }}
              >
                {formatDateForDisplay(formData.targetDate)}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Priority */}
          <View style={{ marginBottom: 32 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 12,
              }}
            >
              Priority
            </Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {(["low", "medium", "high"] as const).map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor:
                      formData.priority === priority
                        ? priorityColors[priority]
                        : colors.border,
                    backgroundColor:
                      formData.priority === priority
                        ? priorityColors[priority] + "20"
                        : "transparent",
                    alignItems: "center",
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

          {/* Action Buttons */}
          <View style={{ marginTop: 20, gap: 16 }}>
            {/* Save Button */}
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                padding: 18,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                shadowColor: colors.primary,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 8,
              }}
              onPress={handleSave}
              disabled={loading}
            >
              {loading && (
                <ActivityIndicator
                  size="small"
                  color="white"
                  style={{ marginRight: 8 }}
                />
              )}
              <Text
                style={{
                  color: "white",
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                {editMode ? "Update" : "Save"} Goal
              </Text>
            </TouchableOpacity>

            {/* Delete Button (only in edit mode) */}
            {editMode && (
              <TouchableOpacity
                style={{
                  backgroundColor: colors.error + "20",
                  padding: 18,
                  borderRadius: 12,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.error,
                }}
                onPress={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading && (
                  <ActivityIndicator
                    size="small"
                    color={colors.error}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text
                  style={{
                    color: colors.error,
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  Delete Goal
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              width: "90%",
              maxWidth: 400,
              shadowColor: colors.shadow,
              shadowOpacity: 0.25,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            }}
            onStartShouldSetResponder={() => true}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.text,
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              Select Target Date
            </Text>
            <View
              style={{
                alignItems: "center",
                marginVertical: 10,
              }}
            >
              <DateTimePicker
                value={formData.targetDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  width: "100%",
                }}
                textColor={colors.text}
                minimumDate={new Date()}
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginTop: 20,
              }}
            >
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: colors.border,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                onPress={() => setShowDatePicker(false)}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                onPress={() => setShowDatePicker(false)}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};
