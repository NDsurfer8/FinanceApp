import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTranslation } from "../hooks/useTranslation";
import { useTheme } from "../contexts/ThemeContext";

export const TranslationExample: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={{ padding: 20, backgroundColor: colors.background }}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          color: colors.text,
          marginBottom: 20,
        }}
      >
        {t("dashboard.title")}
      </Text>

      <Text style={{ fontSize: 16, color: colors.text, marginBottom: 10 }}>
        {t("dashboard.welcome_message")}
      </Text>

      <Text
        style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}
      >
        {t("dashboard.total_balance")}
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: colors.primary,
          padding: 15,
          borderRadius: 8,
          marginBottom: 10,
        }}
      >
        <Text style={{ color: colors.buttonText, textAlign: "center" }}>
          {t("common.save")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: colors.surface,
          padding: 15,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.text, textAlign: "center" }}>
          {t("common.cancel")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
