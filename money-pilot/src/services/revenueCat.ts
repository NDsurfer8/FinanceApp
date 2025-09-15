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

// Add error handling and retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Simple network connectivity check
const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://api.revenuecat.com/v1/health", {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log("Network connectivity check failed:", error);
    return false;
  }
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
  AI_FINANCIAL_ADVISOR: "ai_financial_advisor",
  PLAID_BANK_CONNECTION: "plaid_bank_connection",
};

export interface SubscriptionStatus {
  isPremium: boolean;
  isActive: boolean;
  expirationDate?: Date;
  productId?: string;
  features: string[];
  isEligibleForIntroOffer?: boolean;
}

class RevenueCatService {
  private static instance: RevenueCatService;
  private customerInfoUpdateListeners: ((
    customerInfo: CustomerInfo
  ) => void)[] = [];
  private isInitialized = false;
  private isOfflineMode = false;

  private constructor() {}

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    let lastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Check network connectivity first
        const isConnected = await checkNetworkConnectivity();
        if (!isConnected) {
          throw new Error("No network connectivity to RevenueCat servers");
        }

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

        // Set up customer info update listener
        this.setupCustomerInfoUpdateListener();

        return; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        console.error(`RevenueCat initialization attempt ${attempt} failed:`, {
          error: error.message,
          code: error.code,
          userInfo: error.userInfo,
        });

        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    // All attempts failed - enable offline mode
    console.error(
      "RevenueCat initialization failed after all attempts:",
      lastError
    );

    this.isOfflineMode = true;
    this.isInitialized = true; // Mark as initialized to prevent retries
  }

  async setUser(userId: string): Promise<void> {
    if (this.isOfflineMode) {
      return;
    }

    try {
      await Purchases.logIn(userId);
    } catch (error: any) {
      console.error("Failed to set RevenueCat user:", {
        error: error.message,
        code: error.code,
        userInfo: error.userInfo,
      });
      throw error;
    }
  }

  // Get diagnostic information
  getDiagnosticInfo(): any {
    return {
      isInitialized: this.isInitialized,
      isOfflineMode: this.isOfflineMode,
      platform: Platform.OS,
      bundleId:
        Platform.OS === "ios"
          ? "com.ndsurf888.vectorfii"
          : "com.ndsurf888.vectorfii",
      apiKey:
        Platform.OS === "ios"
          ? `${REVENUECAT_API_KEYS.ios.substring(0, 10)}...`
          : `${REVENUECAT_API_KEYS.android.substring(0, 10)}...`,
    };
  }

  async getOfferings(): Promise<PurchasesOffering | null> {
    if (this.isOfflineMode) {
      return null;
    }

    try {
      const startTime = Date.now();

      const offerings = await Purchases.getOfferings();

      const fetchTime = Date.now() - startTime;

      return offerings.current;
    } catch (error: any) {
      console.error("Failed to get offerings:", {
        error: error.message,
        code: error.code,
        userInfo: error.userInfo,
      });
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

      return customerInfo;
    } catch (error) {
      console.error("Purchase failed:", error);
      throw error;
    }
  }

  async restorePurchases(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      console.log("Purchases restored successfully");
      return customerInfo;
    } catch (error) {
      console.error("Failed to restore purchases:", error);
      throw error;
    }
  }

  // Handle purchase completion and ensure subscription status is updated
  async handlePurchaseCompletion(): Promise<SubscriptionStatus> {
    try {
      console.log("RevenueCat: Handling purchase completion...");

      // Force refresh customer info from servers
      const customerInfo = await this.refreshCustomerInfo();

      // Check subscription status with the fresh data
      const subscriptionStatus = await this.checkSubscriptionStatus(true);

      console.log(
        "RevenueCat: Purchase completion handled, subscription status:",
        subscriptionStatus
      );

      return subscriptionStatus;
    } catch (error) {
      console.error("Failed to handle purchase completion:", error);
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

  // Force refresh customer info from RevenueCat servers
  async refreshCustomerInfo(): Promise<CustomerInfo> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error("Failed to refresh customer info:", error);
      throw error;
    }
  }

  async checkSubscriptionStatus(
    forceRefresh: boolean = false
  ): Promise<SubscriptionStatus> {
    try {
      const customerInfo = forceRefresh
        ? await this.refreshCustomerInfo()
        : await this.getCustomerInfo();

      // Check for both possible entitlement names
      const isPremium =
        customerInfo.entitlements.active["premium"] !== undefined ||
        customerInfo.entitlements.active["premium_monthly"] !== undefined;

      const premiumEntitlement =
        customerInfo.entitlements.active["premium"] ||
        customerInfo.entitlements.active["premium_monthly"];

      // Check introductory offer eligibility
      const isEligibleForIntroOffer = await this.checkIntroOfferEligibility();

      const subscriptionStatus: SubscriptionStatus = {
        isPremium,
        isActive: isPremium,
        expirationDate: premiumEntitlement?.expirationDate
          ? new Date(premiumEntitlement.expirationDate)
          : undefined,
        productId: premiumEntitlement?.productIdentifier,
        features: this.getFeaturesForSubscription(customerInfo),
        isEligibleForIntroOffer,
      };

      return subscriptionStatus;
    } catch (error) {
      console.error("Failed to check subscription status:", error);
      return {
        isPremium: false,
        isActive: false,
        features: [],
        isEligibleForIntroOffer: false,
      };
    }
  }

  // Check if user is eligible for introductory offers
  async checkIntroOfferEligibility(): Promise<boolean> {
    try {
      if (this.isOfflineMode) {
        console.log(
          "RevenueCat: Offline mode - assuming eligible for intro offer"
        );
        return true;
      }

      const customerInfo = await this.getCustomerInfo();

      // Check if user has any active subscriptions
      const hasActiveSubscription =
        Object.keys(customerInfo.entitlements.active).length > 0;

      // Check if user has any non-subscription purchases (lifetime)
      const hasNonSubscriptionPurchases =
        Object.keys(customerInfo.nonSubscriptionTransactions).length > 0;

      // Check if user has any subscription transactions (past or present)
      const hasSubscriptionHistory =
        Object.keys(customerInfo.allPurchaseDates).length > 0;

      // User is eligible for intro offer if they have no active subscriptions,
      // no lifetime purchases, and no subscription history
      const isEligible =
        !hasActiveSubscription &&
        !hasNonSubscriptionPurchases &&
        !hasSubscriptionHistory;

      return isEligible;
    } catch (error) {
      console.error("Failed to check intro offer eligibility:", error);
      // Default to true if we can't determine eligibility
      return true;
    }
  }

  private getFeaturesForSubscription(customerInfo: CustomerInfo): string[] {
    const features: string[] = [];

    // Check for premium entitlement (both possible names)
    if (
      customerInfo.entitlements.active["premium"] ||
      customerInfo.entitlements.active["premium_monthly"]
    ) {
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
        PREMIUM_FEATURES.BUDGET_PLANNING,
        PREMIUM_FEATURES.AI_FINANCIAL_ADVISOR,
        PREMIUM_FEATURES.PLAID_BANK_CONNECTION
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

  // Method to prepare paywall
  async preparePaywall(): Promise<{
    isReady: boolean;
    offerings: PurchasesOffering | null;
    loadTime: number;
  }> {
    const startTime = Date.now();

    try {
      console.log("RevenueCat: Preparing paywall...");

      // Get offerings
      const offerings = await this.getOfferings();

      const loadTime = Date.now() - startTime;

      return {
        isReady: !!offerings,
        offerings,
        loadTime,
      };
    } catch (error) {
      console.error("RevenueCat: Failed to prepare paywall:", error);
      return {
        isReady: false,
        offerings: null,
        loadTime: Date.now() - startTime,
      };
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

  private setupCustomerInfoUpdateListener(): void {
    try {
      // Add listener for customer info updates
      Purchases.addCustomerInfoUpdateListener((customerInfo) => {
        // Notify all listeners
        this.customerInfoUpdateListeners.forEach((listener) => {
          try {
            listener(customerInfo);
          } catch (error) {
            console.error("Error in customer info update listener:", error);
          }
        });
      });
    } catch (error) {
      console.error("Failed to set up customer info update listener:", error);
    }
  }

  // Add a listener for customer info updates
  addCustomerInfoUpdateListener(
    listener: (customerInfo: CustomerInfo) => void
  ): () => void {
    this.customerInfoUpdateListeners.push(listener);

    // Return a function to remove the listener
    return () => {
      const index = this.customerInfoUpdateListeners.indexOf(listener);
      if (index > -1) {
        this.customerInfoUpdateListeners.splice(index, 1);
      }
    };
  }
}

export default RevenueCatService.getInstance();
