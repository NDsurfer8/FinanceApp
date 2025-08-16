import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

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
      question: "How do I set up a budget?",
      answer:
        "Go to the Budget tab. You can add income sources, fixed expenses, and variable expenses. The app will automatically calculate your remaining budget.",
      category: "Budgeting",
    },
    {
      id: "3",
      question: "Can I share my finances with family members?",
      answer:
        "Yes! Use the Shared Finance feature to create groups with family members. You can share transactions, assets, and debts while maintaining privacy.",
      category: "Shared Finance",
    },
    {
      id: "4",
      question: "How do I set financial goals?",
      answer:
        "Go to the Goals tab and tap 'Add Goal'. Set a target amount, monthly contribution, and target date. Track your progress visually.",
      category: "Goals",
    },
    {
      id: "5",
      question: "Is my financial data secure?",
      answer:
        "Absolutely! We use industry-standard encryption and Firebase security. Your data is private and only accessible to you and your shared group members.",
      category: "Security",
    },
    {
      id: "6",
      question: "How do I export my data?",
      answer:
        "Go to Settings → Privacy & Security → Export My Data. You'll receive an email with your financial data within 24 hours.",
      category: "Data Management",
    },
    {
      id: "7",
      question: "Can I use the app offline?",
      answer:
        "The app requires an internet connection to sync your data with our secure servers. However, you can view recently loaded data when offline.",
      category: "Technical",
    },
    {
      id: "8",
      question: "How do I change my password?",
      answer:
        "Go to Settings → Privacy & Security → Change Password. Enter your current password and set a new one.",
      category: "Account",
    },
  ];

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const openSupportEmail = () => {
    Linking.openURL(
      "mailto:support@moneypilot.com?subject=Money%20Pilot%20Support"
    );
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
    Linking.openURL("https://moneypilot.com/user-guide");
  };

  const openVideoTutorials = () => {
    Linking.openURL("https://moneypilot.com/tutorials");
  };

  const reportBug = () => {
    Linking.openURL("mailto:bugs@moneypilot.com?subject=Bug%20Report");
  };

  const requestFeature = () => {
    Linking.openURL("mailto:features@moneypilot.com?subject=Feature%20Request");
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
      default:
        return "#6366f1";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#475569" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Help & Support</Text>
            <Text style={styles.subtitle}>Get help and find answers</Text>
          </View>
        </View>

        {/* Quick Support Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Support</Text>

          <View style={styles.supportGrid}>
            <TouchableOpacity
              style={styles.supportCard}
              onPress={openSupportEmail}
            >
              <View style={styles.supportIcon}>
                <Ionicons name="mail" size={24} color="#6366f1" />
              </View>
              <Text style={styles.supportTitle}>Email Support</Text>
              <Text style={styles.supportDescription}>Get help via email</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.supportCard} onPress={openLiveChat}>
              <View style={styles.supportIcon}>
                <Ionicons name="chatbubbles" size={24} color="#10b981" />
              </View>
              <Text style={styles.supportTitle}>Live Chat</Text>
              <Text style={styles.supportDescription}>
                Chat with support team
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportCard}
              onPress={openUserGuide}
            >
              <View style={styles.supportIcon}>
                <Ionicons name="book" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.supportTitle}>User Guide</Text>
              <Text style={styles.supportDescription}>
                Detailed instructions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportCard}
              onPress={openVideoTutorials}
            >
              <View style={styles.supportIcon}>
                <Ionicons name="play-circle" size={24} color="#ef4444" />
              </View>
              <Text style={styles.supportTitle}>Video Tutorials</Text>
              <Text style={styles.supportDescription}>Learn with videos</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          {faqs.map((faq) => (
            <View key={faq.id} style={styles.faqItem}>
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
                  <Text style={styles.faqQuestion}>{faq.question}</Text>
                </View>
                <Ionicons
                  name={expandedFAQ === faq.id ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>

              {expandedFAQ === faq.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.answerText}>{faq.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Feedback Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feedback & Requests</Text>

          <TouchableOpacity style={styles.feedbackButton} onPress={reportBug}>
            <View style={styles.feedbackContent}>
              <Ionicons name="bug" size={20} color="#ef4444" />
              <Text style={styles.feedbackText}>Report a Bug</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.feedbackButton}
            onPress={requestFeature}
          >
            <View style={styles.feedbackContent}>
              <Ionicons name="bulb" size={20} color="#6366f1" />
              <Text style={styles.feedbackText}>Request a Feature</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={16} color="#6366f1" />
              <Text style={styles.contactText}>support@moneypilot.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="time" size={16} color="#6366f1" />
              <Text style={styles.contactText}>Mon-Fri 9 AM - 6 PM EST</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="globe" size={16} color="#6366f1" />
              <Text style={styles.contactText}>moneypilot.com/support</Text>
            </View>
          </View>
        </View>

        {/* Emergency Support */}
        <View style={styles.emergencySection}>
          <View style={styles.emergencyCard}>
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <Text style={styles.emergencyTitle}>Need Immediate Help?</Text>
            <Text style={styles.emergencyDescription}>
              For urgent issues or account problems, contact us immediately.
            </Text>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={openSupportEmail}
            >
              <Text style={styles.emergencyButtonText}>
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
    backgroundColor: "#f8fafc",
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
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "400",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  supportGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  supportCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    width: "48%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
    textAlign: "center",
  },
  supportDescription: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  faqItem: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
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
    color: "#111827",
    lineHeight: 22,
  },
  faqAnswer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  answerText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    marginTop: 12,
  },
  feedbackButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
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
    color: "#111827",
    marginLeft: 12,
  },
  contactCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
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
    color: "#374151",
    marginLeft: 12,
    fontWeight: "500",
  },
  emergencySection: {
    marginBottom: 24,
  },
  emergencyCard: {
    backgroundColor: "#fef3c7",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#92400e",
    marginTop: 12,
    marginBottom: 8,
  },
  emergencyDescription: {
    fontSize: 15,
    color: "#92400e",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 22,
  },
  emergencyButton: {
    backgroundColor: "#f59e0b",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emergencyButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
