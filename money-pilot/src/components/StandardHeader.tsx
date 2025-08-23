import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

interface StandardHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightComponent?: React.ReactNode;
  showBackButton?: boolean;
}

export const StandardHeader: React.FC<StandardHeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightComponent,
  showBackButton = true,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {showBackButton && onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightComponent && (
        <View style={styles.rightSection}>{rightComponent}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingTop: 8,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  backButton: {
    marginRight: 20,
    padding: 10,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    fontWeight: "400",
  },
  rightSection: {
    alignItems: "flex-end",
  },
});
