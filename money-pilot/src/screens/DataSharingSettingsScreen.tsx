import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import {
  updateUserDataSharingSettings,
  getUserSharedGroups,
} from "../services/userData";
import { syncUserDataToGroup } from "../services/sharedFinanceDataSync";

interface DataSharingSettings {
  shareNetWorth: boolean;
  shareMonthlyIncome: boolean;
  shareMonthlyExpenses: boolean;
  shareTransactions: boolean;
  shareRecurringTransactions: boolean;
  shareAssets: boolean;
  shareDebts: boolean;
  shareGoals: boolean;
}

export default function DataSharingSettingsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [settings, setSettings] = useState<DataSharingSettings>({
    shareNetWorth: true,
    shareMonthlyIncome: true,
    shareMonthlyExpenses: true,
    shareTransactions: true,
    shareRecurringTransactions: true,
    shareAssets: false,
    shareDebts: false,
    shareGoals: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    if (!user?.uid) return;

    try {
      // Load current settings from user profile
      // For now, using defaults - you can implement loading from Firebase
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleToggle = (key: keyof DataSharingSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      // Save the data sharing settings
      await updateUserDataSharingSettings(user.uid, settings);

      // Automatically sync data to all shared groups
      await syncDataToAllGroups(user.uid, settings);

      Alert.alert(
        "Success",
        "Data sharing settings saved and synced to all groups!"
      );
      navigation.goBack();
    } catch (error) {
      console.error("Error saving settings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const syncDataToAllGroups = async (
    userId: string,
    userSettings: DataSharingSettings
  ) => {
    try {
      // Get user's shared groups
      const userGroups = await getUserSharedGroups(userId);

      // Sync data to each group
      for (const group of userGroups) {
        await syncUserDataToGroup(userId, group.id!, userSettings);
      }
    } catch (error) {
      console.error("Error syncing data to groups:", error);
      // Don't throw error here - we still want to save the settings
    }
  };

  const renderSettingItem = (
    key: keyof DataSharingSettings,
    title: string,
    description: string,
    icon: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={24} color="#007AFF" />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={() => handleToggle(key)}
        trackColor={{ false: "#E5E5EA", true: "#007AFF" }}
        thumbColor={settings[key] ? "#FFFFFF" : "#FFFFFF"}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Data Sharing</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What to Share</Text>
          <Text style={styles.sectionDescription}>
            Choose which financial information you want to share with your
            shared finance groups.
          </Text>
        </View>

        <View style={styles.settingsContainer}>
          {renderSettingItem(
            "shareNetWorth",
            "Net Worth",
            "Share your current net worth with group members",
            "trending-up"
          )}

          {renderSettingItem(
            "shareMonthlyIncome",
            "Monthly Income",
            "Share your monthly income amounts",
            "cash"
          )}

          {renderSettingItem(
            "shareMonthlyExpenses",
            "Monthly Expenses",
            "Share your monthly expense amounts",
            "card"
          )}

          {renderSettingItem(
            "shareTransactions",
            "Recent Transactions",
            "Share your transaction history",
            "list"
          )}

          {renderSettingItem(
            "shareRecurringTransactions",
            "Recurring Transactions",
            "Share your recurring bills and income",
            "repeat"
          )}

          {renderSettingItem(
            "shareAssets",
            "Assets",
            "Share your asset details",
            "home"
          )}

          {renderSettingItem(
            "shareDebts",
            "Debts",
            "Share your debt information",
            "warning"
          )}

          {renderSettingItem(
            "shareGoals",
            "Financial Goals",
            "Share your savings and investment goals",
            "flag"
          )}
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={20} color="#007AFF" />
          </View>
          <Text style={styles.infoText}>
            Your data will only be shared with members of groups you've joined.
            You can change these settings at any time.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? "Saving..." : "Save Settings"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: "#8E8E93",
    lineHeight: 22,
  },
  settingsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F8FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: "#8E8E93",
    lineHeight: 18,
  },
  infoSection: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1976D2",
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  saveButton: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
