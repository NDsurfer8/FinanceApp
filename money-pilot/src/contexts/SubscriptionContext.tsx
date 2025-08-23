import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "../hooks/useAuth";
import revenueCatService, {
  SubscriptionStatus,
  PREMIUM_FEATURES,
} from "../services/revenueCat";

interface SubscriptionContextType {
  subscriptionStatus: SubscriptionStatus | null;
  loading: boolean;
  isFeatureAvailable: (feature: string) => boolean;
  hasPremiumAccess: () => boolean;
  getSubscriptionFeatures: () => string[];
  getExpirationDate: () => Date | undefined;
  getProductId: () => string | undefined;
  isEligibleForIntroOffer: () => boolean;
  refreshSubscriptionStatus: (
    forceRefresh?: boolean
  ) => Promise<SubscriptionStatus | null>;
  PREMIUM_FEATURES: typeof PREMIUM_FEATURES;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined
);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
};

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const initializeSubscription = useCallback(async () => {
    try {
      setLoading(true);
      console.log("SubscriptionContext: Initializing subscription...");

      // Initialize RevenueCat if not already done
      if (!initialized) {
        await revenueCatService.initialize();
        setInitialized(true);
        console.log("SubscriptionContext: RevenueCat initialized");
      }

      // Set user if logged in
      if (user?.uid) {
        await revenueCatService.setUser(user.uid);
        console.log("SubscriptionContext: User set for RevenueCat");
      }

      // Get subscription status
      const status = await revenueCatService.checkSubscriptionStatus();
      setSubscriptionStatus(status);
      console.log("SubscriptionContext: Initial subscription status:", status);
    } catch (error) {
      console.error(
        "SubscriptionContext: Failed to initialize subscription:",
        error
      );
      // Set default status on error
      setSubscriptionStatus({
        isPremium: false,
        isActive: false,
        features: [],
      });
    } finally {
      setLoading(false);
    }
  }, [user, initialized]);

  const refreshSubscriptionStatus = useCallback(
    async (forceRefresh: boolean = false) => {
      try {
        console.log("SubscriptionContext: Refreshing subscription status...", {
          forceRefresh,
        });
        const status = await revenueCatService.checkSubscriptionStatus(
          forceRefresh
        );
        setSubscriptionStatus(status);
        console.log("SubscriptionContext: New subscription status:", status);
        return status;
      } catch (error) {
        console.error(
          "SubscriptionContext: Failed to refresh subscription status:",
          error
        );
        return null;
      }
    },
    []
  );

  const isFeatureAvailable = useCallback(
    (feature: string): boolean => {
      if (!subscriptionStatus) return false;
      return subscriptionStatus.features.includes(feature);
    },
    [subscriptionStatus]
  );

  const hasPremiumAccess = useCallback((): boolean => {
    return subscriptionStatus?.isPremium || false;
  }, [subscriptionStatus]);

  const getSubscriptionFeatures = useCallback((): string[] => {
    return subscriptionStatus?.features || [];
  }, [subscriptionStatus]);

  const getExpirationDate = useCallback((): Date | undefined => {
    return subscriptionStatus?.expirationDate;
  }, [subscriptionStatus]);

  const getProductId = useCallback((): string | undefined => {
    return subscriptionStatus?.productId;
  }, [subscriptionStatus]);

  const isEligibleForIntroOffer = useCallback((): boolean => {
    return subscriptionStatus?.isEligibleForIntroOffer ?? false;
  }, [subscriptionStatus]);

  // Initialize subscription when user changes
  useEffect(() => {
    initializeSubscription();
  }, [initializeSubscription]);

  // Set up customer info update listener for real-time subscription changes
  useEffect(() => {
    if (!user?.uid) return;

    console.log(
      "SubscriptionContext: Setting up customer info update listener"
    );

    // Add listener for customer info updates
    const removeListener = revenueCatService.addCustomerInfoUpdateListener(
      async (customerInfo) => {
        console.log(
          "SubscriptionContext: Customer info update received, refreshing subscription status"
        );

        try {
          // Force refresh subscription status immediately when customer info changes
          const newStatus = await revenueCatService.checkSubscriptionStatus(
            true
          );
          setSubscriptionStatus(newStatus);
          console.log(
            "SubscriptionContext: Subscription status updated from listener:",
            newStatus
          );
        } catch (error) {
          console.error(
            "SubscriptionContext: Failed to refresh subscription status from listener:",
            error
          );
        }
      }
    );

    // Cleanup listener when user changes or component unmounts
    return () => {
      console.log(
        "SubscriptionContext: Removing customer info update listener"
      );
      removeListener();
    };
  }, [user?.uid]);

  // Debug: Log subscription status changes
  useEffect(() => {
    console.log("SubscriptionContext: Subscription status changed:", {
      isPremium: subscriptionStatus?.isPremium,
      isActive: subscriptionStatus?.isActive,
      features: subscriptionStatus?.features,
      expirationDate: subscriptionStatus?.expirationDate,
      timestamp: new Date().toISOString(),
    });
  }, [subscriptionStatus]);

  const value: SubscriptionContextType = {
    subscriptionStatus,
    loading,
    isFeatureAvailable,
    hasPremiumAccess,
    getSubscriptionFeatures,
    getExpirationDate,
    getProductId,
    isEligibleForIntroOffer,
    refreshSubscriptionStatus,
    PREMIUM_FEATURES,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
