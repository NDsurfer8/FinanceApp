import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Animated,
  Alert,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fontFamily } from "../config/fonts";
import { AssetsDebtsChart } from "../components/AssetsDebtsChart";
import { useAuth } from "../hooks/useAuth";
import { useZeroLoading } from "../hooks/useZeroLoading";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";
import { StandardHeader } from "../components/StandardHeader";
import { getAssetTypeLabel } from "../utils/assetMigration";
import { useData } from "../contexts/DataContext";
import { useSubscription } from "../contexts/SubscriptionContext";
import { usePaywall } from "../hooks/usePaywall";
import { FloatingAIChatbot } from "../components/FloatingAIChatbot";

interface AssetsDebtsScreenProps {
  navigation: any;
}

const screenWidth = Dimensions.get("window").width;

export const AssetsDebtsScreen: React.FC<AssetsDebtsScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { assets, debts, updateDataOptimistically, refreshInBackground } =
    useZeroLoading();
  const { bankAccounts } = useData();
  const [loading, setLoading] = useState(false);
  const [isAssetsCollapsed, setIsAssetsCollapsed] = useState(false);
  const [isDebtsCollapsed, setIsDebtsCollapsed] = useState(false);
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();
  const { hasPremiumAccess } = useSubscription();
  const { presentPaywall } = usePaywall();

  // Background refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        refreshInBackground();
      }
    }, [user, refreshInBackground])
  );

  const assetTotal = assets.reduce((sum, asset) => sum + asset.balance, 0);
  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const netWorth = assetTotal - totalDebt;

  // Prepare data for the chart
  const chartAssets = assets.map((asset) => ({
    name: asset.name,
    balance: asset.balance,
    type: "asset" as const,
  }));

  const chartDebts = debts.map((debt) => ({
    name: debt.name,
    balance: debt.balance,
    type: "debt" as const,
  }));

  // Calculate financial insights
  const debtToAssetRatio = assetTotal > 0 ? (totalDebt / assetTotal) * 100 : 0;
  const isHealthyRatio = debtToAssetRatio <= 30;
  const hasAssets = assets.length > 0;
  const hasDebts = debts.length > 0;

  // Get top assets and debts for quick insights
  const topAssets = [...assets]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 3);
  const topDebts = [...debts].sort((a, b) => b.balance - a.balance).slice(0, 3);

  const handleQuickAction = (type: "asset" | "debt") => {
    navigation.navigate("AddAssetDebt", { type });
  };

  const handleEditItem = (item: any, type: "asset" | "debt") => {
    navigation.navigate("AddAssetDebt", {
      type,
      editMode: true,
      [type]: item,
    });
  };

  const handleDeleteItem = (item: any, type: "asset" | "debt") => {
    Alert.alert(
      `Delete ${type === "asset" ? "Asset" : "Debt"}`,
      `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Handle deletion logic here
            // Deleting item
          },
        },
      ]
    );
  };

  const renderEmptyState = (
    type: "asset" | "debt",
    icon: string,
    message: string
  ) => {
    const iconColor = type === "asset" ? colors.success : colors.error;
    const backgroundColor =
      type === "asset" ? colors.success + "20" : colors.error + "20";

    return (
      <View
        style={{
          alignItems: "center",
          padding: 32,
          backgroundColor: colors.surfaceSecondary,
          borderRadius: 16,
          marginVertical: 8,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: backgroundColor,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name={icon as any} size={28} color={iconColor} />
        </View>
        <Text
          style={{
            fontFamily: fontFamily.medium,
            color: colors.textSecondary,
            fontSize: 16,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {message}
        </Text>
        <TouchableOpacity
          onPress={() => handleQuickAction(type)}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 20,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons
            name="add"
            size={16}
            color={colors.buttonText}
            style={{ marginRight: 6 }}
          />
          <Text
            style={{
              fontFamily: fontFamily.semiBold,
              color: colors.buttonText,
              fontSize: 14,
            }}
          >
            Add Your First {type === "asset" ? "Asset" : "Debt"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderAssetItem = (asset: any, index: number) => (
    <View key={asset.id}>
      <TouchableOpacity
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 20,
          marginBottom: 12,
          borderLeftWidth: 4,
          borderLeftColor: colors.success,
          shadowColor: colors.shadow,
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
        onPress={() => handleEditItem(asset, "asset")}
        activeOpacity={0.7}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1, marginRight: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.success,
                  marginRight: 8,
                }}
              />
              <Text
                style={{
                  fontSize: 18,
                  color: colors.text,
                  fontWeight: "600",
                  fontFamily: fontFamily.semiBold,
                }}
              >
                {asset.name}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                fontFamily: fontFamily.regular,
              }}
            >
              {getAssetTypeLabel(asset.type)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.success,
                fontFamily: fontFamily.bold,
              }}
            >
              ${asset.balance.toLocaleString()}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.textTertiary}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textTertiary,
                  marginLeft: 4,
                }}
              >
                Edit
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderDebtItem = (debt: any, index: number) => (
    <View key={debt.id}>
      <TouchableOpacity
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 20,
          marginBottom: 12,
          borderLeftWidth: 4,
          borderLeftColor: colors.error,
          shadowColor: colors.shadow,
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
        onPress={() => handleEditItem(debt, "debt")}
        activeOpacity={0.7}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1, marginRight: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.error,
                  marginRight: 8,
                }}
              />
              <Text
                style={{
                  fontSize: 18,
                  color: colors.text,
                  fontWeight: "600",
                  fontFamily: fontFamily.semiBold,
                }}
              >
                {debt.name}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  fontFamily: fontFamily.regular,
                  marginRight: 12,
                }}
              >
                {debt.rate}% APR
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  fontFamily: fontFamily.regular,
                }}
              >
                ${debt.payment}/mo
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.error,
                fontFamily: fontFamily.bold,
              }}
            >
              ${debt.balance.toLocaleString()}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Ionicons
                name="chevron-forward"
                size={14}
                color={colors.textTertiary}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textTertiary,
                  marginLeft: 4,
                }}
              >
                Edit
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderFinancialInsights = () => (
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
      <View
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.surfaceSecondary,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16,
          }}
        >
          <Ionicons name="analytics" size={20} color={colors.primary} />
        </View>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: colors.text,
            fontFamily: fontFamily.bold,
          }}
        >
          Financial Insights
        </Text>
      </View>

      {/* Net Worth Summary */}
      <View
        style={{
          backgroundColor: colors.surfaceSecondary,
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: colors.textSecondary,
            marginBottom: 12,
            fontFamily: fontFamily.medium,
          }}
        >
          Net Worth
        </Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: netWorth >= 0 ? colors.success : colors.error,
            fontFamily: fontFamily.bold,
            marginBottom: 8,
          }}
        >
          ${Math.abs(netWorth).toLocaleString()}
          {netWorth < 0 ? " (Negative)" : ""}
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            fontFamily: fontFamily.regular,
          }}
        >
          {netWorth >= 0
            ? "Great job! You're building wealth."
            : "Focus on debt reduction to improve your financial health."}
        </Text>
      </View>

      {/* Debt-to-Asset Ratio */}
      <View
        style={{
          backgroundColor: colors.surfaceSecondary,
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: colors.textSecondary,
            marginBottom: 12,
            fontFamily: fontFamily.medium,
          }}
        >
          Debt-to-Asset Ratio
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: isHealthyRatio ? colors.success : colors.warning,
              fontFamily: fontFamily.bold,
              marginRight: 12,
            }}
          >
            {debtToAssetRatio.toFixed(1)}%
          </Text>
          <View
            style={{
              backgroundColor: isHealthyRatio
                ? colors.successLight
                : colors.warningLight,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: isHealthyRatio ? colors.success : colors.warning,
                fontFamily: fontFamily.medium,
              }}
            >
              {isHealthyRatio ? "Healthy" : "High"}
            </Text>
          </View>
        </View>
        <View
          style={{
            height: 8,
            backgroundColor: colors.border,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${Math.min(debtToAssetRatio, 100)}%`,
              backgroundColor: isHealthyRatio ? colors.success : colors.warning,
              borderRadius: 4,
            }}
          />
        </View>
        <Text
          style={{
            fontSize: 14,
            color: colors.textSecondary,
            marginTop: 8,
            fontFamily: fontFamily.regular,
          }}
        >
          {isHealthyRatio
            ? "Your debt is well-managed relative to your assets."
            : "Consider reducing debt or increasing assets to improve this ratio."}
        </Text>
      </View>

      {/* Quick Actions */}
      <View
        style={{
          marginTop: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (hasPremiumAccess()) {
              navigation.navigate("BankTransactions");
            } else {
              presentPaywall();
            }
          }}
          style={{
            backgroundColor: colors.surfaceSecondary,
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          <Ionicons
            name="trending-up"
            size={16}
            color={colors.primary}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontFamily: fontFamily.semiBold,
              color: colors.primary,
              fontSize: 14,
            }}
          >
            View Financial Accounts
          </Text>
          {!hasPremiumAccess() && (
            <View
              style={{
                backgroundColor: colors.primary,
                borderRadius: 8,
                paddingHorizontal: 6,
                paddingVertical: 2,
                marginLeft: 8,
              }}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  fontSize: 10,
                  fontFamily: fontFamily.bold,
                }}
              >
                PREMIUM
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colors.text === "#000000" ? "dark-content" : "light-content"}
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <StandardHeader
          title={translate("assetsDebts", isFriendlyMode)}
          subtitle="Track your net worth and financial health"
          showBackButton={false}
        />

        {/* Financial Insights Section */}
        {renderFinancialInsights()}

        {/* Assets Section */}
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.success + "20",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}
            >
              <Ionicons name="trending-up" size={20} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                  fontFamily: fontFamily.bold,
                }}
              >
                {translate("assets", isFriendlyMode)}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  fontFamily: fontFamily.regular,
                }}
              >
                {assets.length} item{assets.length !== 1 ? "s" : ""} • Total: $
                {assetTotal.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsAssetsCollapsed(!isAssetsCollapsed)}
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.surfaceSecondary,
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isAssetsCollapsed ? "chevron-down" : "chevron-up"}
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {!isAssetsCollapsed && (
            <>
              {!hasAssets ? (
                renderEmptyState(
                  "asset",
                  "wallet-outline",
                  `No ${translate(
                    "assets",
                    isFriendlyMode
                  ).toLowerCase()} yet. Start building your wealth by adding your first asset.`
                )
              ) : (
                <>
                  {assets.map((asset, i) => renderAssetItem(asset, i))}
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.border,
                      marginVertical: 16,
                    }}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fontFamily.semiBold,
                        fontWeight: "600",
                        fontSize: 16,
                        color: colors.text,
                      }}
                    >
                      Total Assets
                    </Text>
                    <Text
                      style={{
                        fontFamily: fontFamily.bold,
                        fontWeight: "700",
                        fontSize: 20,
                        color: colors.success,
                      }}
                    >
                      ${assetTotal.toLocaleString()}
                    </Text>
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* Debts Section */}
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.error + "20",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}
            >
              <Ionicons name="trending-down" size={20} color={colors.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                  fontFamily: fontFamily.bold,
                }}
              >
                {translate("debt", isFriendlyMode)}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  fontFamily: fontFamily.regular,
                }}
              >
                {debts.length} item{debts.length !== 1 ? "s" : ""} • Total: $
                {totalDebt.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsDebtsCollapsed(!isDebtsCollapsed)}
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.surfaceSecondary,
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isDebtsCollapsed ? "chevron-down" : "chevron-up"}
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {!isDebtsCollapsed && (
            <>
              {!hasDebts ? (
                renderEmptyState(
                  "debt",
                  "card-outline",
                  `No ${translate(
                    "debt",
                    isFriendlyMode
                  ).toLowerCase()} yet. Track your debts to better manage your finances.`
                )
              ) : (
                <>
                  {debts.map((debt, i) => renderDebtItem(debt, i))}
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.border,
                      marginVertical: 16,
                    }}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fontFamily.semiBold,
                        fontWeight: "600",
                        fontSize: 16,
                        color: colors.text,
                      }}
                    >
                      Total Debt
                    </Text>
                    <Text
                      style={{
                        fontFamily: fontFamily.bold,
                        fontWeight: "700",
                        fontSize: 20,
                        color: colors.error,
                      }}
                    >
                      ${totalDebt.toLocaleString()}
                    </Text>
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View
          style={{
            flexDirection: "row",
            gap: 16,
            marginTop: 24,
            marginBottom: 24,
          }}
        >
          <TouchableOpacity
            onPress={() => handleQuickAction("asset")}
            style={{
              backgroundColor: colors.success,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: colors.shadow,
              shadowOpacity: 0.1,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="add"
              size={20}
              color={colors.buttonText}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontFamily: fontFamily.semiBold,
                color: colors.buttonText,
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              Add Asset
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleQuickAction("debt")}
            style={{
              backgroundColor: colors.error,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 12,
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: colors.shadow,
              shadowOpacity: 0.1,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="add"
              size={20}
              color={colors.buttonText}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontFamily: fontFamily.semiBold,
                color: colors.buttonText,
                fontWeight: "600",
                fontSize: 16,
              }}
            >
              Add Debt
            </Text>
          </TouchableOpacity>
        </View>

        {/* Enhanced Chart Section */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
            shadowColor: colors.shadow,
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.surfaceSecondary,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}
            >
              <Ionicons name="pie-chart" size={20} color={colors.primary} />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.text,
                fontFamily: fontFamily.bold,
              }}
            >
              Visual Breakdown
            </Text>
          </View>
          <AssetsDebtsChart assets={chartAssets} debts={chartDebts} />
        </View>
      </ScrollView>

      {/* Floating AI Chatbot - only show on main tab screens */}
      <FloatingAIChatbot />
    </SafeAreaView>
  );
};
