import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface GoalTrackingScreenProps {
  navigation: any;
}

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: "emergency" | "debt" | "vacation" | "investment" | "other";
  icon: string;
  color: string;
}

export const GoalTrackingScreen: React.FC<GoalTrackingScreenProps> = ({
  navigation,
}) => {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: "1",
      name: "Emergency Fund",
      targetAmount: 10000,
      currentAmount: 6500,
      targetDate: "2024-06-01",
      category: "emergency",
      icon: "shield-checkmark",
      color: "#10b981",
    },
    {
      id: "2",
      name: "Credit Card Payoff",
      targetAmount: 5000,
      currentAmount: 3200,
      targetDate: "2024-08-01",
      category: "debt",
      icon: "card",
      color: "#ef4444",
    },
    {
      id: "3",
      name: "Vacation Fund",
      targetAmount: 3000,
      currentAmount: 1200,
      targetDate: "2024-12-01",
      category: "vacation",
      icon: "airplane",
      color: "#3b82f6",
    },
  ]);

  const getProgressPercentage = (goal: Goal) => {
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "#10b981";
    if (percentage >= 60) return "#f59e0b";
    if (percentage >= 40) return "#f97316";
    return "#ef4444";
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleAddGoal = () => {
    Alert.alert(
      "Premium Feature",
      "Create custom financial goals with progress tracking and smart recommendations!",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Coming Soon", style: "default" },
      ]
    );
  };

  const handleUpdateProgress = (goalId: string) => {
    Alert.alert("Update Progress", "Track your progress towards this goal", [
      { text: "Cancel", style: "cancel" },
      { text: "Coming Soon", style: "default" },
    ]);
  };

  const totalTargetAmount = goals.reduce(
    (sum, goal) => sum + goal.targetAmount,
    0
  );
  const totalCurrentAmount = goals.reduce(
    (sum, goal) => sum + goal.currentAmount,
    0
  );
  const overallProgress = (totalCurrentAmount / totalTargetAmount) * 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: "700", color: "#374151" }}>
            Financial Goals
          </Text>
          <TouchableOpacity onPress={handleAddGoal}>
            <Ionicons name="add-circle" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {/* Overall Progress */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 12,
              color: "#374151",
            }}
          >
            Overall Progress
          </Text>

          <View style={{ marginBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 16, color: "#6b7280" }}>
                Total Saved
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#10b981" }}
              >
                {formatCurrency(totalCurrentAmount)}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 16, color: "#6b7280" }}>Total Goal</Text>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: "#374151" }}
              >
                {formatCurrency(totalTargetAmount)}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View
            style={{
              height: 8,
              backgroundColor: "#e5e7eb",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${overallProgress}%`,
                height: 8,
                backgroundColor: getProgressColor(overallProgress),
              }}
            />
          </View>

          <Text
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            {overallProgress.toFixed(1)}% Complete
          </Text>
        </View>

        {/* Goals List */}
        {goals.map((goal) => {
          const progressPercentage = getProgressPercentage(goal);
          const progressColor = getProgressColor(progressPercentage);

          return (
            <View
              key={goal.id}
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 2,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    backgroundColor: goal.color + "20",
                    padding: 8,
                    borderRadius: 8,
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name={goal.icon as any}
                    size={20}
                    color={goal.color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    {goal.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#6b7280" }}>
                    Due: {formatDate(goal.targetDate)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleUpdateProgress(goal.id)}>
                  <Ionicons
                    name="ellipsis-vertical"
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>

              <View style={{ marginBottom: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#6b7280" }}>
                    Progress
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: progressColor,
                    }}
                  >
                    {progressPercentage.toFixed(1)}%
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#6b7280" }}>
                    {formatCurrency(goal.currentAmount)} /{" "}
                    {formatCurrency(goal.targetAmount)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    {formatCurrency(goal.targetAmount - goal.currentAmount)}{" "}
                    left
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View
                style={{
                  height: 6,
                  backgroundColor: "#e5e7eb",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${progressPercentage}%`,
                    height: 6,
                    backgroundColor: progressColor,
                  }}
                />
              </View>
            </View>
          );
        })}

        {/* Quick Actions */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              marginBottom: 16,
              color: "#374151",
            }}
          >
            Quick Actions
          </Text>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "#f3f4f6",
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
              }}
              onPress={handleAddGoal}
            >
              <Ionicons
                name="add-circle"
                size={24}
                color="#6366f1"
                style={{ marginBottom: 8 }}
              />
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}
              >
                Add Goal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "#f3f4f6",
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
              }}
              onPress={() =>
                Alert.alert(
                  "Premium Feature",
                  "Get personalized goal recommendations!"
                )
              }
            >
              <Ionicons
                name="bulb"
                size={24}
                color="#f59e0b"
                style={{ marginBottom: 8 }}
              />
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}
              >
                Get Tips
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
