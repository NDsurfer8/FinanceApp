import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SettingsScreenProps {
  onLogout?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onLogout }) => {
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
        {/* User Profile */}
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "#6366f1",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}
            >
              <Ionicons name="person" size={30} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 18, fontWeight: "600", color: "#1f2937" }}
              >
                John Doe
              </Text>
              <Text style={{ fontSize: 14, color: "#6b7280" }}>
                john.doe@example.com
              </Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
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

          <TouchableOpacity style={styles.settingItem}>
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

          <TouchableOpacity style={styles.settingItem}>
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

          <TouchableOpacity style={styles.settingItem}>
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

          <TouchableOpacity style={styles.settingItem}>
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
