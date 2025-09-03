import React from "react";
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

interface AboutScreenProps {
  navigation: any;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || "1";
  const appName = Constants.expoConfig?.name || "VectorFi";

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
          "Email Not Available",
          "No email app is configured on this device. Please set up an email account in your device settings.",
          [{ text: "OK" }]
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
        subject: "VectorFi Support Request",
        body: `Hello VectorFi Support Team,

I need help with the VectorFi app. Please provide assistance with my issue.

${userInfo}

Issue Description:
[Please describe your issue here]

Device Information:
- App Version: ${appVersion}
- Platform: ${Platform.OS}
- Device: ${Platform.OS === "ios" ? "iOS" : "Android"}

Thank you for your help!

Best regards,
${user?.displayName || "VectorFi User"}`,
        isHtml: false,
      };

      const result = await MailComposer.composeAsync(emailContent);

      if (result.status === MailComposer.MailComposerStatus.SENT) {
        Alert.alert(
          "Email Sent",
          "Thank you for contacting us. We'll get back to you as soon as possible.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error opening email composer:", error);
      Alert.alert(
        "Error",
        "Unable to open email composer. Please try again or contact us through other means.",
        [{ text: "OK" }]
      );
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
      Alert.alert("Error", "Unable to share the app. Please try again later.", [
        { text: "OK" },
      ]);
    }
  };

  const shareAppGeneral = async () => {
    try {
      // Prepare share content
      const shareContent = {
        title: "VectorFi - Take Control of Your Finances",
        message: `Check out VectorFi - the smart finance app that helps you track expenses, set goals, and build wealth! 

Download now and start your financial journey:
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
          message:
            "Check out VectorFi - the smart finance app! https://vectorfi.ai/",
        };
        await Share.share(simpleShare);
      } catch (fallbackError) {
        console.error("Fallback share also failed:", fallbackError);
        Alert.alert(
          "Sharing Unavailable",
          "Sharing is not available on this device. You can copy the link manually: https://vectorfi.ai/",
          [{ text: "OK" }]
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
          "Rating Not Available",
          "App rating is not available at this time. Please try again later.",
          [{ text: "OK" }]
        );
        return;
      }

      // Check if the user has already rated the app
      const hasAction = await StoreReview.hasAction();

      if (!hasAction) {
        Alert.alert(
          "Rating Not Available",
          "App rating is not available at this time. Please try again later.",
          [{ text: "OK" }]
        );
        return;
      }

      // Request a review
      await StoreReview.requestReview();

      // Show thank you message after requesting review
      Alert.alert(
        "Thank You!",
        "Thank you for taking the time to rate VectorFi! Your feedback helps us improve the app.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error requesting app review:", error);
      Alert.alert(
        "Error",
        "Unable to open app rating. Please try again later.",
        [{ text: "OK" }]
      );
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
            <Text style={[styles.title, { color: colors.text }]}>About</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Learn more about VectorFi
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
            Take control of your financial future
          </Text>
          <Text style={[styles.appVersion, { color: colors.textSecondary }]}>
            Version {appVersion} ({buildNumber})
          </Text>
        </View>

        {/* App Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            About VectorFi
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
              VectorFi is your comprehensive personal finance companion,
              designed to help you track expenses, manage budgets, set financial
              goals, and build wealth with confidence.
            </Text>
            <Text
              style={[styles.descriptionText, { color: colors.textSecondary }]}
            >
              Built with modern technology and security in mind, we prioritize
              your financial data privacy while providing powerful tools to
              achieve your financial dreams.
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Key Features
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
                Expense & Income Tracking
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                Smart Budget Management
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                Financial Goal Setting
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                Asset & Debt Management
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                Shared Finance Groups
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                Real-time Notifications
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                Secure Data Encryption
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text
                style={[styles.featureText, { color: colors.textSecondary }]}
              >
                Vectra AI Financial Assistant
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
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
                Share App
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
                Rate App
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
                Contact Support
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
                Visit Website
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
            Legal
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
                Privacy Policy
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
                Terms of Service
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
            Developer
          </Text>
          <View
            style={[
              styles.developerCard,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
          >
            <Text style={[styles.developerName, { color: colors.text }]}>
              VectorFi Team
            </Text>
            <Text
              style={[
                styles.developerDescription,
                { color: colors.textSecondary },
              ]}
            >
              Built with ❤️ using React Native and Expo
            </Text>
            <Text
              style={[styles.developerTech, { color: colors.textSecondary }]}
            >
              React Native • Expo • TypeScript • Firebase
            </Text>
          </View>
        </View>

        {/* Copyright */}
        <View
          style={[styles.copyrightSection, { borderTopColor: colors.border }]}
        >
          <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>
            © 2025 VectorFi All rights reserved.
          </Text>
          <Text style={[styles.copyrightText, { color: colors.textSecondary }]}>
            Made with passion for financial empowerment.
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
