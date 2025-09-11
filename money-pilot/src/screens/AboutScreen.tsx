import React, { useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Image,
  Platform,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useTheme } from "../contexts/ThemeContext";
import * as MailComposer from "expo-mail-composer";
import * as StoreReview from "expo-store-review";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "react-i18next";
import { loadLanguageOnDemand } from "../config/i18n";

interface AboutScreenProps {
  navigation: any;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || "1";
  const appName = Constants.expoConfig?.name || "VectorFi";

  // Ensure language is loaded when component mounts
  useEffect(() => {
    const loadLanguage = async () => {
      if (i18n.language && i18n.language !== "en") {
        await loadLanguageOnDemand(i18n.language);
      }
    };
    loadLanguage();
  }, [i18n.language]);

  const openPrivacyPolicy = () => {
    navigation.navigate("PrivacyPolicy");
  };

  const openTermsOfService = () => {
    navigation.navigate("TermsOfService");
  };

  const openSupportEmail = async () => {
    try {
      const isAvailable = await MailComposer.isAvailableAsync();

      if (!isAvailable) {
        Alert.alert(
          t("about.email_not_available"),
          t("about.email_not_available_message"),
          [{ text: t("common.ok") }]
        );
        return;
      }

      const userInfo = user
        ? `\n\nUser Information:\n- User ID: ${user.uid}\n- Email: ${
            user.email || "Not provided"
          }\n- Display Name: ${user.displayName || "Not provided"}`
        : "";

      const emailContent = {
        recipients: ["support@vectorfi.ai"],
        subject: t("about.email_subject"),
        body: `${t("about.email_greeting")}

${t("about.email_body")}

${userInfo}

${t("about.email_issue_description")}:
[${t("about.email_issue_placeholder")}]

${t("about.email_device_info")}:
- ${t("about.email_app_version")}: ${appVersion}
- ${t("about.email_platform")}: ${Platform.OS}
- ${t("about.email_device")}: ${Platform.OS === "ios" ? "iOS" : "Android"}

${t("about.email_thanks")}

${t("about.email_best_regards")},
${user?.displayName || t("about.email_user")}`,
        isHtml: false,
      };

      const result = await MailComposer.composeAsync(emailContent);

      if (result.status === MailComposer.MailComposerStatus.SENT) {
        Alert.alert(t("about.email_sent"), t("about.email_sent_message"), [
          { text: t("common.ok") },
        ]);
      }
    } catch (error) {
      console.error("Error opening email composer:", error);
      Alert.alert(t("common.error"), t("about.email_composer_error"), [
        { text: t("common.ok") },
      ]);
    }
  };

  const openWebsite = () => {
    Linking.openURL("https://vectorfi.ai/");
  };

  // const openGitHub = () => {
  //   Linking.openURL("https://github.com/ndsurf888/vectorfii");
  // };

  const shareApp = async () => {
    try {
      // Start with general share as the primary option
      // This is more reliable and doesn't require permissions
      shareAppGeneral();
    } catch (error) {
      console.error("Error sharing app:", error);
      Alert.alert(t("common.error"), t("about.share_error"), [
        { text: t("common.ok") },
      ]);
    }
  };

  const shareAppGeneral = async () => {
    try {
      // Prepare share content
      const shareContent = {
        title: t("about.share_title"),
        message: `${t("about.share_message")}

${t("about.share_download")}:
https://vectorfi.ai/

#VectorFi #Finance #Budgeting #Investing`,
        url: "https://vectorfi.ai/",
      };

      // Share the app using React Native's Share API
      const result = await Share.share(shareContent);

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type
        } else {
          // Shared successfully
        }
      } else if (result.action === Share.dismissedAction) {
        // Share dismissed
      }
    } catch (error) {
      console.error("Error sharing app:", error);

      // Fallback to a simpler share if the main one fails
      try {
        const simpleShare = {
          message: `${t("about.share_simple")} https://vectorfi.ai/`,
        };
        await Share.share(simpleShare);
      } catch (fallbackError) {
        console.error("Fallback share also failed:", fallbackError);
        Alert.alert(
          t("about.sharing_unavailable"),
          t("about.sharing_unavailable_message"),
          [{ text: t("common.ok") }]
        );
      }
    }
  };

  const rateApp = async () => {
    try {
      // Check if the app is available for review
      const isAvailable = await StoreReview.isAvailableAsync();

      if (!isAvailable) {
        Alert.alert(
          t("about.rating_not_available"),
          t("about.rating_not_available_message"),
          [{ text: t("common.ok") }]
        );
        return;
      }

      // Check if the user has already rated the app
      const hasAction = await StoreReview.hasAction();

      if (!hasAction) {
        Alert.alert(
          t("about.rating_not_available"),
          t("about.rating_not_available_message"),
          [{ text: t("common.ok") }]
        );
        return;
      }

      // Request a review
      await StoreReview.requestReview();

      // Show thank you message after requesting review
      Alert.alert(t("about.thank_you"), t("about.thank_you_message"), [
        { text: t("common.ok") },
      ]);
    } catch (error) {
      console.error("Error requesting app review:", error);
      Alert.alert(t("common.error"), t("about.rating_error"), [
        { text: t("common.ok") },
      ]);
    }
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
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("about.title")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t("about.subtitle")}
            </Text>
          </View>
        </View>

        {/* App Info Card */}
        <View
          style={[
            styles.appInfoCard,
            { backgroundColor: colors.surface, shadowColor: colors.shadow },
          ]}
        >
          <View style={styles.appIconContainer}>
            <View
              style={[
                styles.appIcon,
                { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <Image
                source={require("../../assets/appstore.png")}
                style={styles.appStoreIcon}
                resizeMode="contain"
              />
            </View>
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>
            {appName}
          </Text>
          <Text style={[styles.appTagline, { color: colors.textSecondary }]}>
            {t("about.app_tagline")}
          </Text>
          <Text style={[styles.appVersion, { color: colors.textSecondary }]}>
            {t("about.version")} {appVersion} ({buildNumber})
          </Text>
        </View>

        {/* App Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("about.about_vectorfi")}
          </Text>
          <View
            style={[
              styles.descriptionCard,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
          >
            <Text
              style={[styles.descriptionText, { color: colors.textSecondary }]}
            >
              {t("about.description_1")}
            </Text>
            <Text
              style={[styles.descriptionText, { color: colors.textSecondary }]}
            >
              {t("about.description_2")}
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("about.key_features")}
          </Text>
          <View
            style={[
              styles.featuresList,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
          >
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                {t("about.feature_expense_tracking")}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                {t("about.feature_budget_management")}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                {t("about.feature_goal_setting")}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                {t("about.feature_asset_debt_management")}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                {t("about.feature_shared_finance")}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                {t("about.feature_notifications")}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                {t("about.feature_encryption")}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                {t("about.feature_ai_assistant")}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("about.quick_actions")}
          </Text>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
            onPress={shareApp}
          >
            <View style={styles.actionContent}>
              <Ionicons name="share-social" size={20} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                {t("about.share_app")}
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
              styles.actionButton,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
            onPress={rateApp}
          >
            <View style={styles.actionContent}>
              <Ionicons name="star" size={20} color="#f59e0b" />
              <Text style={[styles.actionText, { color: colors.text }]}>
                {t("about.rate_app")}
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
              styles.actionButton,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
            onPress={openSupportEmail}
          >
            <View style={styles.actionContent}>
              <Ionicons name="mail" size={20} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                {t("about.contact_support")}
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
              styles.actionButton,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
            onPress={openWebsite}
          >
            <View style={styles.actionContent}>
              <Ionicons name="globe" size={20} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                {t("about.visit_website")}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
            onPress={openGitHub}
          >
            <View style={styles.actionContent}>
              <Ionicons name="logo-github" size={20} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>
                View Source Code
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity> */}
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("about.legal")}
          </Text>

          <TouchableOpacity
            style={[
              styles.legalButton,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
            onPress={openPrivacyPolicy}
          >
            <View style={styles.legalContent}>
              <Ionicons name="document-text" size={20} color={colors.primary} />
              <Text style={[styles.legalText, { color: colors.text }]}>
                {t("about.privacy_policy")}
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
              styles.legalButton,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
            onPress={openTermsOfService}
          >
            <View style={styles.legalContent}>
              <Ionicons name="document" size={20} color={colors.primary} />
              <Text style={[styles.legalText, { color: colors.text }]}>
                {t("about.terms_of_service")}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Developer Info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("about.developer")}
          </Text>
          <View
            style={[
              styles.developerCard,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
          >
            <Text style={[styles.developerName, { color: colors.text }]}>
              {t("about.developer_name")}
            </Text>
            <Text
              style={[
                styles.developerDescription,
                { color: colors.textSecondary },
              ]}
            >
              {t("about.developer_description")}
            </Text>
            <Text
              style={[styles.developerTech, { color: colors.textSecondary }]}
            >
              {t("about.developer_tech")}
            </Text>
          </View>
        </View>

        {/* Copyright */}
        <View
          style={[styles.copyrightSection, { borderTopColor: colors.border }]}
        >
          <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>
            {t("about.copyright", { year: new Date().getFullYear() })}
          </Text>
          <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>
            {t("about.copyright_message")}
          </Text>
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
  appInfoCard: {
    borderRadius: 20,
    padding: 32,
    marginBottom: 24,
    alignItems: "center",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  appIconContainer: {
    marginBottom: 16,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  appStoreIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
  },
  appVersion: {
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  descriptionCard: {
    borderRadius: 16,
    padding: 20,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  featuresList: {
    borderRadius: 16,
    padding: 20,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    marginLeft: 12,
    fontWeight: "500",
  },
  actionButton: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  legalButton: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  legalContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  legalText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  developerCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  developerName: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  developerDescription: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 8,
  },
  developerTech: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  copyrightSection: {
    alignItems: "center",
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
  },
  copyrightText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
});
