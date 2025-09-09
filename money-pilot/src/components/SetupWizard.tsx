import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

interface SetupWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
  onComplete,
  onSkip,
}) => {
  const { colors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Track your spending",
      description:
        "Add income and expenses manually — or link your bank to auto-import transactions and get alerts.",
      icon: "pie-chart-outline" as keyof typeof Ionicons.glyphMap,
      action: "setBudget",
    },
    {
      title: "Build your budget",
      description:
        "In Budget, tap the gear in Overview to set category limits and safe-to-spend.",
      icon: "settings-outline" as keyof typeof Ionicons.glyphMap,
      action: "setBudget",
    },
    {
      title: "Set a goal",
      description:
        "Create your first goal (e.g., Spain trip) and choose a target date.",
      icon: "flag-outline" as keyof typeof Ionicons.glyphMap,
      action: "setGoal",
    },
    {
      title: "Add assets & debts",
      description:
        "Log savings, investments, loans, and cards to track your net worth.",
      icon: "briefcase-outline" as keyof typeof Ionicons.glyphMap,
      action: "addAssetsDebts",
    },
    {
      title: "Ask Vectra",
      description:
        'Get clear, actionable tips based on your data (e.g., "Am I financially ready to buy a house?").',
      icon: "chatbubble-ellipses-outline" as keyof typeof Ionicons.glyphMap,
      action: "askAI",
    },
  ];

  const handleStepComplete = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Let's Get You Started!
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Step {currentStep + 1} of {steps.length}
        </Text>
      </View>

      <View style={styles.stepContainer}>
        <Ionicons
          name={steps[currentStep].icon}
          size={64}
          color={colors.primary}
          style={styles.icon}
        />
        <Text style={[styles.stepTitle, { color: colors.text }]}>
          {steps[currentStep].title}
        </Text>
        <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
          {steps[currentStep].description}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        {steps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              {
                backgroundColor:
                  index <= currentStep ? colors.primary : colors.border,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleStepComplete}
        >
          <Text style={styles.buttonText}>
            {currentStep === steps.length - 1 ? "Complete Setup" : "Next Step"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.skipButton, { borderColor: colors.border }]}
          onPress={onSkip}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            Skip for Now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  stepContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  icon: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 32,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  buttonContainer: {
    marginBottom: 40,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  skipButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  skipText: {
    fontSize: 14,
  },
});
