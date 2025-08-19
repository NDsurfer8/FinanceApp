import Purchases, {
  PurchasesOffering,
  CustomerInfo,
  PurchasesPackage,
} from "react-native-purchases";
import { Platform } from "react-native";

// RevenueCat API Keys
const REVENUECAT_API_KEYS = {
  ios: "appl_kRrkEWJYkLcgRfvkOovUpabriTI", // Replace with your iOS API key
  android: "goog_YOUR_ANDROID_API_KEY", // Replace with your Android API key
};

// Product Identifiers
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: "premium_monthly",
  PREMIUM_YEARLY: "premium_yearly",
  PREMIUM_LIFETIME: "premium_lifetime",
};

// Subscription Features
export const PREMIUM_FEATURES = {
  UNLIMITED_TRANSACTIONS: "unlimited_transactions",
  UNLIMITED_INCOME_SOURCES: "unlimited_income_sources",
  ADVANCED_ANALYTICS: "advanced_analytics",
  EXPORT_DATA: "export_data",
  CUSTOM_CATEGORIES: "custom_categories",
  PRIORITY_SUPPORT: "priority_support",
  NO_ADS: "no_ads",
  SHARED_FINANCE: "shared_finance",
  GOAL_TRACKING: "goal_tracking",
  BUDGET_PLANNING: "budget_planning",
};

export interface SubscriptionStatus {
  isPremium: boolean;
  isActive: boolean;
  expirationDate?: Date;
  productId?: string;
  features: string[];
}

class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const apiKey =
        Platform.OS === "ios"
          ? REVENUECAT_API_KEYS.ios
          : REVENUECAT_API_KEYS.android;

      await Purchases.configure({
        apiKey,
        appUserID: null, // Will be set when user logs in
      });

      // Enable debug logs in development
      if (__DEV__) {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      }

      this.isInitialized = true;
      console.log("RevenueCat initialized successfully");
    } catch (error) {
      console.error("Failed to initialize RevenueCat:", error);
      throw error;
    }
  }

  async setUser(userId: string): Promise<void> {
    try {
      await Purchases.logIn(userId);
      console.log("RevenueCat user set:", userId);
    } catch (error) {
      console.error("Failed to set RevenueCat user:", error);
      throw error;
    }
  }

  async getOfferings(): Promise<PurchasesOffering | null> {
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error("Failed to get offerings:", error);
      return null;
    }
  }

  async purchasePackage(
    packageToPurchase: PurchasesPackage
  ): Promise<CustomerInfo> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(
        packageToPurchase
      );
      console.log("Purchase successful:", customerInfo);
      return customerInfo;
    } catch (error) {
      console.error("Purchase failed:", error);
      throw error;
    }
  }

  async restorePurchases(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      console.log("Purchases restored:", customerInfo);
      return customerInfo;
    } catch (error) {
      console.error("Failed to restore purchases:", error);
      throw error;
    }
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error("Failed to get customer info:", error);
      throw error;
    }
  }

  async checkSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const customerInfo = await this.getCustomerInfo();

      const isPremium =
        customerInfo.entitlements.active["premium"] !== undefined;
      const premiumEntitlement = customerInfo.entitlements.active["premium"];

      const subscriptionStatus: SubscriptionStatus = {
        isPremium,
        isActive: isPremium,
        expirationDate: premiumEntitlement?.expirationDate
          ? new Date(premiumEntitlement.expirationDate)
          : undefined,
        productId: premiumEntitlement?.productIdentifier,
        features: this.getFeaturesForSubscription(customerInfo),
      };

      return subscriptionStatus;
    } catch (error) {
      console.error("Failed to check subscription status:", error);
      return {
        isPremium: false,
        isActive: false,
        features: [],
      };
    }
  }

  private getFeaturesForSubscription(customerInfo: CustomerInfo): string[] {
    const features: string[] = [];

    // Check for premium entitlement
    if (customerInfo.entitlements.active["premium"]) {
      features.push(
        PREMIUM_FEATURES.UNLIMITED_TRANSACTIONS,
        PREMIUM_FEATURES.UNLIMITED_INCOME_SOURCES,
        PREMIUM_FEATURES.ADVANCED_ANALYTICS,
        PREMIUM_FEATURES.EXPORT_DATA,
        PREMIUM_FEATURES.CUSTOM_CATEGORIES,
        PREMIUM_FEATURES.PRIORITY_SUPPORT,
        PREMIUM_FEATURES.NO_ADS,
        PREMIUM_FEATURES.SHARED_FINANCE,
        PREMIUM_FEATURES.GOAL_TRACKING,
        PREMIUM_FEATURES.BUDGET_PLANNING
      );
    }

    return features;
  }

  async isFeatureAvailable(feature: string): Promise<boolean> {
    try {
      const subscriptionStatus = await this.checkSubscriptionStatus();
      return subscriptionStatus.features.includes(feature);
    } catch (error) {
      console.error("Failed to check feature availability:", error);
      return false;
    }
  }

  async getSubscriptionProducts(): Promise<PurchasesPackage[]> {
    try {
      const offering = await this.getOfferings();
      return offering?.availablePackages || [];
    } catch (error) {
      console.error("Failed to get subscription products:", error);
      return [];
    }
  }

  async cancelSubscription(): Promise<void> {
    try {
      // Note: RevenueCat doesn't directly cancel subscriptions
      // Users need to cancel through App Store/Google Play
      console.log(
        "Subscription cancellation should be done through App Store/Google Play"
      );
    } catch (error) {
      console.error("Failed to handle subscription cancellation:", error);
      throw error;
    }
  }
}

export default RevenueCatService.getInstance();
