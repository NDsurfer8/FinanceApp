import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../hooks/useAuth";
import { useFocusEffect } from "@react-navigation/native";
import { useUser } from "../context/UserContext";
import { sendEmailVerificationLink } from "../services/auth";
import { PlaidLinkComponent } from "../components/PlaidLinkComponent";
import { usePaywall } from "../hooks/usePaywall";
import { useSubscription } from "../contexts/SubscriptionContext";
import { plaidService } from "../services/plaid";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";
import { useChatbot } from "../contexts/ChatbotContext";
import { useData } from "../contexts/DataContext";
import { AIUsageAdminScreen } from "./AIUsageAdminScreen";
import { FloatingAIChatbot } from "../components/FloatingAIChatbot";

interface SettingsScreenProps {
  onLogout?: () => void;
  navigation?: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onLogout,
  navigation,
}) => {
  const { user } = useAuth();
  const { currentUser, forceRefresh } = useUser();
  const [photoKey, setPhotoKey] = useState(Date.now());
  const { presentPaywall } = usePaywall();

  const handlePaywallPress = async () => {
    setLoading(true);
    try {
      await presentPaywall();
    } finally {
      setLoading(false);
    }
  };
  const { subscriptionStatus, isEligibleForIntroOffer } = useSubscription();
  const { isDark, toggleTheme, colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();
  const { isVisible: isChatbotVisible, toggleChatbot } = useChatbot();
  const {
    refreshBankData,
    isBankDataLoading,
    bankTransactions,
    isBankConnected,
  } = useData();
  const [connectedBankInfo, setConnectedBankInfo] = useState<{
    name: string;
    accounts: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailVerificationLoading, setEmailVerificationLoading] =
    useState(false);
  const [bankConnectionLoading, setBankConnectionLoading] = useState(false);

  // Check if user is admin (you can modify this logic as needed)
  const isAdmin =
    user?.email === "noahduran911@gmail.com" ||
    user?.email === "admin@vectorfi.ai";

  // Monitor bank connection status and stop loading when connected or disconnected
  useEffect(() => {
    if (bankConnectionLoading && isBankConnected) {
      setBankConnectionLoading(false);
    }
  }, [isBankConnected, bankConnectionLoading]);

  // Stop loading when bank data is loaded
  useEffect(() => {
    if (
      bankConnectionLoading &&
      !isBankDataLoading &&
      bankTransactions.length > 0
    ) {
      setBankConnectionLoading(false);
    }
  }, [bankConnectionLoading, isBankDataLoading, bankTransactions.length]);

  // Additional check to stop loading if bank is already connected on mount
  useEffect(() => {
    const checkAndStopLoading = async () => {
      if (bankConnectionLoading) {
        const connected = await plaidService.isBankConnected();
        if (connected) {
          setBankConnectionLoading(false);
        }
      }
    };

    checkAndStopLoading();
  }, [bankConnectionLoading]);

  // Function to handle email verification
  const handleEmailVerification = async () => {
    if (!currentUser?.email) {
      Alert.alert("Error", "No email address found for this account.");
      return;
    }

    if (currentUser.emailVerified) {
      Alert.alert("Already Verified", "Your email is already verified.");
      return;
    }

    setEmailVerificationLoading(true);
    try {
      await sendEmailVerificationLink();
      Alert.alert(
        "Verification Email Sent",
        `We've sent a verification email to ${currentUser.email}. Please check your inbox and click the verification link.`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("Email verification error:", error);
      Alert.alert(
        "Verification Failed",
        error.message || "Failed to send verification email. Please try again."
      );
    } finally {
      setEmailVerificationLoading(false);
    }
  };

  // Function to format display name for long names
  const formatDisplayName = (displayName: string | null | undefined) => {
    if (!displayName) return { firstName: "User", lastName: "" };

    const nameParts = displayName.trim().split(" ");
    if (nameParts.length === 1) {
      return { firstName: nameParts[0], lastName: "" };
    }

    // If name is longer than 20 characters, split it
    if (displayName.length > 20) {
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");
      return { firstName, lastName };
    }

    // For shorter names, keep on one line
    return { firstName: displayName, lastName: "" };
  };

  // Get introductory offer eligibility from RevenueCat
  const introOfferEligible = isEligibleForIntroOffer();

  // Debug logging
  useEffect(() => {
    console.log("SettingsScreen: User data updated", {
      authUserPhotoURL: user?.photoURL,
      contextUserPhotoURL: currentUser?.photoURL,
      authUserDisplayName: user?.displayName,
      contextUserDisplayName: currentUser?.displayName,
    });
  }, [user, currentUser]);

  // Debug subscription status
  useEffect(() => {
    console.log("SettingsScreen: Subscription status updated", {
      isPremium: subscriptionStatus?.isPremium,
      isActive: subscriptionStatus?.isActive,
      features: subscriptionStatus?.features,
      expirationDate: subscriptionStatus?.expirationDate,
      productId: subscriptionStatus?.productId,
      isEligibleForIntroOffer: introOfferEligible,
    });
  }, [subscriptionStatus, introOfferEligible]);

  // Check bank connection status
  useEffect(() => {
    const checkBankConnection = async () => {
      try {
        const connected = await plaidService.isBankConnected();
        console.log("SettingsScreen: Bank connection status:", connected);

        // If bank is connected, stop any loading state
        if (connected && bankConnectionLoading) {
          console.log(
            "SettingsScreen: Bank is connected, clearing loading state"
          );
          setBankConnectionLoading(false);
        }

        if (connected) {
          const bankInfo = await plaidService.getConnectedBankInfo();
          setConnectedBankInfo(bankInfo);
        } else {
          setConnectedBankInfo(null);
        }
      } catch (error) {
        console.error("Failed to check bank connection:", error);
        setConnectedBankInfo(null);
      }
    };

    checkBankConnection();
  }, []);

  // Force re-render when photo URL changes
  useEffect(() => {
    if (currentUser?.photoURL) {
      console.log("SettingsScreen: Photo URL changed, updating key");
      setPhotoKey(Date.now()); // Use timestamp for unique key
    }
  }, [currentUser?.photoURL]);

  // Refresh user data when screen comes into focus (optimized)
  useFocusEffect(
    React.useCallback(() => {
      console.log("SettingsScreen: Screen focused, checking data freshness...");

      // Only refresh user data if it's stale (older than 5 minutes)
      const lastRefresh = (forceRefresh as any).lastCallTime || 0;
      const timeSinceLastRefresh = Date.now() - lastRefresh;
      const FIVE_MINUTES = 5 * 60 * 1000;

      if (timeSinceLastRefresh > FIVE_MINUTES) {
        console.log("SettingsScreen: Data is stale, refreshing...");
        forceRefresh();
        (forceRefresh as any).lastCallTime = Date.now();
      } else {
        console.log("SettingsScreen: Data is fresh, skipping refresh");
      }

      // Check bank connection status only if not already checked recently
      const lastBankCheck = (global as any).lastBankCheckTime || 0;
      const timeSinceLastBankCheck = Date.now() - lastBankCheck;
      const TWO_MINUTES = 2 * 60 * 1000;

      if (timeSinceLastBankCheck > TWO_MINUTES) {
        const checkBankConnection = async () => {
          try {
            const connected = await plaidService.isBankConnected();

            if (connected) {
              const bankInfo = await plaidService.getConnectedBankInfo();
              setConnectedBankInfo(bankInfo);
            } else {
              setConnectedBankInfo(null);
            }
            (global as any).lastBankCheckTime = Date.now();
          } catch (error) {
            console.error("Failed to check bank connection on focus:", error);
            setConnectedBankInfo(null);
          }
        };

        checkBankConnection();
      }
    }, [forceRefresh])
  );

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      isBankConnected
        ? "You will be logged out and your bank connection will be disconnected for security. You'll need to reconnect your bank when you log back in."
        : "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              const { signOutUser } = await import("../services/auth");
              await signOutUser();
              onLogout?.();
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to logout. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Enhanced User Profile */}
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
            marginBottom: 20,
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
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#6366f1",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 20,
                shadowColor: "#6366f1",
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 4,
                overflow: "hidden",
              }}
            >
              {currentUser?.photoURL ? (
                <Image
                  key={photoKey} // Force re-render when photoURL changes
                  source={{ uri: currentUser?.photoURL }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                  }}
                />
              ) : (
                <Ionicons name="person" size={36} color="white" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              {(() => {
                const { firstName, lastName } = formatDisplayName(
                  currentUser?.displayName
                );
                return (
                  <>
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "700",
                        color: colors.text,
                        marginBottom: lastName ? 2 : 4,
                        letterSpacing: -0.3,
                      }}
                    >
                      {firstName}
                    </Text>
                    {lastName && (
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "600",
                          color: colors.text,
                          marginBottom: 4,
                          letterSpacing: -0.3,
                        }}
                      >
                        {lastName}
                      </Text>
                    )}
                  </>
                );
              })()}

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    backgroundColor: "#f0fdf4",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    marginRight: 10,
                    shadowColor: "#16a34a",
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 3 },
                    elevation: 4,
                    borderWidth: 1.5,
                    borderColor: "#bbf7d0",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: "#16a34a",
                        marginRight: 5,
                        shadowColor: "#16a34a",
                        shadowOpacity: 0.3,
                        shadowRadius: 2,
                        shadowOffset: { width: 0, height: 1 },
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#15803d",
                        fontWeight: "800",
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      Active
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Member since{" "}
                  {currentUser?.metadata?.creationTime
                    ? new Date(
                        currentUser.metadata.creationTime
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })
                    : "Recently"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                borderColor: colors.primary,
                alignSelf: "flex-start",
                shadowColor: colors.primary,
                shadowOpacity: 0.2,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 4,
                minWidth: 40,
                minHeight: 40,
                justifyContent: "center",
                alignItems: "center",
              }}
              onPress={() => navigation.navigate("EditProfile")}
              activeOpacity={0.8}
            >
              <Ionicons name="create" size={30} color={colors.buttonText} />
            </TouchableOpacity>
          </View>

          {/* Profile Stats */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingTop: 20,
              borderTopWidth: 1,
              borderTopColor: "#f1f5f9",
            }}
          >
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                  marginBottom: 4,
                }}
              >
                {currentUser?.metadata?.lastSignInTime
                  ? new Date(
                      currentUser.metadata.lastSignInTime
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "Today"}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  fontWeight: "500",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Last Login
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: subscriptionStatus?.isPremium
                    ? colors.warning
                    : colors.text,
                  marginBottom: 4,
                }}
              >
                {subscriptionStatus?.isPremium ? "Premium" : "Free"}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  fontWeight: "500",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Plan
              </Text>
            </View>
            <View style={{ alignItems: "center", flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: colors.text,
                  marginBottom: 4,
                }}
              >
                {currentUser?.emailVerified ? "✓" : "✗"}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  fontWeight: "500",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Verified
              </Text>
              {!currentUser?.emailVerified && currentUser?.email && (
                <TouchableOpacity
                  onPress={handleEmailVerification}
                  disabled={emailVerificationLoading}
                  style={{
                    marginTop: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: colors.primary,
                    borderRadius: 8,
                    opacity: emailVerificationLoading ? 0.6 : 1,
                  }}
                >
                  {emailVerificationLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text
                      style={{
                        color: "white",
                        fontSize: 10,
                        fontWeight: "600",
                        textTransform: "uppercase",
                      }}
                    >
                      Verify Email
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Data Sources */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            shadowColor: colors.shadow,
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              marginBottom: 16,
              color: colors.text,
            }}
          >
            Data Sources
          </Text>
          <PlaidLinkComponent
            onSuccess={async () => {
              console.log("Bank connected successfully");

              // Get the bank information after successful connection
              try {
                const bankInfo = await plaidService.getConnectedBankInfo();
                setConnectedBankInfo(bankInfo);

                // Refresh bank data to load transactions
                console.log("Refreshing bank data after connection...");
                await refreshBankData(true);
                console.log("Bank data refreshed successfully");
              } catch (error) {
                console.error(
                  "Failed to get bank info after connection:",
                  error
                );
              }
            }}
            onExit={() => {
              console.log("Plaid link exited");
              // Don't stop loading here - let it continue until connection is confirmed
            }}
            onLoadingChange={(loading) => {
              setBankConnectionLoading(loading);
            }}
          />
          {isBankConnected ? (
            <View style={{ marginTop: 12 }}>
              {connectedBankInfo?.accounts &&
                connectedBankInfo.accounts.length > 0 && (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                    }}
                  >
                    {connectedBankInfo.accounts.length} account
                    {connectedBankInfo.accounts.length !== 1 ? "s" : ""}{" "}
                    connected
                  </Text>
                )}
            </View>
          ) : (
            <Text style={{ marginTop: 12, color: colors.textSecondary }}>
              Or keep it manual—works great from day one.
            </Text>
          )}
        </View>

        {/* Premium */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            shadowColor: colors.shadow,
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
              }}
            >
              Premium
            </Text>
            {subscriptionStatus?.isPremium && (
              <Ionicons
                name="star"
                size={16}
                color="#f59e0b"
                style={{ marginLeft: 6 }}
              />
            )}
          </View>

          {subscriptionStatus?.isPremium ? (
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                Premium + Plaid: review, label, add to budget.
              </Text>
              {subscriptionStatus.expirationDate && (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Renews:{" "}
                  {subscriptionStatus.expirationDate.toLocaleDateString()}
                </Text>
              )}
            </View>
          ) : (
            <View>
              <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                {introOfferEligible
                  ? "Start your free trial and unlock auto-import, AI budgeting, and unlimited accounts."
                  : "Unlock auto-import, AI budgeting, and unlimited accounts."}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: "#0ea5e9",
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  alignSelf: "flex-start",
                  opacity: loading ? 0.6 : 1,
                }}
                onPress={handlePaywallPress}
                disabled={loading}
              >
                {loading ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <ActivityIndicator
                      size="small"
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ color: "white", fontWeight: "700" }}>
                      Loading...
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: "white", fontWeight: "700" }}>
                    {introOfferEligible ? "Start Free Trial" : "Get Premium"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* App Settings */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            shadowColor: colors.shadow,
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              marginBottom: 12,
              color: colors.text,
            }}
          >
            {translate("settings", isFriendlyMode)}
          </Text>

          {/* Dark Mode Toggle */}
          <TouchableOpacity
            style={[
              styles.settingItem,
              { borderBottomColor: colors.borderLight },
            ]}
            onPress={toggleTheme}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={20}
                color={colors.textSecondary}
                style={{ marginRight: 12 }}
              />
              <Text style={[styles.settingText, { color: colors.text }]}>
                Dark Mode
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  marginRight: 8,
                  fontSize: 14,
                }}
              >
                {isDark ? "On" : "Off"}
              </Text>
              <View
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: isDark ? colors.primary : colors.border,
                  padding: 2,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "#fff",
                    transform: [{ translateX: isDark ? 20 : 0 }],
                  }}
                />
              </View>
            </View>
          </TouchableOpacity>

          {/* AI Chatbot Toggle */}
          <TouchableOpacity
            style={[
              styles.settingItem,
              { borderBottomColor: colors.borderLight },
            ]}
            onPress={toggleChatbot}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="chatbubble-ellipses"
                size={20}
                color={colors.textSecondary}
                style={{ marginRight: 12 }}
              />
              <Text style={[styles.settingText, { color: colors.text }]}>
                AI Chatbot
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  marginRight: 8,
                  fontSize: 14,
                }}
              >
                {isChatbotVisible ? "On" : "Off"}
              </Text>
              <View
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: isChatbotVisible
                    ? colors.primary
                    : colors.border,
                  padding: 2,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "#fff",
                    transform: [{ translateX: isChatbotVisible ? 20 : 0 }],
                  }}
                />
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              { borderBottomColor: colors.borderLight },
            ]}
            onPress={() => navigation?.navigate("NotificationSettings")}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="notifications"
                size={20}
                color={colors.textSecondary}
                style={{ marginRight: 12 }}
              />
              <Text style={[styles.settingText, { color: colors.text }]}>
                Notifications
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              { borderBottomColor: colors.borderLight },
            ]}
            onPress={() => navigation?.navigate("PrivacySecurity")}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={colors.textSecondary}
                style={{ marginRight: 12 }}
              />
              <Text style={[styles.settingText, { color: colors.text }]}>
                Privacy & Security
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              { borderBottomColor: colors.borderLight },
            ]}
            onPress={() => navigation?.navigate("HelpSupport")}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="help-circle"
                size={20}
                color={colors.textSecondary}
                style={{ marginRight: 12 }}
              />
              <Text style={[styles.settingText, { color: colors.text }]}>
                Help & Support
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              { borderBottomColor: colors.borderLight },
            ]}
            onPress={() => navigation?.navigate("FinancialPlans")}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="document-text"
                size={20}
                color={colors.textSecondary}
                style={{ marginRight: 12 }}
              />
              <Text style={[styles.settingText, { color: colors.text }]}>
                Financial Plans
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.settingItem,
              { borderBottomColor: colors.borderLight },
            ]}
            onPress={() => navigation?.navigate("About")}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="information-circle"
                size={20}
                color={colors.textSecondary}
                style={{ marginRight: 12 }}
              />
              <Text style={[styles.settingText, { color: colors.text }]}>
                About
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* AI Usage Admin - Only visible to admin users */}
          {isAdmin && (
            <TouchableOpacity
              style={[
                styles.settingItem,
                { borderBottomColor: colors.borderLight },
              ]}
              onPress={() => navigation?.navigate("AIUsageAdmin")}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="settings"
                  size={20}
                  color={colors.textSecondary}
                  style={{ marginRight: 12 }}
                />
                <Text style={[styles.settingText, { color: colors.text }]}>
                  AI Usage Admin
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.settingItem,
              { borderBottomColor: colors.borderLight },
            ]}
            onPress={async () => {
              try {
                await AsyncStorage.removeItem("hasSeenIntro");
                Alert.alert(
                  "Onboarding Reset",
                  "The onboarding slider will show on the next app launch. Please restart the app to see it.",
                  [{ text: "OK" }]
                );
              } catch (error) {
                Alert.alert("Error", "Failed to reset onboarding");
              }
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="refresh"
                size={20}
                color={colors.textSecondary}
                style={{ marginRight: 12 }}
              />
              <Text style={[styles.settingText, { color: colors.text }]}>
                Reset Onboarding
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            shadowColor: colors.shadow,
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            marginBottom: 12,
          }}
          onPress={handleLogout}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="log-out"
              size={20}
              color="#ef4444"
              style={{ marginRight: 8 }}
            />
            <Text style={{ color: "#ef4444", fontSize: 16, fontWeight: "600" }}>
              Logout
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Floating AI Chatbot - only show on main tab screens */}
      <FloatingAIChatbot />
    </SafeAreaView>
  );
};

const styles = {
  settingItem: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  settingText: {
    fontSize: 16,
    color: "#374151", // This will be overridden with theme colors
  },
  section: {
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#1f2937",
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginRight: 12,
  },
};
