import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";
import { TourGuide } from "./TourGuide";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  onPressIncome: () => void;
  onPressExpense: () => void;
  onPressImport?: () => void;
  isBankConnected?: boolean;
  availableTransactionsCount?: number;
  hasOverBudgetItems?: boolean;
}

export const BudgetOverviewCard: React.FC<BudgetOverviewCardProps> = (
  props
) => {
  const {
    netIncome = 0,
    totalIncome = 0,
    totalExpenses = 0,
    savingsAmount = 0,
    savingsPercentage = 0,
    discretionaryIncome = 0,
    remainingBalance = 0,
    onPressDetails = () => {},
    onPressSettings = () => {},
    onPressIncome = () => {},
    onPressExpense = () => {},
    onPressImport,
    isBankConnected = false,
    availableTransactionsCount = 0,
  } = props;

  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();

  // Animation and state for glow effects
  const [showSettingsGlow, setShowSettingsGlow] = useState(false);
  const glowAnim = React.useRef(new Animated.Value(0)).current;
  const settingsGlowAnim = React.useRef(new Animated.Value(0)).current;

  // Ensure all values are safe numbers
  const safeNetIncome = Number(netIncome) || 0;
  const safeTotalIncome = Number(totalIncome) || 0;
  const safeTotalExpenses = Number(totalExpenses) || 0;
  const safeSavingsAmount = Number(savingsAmount) || 0;
  const safeSavingsPercentage = Number(savingsPercentage) || 0;
  const safeDiscretionaryIncome = Number(discretionaryIncome) || 0;
  const safeRemainingBalance = Number(remainingBalance) || 0;
  const safeAvailableTransactionsCount =
    Number(availableTransactionsCount) || 0;

  const getBudgetStatus = () => {
    if (safeRemainingBalance >= 0)
      return {
        status: "healthy",
        color: colors.success,
        icon: "checkmark-circle",
      };
    if (safeRemainingBalance >= -100)
      return { status: "warning", color: colors.warning, icon: "warning" };
    return { status: "danger", color: colors.error, icon: "alert-circle" };
  };

  const budgetStatus = getBudgetStatus();

  // Check if there are no transactions
  const hasNoTransactions = safeTotalIncome === 0 && safeTotalExpenses === 0;

  // Load settings glow state from AsyncStorage
  useEffect(() => {
    const loadSettingsGlowState = async () => {
      try {
        const hasSeenSettings = await AsyncStorage.getItem(
          "hasSeenBudgetSettings"
        );
        if (!hasSeenSettings) {
          setShowSettingsGlow(true);
        }
      } catch (error) {
        console.error("Error loading settings glow state:", error);
      }
    };
    loadSettingsGlowState();
  }, []);

  // Animate glow effects
  useEffect(() => {
    if (hasNoTransactions) {
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
  }, [hasNoTransactions]);

  useEffect(() => {
    if (showSettingsGlow) {
      // Start pulsing glow animation for settings
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(settingsGlowAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: false,
          }),
          Animated.timing(settingsGlowAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: false,
          }),
        ])
      );
      pulseAnimation.start();
    } else {
      // Stop animation and reset
      settingsGlowAnim.setValue(0);
    }
  }, [showSettingsGlow]);

  // Handle settings press with glow dismissal
  const handleSettingsPress = async () => {
    if (showSettingsGlow) {
      try {
        await AsyncStorage.setItem("hasSeenBudgetSettings", "true");
        setShowSettingsGlow(false);
      } catch (error) {
        console.error("Error saving settings glow state:", error);
      }
    }
    onPressSettings();
  };

  return (
    <Animated.View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        shadowColor: hasNoTransactions ? colors.primary : colors.shadow,
        shadowOpacity: hasNoTransactions
          ? glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.08, 0.3],
            })
          : 0.08,
        shadowRadius: hasNoTransactions
          ? glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 20],
            })
          : 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: hasNoTransactions
          ? glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [4, 8],
            })
          : 4,
        borderWidth: hasNoTransactions ? 2 : 0,
        borderColor: hasNoTransactions
          ? glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [colors.primary + "40", colors.primary + "80"],
            })
          : "transparent",
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
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

        {/* Import Transactions Button */}
        {isBankConnected && onPressImport && (
          <TouchableOpacity
            onPress={onPressImport}
            style={{
              position: "relative",
              padding: 8,
              borderRadius: 8,
              backgroundColor: colors.surfaceSecondary,
            }}
          >
            <Ionicons name="download" size={28} color={colors.primary} />
            {safeAvailableTransactionsCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -8,
                  right: -6,
                  backgroundColor: colors.error,
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 2,
                  borderColor: colors.surface,
                }}
              >
                <Text
                  style={{
                    color: colors.buttonText,
                    fontSize: 9,
                    fontWeight: "700",
                  }}
                >
                  {safeAvailableTransactionsCount > 99
                    ? "99+"
                    : String(safeAvailableTransactionsCount || 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
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
              color: colors.warning,
            }}
          >
            $
            {safeRemainingBalance.toLocaleString(undefined, {
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
        <TouchableOpacity
          style={{ flex: 1, marginRight: 12 }}
          onPress={onPressIncome}
          activeOpacity={0.7}
        >
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
              {safeTotalIncome.toLocaleString(undefined, {
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
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1, marginLeft: 12 }}
          onPress={onPressExpense}
          activeOpacity={0.7}
        >
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
              {safeTotalExpenses.toLocaleString(undefined, {
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
        </TouchableOpacity>
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
            Savings ({safeSavingsPercentage}%)
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: colors.success,
            }}
          >
            $
            {safeSavingsAmount.toLocaleString(undefined, {
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
              width: `${safeSavingsPercentage}%`,
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

        <TourGuide zone={2} screen="Budget">
          <Animated.View
            style={{
              shadowColor: showSettingsGlow ? colors.primary : "transparent",
              shadowOpacity: showSettingsGlow
                ? settingsGlowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.4],
                  })
                : 0,
              shadowRadius: showSettingsGlow
                ? settingsGlowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 15],
                  })
                : 0,
              shadowOffset: { width: 0, height: 0 },
              elevation: showSettingsGlow
                ? settingsGlowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 6],
                  })
                : 0,
            }}
          >
            <TouchableOpacity
              onPress={handleSettingsPress}
              style={{
                backgroundColor: colors.surfaceSecondary,
                padding: 12,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                minWidth: 60,
                position: "relative",
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: "dashed",
              }}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={colors.buttonPrimary}
              />
              {props.hasOverBudgetItems && (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    backgroundColor: colors.error,
                    borderRadius: 8,
                    width: 16,
                    height: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: colors.surface,
                  }}
                >
                  <Text
                    style={{
                      color: colors.buttonText,
                      fontSize: 10,
                      fontWeight: "700",
                    }}
                  >
                    !
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </TourGuide>
      </View>
    </Animated.View>
  );
};
