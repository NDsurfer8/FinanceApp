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

  // Debug logging
  useEffect(() => {
    console.log("SettingsScreen: User data updated", {
      authUserPhotoURL: user?.photoURL,
      contextUserPhotoURL: currentUser?.photoURL,
      authUserDisplayName: user?.displayName,
      contextUserDisplayName: currentUser?.displayName,
    });
  }, [user, currentUser]);

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

      // Also refresh after a short delay to catch any pending updates
      setTimeout(() => {
        forceRefresh();
      }, 100);
    }, [forceRefresh])
  );

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: onLogout,
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Enhanced User Profile */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 24,
            shadowColor: "#000",
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
                  color: "#1f2937",
                  marginBottom: 4,
                  letterSpacing: -0.3,
                }}
              >
                {currentUser?.displayName || "User"}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: "#6b7280",
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
                <Text style={{ fontSize: 12, color: "#6b7280" }}>
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
                  color: "#1f2937",
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
                  color: "#6b7280",
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
                  color: "#1f2937",
                  marginBottom: 4,
                }}
              >
                Free
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#6b7280",
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
                  color: "#1f2937",
                  marginBottom: 4,
                }}
              >
                {currentUser?.emailVerified ? "✓" : "✗"}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#6b7280",
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
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            Data Sources
          </Text>
          <PlaidLinkComponent
            onSuccess={() => {
              console.log("Bank connected successfully");
            }}
            onExit={() => {
              console.log("Plaid link exited");
            }}
          />
          <Text style={{ marginTop: 8, color: "#6b7280" }}>
            Or keep it manual—works great from day one.
          </Text>
        </View>

        {/* Premium */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            Premium
          </Text>
          <Text style={{ color: "#6b7280", marginBottom: 8 }}>
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
            onPress={() => navigation?.navigate("Subscription")}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>
              Start 7‑day Trial
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Settings */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 12 }}>
            App Settings
          </Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation?.navigate("NotificationSettings")}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="notifications"
                size={20}
                color="#6b7280"
                style={{ marginRight: 12 }}
              />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation?.navigate("PrivacySecurity")}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color="#6b7280"
                style={{ marginRight: 12 }}
              />
              <Text style={styles.settingText}>Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation?.navigate("HelpSupport")}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="help-circle"
                size={20}
                color="#6b7280"
                style={{ marginRight: 12 }}
              />
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation?.navigate("About")}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="information-circle"
                size={20}
                color="#6b7280"
                style={{ marginRight: 12 }}
              />
              <Text style={styles.settingText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
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
                color="#6b7280"
                style={{ marginRight: 12 }}
              />
              <Text style={styles.settingText}>Reset Onboarding</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 16,
            shadowColor: "#000",
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
    color: "#374151",
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
