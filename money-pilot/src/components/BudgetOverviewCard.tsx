import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";

interface BudgetOverviewCardProps {
  netIncome: number;
  totalIncome: number;
  totalExpenses: number;
  savingsAmount: number;
  savingsPercentage: number;
  discretionaryIncome: number;
  remainingBalance: number;
  onPressDetails: () => void;
  onPressSettings: () => void;
}

export const BudgetOverviewCard: React.FC<BudgetOverviewCardProps> = ({
  netIncome,
  totalIncome,
  totalExpenses,
  savingsAmount,
  savingsPercentage,
  discretionaryIncome,
  remainingBalance,
  onPressDetails,
  onPressSettings,
}) => {
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();

  const getBudgetStatus = () => {
    if (remainingBalance >= 0)
      return {
        status: "healthy",
        color: colors.success,
        icon: "checkmark-circle",
      };
    if (remainingBalance >= -100)
      return { status: "warning", color: colors.warning, icon: "warning" };
    return { status: "danger", color: colors.error, icon: "alert-circle" };
  };

  const budgetStatus = getBudgetStatus();

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
            backgroundColor: colors.surfaceSecondary,
            padding: 12,
            borderRadius: 12,
            marginRight: 12,
          }}
        >
          <Ionicons name="pie-chart" size={20} color={colors.primary} />
        </View>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
          }}
        >
          {translate("budget", isFriendlyMode)} Overview
        </Text>
      </View>

      {/* Main Budget Status */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          padding: 16,
          backgroundColor: budgetStatus.color + "10",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: budgetStatus.color + "30",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 4,
            }}
          >
            Safe to Spend
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "800",
              color: budgetStatus.color,
            }}
          >
            $
            {remainingBalance.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: colors.surfaceSecondary,
            padding: 12,
            borderRadius: 12,
          }}
        >
          <Ionicons
            name={budgetStatus.icon as any}
            size={20}
            color={budgetStatus.color}
          />
        </View>
      </View>

      {/* Quick Stats Grid */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <View
            style={{
              backgroundColor: colors.surfaceSecondary,
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Ionicons name="trending-up" size={20} color={colors.primary} />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.success,
                marginTop: 4,
              }}
            >
              $
              {totalIncome.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              Income
            </Text>
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View
            style={{
              backgroundColor: colors.surfaceSecondary,
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Ionicons name="trending-down" size={20} color={colors.error} />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.error,
                marginTop: 4,
              }}
            >
              $
              {totalExpenses.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              Expenses
            </Text>
          </View>
        </View>
      </View>

      {/* Savings Progress */}
      <View style={{ marginBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              fontWeight: "500",
            }}
          >
            Savings ({savingsPercentage}%)
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.success,
            }}
          >
            $
            {savingsAmount.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </Text>
        </View>
        <View
          style={{
            height: 6,
            backgroundColor: colors.border,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${savingsPercentage}%`,
              height: 6,
              backgroundColor: colors.success,
              borderRadius: 3,
            }}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View
        style={{
          flexDirection: "row",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={onPressDetails}
          style={{
            flex: 1,
            backgroundColor: colors.surfaceSecondary,
            padding: 12,
            borderRadius: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
            borderStyle: "dashed",
          }}
        >
          <Ionicons
            name="analytics-outline"
            size={16}
            color={colors.primary}
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              color: colors.primary,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            View Details
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
