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
  ActivityIndicator,
  Animated,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import { useZeroLoading } from "../hooks/useZeroLoading";
import { useTransactionLimits } from "../hooks/useTransactionLimits";
import { usePaywall } from "../hooks/usePaywall";
import { useTheme } from "../contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { StandardHeader } from "../components/StandardHeader";
import {
  saveGoal,
  updateGoal,
  removeGoal,
  FinancialGoal,
} from "../services/userData";
import { formatNumberWithCommas, removeCommas } from "../utils/formatNumber";
import { formatDateToLocalString, createLocalDate } from "../utils/dateUtils";
import { FloatingAIChatbot } from "../components/FloatingAIChatbot";
import { useScrollDetection } from "../hooks/useScrollDetection";

interface GoalTrackingScreenProps {
  navigation: any;
}

type GoalTrackingRouteParams = {
  openAddModal?: boolean;
};

export const GoalTrackingScreen: React.FC<GoalTrackingScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { goals, updateDataOptimistically, refreshInBackground } =
    useZeroLoading();
  const { canAddGoal, getGoalLimitInfo } = useTransactionLimits();
  const { isScrolling, handleScrollBegin, handleScrollEnd } =
    useScrollDetection();
  const { presentPaywall } = usePaywall();
  const route = useRoute();
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: "",
    targetAmount: "",
    currentAmount: "",
    monthlyContribution: "",
    targetDate: formatDateToLocalString(
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    ),
    category: "savings",
    priority: "medium" as "medium" | "high" | "low",
  });
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Animation for glow effect when no goals
  const glowAnim = React.useRef(new Animated.Value(0)).current;

  const goalCategories = [
    {
      key: "emergency",
      label: t("goals.categories.emergency_fund"),
      icon: "shield-checkmark",
      color: "#d97706",
    },
    {
      key: "vacation",
      label: t("goals.categories.vacation"),
      icon: "airplane",
      color: "#3b82f6",
    },
    {
      key: "downpayment",
      label: t("goals.categories.down_payment"),
      icon: "home",
      color: "#16a34a",
    },
    {
      key: "car",
      label: t("goals.categories.new_car"),
      icon: "car",
      color: "#8b5cf6",
    },
    {
      key: "wedding",
      label: t("goals.categories.wedding"),
      icon: "heart",
      color: "#ec4899",
    },
    {
      key: "education",
      label: t("goals.categories.education"),
      icon: "school",
      color: "#f59e0b",
    },
    {
      key: "retirement",
      label: t("goals.categories.retirement"),
      icon: "trending-up",
      color: "#10b981",
    },
    {
      key: "other",
      label: t("goals.categories.other"),
      icon: "star",
      color: "#6b7280",
    },
  ];

  const priorityColors = {
    high: "#dc2626",
    medium: "#d97706",
    low: "#16a34a",
  };

  // Date picker handlers
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      const formattedDate = formatDateToLocalString(selectedDate);
      setNewGoal({ ...newGoal, targetDate: formattedDate });
    }
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  // Background refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        refreshInBackground();
      }
    }, [user, refreshInBackground])
  );

  // Check if we should open the add modal from navigation params
  useEffect(() => {
    const params = route.params as GoalTrackingRouteParams | undefined;
    const openAddModal = params?.openAddModal;
    if (openAddModal) {
      setShowAddModal(true);
      // Clear the parameter so it doesn't open again on subsequent visits
      navigation.setParams({ openAddModal: false });
    }
  }, [route.params, navigation]);

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = createLocalDate(dateString);
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

  const calculateTimeRemaining = (goal: FinancialGoal) => {
    if (!goal.targetDate) return t("goals.time.no_date");

    const now = new Date();
    const targetDate = createLocalDate(goal.targetDate);
    const timeDiff = targetDate.getTime() - now.getTime();

    if (timeDiff <= 0) return t("goals.time.overdue");

    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (daysRemaining >= 365) {
      const years = Math.floor(daysRemaining / 365);
      const months = Math.floor((daysRemaining % 365) / 30);
      if (months > 0) {
        return `${years}y ${months}m`;
      }
      return `${years}y`;
    } else if (daysRemaining >= 30) {
      const months = Math.floor(daysRemaining / 30);
      const weeks = Math.floor((daysRemaining % 30) / 7);
      if (weeks > 0) {
        return `${months}m ${weeks}w`;
      }
      return `${months}m`;
    } else if (daysRemaining >= 7) {
      const weeks = Math.floor(daysRemaining / 7);
      const days = daysRemaining % 7;
      if (days > 0) {
        return `${weeks}w ${days}d`;
      }
      return `${weeks}w`;
    } else {
      return `${daysRemaining}d`;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return colors.success;
    if (progress >= 75) return "#d97706";
    if (progress >= 50) return "#f59e0b";
    return colors.error;
  };

  const getProgressStatus = (progress: number) => {
    if (progress >= 100) return t("goals.status.completed");
    if (progress >= 75) return t("goals.status.almost_there");
    if (progress >= 50) return t("goals.status.halfway_there");
    if (progress >= 25) return t("goals.status.getting_started");
    return t("goals.status.just_starting");
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
      if (isEditMode && editingGoal) {
        // Update existing goal
        const updatedGoal = {
          ...editingGoal,
          name: newGoal.name,
          targetAmount: parseFloat(removeCommas(newGoal.targetAmount)),
          currentAmount: parseFloat(removeCommas(newGoal.currentAmount)) || 0,
          monthlyContribution: parseFloat(
            removeCommas(newGoal.monthlyContribution)
          ),
          targetDate: newGoal.targetDate,
          category: newGoal.category,
          priority: newGoal.priority,
          updatedAt: Date.now(),
        };

        // Optimistic update
        const updatedGoals = goals.map((g) =>
          g.id === editingGoal.id ? updatedGoal : g
        );
        updateDataOptimistically({ goals: updatedGoals });

        // Update in database
        await updateGoal(updatedGoal);

        setShowAddModal(false);
        setIsEditMode(false);
        setEditingGoal(null);
        setNewGoal({
          name: "",
          targetAmount: "",
          currentAmount: "",
          monthlyContribution: "",
          targetDate: formatDateToLocalString(
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          ),
          category: "savings",
          priority: "medium",
        });
        Alert.alert(t("common.success"), "Goal updated successfully!");
      } else {
        // Create new goal
        const goal: FinancialGoal = {
          name: newGoal.name,
          targetAmount: parseFloat(removeCommas(newGoal.targetAmount)),
          currentAmount: parseFloat(removeCommas(newGoal.currentAmount)) || 0,
          monthlyContribution: parseFloat(
            removeCommas(newGoal.monthlyContribution)
          ),
          targetDate: newGoal.targetDate,
          category: newGoal.category,
          priority: newGoal.priority,
          userId: user.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Optimistic update - add to UI immediately
        const tempGoal = { ...goal, id: `temp-${Date.now()}` };
        const updatedGoals = [...goals, tempGoal];
        updateDataOptimistically({ goals: updatedGoals });

        // Save to database in background
        const savedGoalId = await saveGoal(goal);

        // Update with real ID from database
        const finalGoals = updatedGoals.map((g) =>
          g.id === tempGoal.id ? { ...g, id: savedGoalId } : g
        );
        updateDataOptimistically({ goals: finalGoals });

        setShowAddModal(false);
        setNewGoal({
          name: "",
          targetAmount: "",
          currentAmount: "",
          monthlyContribution: "",
          targetDate: formatDateToLocalString(
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          ),
          category: "savings",
          priority: "medium",
        });
        Alert.alert(t("common.success"), "Goal added successfully!");
      }
    } catch (error) {
      console.error("Error saving goal:", error);
      Alert.alert(
        "Error",
        `Failed to ${isEditMode ? "update" : "add"} goal. Please try again.`
      );

      // Revert optimistic update on error
      if (!isEditMode) {
        const revertedGoals = goals.filter((g) => !g.id.startsWith("temp-"));
        updateDataOptimistically({ goals: revertedGoals });
      }
    }
  };

  const handleUpdateGoal = async (goalId: string, newAmount: number) => {
    if (!user) return;

    try {
      const goalToUpdate = goals.find((goal) => goal.id === goalId);
      if (!goalToUpdate) return;

      const updatedGoal: FinancialGoal = {
        ...goalToUpdate,
        currentAmount: newAmount,
        userId: user.uid,
      };

      // Optimistic update - update UI immediately
      const updatedGoals = goals.map((goal) =>
        goal.id === goalId ? updatedGoal : goal
      );
      updateDataOptimistically({ goals: updatedGoals });

      await updateGoal(updatedGoal);
      await refreshInBackground(); // Reload goals from database
      Alert.alert(t("common.success"), "Goal updated successfully!");
    } catch (error) {
      console.error("Error updating goal:", error);
      Alert.alert("Error", "Failed to update goal. Please try again.");
    }
  };

  const handleDeleteGoal = () => {
    if (!user || !editingGoal) return;

    setDeleteLoading(true);

    try {
      Alert.alert(
        "Delete Goal",
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
                // Optimistic update - remove from UI immediately
                const updatedGoals = goals.filter(
                  (g) => g.id !== editingGoal.id
                );
                updateDataOptimistically({ goals: updatedGoals });

                // Delete from database in background
                await removeGoal(user.uid, editingGoal.id!);

                setShowAddModal(false);
                setIsEditMode(false);
                setEditingGoal(null);
                setNewGoal({
                  name: "",
                  targetAmount: "",
                  currentAmount: "",
                  monthlyContribution: "",
                  targetDate: formatDateToLocalString(
                    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                  ),
                  category: "savings",
                  priority: "medium",
                });
                Alert.alert(t("common.success"), "Goal deleted successfully!");
              } catch (error) {
                console.error("Error deleting goal:", error);
                Alert.alert(
                  "Error",
                  "Failed to delete goal. Please try again."
                );

                // Revert optimistic update on error
                await refreshInBackground();
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

  const handleEditGoal = (goalId: string, field: string, value: string) => {
    setEditingGoalId(goalId);
    setEditingField(field);
    setEditingValue(value);
  };

  const handleSaveGoalEdit = async () => {
    if (!user || !editingGoalId || !editingField) return;

    try {
      const goalToUpdate = goals.find((goal) => goal.id === editingGoalId);
      if (!goalToUpdate) {
        Alert.alert("Error", "Goal not found");
        return;
      }

      let newValue: any = editingValue;

      // Validate and convert based on field type
      if (
        editingField === "targetAmount" ||
        editingField === "currentAmount" ||
        editingField === "monthlyContribution"
      ) {
        const numValue = parseFloat(editingValue);
        if (isNaN(numValue) || numValue < 0) {
          Alert.alert("Error", "Please enter a valid amount");
          return;
        }
        newValue = numValue;
      } else if (editingField === "targetDate") {
        // Validate date format
        const dateValue = new Date(editingValue);
        if (isNaN(dateValue.getTime())) {
          Alert.alert("Error", "Please enter a valid date (YYYY-MM-DD)");
          return;
        }
        newValue = editingValue;
      }

      const updatedGoal: FinancialGoal = {
        ...goalToUpdate,
        [editingField]: newValue,
        userId: user.uid,
      };

      // Optimistic update - update UI immediately
      const updatedGoals = goals.map((goal) =>
        goal.id === editingGoalId ? updatedGoal : goal
      );
      updateDataOptimistically({ goals: updatedGoals });

      await updateGoal(updatedGoal);

      // Reset editing state
      setEditingGoalId(null);
      setEditingField(null);
      setEditingValue("");

      // Reload goals
      await refreshInBackground();
      Alert.alert(t("common.success"), "Goal updated successfully!");
    } catch (error) {
      console.error("Error updating goal:", error);
      Alert.alert("Error", "Failed to update goal");
    }
  };

  const handleCancelEdit = () => {
    setEditingGoalId(null);
    setEditingField(null);
    setEditingValue("");
  };

  // Animate glow effect when no goals
  useEffect(() => {
    if (goals.length === 0) {
      // Start pulsing glow animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      pulseAnimation.start();
    } else {
      // Stop animation and reset
      glowAnim.setValue(0);
    }
  }, [goals.length]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollBegin={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {/* Header */}
        <StandardHeader
          title={t("goals.title")}
          subtitle={t("goals.subtitle")}
          showBackButton={false}
          rightComponent={
            <TouchableOpacity
              onPress={() => navigation.navigate("AddGoal")}
              style={{
                backgroundColor: colors.primary,
                padding: 12,
                borderRadius: 12,
              }}
            >
              <Ionicons name="add" size={20} color={colors.buttonText} />
            </TouchableOpacity>
          }
        />

        {/* Goals Summary */}
        {goals.length > 0 && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              marginBottom: 20,
              shadowColor: colors.shadow,
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
                color: colors.text,
              }}
            >
              {t("goals.summary_title")}
            </Text>

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginBottom: 4,
                  }}
                >
                  {t("goals.total_goals")}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.text,
                  }}
                >
                  {goals.length}
                </Text>
              </View>
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginBottom: 4,
                  }}
                >
                  {t("goals.total_target")}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.success,
                  }}
                >
                  {formatCurrency(
                    goals.reduce((sum, goal) => sum + goal.targetAmount, 0)
                  )}
                </Text>
              </View>
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginBottom: 4,
                  }}
                >
                  {t("goals.total_saved")}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.warning,
                  }}
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
          <Animated.View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 40,
              alignItems: "center",
              shadowColor: colors.primary,
              shadowOpacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.08, 0.3],
              }),
              shadowRadius: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 20],
              }),
              shadowOffset: { width: 0, height: 4 },
              elevation: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 8],
              }),
              borderWidth: 2,
              borderColor: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [colors.primary + "40", colors.primary + "80"],
              }),
            }}
          >
            <Ionicons
              name="flag-outline"
              size={48}
              color={colors.textSecondary}
              style={{ marginBottom: 16 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              {t("goals.no_goals_yet")}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              {t("goals.start_adding_goals")}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("AddGoal")}
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: colors.buttonText, fontWeight: "600" }}>
                {t("goals.add_goal")}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          goals.map((goal) => {
            const progress = calculateProgress(goal);
            const monthsToGoal = calculateMonthsToGoal(goal);
            const category = goalCategories.find(
              (cat) => cat.key === goal.category
            );

            return (
              <TouchableOpacity
                key={goal.id}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 24,
                  padding: 24,
                  marginBottom: 24,
                  shadowColor: colors.shadow,
                  shadowOpacity: 0.12,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 8,
                  borderWidth: 1,
                  borderColor: `${category?.color}15`,
                }}
                onPress={() => {
                  navigation.navigate("AddGoal", {
                    editMode: true,
                    goal: goal,
                  });
                }}
                activeOpacity={0.7}
              >
                {/* Goal Header */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
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
                        backgroundColor: `${category?.color}15`,
                        padding: 12,
                        borderRadius: 16,
                        marginRight: 16,
                        shadowColor: category?.color,
                        shadowOpacity: 0.2,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 4,
                      }}
                    >
                      <Ionicons
                        name={category?.icon as any}
                        size={24}
                        color={category?.color}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "800",
                          color: colors.text,
                          marginBottom: 4,
                          letterSpacing: -0.5,
                        }}
                      >
                        {goal.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: colors.textSecondary,
                          fontWeight: "500",
                        }}
                      >
                        {category?.label}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        backgroundColor: `${
                          priorityColors[
                            goal.priority as keyof typeof priorityColors
                          ]
                        }15`,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 12,
                        marginRight: 12,
                        borderWidth: 1,
                        borderColor: `${
                          priorityColors[
                            goal.priority as keyof typeof priorityColors
                          ]
                        }30`,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color:
                            priorityColors[
                              goal.priority as keyof typeof priorityColors
                            ],
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {t(`goals.priorities.${goal.priority}`)}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: colors.surfaceSecondary,
                        padding: 8,
                        borderRadius: 12,
                      }}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </View>
                  </View>
                </View>

                {/* Progress Bar */}
                <View style={{ marginBottom: 30 }}>
                  <View
                    style={{
                      height: 12,
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: 8,
                      overflow: "hidden",
                      shadowColor: colors.shadow,
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        backgroundColor: getProgressColor(progress),
                        width: `${Math.min(progress, 100)}%`,
                        borderRadius: 8,
                        shadowColor: getProgressColor(progress),
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 2 },
                      }}
                    />
                  </View>

                  {/* Progress Arrow Indicator - Positioned below progress bar */}
                  <View style={{ alignItems: "center", marginTop: 0 }}>
                    <View
                      style={{
                        position: "relative",
                        width: "100%",
                        height: 20,
                      }}
                    >
                      <View
                        style={{
                          position: "absolute",
                          left: `${Math.min(progress, 100)}%`,
                          transform: [{ translateX: -22 }], // Center the arrow
                          alignItems: "center",
                        }}
                      >
                        <Ionicons
                          name="caret-up"
                          size={16}
                          color={getProgressColor(progress)}
                          style={{ marginBottom: 0 }}
                        />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: getProgressColor(progress),
                            backgroundColor: `${getProgressColor(progress)}15`,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 8,
                            overflow: "hidden",
                          }}
                        >
                          {progress.toFixed(0)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Goal Details */}
                <View
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 16,
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginBottom: 6,
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {t("goals.target")}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: colors.text,
                        letterSpacing: -0.3,
                      }}
                    >
                      {formatCurrency(goal.targetAmount)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginBottom: 6,
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {t("goals.monthly")}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: colors.success,
                        letterSpacing: -0.3,
                      }}
                    >
                      {formatCurrency(goal.monthlyContribution)}
                    </Text>
                  </View>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginBottom: 6,
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {t("goals.time_left")}
                    </Text>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "800",
                        color: colors.warning,
                        letterSpacing: -0.3,
                      }}
                    >
                      {calculateTimeRemaining(goal)}
                    </Text>
                  </View>
                </View>

                {/* Target Date */}
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: `${colors.primary}08`,
                    borderRadius: 12,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: `${colors.primary}20`,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textSecondary,
                      marginBottom: 4,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {t("goals.target_achievement_date")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: colors.primary,
                      letterSpacing: -0.2,
                    }}
                  >
                    {goal.targetDate
                      ? formatDate(goal.targetDate)
                      : t("goals.no_date_set")}
                  </Text>
                </View>

                {/* Quick Update Button */}
              </TouchableOpacity>
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
              backgroundColor: colors.modalOverlay,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: colors.modal,
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
                    color: colors.text,
                  }}
                >
                  {isEditMode ? t("goals.edit_goal") : t("goals.add_new_goal")}
                </Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 24 }}
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
                    {t("goals.goal_description")} *
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
                    value={newGoal.name}
                    onChangeText={(text) =>
                      setNewGoal({ ...newGoal, name: text })
                    }
                    placeholder={t("goals.goal_description_placeholder")}
                    placeholderTextColor={colors.textSecondary}
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
                    {t("goals.category")}
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
                              : colors.surfaceSecondary,
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
                                : colors.text,
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
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      marginBottom: 8,
                      color: colors.text,
                    }}
                  >
                    {t("goals.goal_target_amount")} *
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
                    value={formatNumberWithCommas(newGoal.targetAmount)}
                    onChangeText={(text) => {
                      const cleanValue = removeCommas(text);
                      setNewGoal({ ...newGoal, targetAmount: cleanValue });
                    }}
                    keyboardType="decimal-pad"
                    placeholder={t("goals.target_amount_placeholder")}
                    placeholderTextColor={colors.textSecondary}
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
                    {t("goals.current_amount_saved")}
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
                    value={formatNumberWithCommas(newGoal.currentAmount)}
                    onChangeText={(text) => {
                      const cleanValue = removeCommas(text);
                      setNewGoal({ ...newGoal, currentAmount: cleanValue });
                    }}
                    keyboardType="decimal-pad"
                    placeholder={t("goals.current_amount_placeholder")}
                    placeholderTextColor={colors.textSecondary}
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
                    {t("goals.planned_monthly_contribution")} *
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
                    value={formatNumberWithCommas(newGoal.monthlyContribution)}
                    onChangeText={(text) => {
                      const cleanValue = removeCommas(text);
                      setNewGoal({
                        ...newGoal,
                        monthlyContribution: cleanValue,
                      });
                    }}
                    keyboardType="decimal-pad"
                    placeholder={t("goals.monthly_contribution_placeholder")}
                    placeholderTextColor={colors.textSecondary}
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
                    {t("goals.priority")}
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
                              : colors.surfaceSecondary,
                          alignItems: "center",
                        }}
                        onPress={() =>
                          setNewGoal({
                            ...newGoal,
                            priority: priority as "medium" | "high" | "low",
                          })
                        }
                      >
                        <Text
                          style={{
                            color:
                              newGoal.priority === priority
                                ? "#fff"
                                : colors.text,
                            fontWeight: "600",
                            textTransform: "capitalize",
                          }}
                        >
                          {t(`goals.priorities.${priority}`)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Target Date */}
                <View style={{ marginBottom: 24 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      marginBottom: 8,
                      color: colors.text,
                    }}
                  >
                    {t("goals.target_achievement_date")}
                  </Text>
                  <TouchableOpacity
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      padding: 12,
                      backgroundColor: colors.surfaceSecondary,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                    onPress={openDatePicker}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: newGoal.targetDate
                          ? colors.text
                          : colors.textSecondary,
                      }}
                    >
                      {newGoal.targetDate || t("goals.select_date")}
                    </Text>
                    <Ionicons
                      name="calendar"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
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
                      backgroundColor: colors.surfaceSecondary,
                    }}
                    onPress={() => {
                      setShowAddModal(false);
                      setIsEditMode(false);
                      setEditingGoal(null);
                      setNewGoal({
                        name: "",
                        targetAmount: "",
                        currentAmount: "",
                        monthlyContribution: "",
                        targetDate: formatDateToLocalString(
                          new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                        ),
                        category: "savings",
                        priority: "medium",
                      });
                    }}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color: colors.textSecondary,
                        fontWeight: "600",
                      }}
                    >
                      {t("common.cancel")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: colors.primary,
                    }}
                    onPress={handleAddGoal}
                  >
                    <Text
                      style={{
                        textAlign: "center",
                        color: colors.buttonText,
                        fontWeight: "600",
                      }}
                    >
                      {isEditMode
                        ? t("goals.update_goal")
                        : t("goals.add_goal")}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Delete Button (only show in edit mode) */}
                {isEditMode && (
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
                      marginBottom: 24,
                      opacity: deleteLoading ? 0.6 : 1,
                    }}
                    onPress={handleDeleteGoal}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ActivityIndicator
                          size="small"
                          color={colors.error}
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={{
                            textAlign: "center",
                            color: colors.error,
                            fontWeight: "700",
                          }}
                        >
                          {t("goals.deleting")}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={{
                          textAlign: "center",
                          color: colors.error,
                          fontWeight: "700",
                        }}
                      >
                        {t("goals.delete_goal")}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </ScrollView>

              {/* Date Picker Modal - Inside Goal Modal */}
              {showDatePicker && (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 1000,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 16,
                      padding: 20,
                      width: "90%",
                      maxWidth: 350,
                      shadowColor: "#000",
                      shadowOpacity: 0.15,
                      shadowRadius: 15,
                      shadowOffset: { width: 0, height: 5 },
                      elevation: 8,
                    }}
                  >
                    {/* Header with Close Button */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 16,
                        paddingBottom: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "700",
                          color: colors.text,
                        }}
                      >
                        {t("goals.select_target_date")}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                        style={{
                          padding: 4,
                        }}
                      >
                        <Ionicons
                          name="close"
                          size={24}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* DatePicker Component */}
                    <View
                      style={{
                        alignItems: "center",
                        marginVertical: 10,
                      }}
                    >
                      <DateTimePicker
                        value={createLocalDate(newGoal.targetDate)}
                        mode="date"
                        display="spinner"
                        onChange={handleDateChange}
                        style={{
                          backgroundColor: colors.surface,
                          borderRadius: 8,
                          width: "100%",
                        }}
                        textColor={colors.text}
                      />
                    </View>

                    {/* Action Buttons */}
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 12,
                        marginTop: 16,
                      }}
                    >
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: colors.border,
                          padding: 14,
                          borderRadius: 10,
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
                          {t("common.cancel")}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: colors.primary,
                          padding: 14,
                          borderRadius: 10,
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
                          {t("common.done")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </ScrollView>

      {/* Floating AI Chatbot - only show on main tab screens */}
      <FloatingAIChatbot hideOnScroll={true} isScrolling={isScrolling} />
    </SafeAreaView>
  );
};
