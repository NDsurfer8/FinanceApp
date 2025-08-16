import React from "react";
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
import { useAuth } from "../hooks/useAuth";

interface SettingsScreenProps {
  onLogout?: () => void;
  navigation?: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onLogout,
  navigation,
}) => {
  const { user } = useAuth();

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
              {user?.photoURL ? (
                <Image
                  source={{ uri: user.photoURL }}
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
                {user?.displayName || "User"}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: "#6b7280",
                  marginBottom: 8,
                  fontWeight: "500",
                }}
              >
                {user?.email || "No email"}
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
                  {user?.metadata?.creationTime
                    ? new Date(user.metadata.creationTime).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          year: "numeric",
                        }
                      )
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
                {user?.metadata?.lastSignInTime
                  ? new Date(user.metadata.lastSignInTime).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                      }
                    )
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
                {user?.emailVerified ? "✓" : "✗"}
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
          <TouchableOpacity
            style={{
              backgroundColor: "#111827",
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 12,
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              Connect Bank (Plaid)
            </Text>
          </TouchableOpacity>
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
};
