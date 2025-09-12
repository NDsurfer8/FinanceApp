import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import { loadLanguageOnDemand } from "../config/i18n";

interface SetupWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
  onComplete,
  onSkip,
}) => {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  // Ensure language is loaded on demand
  useEffect(() => {
    const loadLanguage = async () => {
      if (i18n.language && i18n.language !== "en") {
        await loadLanguageOnDemand(i18n.language);
      }
    };
    loadLanguage();
  }, [i18n.language]);

  // Create steps with translations
  const steps = [
    {
      title: t("setup_wizard.step1.title"),
      description: t("setup_wizard.step1.description"),
      icon: "pie-chart-outline" as keyof typeof Ionicons.glyphMap,
      action: "setBudget",
    },
    {
      title: t("setup_wizard.step2.title"),
      description: t("setup_wizard.step2.description"),
      icon: "settings-outline" as keyof typeof Ionicons.glyphMap,
      action: "setBudget",
    },
    {
      title: t("setup_wizard.step3.title"),
      description: t("setup_wizard.step3.description"),
      icon: "flag-outline" as keyof typeof Ionicons.glyphMap,
      action: "setGoal",
    },
    {
      title: t("setup_wizard.step4.title"),
      description: t("setup_wizard.step4.description"),
      icon: "briefcase-outline" as keyof typeof Ionicons.glyphMap,
      action: "addAssetsDebts",
    },
    {
      title: t("setup_wizard.step5.title"),
      description: t("setup_wizard.step5.description"),
      icon: "chatbubble-ellipses-outline" as keyof typeof Ionicons.glyphMap,
      action: "askAI",
    },
    {
      title: t("setup_wizard.step6.title"),
      description: t("setup_wizard.step6.description"),
      icon: "add-circle-outline" as keyof typeof Ionicons.glyphMap,
      action: "addTransaction",
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
          {t("setup_wizard.header_title")}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t("setup_wizard.step_counter", {
            current: currentStep + 1,
            total: steps.length,
          })}
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
            {currentStep === steps.length - 1
              ? t("setup_wizard.complete_setup")
              : t("setup_wizard.next_step")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.skipButton, { borderColor: colors.border }]}
          onPress={onSkip}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            {t("setup_wizard.skip_for_now")}
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
