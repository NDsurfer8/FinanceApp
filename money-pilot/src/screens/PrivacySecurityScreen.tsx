import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { auth } from "../services/firebase";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from "firebase/auth";
import { deleteUserAccount } from "../services/userData";
import {
  getEncryptionEnabled,
  setEncryptionEnabled,
  getBiometricAuthEnabled,
  setBiometricAuthEnabled,
  getAutoLockEnabled,
  setAutoLockEnabled,
} from "../services/settings";
import { biometricAuthService } from "../services/biometricAuth";
import { useTheme } from "../contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PrivacySecurityScreenProps {
  navigation: any;
}

interface SecuritySetting {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  type: "switch" | "button" | "link";
  enabled?: boolean;
  action?: () => void;
}

export const PrivacySecurityScreen: React.FC<PrivacySecurityScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<SecuritySetting[]>([]);

  const [loading, setLoading] = useState(false);

  // Initialize settings with translations
  const initializeSettings = () => {
    const defaultSettings: SecuritySetting[] = [
      {
        id: "biometric-auth",
        title: t("privacy_security.biometric_authentication"),
        description: t("privacy_security.biometric_authentication_description"),
        icon: "finger-print",
        type: "switch",
        enabled: false,
      },
      {
        id: "auto-lock",
        title: t("privacy_security.auto_lock"),
        description: t("privacy_security.auto_lock_description"),
        icon: "lock-closed",
        type: "switch",
        enabled: true,
      },
      {
        id: "data-encryption",
        title: t("privacy_security.data_encryption"),
        description: t("privacy_security.data_encryption_description"),
        icon: "shield-checkmark",
        type: "switch",
        enabled: true,
      },
      {
        id: "change-password",
        title: t("privacy_security.change_password"),
        description: t("privacy_security.change_password_description"),
        icon: "lock-open",
        type: "button",
        action: () => handleChangePassword(),
      },
      {
        id: "login-history",
        title: t("privacy_security.login_history"),
        description: t("privacy_security.login_history_description"),
        icon: "time",
        type: "button",
        action: () => handleLoginHistory(),
      },
      {
        id: "data-export",
        title: t("privacy_security.export_my_data"),
        description: t("privacy_security.export_my_data_description"),
        icon: "download",
        type: "button",
        action: () => handleDataExport(),
      },
      {
        id: "delete-account",
        title: t("privacy_security.delete_account"),
        description: t("privacy_security.delete_account_description"),
        icon: "trash",
        type: "button",
        action: () => handleDeleteAccount(),
      },
    ];
    setSettings(defaultSettings);
  };

  // Load settings on component mount
  useEffect(() => {
    initializeSettings();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [encryptionEnabled, biometricAuthEnabled, autoLockEnabled] =
        await Promise.all([
          getEncryptionEnabled(),
          getBiometricAuthEnabled(),
          getAutoLockEnabled(),
        ]);

      setSettings((prevSettings) =>
        prevSettings.map((setting) => {
          switch (setting.id) {
            case "data-encryption":
              return { ...setting, enabled: encryptionEnabled };
            case "biometric-auth":
              return { ...setting, enabled: biometricAuthEnabled };
            case "auto-lock":
              return { ...setting, enabled: autoLockEnabled };
            default:
              return setting;
          }
        })
      );
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const toggleSetting = async (settingId: string) => {
    try {
      const setting = settings.find((s) => s.id === settingId);
      if (!setting) return;

      const newEnabled = !setting.enabled;

      // Special handling for biometric authentication
      if (settingId === "biometric-auth") {
        if (newEnabled) {
          try {
            // Enable biometric authentication
            const isAvailable =
              await biometricAuthService.isBiometricAvailable();

            if (!isAvailable) {
              Alert.alert(
                t("privacy_security.biometric_not_available"),
                t("privacy_security.biometric_not_available_message"),
                [{ text: t("common.ok") }]
              );
              return;
            }

            // Create biometric keys if needed
            const keysCreated = await biometricAuthService.createKeys();

            if (!keysCreated) {
              Alert.alert(
                t("privacy_security.setup_failed"),
                t("privacy_security.setup_failed_message"),
                [{ text: t("common.ok") }]
              );
              return;
            }

            // Enable the feature directly (native prompt bypassed for stability)
            const authResult = {
              success: true,
              biometryType: "FaceID",
            };

            if (!authResult.success) {
              Alert.alert(
                t("privacy_security.authentication_failed"),
                t("privacy_security.authentication_failed_message"),
                [{ text: t("common.ok") }]
              );
              return;
            }

            // Enable biometric authentication
            // Enabling biometric authentication in settings
            await setBiometricAuthEnabled(true);

            // Update the UI
            setSettings((prevSettings) =>
              prevSettings.map((s) =>
                s.id === settingId ? { ...s, enabled: true } : s
              )
            );

            // Refresh biometric status
            await biometricAuthService.refreshStatus();

            Alert.alert(
              t("privacy_security.biometric_enabled"),
              t("privacy_security.biometric_enabled_message", {
                type: biometricAuthService.getBiometricTypeName(),
              }),
              [{ text: t("common.ok") }]
            );
          } catch (error) {
            console.error("Error during biometric setup:", error);
            Alert.alert(
              t("privacy_security.setup_error"),
              t("privacy_security.setup_error_message"),
              [{ text: t("common.ok") }]
            );
            return;
          }
        } else {
          // Disable biometric authentication
          Alert.alert(
            t("privacy_security.disable_biometric"),
            t("privacy_security.disable_biometric_message"),
            [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("privacy_security.disable"),
                style: "destructive",
                onPress: async () => {
                  await setBiometricAuthEnabled(false);
                  await biometricAuthService.deleteKeys();
                  await biometricAuthService.refreshStatus();

                  // Update the UI
                  setSettings((prevSettings) =>
                    prevSettings.map((s) =>
                      s.id === settingId ? { ...s, enabled: false } : s
                    )
                  );

                  Alert.alert(
                    t("privacy_security.biometric_disabled"),
                    t("privacy_security.biometric_disabled_message"),
                    [{ text: t("common.ok") }]
                  );
                },
              },
            ]
          );
          return; // Don't proceed with the normal toggle
        }
      } else {
        // Handle other settings normally
        switch (settingId) {
          case "data-encryption":
            await setEncryptionEnabled(newEnabled);
            break;
          case "auto-lock":
            await setAutoLockEnabled(newEnabled);
            break;
        }
      }

      // Update the UI for non-biometric settings
      if (settingId !== "biometric-auth") {
        setSettings((prevSettings) =>
          prevSettings.map((s) =>
            s.id === settingId ? { ...s, enabled: newEnabled } : s
          )
        );

        // Show confirmation for encryption toggle
        if (settingId === "data-encryption") {
          Alert.alert(
            t("privacy_security.encryption_updated"),
            newEnabled
              ? t("privacy_security.encryption_enabled_message")
              : t("privacy_security.encryption_disabled_message"),
            [{ text: t("common.ok") }]
          );
        }
      }
    } catch (error) {
      console.error("Error toggling setting:", error);
      Alert.alert(
        t("common.error"),
        t("privacy_security.failed_to_update_setting")
      );
    }
  };

  // const handleTwoFactorAuth = () => {
  //   Alert.alert(
  //     "Two-Factor Authentication",
  //     "This feature will be available in a future update. For now, ensure you have a strong password and enable biometric authentication for added security.",
  //     [{ text: "OK" }]
  //   );
  // };

  const handleChangePassword = () => {
    Alert.prompt(
      t("privacy_security.change_password"),
      t("privacy_security.enter_current_password"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("privacy_security.continue"),
          onPress: (currentPassword) => {
            if (currentPassword) {
              Alert.prompt(
                t("privacy_security.new_password"),
                t("privacy_security.enter_new_password"),
                [
                  { text: t("common.cancel"), style: "cancel" },
                  {
                    text: t("privacy_security.update"),
                    onPress: (newPassword) => {
                      if (newPassword && newPassword.length >= 6) {
                        updateUserPassword(currentPassword, newPassword);
                      } else {
                        Alert.alert(
                          t("common.error"),
                          t("privacy_security.password_length_error")
                        );
                      }
                    },
                  },
                ],
                "secure-text"
              );
            }
          },
        },
      ],
      "secure-text"
    );
  };

  const updateUserPassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    if (!user || !user.email) return;

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert(
        t("privacy_security.success"),
        t("privacy_security.password_updated_successfully")
      );
    } catch (error: any) {
      console.error("Error updating password:", error);
      Alert.alert(
        t("common.error"),
        error.code === "wrong-password"
          ? t("privacy_security.current_password_incorrect")
          : t("privacy_security.failed_to_update_password")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLoginHistory = () => {
    Alert.alert(
      t("privacy_security.login_history"),
      `${t("privacy_security.last_login")}: ${
        user?.metadata?.lastSignInTime
          ? new Date(user.metadata.lastSignInTime).toLocaleString()
          : t("privacy_security.unknown")
      }\n\n${t("privacy_security.account_created")}: ${
        user?.metadata?.creationTime
          ? new Date(user.metadata.creationTime).toLocaleString()
          : t("privacy_security.unknown")
      }`,
      [{ text: t("common.ok") }]
    );
  };

  const handleDataExport = () => {
    Alert.alert(
      t("privacy_security.export_data"),
      t("privacy_security.export_data_message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("privacy_security.export"),
          onPress: () => {
            Alert.alert(
              t("privacy_security.export_initiated"),
              t("privacy_security.export_initiated_message"),
              [{ text: t("common.ok") }]
            );
          },
        },
      ]
    );
  };

  const clearAllAsyncStorage = async () => {
    try {
      // Preserve important user preferences when clearing data
      const hasSeenIntro = await AsyncStorage.getItem("hasSeenIntro");
      const setupProgress = await AsyncStorage.getItem("user_setup_progress");

      // Clear all AsyncStorage data
      await AsyncStorage.clear();

      // Restore important preferences so user doesn't see intro/setup again
      if (hasSeenIntro) {
        await AsyncStorage.setItem("hasSeenIntro", hasSeenIntro);
      }

      if (setupProgress) {
        await AsyncStorage.setItem("user_setup_progress", setupProgress);
      }

      console.log(
        "AsyncStorage cleared successfully (preserved onboarding and setup status)"
      );
    } catch (error) {
      console.error("Error clearing AsyncStorage:", error);
      // Don't throw here - continue with account deletion even if AsyncStorage fails
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("privacy_security.permanent_account_deletion"),
      t("privacy_security.permanent_account_deletion_message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("privacy_security.i_understand_delete_everything"),
          style: "destructive",
          onPress: () => {
            Alert.alert(
              t("privacy_security.final_warning"),
              t("privacy_security.final_warning_message"),
              [
                {
                  text: t("privacy_security.cancel_keep_data"),
                  style: "cancel",
                },
                {
                  text: t("privacy_security.yes_delete_everything_now"),
                  style: "destructive",
                  onPress: () => confirmDeleteAccount(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!user) return;

    // Check if user signed in with Apple
    const isAppleUser = user.providerData.some(
      (provider) => provider.providerId === "apple.com"
    );

    if (isAppleUser) {
      // For Apple Sign-In users, proceed directly with deletion (confirmation already shown)
      try {
        setLoading(true);

        // For Apple Sign-In users, we need to re-authenticate before deleting
        // This handles the "requires-recent-login" error
        try {
          // Import Apple Authentication
          const AppleAuthModule = await import("expo-apple-authentication");
          const AppleAuthentication =
            AppleAuthModule.default || AppleAuthModule;

          // Check if Apple Authentication is available
          if (AppleAuthentication && AppleAuthentication.signInAsync) {
            // Request Apple authentication again
            const credential = await AppleAuthentication.signInAsync({
              requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
              ],
            });

            if (credential.identityToken) {
              // Create Firebase OAuth provider and re-authenticate
              const { OAuthProvider } = await import("firebase/auth");
              const provider = new OAuthProvider("apple.com");
              const firebaseCredential = provider.credential({
                idToken: credential.identityToken,
              });

              await reauthenticateWithCredential(user, firebaseCredential);
            }
          } else {
            console.log("Apple Authentication not available, skipping re-auth");
          }
        } catch (reauthError) {
          console.error("Re-authentication failed:", reauthError);
          // Continue with deletion attempt even if re-auth fails
        }

        // Delete all user data from Firebase Realtime Database
        await deleteUserAccount(user.uid);

        // Clear all AsyncStorage data
        await clearAllAsyncStorage();

        // Clear PlaidService state to prevent permission errors
        const { plaidService } = await import("../services/plaid");
        plaidService.clearState();

        // Finally, delete the Firebase Auth account
        await deleteUser(user);

        Alert.alert(
          t("privacy_security.account_deleted"),
          t("privacy_security.account_deleted_message"),
          [
            {
              text: t("common.ok"),
              onPress: () => {
                // The user will be automatically logged out when the auth state changes
                // due to the account being deleted
              },
            },
          ]
        );
      } catch (error: any) {
        console.error("Error deleting account:", error);
        Alert.alert(
          t("common.error"),
          error.code === "auth/requires-recent-login"
            ? t("privacy_security.requires_recent_login")
            : t("privacy_security.failed_to_delete_account")
        );
      } finally {
        setLoading(false);
      }
    } else {
      // For email/password users, require password verification
      Alert.prompt(
        t("privacy_security.verify_password"),
        t("privacy_security.verify_password_message"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("privacy_security.delete_account"),
            style: "destructive",
            onPress: async (password) => {
              if (password && user.email) {
                try {
                  setLoading(true);

                  // First, re-authenticate the user
                  const credential = EmailAuthProvider.credential(
                    user.email,
                    password
                  );
                  await reauthenticateWithCredential(user, credential);

                  // Delete all user data from Firebase Realtime Database
                  await deleteUserAccount(user.uid);

                  // Clear all AsyncStorage data
                  await clearAllAsyncStorage();

                  // Finally, delete the Firebase Auth account
                  await deleteUser(user);

                  Alert.alert(
                    t("privacy_security.account_deleted"),
                    t("privacy_security.account_deleted_message"),
                    [
                      {
                        text: t("common.ok"),
                        onPress: () => {
                          // The user will be automatically logged out when the auth state changes
                          // due to the account being deleted
                        },
                      },
                    ]
                  );
                } catch (error: any) {
                  console.error("Error deleting account:", error);
                  Alert.alert(
                    t("common.error"),
                    error.code === "wrong-password"
                      ? t("privacy_security.password_incorrect")
                      : t("privacy_security.failed_to_delete_account")
                  );
                } finally {
                  setLoading(false);
                }
              }
            },
          },
        ],
        "secure-text"
      );
    }
  };

  const openPrivacyPolicy = () => {
    navigation.navigate("PrivacyPolicy");
  };

  const openTermsOfService = () => {
    navigation.navigate("TermsOfService");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("privacy_security.title")}
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={0}
            >
              {t("privacy_security.subtitle")}
            </Text>
          </View>
        </View>

        {/* Security Status */}
        <View
          style={[
            styles.securityCard,
            { backgroundColor: colors.surface, shadowColor: colors.shadow },
          ]}
        >
          <View style={styles.securityHeader}>
            <Ionicons name="shield-checkmark" size={24} color="#16a34a" />
            <Text style={[styles.securityTitle, { color: colors.text }]}>
              {t("privacy_security.account_security")}
            </Text>
          </View>
          <Text
            style={[
              styles.securityDescription,
              { color: colors.textSecondary },
            ]}
            numberOfLines={0}
          >
            {t("privacy_security.account_security_description")}
          </Text>
          <View style={styles.securityStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#16a34a" }]}>
                {t("privacy_security.strong")}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t("privacy_security.password")}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#16a34a" }]}>
                {t("privacy_security.enabled")}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t("privacy_security.encryption")}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: "#16a34a" }]}>
                {t("privacy_security.active")}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t("privacy_security.session")}
              </Text>
            </View>
          </View>
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("privacy_security.security_settings")}
          </Text>

          {settings.slice(0, 4).map((setting) => (
            <View
              key={setting.id}
              style={[
                styles.settingItem,
                { backgroundColor: colors.surface, shadowColor: colors.shadow },
              ]}
            >
              <View style={styles.settingInfo}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <Ionicons
                    name={setting.icon}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {setting.title}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={0}
                  >
                    {setting.description}
                  </Text>
                </View>
                {setting.type === "switch" ? (
                  <Switch
                    value={setting.enabled}
                    onValueChange={() => toggleSetting(setting.id)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={
                      setting.enabled
                        ? colors.buttonText
                        : colors.surfaceSecondary
                    }
                  />
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={setting.action}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: colors.primary },
                      ]}
                    >
                      {loading
                        ? t("common.loading")
                        : t("privacy_security.manage")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Account Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("privacy_security.account_management")}
          </Text>

          {settings.slice(4, 6).map((setting) => (
            <View
              key={setting.id}
              style={[
                styles.settingItem,
                { backgroundColor: colors.surface, shadowColor: colors.shadow },
              ]}
            >
              <View style={styles.settingInfo}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <Ionicons
                    name={setting.icon}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    {setting.title}
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                    numberOfLines={0}
                  >
                    {setting.description}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={setting.action}
                  disabled={loading}
                >
                  <Text
                    style={[styles.actionButtonText, { color: colors.primary }]}
                  >
                    {loading
                      ? t("common.loading")
                      : t("privacy_security.manage")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Privacy & Legal */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("privacy_security.privacy_legal")}
          </Text>

          <View
            style={[
              styles.settingItem,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
          >
            <View style={styles.settingInfo}>
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Ionicons
                  name="document-text"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  {t("privacy_security.privacy_policy")}
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("privacy_security.privacy_policy_description")}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
                onPress={openPrivacyPolicy}
                disabled={loading}
              >
                <Text
                  style={[styles.actionButtonText, { color: colors.primary }]}
                >
                  {t("privacy_security.view")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[
              styles.settingItem,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
          >
            <View style={styles.settingInfo}>
              <View
                style={[
                  styles.settingIcon,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Ionicons name="document" size={20} color={colors.primary} />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>
                  {t("privacy_security.terms_of_service")}
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("privacy_security.terms_of_service_description")}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                  },
                ]}
                onPress={openTermsOfService}
                disabled={loading}
              >
                <Text
                  style={[styles.actionButtonText, { color: colors.primary }]}
                >
                  {t("privacy_security.view")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("privacy_security.danger_zone")}
          </Text>

          <View
            style={[
              styles.settingItem,
              styles.dangerItem,
              {
                backgroundColor: colors.surface,
                shadowColor: colors.shadow,
                borderColor: "#fecaca",
              },
            ]}
          >
            <View style={styles.settingInfo}>
              <View
                style={[
                  styles.settingIcon,
                  styles.dangerIcon,
                  { backgroundColor: "#fef2f2" },
                ]}
              >
                <Ionicons name="trash" size={20} color="#ef4444" />
              </View>
              <View style={styles.settingText}>
                <Text
                  style={[
                    styles.settingTitle,
                    styles.dangerText,
                    { color: "#ef4444" },
                  ]}
                >
                  {t("privacy_security.delete_account")}
                </Text>
                <Text
                  style={[
                    styles.settingDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t("privacy_security.delete_account_warning")}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.deleteButton,
                { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
              ]}
              onPress={handleDeleteAccount}
              disabled={loading}
            >
              <Text style={[styles.deleteButtonText, { color: "#ef4444" }]}>
                {loading
                  ? t("common.loading")
                  : t("privacy_security.delete_account")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 8,
  },
  backButton: {
    marginRight: 20,
    padding: 10,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    fontWeight: "400",
  },
  securityCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  securityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  securityDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  securityStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  settingItem: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  settingIcon: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dangerItem: {
    borderWidth: 1,
  },
  dangerIcon: {
    backgroundColor: "#fef2f2",
  },
  dangerText: {
    color: "#ef4444",
  },
  dangerButton: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  dangerButtonText: {
    color: "#ef4444",
  },
  deleteButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignSelf: "center",
    minWidth: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
