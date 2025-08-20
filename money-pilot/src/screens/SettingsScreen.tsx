import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../hooks/useAuth";
import { useFocusEffect } from "@react-navigation/native";
import { useUser } from "../context/UserContext";
import { PlaidLinkComponent } from "../components/PlaidLinkComponent";
import { usePaywall } from "../hooks/usePaywall";
import { useSubscription } from "../contexts/SubscriptionContext";
import { plaidService } from "../services/plaid";
import { useTheme } from "../contexts/ThemeContext";

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
  const { subscriptionStatus, refreshSubscriptionStatus } = useSubscription();
  const [refreshingSubscription, setRefreshingSubscription] = useState(false);
  const [isBankConnected, setIsBankConnected] = useState(false);
  const { isDark, toggleTheme, colors } = useTheme();
  const [connectedBankInfo, setConnectedBankInfo] = useState<{
    name: string;
    accounts: any[];
  } | null>(null);

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
    });
  }, [subscriptionStatus]);

  // Check bank connection status
  useEffect(() => {
    const checkBankConnection = async () => {
      try {
        const connected = await plaidService.isBankConnected();
        setIsBankConnected(connected);
        console.log("SettingsScreen: Bank connection status:", connected);

        if (connected) {
          const bankInfo = await plaidService.getConnectedBankInfo();
          setConnectedBankInfo(bankInfo);
          console.log("SettingsScreen: Connected bank info:", bankInfo);
        } else {
          setConnectedBankInfo(null);
        }
      } catch (error) {
        console.error("Failed to check bank connection:", error);
        setIsBankConnected(false);
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

  // Refresh user data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log("SettingsScreen: Screen focused, refreshing user data...");

      // Force refresh user data immediately when screen comes into focus
      forceRefresh();

      // Check bank connection status when screen comes into focus
      const checkBankConnection = async () => {
        try {
          const connected = await plaidService.isBankConnected();
          setIsBankConnected(connected);
          console.log(
            "SettingsScreen: Bank connection status on focus:",
            connected
          );

          if (connected) {
            const bankInfo = await plaidService.getConnectedBankInfo();
            setConnectedBankInfo(bankInfo);
            console.log(
              "SettingsScreen: Connected bank info on focus:",
              bankInfo
            );
          } else {
            setConnectedBankInfo(null);
          }
        } catch (error) {
          console.error("Failed to check bank connection on focus:", error);
          setIsBankConnected(false);
          setConnectedBankInfo(null);
        }
      };

      checkBankConnection();
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

  const handleRefreshSubscription = async () => {
    try {
      setRefreshingSubscription(true);
      console.log("Manually refreshing subscription status...");

      // Use force refresh to get the latest data from RevenueCat servers
      const newStatus = await refreshSubscriptionStatus(true);
      console.log("Manual refresh completed - new status:", newStatus);

      if (newStatus?.isPremium) {
        Alert.alert(
          "Subscription Updated!",
          "Your premium subscription is now active. You can now use all premium features!"
        );
      } else {
        Alert.alert(
          "No Active Subscription",
          "No active premium subscription found. If you recently purchased, try again in a moment."
        );
      }
    } catch (error) {
      console.error("Failed to refresh subscription:", error);
      Alert.alert(
        "Error",
        "Failed to refresh subscription status. Please try again."
      );
    } finally {
      setRefreshingSubscription(false);
    }
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
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
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
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: colors.text,
                  marginBottom: 4,
                  letterSpacing: -0.3,
                }}
              >
                {currentUser?.displayName || "User"}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: colors.textSecondary,
                  marginBottom: 8,
                  fontWeight: "500",
                }}
              >
                {currentUser?.email || "No email"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    backgroundColor: "#dcfce7",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 12,
                    marginRight: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#16a34a",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Active
                  </Text>
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
                backgroundColor: "#f8fafc",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#e2e8f0",
              }}
              onPress={() => navigation.navigate("EditProfile")}
            >
              <Ionicons name="create" size={20} color="#6366f1" />
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
            </View>
          </View>
        </View>

        {/* Data Sources */}
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
              marginBottom: 8,
              color: colors.text,
            }}
          >
            Data Sources
          </Text>
          <PlaidLinkComponent
            onSuccess={async () => {
              console.log("Bank connected successfully");
              setIsBankConnected(true);

              // Get the bank information after successful connection
              try {
                const bankInfo = await plaidService.getConnectedBankInfo();
                setConnectedBankInfo(bankInfo);
                console.log(
                  "SettingsScreen: Bank info after connection:",
                  bankInfo
                );
              } catch (error) {
                console.error(
                  "Failed to get bank info after connection:",
                  error
                );
              }
            }}
            onExit={() => {
              console.log("Plaid link exited");
            }}
          />
          {isBankConnected ? (
            <View>
              {connectedBankInfo?.accounts &&
                connectedBankInfo.accounts.length > 0 && (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 12,
                      marginTop: 8,
                    }}
                  >
                    {connectedBankInfo.accounts.length} account
                    {connectedBankInfo.accounts.length !== 1 ? "s" : ""}{" "}
                    connected
                  </Text>
                )}
            </View>
          ) : (
            <Text style={{ marginTop: 8, color: colors.textSecondary }}>
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
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              marginBottom: 8,
              color: colors.text,
            }}
          >
            Premium
          </Text>

          {subscriptionStatus?.isPremium ? (
            <View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="star" size={16} color="#f59e0b" />
                <Text
                  style={{
                    color: "#16a34a",
                    fontSize: 14,
                    fontWeight: "600",
                    marginLeft: 6,
                  }}
                >
                  Premium Active
                </Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                You have access to all premium features including unlimited
                transactions, goals, and advanced analytics.
              </Text>
              {subscriptionStatus.expirationDate && (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Expires:{" "}
                  {subscriptionStatus.expirationDate.toLocaleDateString()}
                </Text>
              )}
              <TouchableOpacity
                style={{
                  backgroundColor: "#f3f4f6",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 8,
                  alignSelf: "flex-start",
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 8,
                }}
                onPress={handleRefreshSubscription}
                disabled={refreshingSubscription}
              >
                <Ionicons
                  name="refresh"
                  size={14}
                  color={refreshingSubscription ? "#9ca3af" : "#6b7280"}
                />
                <Text
                  style={{
                    color: refreshingSubscription ? "#9ca3af" : "#6b7280",
                    fontWeight: "600",
                    marginLeft: 6,
                    fontSize: 12,
                  }}
                >
                  {refreshingSubscription ? "Refreshing..." : "Refresh Status"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
                Unlock auto-import, AI budgeting, and unlimited accounts.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: "#0ea5e9",
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  alignSelf: "flex-start",
                }}
                onPress={presentPaywall}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>
                  Start 7‑day Trial
                </Text>
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
            App Settings
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
