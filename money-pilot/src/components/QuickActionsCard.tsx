import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  onPress: () => void;
  badge?: number;
}

interface QuickActionsCardProps {
  actions: QuickAction[];
  onImportTransactions?: () => void;
  onViewRecurring?: () => void;
  onAddGoal?: () => void;
  hasBankConnection?: boolean;
  availableTransactionsCount?: number;
  hasRecurringTransactions?: boolean;
  hasGoals?: boolean;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  actions,
  onImportTransactions,
  onViewRecurring,
  onAddGoal,
  hasBankConnection = false,
  availableTransactionsCount = 0,
  hasRecurringTransactions = false,
  hasGoals = false,
}) => {
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();

  const defaultActions: QuickAction[] = [
    {
      id: "import",
      title: "Import Transactions",
      subtitle: hasBankConnection
        ? `${availableTransactionsCount} available`
        : "Connect bank first",
      icon: "download-outline",
      color: colors.primary,
      onPress: onImportTransactions || (() => {}),
      badge: hasBankConnection ? availableTransactionsCount : undefined,
    },
    {
      id: "recurring",
      title: "Recurring Transactions",
      subtitle: hasRecurringTransactions
        ? "Manage scheduled payments"
        : "Set up recurring payments",
      icon: "repeat-outline",
      color: colors.warning,
      onPress: onViewRecurring || (() => {}),
    },
    {
      id: "goals",
      title: "Financial Goals",
      subtitle: hasGoals ? "Add to savings plan" : "Set new goals",
      icon: "flag-outline",
      color: colors.success,
      onPress: onAddGoal || (() => {}),
    },
  ];

  const allActions = [...actions, ...defaultActions];

  return (
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
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <View
          style={{
            backgroundColor: colors.primaryLight,
            padding: 8,
            borderRadius: 10,
            marginRight: 12,
          }}
        >
          <Ionicons name="flash-outline" size={20} color={colors.primary} />
        </View>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
          }}
        >
          Quick Actions
        </Text>
      </View>

      {/* Actions Grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 20, paddingTop: 8 }}
      >
        {allActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            onPress={action.onPress}
            style={{
              width: 120,
              marginRight: 16,
              backgroundColor: colors.surfaceSecondary,
              borderRadius: 12,
              padding: 16,
              paddingTop: action.badge && action.badge > 0 ? 24 : 16,
              alignItems: "center",
              position: "relative",
            }}
            activeOpacity={0.7}
          >
            {/* Badge */}
            {action.badge && action.badge > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  backgroundColor: colors.error,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1,
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 10,
                    fontWeight: "700",
                  }}
                >
                  {action.badge > 99 ? "99+" : String(action.badge)}
                </Text>
              </View>
            )}

            {/* Icon */}
            <View
              style={{
                backgroundColor: action.color + "20",
                padding: 12,
                borderRadius: 10,
                marginBottom: 8,
              }}
            >
              <Ionicons
                name={action.icon as any}
                size={24}
                color={action.color}
              />
            </View>

            {/* Title */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.text,
                textAlign: "center",
                marginBottom: 4,
              }}
              numberOfLines={2}
            >
              {action.title}
            </Text>

            {/* Subtitle */}
            <Text
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight: 14,
              }}
              numberOfLines={2}
            >
              {action.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Smart Suggestions */}
      {hasBankConnection && availableTransactionsCount > 0 && (
        <View
          style={{
            marginTop: 20,
            padding: 16,
            backgroundColor: colors.successLight,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.success + "30",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons
              name="bulb-outline"
              size={16}
              color={colors.success}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.success,
              }}
            >
              Smart Suggestion
            </Text>
          </View>
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              lineHeight: 18,
            }}
          >
            You have {availableTransactionsCount} new transactions ready to
            import from your bank account.
          </Text>
        </View>
      )}
    </View>
  );
};
