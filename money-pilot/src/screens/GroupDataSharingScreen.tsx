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
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";
import { SharedGroup, getSharedGroup } from "../services/userData";
import { syncUserDataToGroup } from "../services/sharedFinanceDataSync";
import { StandardHeader } from "../components/StandardHeader";

interface GroupDataSharingSettings {
  shareNetWorth: boolean;
  shareMonthlyIncome: boolean;
  shareMonthlyExpenses: boolean;
  shareTransactions: boolean;
  shareRecurringTransactions: boolean;
  shareAssets: boolean;
  shareDebts: boolean;
  shareGoals: boolean;
}

interface GroupDataSharingScreenProps {
  navigation: any;
  route: {
    params: {
      groupId: string;
    };
  };
}

export default function GroupDataSharingScreen({
  navigation,
  route,
}: GroupDataSharingScreenProps) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const { transactions, assets, debts, goals, recurringTransactions } =
    useData();
  const [group, setGroup] = useState<SharedGroup | null>(null);
  const [settings, setSettings] = useState<GroupDataSharingSettings>({
    shareNetWorth: true,
    shareMonthlyIncome: true,
    shareMonthlyExpenses: true,
    shareTransactions: false,
    shareRecurringTransactions: false,
    shareAssets: true,
    shareDebts: false,
    shareGoals: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingGroup, setLoadingGroup] = useState(true);

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  // Load settings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid && groupId) {
        loadSharingSettings();
      }
    }, [user?.uid, groupId])
  );

  const loadGroupData = async () => {
    try {
      setLoadingGroup(true);
      const groupData = await getSharedGroup(groupId);
      if (groupData) {
        setGroup(groupData);
      }
    } catch (error) {
      console.error("Error loading group data:", error);
      Alert.alert("Error", "Failed to load group information");
    } finally {
      setLoadingGroup(false);
    }
  };

  const getStorageKey = () => `groupSharing_${user?.uid}_${groupId}`;

  const getUserFinancialData = async (userId: string) => {
    try {
      // Return the data from the context
      return {
        transactions,
        assets,
        debts,
        goals,
        recurringTransactions,
      };
    } catch (error) {
      console.error("Error getting user financial data:", error);
      return {
        transactions: [],
        assets: [],
        debts: [],
        goals: [],
        recurringTransactions: [],
      };
    }
  };

  const loadSharingSettings = async () => {
    try {
      if (!user?.uid) return;

      const storageKey = getStorageKey();
      const savedSettings = await AsyncStorage.getItem(storageKey);

      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } else {
        console.log("⚠️ No saved settings found, using defaults");
      }
    } catch (error) {
      console.error("❌ Error loading sharing settings:", error);
    }
  };

  const saveSharingSettings = async (newSettings: GroupDataSharingSettings) => {
    try {
      if (!user?.uid) return;

      const storageKey = getStorageKey();
      await AsyncStorage.setItem(storageKey, JSON.stringify(newSettings));
    } catch (error) {
      console.error("❌ Error saving sharing settings:", error);
    }
  };

  const handleToggle = async (key: keyof GroupDataSharingSettings) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };

    setSettings(newSettings);
    await saveSharingSettings(newSettings);

    // If user is turning off sharing for a data type, stop the real-time listener
    if (!newSettings[key]) {
      try {
        // Stop real-time sharing for this specific data type
        // Note: Real-time data sharing cleanup will be handled when implementing the new sync system
      } catch (error) {
        console.error("Error stopping real-time sharing for data type:", error);
      }
    }
  };

  // Cleanup real-time listeners when component unmounts
  useEffect(() => {
    return () => {
      if (user?.uid && groupId) {
        // Stop all real-time data sharing when leaving the screen
        // Note: Real-time data sharing cleanup will be handled when implementing the new sync system
      }
    };
  }, [user?.uid, groupId]);

  const handleSave = async () => {
    if (!user?.uid || !group) return;

    setIsLoading(true);
    try {
      console.log("💾 Saving sharing settings:", settings);

      // Get user's current financial data
      const userData = await getUserFinancialData(user.uid);

      // Sync user's data to the group with the selected settings
      await syncUserDataToGroup(user.uid, group.id!, settings, userData);

      console.log("✅ Data sync complete");
      Alert.alert(
        "Success",
        `Your data has been synced to ${group.name}! You can manually sync again anytime you want to update the shared data.`
      );
      navigation.goBack();
    } catch (error) {
      console.error("❌ Error syncing data:", error);
      Alert.alert("Error", "Failed to sync data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderSettingItem = (
    key: keyof GroupDataSharingSettings,
    title: string,
    description: string,
    icon: string
  ) => (
    <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
      <View style={[styles.settingLeft, { flex: 1 }]}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primaryLight + "20" },
          ]}
        >
          <Ionicons name={icon as any} size={24} color={colors.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>
            {title}
          </Text>
          <Text
            style={[styles.settingDescription, { color: colors.textSecondary }]}
          >
            {description}
          </Text>
        </View>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={() => handleToggle(key)}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={settings[key] ? colors.buttonText : colors.buttonText}
      />
    </View>
  );

  if (loadingGroup) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading group...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>
            Group not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StandardHeader
        title={`Share Data with ${group.name}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.groupInfo, { backgroundColor: colors.surface }]}>
          <Text style={[styles.groupName, { color: colors.text }]}>
            {group.name}
          </Text>
          <Text
            style={[styles.groupDescription, { color: colors.textSecondary }]}
          >
            {group.description}
          </Text>
          <Text style={[styles.groupType, { color: colors.primary }]}>
            Type: {group.type}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            What to Share with This Group
          </Text>
          <Text
            style={[styles.sectionDescription, { color: colors.textSecondary }]}
          >
            Choose which financial information you want to share with{" "}
            {group.name} members. Your data will be synced when you save.
          </Text>
        </View>

        <View
          style={[
            styles.settingsContainer,
            { backgroundColor: colors.surface },
          ]}
        >
          {renderSettingItem(
            "shareNetWorth",
            "Net Worth",
            "Share your current net worth with this group",
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

        <View
          style={[styles.infoSection, { backgroundColor: colors.infoLight }]}
        >
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle" size={20} color={colors.info} />
          </View>
          <Text style={[styles.infoText, { color: colors.info }]}>
            Your data will be synced to {group.name} when you save. You can sync
            again anytime to update the shared data.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: colors.buttonPrimary },
            isLoading && { backgroundColor: colors.textTertiary },
          ]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>
            {isLoading ? "Syncing..." : "Save & Sync Data"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  groupInfo: {
    padding: 20,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 20,
    alignItems: "center",
  },
  groupName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  groupDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
  },
  groupType: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    lineHeight: 22,
  },
  settingsContainer: {
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
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  infoSection: {
    flexDirection: "row",
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
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 18,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 18,
  },
});
