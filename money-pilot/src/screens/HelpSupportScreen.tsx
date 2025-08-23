import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Switch,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import * as MailComposer from "expo-mail-composer";
import { useAuth } from "../hooks/useAuth";

import { useFriendlyMode } from "../contexts/FriendlyModeContext";

interface HelpSupportScreenProps {
  navigation: any;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({
  navigation,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const { isFriendlyMode, setIsFriendlyMode } = useFriendlyMode();

  // Handle friendly mode toggle
  const handleFriendlyModeToggle = async (value: boolean) => {
    setIsFriendlyMode(value);

    // Show confirmation message
    Alert.alert(
      value ? "Friendly Mode Enabled" : "Friendly Mode Disabled",
      value
        ? "Financial terms will now be shown in friendly, easy-to-understand language."
        : "Financial terms will now be shown in standard language.",
      [{ text: "OK" }]
    );
  };

  const faqs: FAQItem[] = [
    {
      id: "1",
      question: "How do I add my first transaction?",
      answer:
        "Tap the '+' button on the Dashboard or go to the Transactions tab and tap 'Add Transaction'. Fill in the amount, category, description, and date, then save.",
      category: "Getting Started",
    },
    {
      id: "2",
      question: "How do I generate financial plans with Vectra?",
      answer:
        "Go to the AI Financial Advisor tab and tap 'Generate Plan'. Vectra will analyze your financial data and create personalized recommendations for budgeting, saving, investing, and debt management. You can customize the plan based on your goals and preferences.",
      category: "AI Features",
    },
    {
      id: "3",
      question: "How do I set up a budget?",
      answer:
        "Go to the Budget tab. You can add income sources, fixed expenses, and variable expenses. The app will automatically calculate your remaining budget.",
      category: "Budgeting",
    },
    {
      id: "4",
      question: "Can I share my finances with family members?",
      answer:
        "Yes! Use the Shared Finance feature to create groups with family members. You can share transactions, assets, and debts while maintaining privacy.",
      category: "Shared Finance",
    },
    {
      id: "5",
      question: "How do I set financial goals?",
      answer:
        "Go to the Goals tab and tap 'Add Goal'. Set a target amount, monthly contribution, and target date. Track your progress visually.",
      category: "Goals",
    },
    {
      id: "6",
      question: "Is my financial data secure?",
      answer:
        "Absolutely! We use industry-standard encryption and Firebase security. Your data is private and only accessible to you and your shared group members.",
      category: "Security",
    },
    {
      id: "7",
      question: "How do I export my data?",
      answer:
        "Go to Settings → Privacy & Security → Export My Data. You'll receive an email with your financial data within 24 hours.",
      category: "Data Management",
    },
    {
      id: "8",
      question: "Can I use the app offline?",
      answer:
        "The app requires an internet connection to sync your data with our secure servers. However, you can view recently loaded data when offline.",
      category: "Technical",
    },
    {
      id: "9",
      question: "How do I change my password?",
      answer:
        "Go to Settings → Privacy & Security → Change Password. Enter your current password and set a new one.",
      category: "Account",
    },
  ];

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const openSupportEmail = async () => {
    try {
      // Check if device can send emails
      const isAvailable = await MailComposer.isAvailableAsync();

      if (!isAvailable) {
        Alert.alert(
          "Email Not Available",
          "No email app is configured on this device. Please set up an email account in your device settings.",
          [{ text: "OK" }]
        );
        return;
      }

      // Prepare email content with user context
      const userInfo = user
        ? `\n\nUser Information:\n- User ID: ${user.uid}\n- Email: ${
            user.email || "Not provided"
          }\n- Display Name: ${user.displayName || "Not provided"}`
        : "";

      const emailContent = {
        recipients: ["support@vectorfi.com"],
        subject: "VectorFi Support Request",
        body: `Hello VectorFi Support Team,

I need help with the VectorFi app. Please provide assistance with my issue.

${userInfo}

Issue Description:
[Please describe your issue here]

Device Information:
- App Version: [Auto-detected]
- Platform: ${Platform.OS}
- Device: ${Platform.OS === "ios" ? "iOS" : "Android"}

Thank you for your help!

Best regards,
${user?.displayName || "VectorFi User"}`,
        isHtml: false,
      };

      // Open email composer
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

  const openLiveChat = () => {
    Alert.alert(
      "Live Chat",
      "Live chat support is available during business hours (9 AM - 6 PM EST). Would you like to start a chat?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Chat",
          onPress: () => {
            // Implement live chat functionality here
            Alert.alert("Live Chat", "Live chat would be implemented here");
          },
        },
      ]
    );
  };

  const openUserGuide = () => {
    Linking.openURL("https://vectorfi.ai/");
  };

  const openVideoTutorials = () => {
    Linking.openURL("https://vectorfi.ai/");
  };

  const reportBug = async () => {
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
        recipients: ["bugs@vectorfi.com"],
        subject: "VectorFi Bug Report",
        body: `Hello VectorFi Team,

I found a bug in the VectorFi app. Here are the details:

${userInfo}

Bug Description:
[Please describe the bug you encountered]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Behavior:
[What should happen]

Actual Behavior:
[What actually happened]

Device Information:
- App Version: [Auto-detected]
- Platform: ${Platform.OS}
- Device: ${Platform.OS === "ios" ? "iOS" : "Android"}

Thank you for your attention to this issue!

Best regards,
${user?.displayName || "VectorFi User"}`,
        isHtml: false,
      };

      const result = await MailComposer.composeAsync(emailContent);

      if (result.status === MailComposer.MailComposerStatus.SENT) {
        Alert.alert(
          "Bug Report Sent",
          "Thank you for reporting this bug. We'll investigate and fix it as soon as possible.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error opening email composer:", error);
      Alert.alert("Error", "Unable to open email composer. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const requestFeature = async () => {
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
        recipients: ["features@vectorfi.com"],
        subject: "VectorFi Feature Request",
        body: `Hello VectorFi Team,

I have a feature request for the VectorFi app. Here are the details:

${userInfo}

Feature Request:
[Please describe the feature you'd like to see]

Why is this feature important to you?
[Explain how this feature would help you]

Use Case:
[Describe how you would use this feature]

Additional Notes:
[Any other relevant information]

Device Information:
- App Version: [Auto-detected]
- Platform: ${Platform.OS}
- Device: ${Platform.OS === "ios" ? "iOS" : "Android"}

Thank you for considering this feature request!

Best regards,
${user?.displayName || "VectorFi User"}`,
        isHtml: false,
      };

      const result = await MailComposer.composeAsync(emailContent);

      if (result.status === MailComposer.MailComposerStatus.SENT) {
        Alert.alert(
          "Feature Request Sent",
          "Thank you for your feature request. We'll review it and consider it for future updates.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error opening email composer:", error);
      Alert.alert("Error", "Unable to open email composer. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Getting Started":
        return "rocket";
      case "Budgeting":
        return "wallet";
      case "Shared Finance":
        return "people";
      case "Goals":
        return "flag";
      case "Security":
        return "shield-checkmark";
      case "Data Management":
        return "cloud-download";
      case "Technical":
        return "settings";
      case "Account":
        return "person";
      case "AI Features":
        return "sparkles";
      default:
        return "help-circle";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Getting Started":
        return "#6366f1";
      case "Budgeting":
        return "#10b981";
      case "Shared Finance":
        return "#f59e0b";
      case "Goals":
        return "#ef4444";
      case "Security":
        return "#8b5cf6";
      case "Data Management":
        return "#06b6d4";
      case "Technical":
        return "#6b7280";
      case "Account":
        return "#ec4899";
      case "AI Features":
        return "#8b5cf6";
      default:
        return "#6366f1";
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
              Help & Support
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Get help and find answers
            </Text>
          </View>
        </View>

        {/* Friendly Mode Toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Accessibility
          </Text>

          <View
            style={[
              styles.settingCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View
                  style={[
                    styles.settingIcon,
                    { backgroundColor: colors.surfaceSecondary },
                  ]}
                >
                  <Ionicons name="school" size={20} color="#6366f1" />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    Friendly Mode
                  </Text>
                  <Text
                    style={[
                      styles.settingDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Translate financial terms into friendly, easy-to-understand
                    language
                  </Text>
                </View>
              </View>
              <Switch
                value={isFriendlyMode}
                onValueChange={handleFriendlyModeToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={
                  isFriendlyMode ? colors.buttonText : colors.surfaceSecondary
                }
              />
            </View>
          </View>
        </View>

        {/* Quick Support Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Support
          </Text>

          <View style={styles.supportGrid}>
            <TouchableOpacity
              style={[
                styles.supportCard,
                { backgroundColor: colors.surface, shadowColor: colors.shadow },
              ]}
              onPress={openSupportEmail}
            >
              <View
                style={[
                  styles.supportIcon,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Ionicons name="mail" size={24} color="#6366f1" />
              </View>
              <Text style={[styles.supportTitle, { color: colors.text }]}>
                Email Support
              </Text>
              <Text
                style={[
                  styles.supportDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Get help via email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.supportCard,
                { backgroundColor: colors.surface, shadowColor: colors.shadow },
              ]}
              onPress={openLiveChat}
            >
              <View
                style={[
                  styles.supportIcon,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Ionicons name="chatbubbles" size={24} color="#10b981" />
              </View>
              <Text style={[styles.supportTitle, { color: colors.text }]}>
                Live Chat
              </Text>
              <Text
                style={[
                  styles.supportDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Chat with support team
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.supportCard,
                { backgroundColor: colors.surface, shadowColor: colors.shadow },
              ]}
              onPress={openUserGuide}
            >
              <View
                style={[
                  styles.supportIcon,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Ionicons name="book" size={24} color="#f59e0b" />
              </View>
              <Text style={[styles.supportTitle, { color: colors.text }]}>
                User Guide
              </Text>
              <Text
                style={[
                  styles.supportDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Detailed instructions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.supportCard,
                { backgroundColor: colors.surface, shadowColor: colors.shadow },
              ]}
              onPress={openVideoTutorials}
            >
              <View
                style={[
                  styles.supportIcon,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <Ionicons name="play-circle" size={24} color="#ef4444" />
              </View>
              <Text style={[styles.supportTitle, { color: colors.text }]}>
                Video Tutorials
              </Text>
              <Text
                style={[
                  styles.supportDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Learn with videos
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Frequently Asked Questions
          </Text>

          {faqs.map((faq) => (
            <View
              key={faq.id}
              style={[
                styles.faqItem,
                { backgroundColor: colors.surface, shadowColor: colors.shadow },
              ]}
            >
              <TouchableOpacity
                style={styles.faqHeader}
                onPress={() => toggleFAQ(faq.id)}
              >
                <View style={styles.faqHeaderContent}>
                  <View style={styles.categoryBadge}>
                    <Ionicons
                      name={getCategoryIcon(faq.category) as any}
                      size={12}
                      color={getCategoryColor(faq.category)}
                    />
                    <Text
                      style={[
                        styles.categoryText,
                        { color: getCategoryColor(faq.category) },
                      ]}
                    >
                      {faq.category}
                    </Text>
                  </View>
                  <Text style={[styles.faqQuestion, { color: colors.text }]}>
                    {faq.question}
                  </Text>
                </View>
                <Ionicons
                  name={expandedFAQ === faq.id ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {expandedFAQ === faq.id && (
                <View
                  style={[styles.faqAnswer, { borderTopColor: colors.border }]}
                >
                  <Text
                    style={[styles.answerText, { color: colors.textSecondary }]}
                  >
                    {faq.answer}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Feedback Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Feedback & Requests
          </Text>

          <TouchableOpacity
            style={[
              styles.feedbackButton,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
            onPress={reportBug}
          >
            <View style={styles.feedbackContent}>
              <Ionicons name="bug" size={20} color="#ef4444" />
              <Text style={[styles.feedbackText, { color: colors.text }]}>
                Report a Bug
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
              styles.feedbackButton,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
            onPress={requestFeature}
          >
            <View style={styles.feedbackContent}>
              <Ionicons name="bulb" size={20} color="#6366f1" />
              <Text style={[styles.feedbackText, { color: colors.text }]}>
                Request a Feature
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Contact Information
          </Text>
          <View
            style={[
              styles.contactCard,
              { backgroundColor: colors.surface, shadowColor: colors.shadow },
            ]}
          >
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={16} color={colors.primary} />
              <Text
                style={[styles.contactText, { color: colors.textSecondary }]}
              >
                support@vectorfi.ai
              </Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="time" size={16} color={colors.primary} />
              <Text
                style={[styles.contactText, { color: colors.textSecondary }]}
              >
                Mon-Fri 9 AM - 6 PM EST
              </Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="globe" size={16} color={colors.primary} />
              <Text
                style={[styles.contactText, { color: colors.textSecondary }]}
              >
                vectorfi.ai/support
              </Text>
            </View>
          </View>
        </View>

        {/* Emergency Support */}
        <View style={styles.emergencySection}>
          <View
            style={[
              styles.emergencyCard,
              { backgroundColor: "#fef3c7", borderColor: "#fde68a" },
            ]}
          >
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <Text style={[styles.emergencyTitle, { color: "#92400e" }]}>
              Need Immediate Help?
            </Text>
            <Text style={[styles.emergencyDescription, { color: "#92400e" }]}>
              For urgent issues or account problems, contact us immediately.
            </Text>
            <TouchableOpacity
              style={[styles.emergencyButton, { backgroundColor: "#f59e0b" }]}
              onPress={openSupportEmail}
            >
              <Text style={[styles.emergencyButtonText, { color: "#ffffff" }]}>
                Contact Support Now
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  supportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  supportCard: {
    borderRadius: 16,
    padding: 20,
    width: "48%",
    alignItems: "center",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  supportDescription: {
    fontSize: 12,
    textAlign: "center",
  },
  faqItem: {
    borderRadius: 16,
    marginBottom: 12,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    overflow: "hidden",
  },
  faqHeader: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqHeaderContent: {
    flex: 1,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  faqAnswer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  answerText: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  feedbackButton: {
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
  feedbackContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  contactCard: {
    borderRadius: 16,
    padding: 20,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  contactText: {
    fontSize: 15,
    marginLeft: 12,
    fontWeight: "500",
  },
  emergencySection: {
    marginBottom: 24,
  },
  emergencyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
  },
  emergencyDescription: {
    fontSize: 15,
  },
  settingCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 12,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
    lineHeight: 20,
  },
  emergencyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emergencyButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
