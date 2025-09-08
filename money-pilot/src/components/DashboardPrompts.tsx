import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

interface DashboardPromptsProps {
  bankConnected: boolean;
  budgetSet: boolean;
  aiUsed: boolean;
  goalSet: boolean;
  onAction: (action: string) => void;
}

export const DashboardPrompts: React.FC<DashboardPromptsProps> = ({
  bankConnected,
  budgetSet,
  aiUsed,
  goalSet,
  onAction,
}) => {
  const { colors } = useTheme();

  const getNextPrompt = () => {
    if (!bankConnected) {
      return {
        title: "Connect Your Bank Account",
        description:
          "Link your bank to see your spending and get personalized insights",
        icon: "card-outline",
        action: "connectBank",
        color: colors.primary,
      };
    }

    if (!budgetSet) {
      return {
        title: "Set Up Your Budget",
        description: "Create your first budget category to track your spending",
        icon: "pie-chart-outline",
        action: "setBudget",
        color: colors.success,
      };
    }

    if (!aiUsed) {
      return {
        title: "Ask Vectra for Advice",
        description: "Get personalized financial advice from your AI advisor",
        icon: "chatbubble-outline",
        action: "askAI",
        color: colors.warning,
      };
    }

    if (!goalSet) {
      return {
        title: "Set a Financial Goal",
        description: "Create your first financial goal to stay motivated",
        icon: "flag-outline",
        action: "setGoal",
        color: colors.info,
      };
    }

    return null;
  };

  const prompt = getNextPrompt();

  if (!prompt) {
    return null; // All steps completed
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: prompt.color + "20" },
          ]}
        >
          <Ionicons name={prompt.icon} size={24} color={prompt.color} />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>
            {prompt.title}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {prompt.description}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: prompt.color }]}
          onPress={() => onAction(prompt.action)}
        >
          <Ionicons name="arrow-forward" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
});
