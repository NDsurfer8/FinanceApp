import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import revenueCatService, {
  SubscriptionStatus,
  PREMIUM_FEATURES,
} from "../services/revenueCat";
import { fontFamily } from "../config/fonts";
import PurchasesUI from "react-native-purchases-ui";

const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeSubscription();
  }, []);

  const initializeSubscription = async () => {
    try {
      setLoading(true);

      // Initialize RevenueCat first
      await revenueCatService.initialize();

      // Set user if logged in
      if (user?.uid) {
        await revenueCatService.setUser(user.uid);
      }

      // Get subscription status
      const status = await revenueCatService.checkSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch (error) {
      console.error("Failed to initialize subscription:", error);
      // Don't show alert for initialization errors, just set default status
      setSubscriptionStatus({
        isPremium: false,
        isActive: false,
        features: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      await revenueCatService.restorePurchases();

      const newStatus = await revenueCatService.checkSubscriptionStatus();
      setSubscriptionStatus(newStatus);

      if (newStatus.isPremium) {
        Alert.alert("Success", "Your purchases have been restored!");
      } else {
        Alert.alert(
          "No Purchases Found",
          "No previous purchases were found to restore."
        );
      }
    } catch (error) {
      console.error("Restore failed:", error);
      Alert.alert("Error", "Failed to restore purchases. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderFeature = (
    feature: string,
    title: string,
    description: string
  ) => (
    <View key={feature} style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>
            Loading subscription information...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Premium Subscription</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Current Status */}
        {subscriptionStatus && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Ionicons
                name={subscriptionStatus.isPremium ? "star" : "star-outline"}
                size={24}
                color={subscriptionStatus.isPremium ? "#f59e0b" : "#6b7280"}
              />
              <Text style={styles.statusTitle}>
                {subscriptionStatus.isPremium ? "Premium Active" : "Free Plan"}
              </Text>
            </View>

            {subscriptionStatus.isPremium &&
              subscriptionStatus.expirationDate && (
                <Text style={styles.expirationText}>
                  Expires:{" "}
                  {subscriptionStatus.expirationDate.toLocaleDateString()}
                </Text>
              )}
          </View>
        )}

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          {renderFeature(
            PREMIUM_FEATURES.UNLIMITED_TRANSACTIONS,
            "Unlimited Transactions",
            "Track as many transactions as you need"
          )}
          {renderFeature(
            PREMIUM_FEATURES.ADVANCED_ANALYTICS,
            "Advanced Analytics",
            "Detailed insights and financial reports"
          )}
          {renderFeature(
            PREMIUM_FEATURES.EXPORT_DATA,
            "Export Data",
            "Export your financial data to CSV/PDF"
          )}
          {renderFeature(
            PREMIUM_FEATURES.CUSTOM_CATEGORIES,
            "Custom Categories",
            "Create your own transaction categories"
          )}
          {renderFeature(
            PREMIUM_FEATURES.SHARED_FINANCE,
            "Shared Finance",
            "Share finances with family and partners"
          )}
          {renderFeature(
            PREMIUM_FEATURES.GOAL_TRACKING,
            "Goal Tracking",
            "Set and track financial goals"
          )}
          {renderFeature(
            PREMIUM_FEATURES.BUDGET_PLANNING,
            "Budget Planning",
            "Advanced budget planning tools"
          )}
          {renderFeature(
            PREMIUM_FEATURES.PRIORITY_SUPPORT,
            "Priority Support",
            "Get help when you need it most"
          )}
          {renderFeature(
            PREMIUM_FEATURES.NO_ADS,
            "Ad-Free Experience",
            "Enjoy a clean, ad-free interface"
          )}
        </View>

        {/* RevenueCat Paywall - Primary Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Plans</Text>
          <TouchableOpacity
            style={styles.primaryPaywallButton}
            onPress={async () => {
              try {
                await PurchasesUI.presentPaywall();
                // Refresh subscription status after paywall is dismissed
                const newStatus =
                  await revenueCatService.checkSubscriptionStatus();
                setSubscriptionStatus(newStatus);
              } catch (error) {
                console.error("Failed to present paywall:", error);
              }
            }}
          >
            <Ionicons name="card" size={20} color="#fff" />
            <Text style={styles.primaryPaywallButtonText}>
              View Premium Plans
            </Text>
          </TouchableOpacity>
        </View>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
        >
          <Ionicons name="refresh" size={16} color="#6366f1" />
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.termsText}>
          Subscriptions automatically renew unless auto-renew is turned off at
          least 24 hours before the end of the current period. You can manage
          your subscriptions in your App Store account settings.
        </Text>
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
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fontFamily.bold,
    color: "#1f2937",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: fontFamily.medium,
    color: "#6b7280",
  },
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: "#1f2937",
    marginLeft: 12,
  },
  expirationText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: "#6b7280",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: fontFamily.bold,
    color: "#1f2937",
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  featureIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: "#374151",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: "#6b7280",
    lineHeight: 20,
  },
  productCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  currentPlanCard: {
    borderColor: "#6366f1",
    borderWidth: 2,
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  productTitle: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: "#1f2937",
  },
  productPrice: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: "#6366f1",
  },
  productDescription: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  currentPlanBadge: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  currentPlanText: {
    fontSize: 12,
    fontFamily: fontFamily.semiBold,
    color: "#fff",
  },
  purchaseButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  purchasingButton: {
    backgroundColor: "#9ca3af",
  },
  purchaseButtonText: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: "#fff",
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginBottom: 24,
  },
  restoreButtonText: {
    fontSize: 16,
    fontFamily: fontFamily.medium,
    color: "#6366f1",
    marginLeft: 8,
  },
  paywallButton: {
    backgroundColor: "#f59e0b",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  paywallButtonText: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: "#fff",
    marginLeft: 8,
  },
  primaryPaywallButton: {
    backgroundColor: "#6366f1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  primaryPaywallButtonText: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: "#fff",
    marginLeft: 12,
  },
  termsText: {
    fontSize: 12,
    fontFamily: fontFamily.regular,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 16,
  },
});

export default SubscriptionScreen;
