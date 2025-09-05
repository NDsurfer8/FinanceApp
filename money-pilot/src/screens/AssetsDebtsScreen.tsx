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
  Modal,
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
import { useScrollDetection } from "../hooks/useScrollDetection";
import { TourGuide } from "../components/TourGuide";
import { HelpfulTooltip } from "../components/HelpfulTooltip";

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
  const { isScrolling, handleScrollBegin, handleScrollEnd } =
    useScrollDetection();
  const [loading, setLoading] = useState(false);
  const [isAssetsCollapsed, setIsAssetsCollapsed] = useState(false);
  const [isDebtsCollapsed, setIsDebtsCollapsed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();
  const { hasPremiumAccess } = useSubscription();
  const { presentPaywall } = usePaywall();

  // Animation for glow effect when no assets
  const assetsGlowAnim = React.useRef(new Animated.Value(0)).current;

  // Background refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        refreshInBackground();
      }
    }, [user, refreshInBackground])
  );

  // Animate glow effect when no assets
  useEffect(() => {
    if (assets.length === 0) {
      // Start pulsing glow animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(assetsGlowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(assetsGlowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      pulseAnimation.start();
    } else {
      // Stop animation and reset
      assetsGlowAnim.setValue(0);
    }
  }, [assets.length]);

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

    if (type === "asset") {
      return (
        <Animated.View
          style={{
            alignItems: "center",
            padding: 32,
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 16,
            marginVertical: 8,
            shadowColor: colors.primary,
            shadowOpacity: assetsGlowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.08, 0.3],
            }),
            shadowRadius: assetsGlowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 20],
            }),
            shadowOffset: { width: 0, height: 4 },
            elevation: assetsGlowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [4, 8],
            }),
            borderWidth: 2,
            borderColor: assetsGlowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [colors.primary + "40", colors.primary + "80"],
            }),
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
        </Animated.View>
      );
    }

    // For debts, use regular View without glow
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
            Add Your First Debt
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
          borderRadius: 12,
          padding: 16,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          shadowOpacity: 0.04,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        }}
        onPress={() => handleEditItem(asset, "asset")}
        activeOpacity={0.6}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.success,
                  marginRight: 8,
                }}
              />
              <Text
                style={{
                  fontSize: 16,
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
                fontSize: 13,
                color: colors.textSecondary,
                fontFamily: fontFamily.regular,
                marginLeft: 14,
              }}
            >
              {getAssetTypeLabel(asset.type)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.success,
                fontFamily: fontFamily.bold,
                marginBottom: 2,
              }}
            >
              ${asset.balance.toLocaleString()}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={12}
              color={colors.textTertiary}
            />
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
          borderRadius: 12,
          padding: 16,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          shadowOpacity: 0.04,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 1 },
          elevation: 1,
        }}
        onPress={() => handleEditItem(debt, "debt")}
        activeOpacity={0.6}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.error,
                  marginRight: 8,
                }}
              />
              <Text
                style={{
                  fontSize: 16,
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
                marginLeft: 14,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSecondary,
                  fontFamily: fontFamily.regular,
                  marginRight: 12,
                }}
              >
                {debt.rate}% APR
              </Text>
              <Text
                style={{
                  fontSize: 13,
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
                fontSize: 18,
                fontWeight: "700",
                color: colors.error,
                fontFamily: fontFamily.bold,
                marginBottom: 2,
              }}
            >
              ${debt.balance.toLocaleString()}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={12}
              color={colors.textTertiary}
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderFinancialInsights = () => (
    <TourGuide zone={1} screen="AssetsDebts">
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          shadowColor: colors.shadow,
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        }}
      >
        {/* Net Worth - Main Focus */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                fontFamily: fontFamily.medium,
                marginBottom: 4,
              }}
            >
              Net Worth
            </Text>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: netWorth >= 0 ? colors.success : colors.error,
                fontFamily: fontFamily.bold,
              }}
            >
              ${Math.abs(netWorth).toLocaleString()}
            </Text>
          </View>

          {/* Quick Stats */}
          <View style={{ alignItems: "flex-end" }}>
            <View
              style={{
                backgroundColor: isHealthyRatio
                  ? colors.success + "15"
                  : colors.warning + "15",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                marginBottom: 4,
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
                {debtToAssetRatio.toFixed(0)}% Debt Ratio
              </Text>
            </View>
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                fontFamily: fontFamily.regular,
              }}
            >
              {isHealthyRatio ? "Healthy" : "High"}
            </Text>
          </View>
        </View>

        {/* Quick Action */}
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
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 10,
            flexDirection: "row",
            alignItems: "center",
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
                borderRadius: 6,
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
    </TourGuide>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={colors.text === "#000000" ? "dark-content" : "light-content"}
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollBegin={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {/* Header */}
        <StandardHeader
          title={translate("assetsDebts", isFriendlyMode)}
          subtitle="Track your net worth and financial health"
          showBackButton={false}
          rightComponent={
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: colors.shadow,
                shadowOpacity: 0.1,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={colors.buttonText} />
            </TouchableOpacity>
          }
        />

        {/* Financial Insights Section */}
        {renderFinancialInsights()}

        {/* Assets Section */}

        <TourGuide zone={2} screen="AssetsDebts">
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
            <TouchableOpacity
              onPress={() => setIsAssetsCollapsed(!isAssetsCollapsed)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
                paddingVertical: 4,
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.success + "20",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="trending-up" size={16} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: colors.text,
                    fontFamily: fontFamily.semiBold,
                  }}
                >
                  {translate("assets", isFriendlyMode)}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    fontFamily: fontFamily.regular,
                  }}
                >
                  {assets.length} item{assets.length !== 1 ? "s" : ""} • $
                  {assetTotal.toLocaleString()}
                </Text>
              </View>
              <Ionicons
                name={isAssetsCollapsed ? "chevron-down" : "chevron-up"}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

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
        </TourGuide>

        {/* Debts Section */}

        <TourGuide zone={3} screen="AssetsDebts">
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
            <TouchableOpacity
              onPress={() => setIsDebtsCollapsed(!isDebtsCollapsed)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
                paddingVertical: 4,
              }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.error + "20",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="trending-down" size={16} color={colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: colors.text,
                    fontFamily: fontFamily.semiBold,
                  }}
                >
                  {translate("debt", isFriendlyMode)}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    fontFamily: fontFamily.regular,
                  }}
                >
                  {debts.length} item{debts.length !== 1 ? "s" : ""} • $
                  {totalDebt.toLocaleString()}
                </Text>
              </View>
              <Ionicons
                name={isDebtsCollapsed ? "chevron-down" : "chevron-up"}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

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
        </TourGuide>

        {/* Chart Section */}
        {(hasAssets || hasDebts) && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              shadowColor: colors.shadow,
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.surfaceSecondary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="pie-chart" size={16} color={colors.primary} />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  fontFamily: fontFamily.semiBold,
                }}
              >
                Visual Breakdown
              </Text>
            </View>
            <AssetsDebtsChart assets={chartAssets} debts={chartDebts} />
          </View>
        )}
      </ScrollView>

      {/* Floating AI Chatbot - only show on main tab screens */}
      <FloatingAIChatbot hideOnScroll={true} isScrolling={isScrolling} />

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxWidth: 320,
              shadowColor: colors.shadow,
              shadowOpacity: 0.25,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.text,
                fontFamily: fontFamily.bold,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              Add New Item
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                fontFamily: fontFamily.regular,
                textAlign: "center",
                marginBottom: 24,
              }}
            >
              What would you like to add to your financial portfolio?
            </Text>

            <View style={{ gap: 12 }}>
              {/* Add Asset Option */}
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  handleQuickAction("asset");
                }}
                style={{
                  backgroundColor: colors.success + "15",
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.success + "30",
                }}
                activeOpacity={0.7}
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
                  <Ionicons
                    name="trending-up"
                    size={20}
                    color={colors.success}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.text,
                      fontFamily: fontFamily.semiBold,
                      marginBottom: 2,
                    }}
                  >
                    Add Asset
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      fontFamily: fontFamily.regular,
                    }}
                  >
                    Track your investments, savings, and valuable items
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>

              {/* Add Debt Option */}
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  handleQuickAction("debt");
                }}
                style={{
                  backgroundColor: colors.error + "15",
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.error + "30",
                }}
                activeOpacity={0.7}
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
                  <Ionicons
                    name="trending-down"
                    size={20}
                    color={colors.error}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.text,
                      fontFamily: fontFamily.semiBold,
                      marginBottom: 2,
                    }}
                  >
                    Add Debt
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      fontFamily: fontFamily.regular,
                    }}
                  >
                    Track your loans, credit cards, and other debts
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setShowAddModal(false)}
              style={{
                marginTop: 20,
                paddingVertical: 12,
                alignItems: "center",
              }}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: colors.textSecondary,
                  fontFamily: fontFamily.medium,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
