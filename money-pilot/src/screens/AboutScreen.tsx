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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";

interface AboutScreenProps {
  navigation: any;
}

export const AboutScreen: React.FC<AboutScreenProps> = ({ navigation }) => {
  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || "1";
  const appName = Constants.expoConfig?.name || "VectorFi";

  const openPrivacyPolicy = () => {
    Linking.openURL("https://your-app.com/privacy-policy");
  };

  const openTermsOfService = () => {
    Linking.openURL("https://your-app.com/terms-of-service");
  };

  const openSupportEmail = () => {
    Linking.openURL("mailto:support@moneypilot.com");
  };

  const openWebsite = () => {
    Linking.openURL("https://moneypilot.com");
  };

  const openGitHub = () => {
    Linking.openURL("https://github.com/ndsurf888/vectorfii");
  };

  const shareApp = () => {
    Alert.alert(
      "Share VectorFi",
      "Help others take control of their finances! Share this app with friends and family.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Share",
          onPress: () => {
            // You can implement actual sharing functionality here
            Alert.alert(
              "Share",
              "Sharing functionality would be implemented here"
            );
          },
        },
      ]
    );
  };

  const rateApp = () => {
    // This would open the app store for rating
    Alert.alert(
      "Rate VectorFi",
      "Enjoying the app? Please rate us on the App Store!",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Rate",
          onPress: () => {
            // You can implement actual app store rating here
            Alert.alert("Rate", "App store rating would be implemented here");
          },
        },
      ]
    );
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
            <Text style={styles.title}>About</Text>
            <Text style={styles.subtitle}>Learn more about VectorFi</Text>
          </View>
        </View>

        {/* App Info Card */}
        <View style={styles.appInfoCard}>
          <View style={styles.appIconContainer}>
            <View style={styles.appIcon}>
              <Ionicons name="wallet" size={48} color="#6366f1" />
            </View>
          </View>
          <Text style={styles.appName}>{appName}</Text>
          <Text style={styles.appTagline}>
            Take control of your financial future
          </Text>
          <Text style={styles.appVersion}>
            Version {appVersion} ({buildNumber})
          </Text>
        </View>

        {/* App Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About VectorFi</Text>
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>
              VectorFi is your comprehensive personal finance companion,
              designed to help you track expenses, manage budgets, set financial
              goals, and build wealth with confidence.
            </Text>
            <Text style={styles.descriptionText}>
              Built with modern technology and security in mind, we prioritize
              your financial data privacy while providing powerful tools to
              achieve your financial dreams.
            </Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text style={styles.featureText}>Expense & Income Tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text style={styles.featureText}>Smart Budget Management</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text style={styles.featureText}>Financial Goal Setting</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text style={styles.featureText}>Asset & Debt Management</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text style={styles.featureText}>Shared Finance Groups</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text style={styles.featureText}>Real-time Notifications</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text style={styles.featureText}>Secure Data Encryption</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.actionButton} onPress={shareApp}>
            <View style={styles.actionContent}>
              <Ionicons name="share-social" size={20} color="#6366f1" />
              <Text style={styles.actionText}>Share App</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={rateApp}>
            <View style={styles.actionContent}>
              <Ionicons name="star" size={20} color="#f59e0b" />
              <Text style={styles.actionText}>Rate App</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={openSupportEmail}
          >
            <View style={styles.actionContent}>
              <Ionicons name="mail" size={20} color="#6366f1" />
              <Text style={styles.actionText}>Contact Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={openWebsite}>
            <View style={styles.actionContent}>
              <Ionicons name="globe" size={20} color="#6366f1" />
              <Text style={styles.actionText}>Visit Website</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={openGitHub}>
            <View style={styles.actionContent}>
              <Ionicons name="logo-github" size={20} color="#6366f1" />
              <Text style={styles.actionText}>View Source Code</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <TouchableOpacity
            style={styles.legalButton}
            onPress={openPrivacyPolicy}
          >
            <View style={styles.legalContent}>
              <Ionicons name="document-text" size={20} color="#6366f1" />
              <Text style={styles.legalText}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.legalButton}
            onPress={openTermsOfService}
          >
            <View style={styles.legalContent}>
              <Ionicons name="document" size={20} color="#6366f1" />
              <Text style={styles.legalText}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Developer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer</Text>
          <View style={styles.developerCard}>
            <Text style={styles.developerName}>VectorFi Team</Text>
            <Text style={styles.developerDescription}>
              Built with ❤️ using React Native and Expo
            </Text>
            <Text style={styles.developerTech}>
              React Native • Expo • TypeScript • Firebase
            </Text>
          </View>
        </View>

        {/* Copyright */}
        <View style={styles.copyrightSection}>
          <Text style={styles.copyrightText}>
            © 2024 VectorFi. All rights reserved.
          </Text>
          <Text style={styles.copyrightText}>
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
  appInfoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 32,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: "#000",
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
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 12,
  },
  appVersion: {
    fontSize: 14,
    color: "#9ca3af",
    fontWeight: "500",
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
  descriptionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  descriptionText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 12,
  },
  featuresList: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
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
    color: "#374151",
    marginLeft: 12,
    fontWeight: "500",
  },
  actionButton: {
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
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 12,
  },
  legalButton: {
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
  legalContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  legalText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 12,
  },
  developerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  developerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  developerDescription: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 8,
  },
  developerTech: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    fontWeight: "500",
  },
  copyrightSection: {
    alignItems: "center",
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  copyrightText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 4,
  },
});
