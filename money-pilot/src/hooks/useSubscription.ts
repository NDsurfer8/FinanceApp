import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import revenueCatService, {
  SubscriptionStatus,
  PREMIUM_FEATURES,
} from "../services/revenueCat";

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    initializeSubscription();
  }, [user]);

  const initializeSubscription = async () => {
    try {
      setLoading(true);

      // Initialize RevenueCat if not already done
      if (!initialized) {
        await revenueCatService.initialize();
        setInitialized(true);
      }

      // Set user if logged in
      if (user?.uid) {
        await revenueCatService.setUser(user.uid);
      }

      // Get subscription status
      const status = await revenueCatService.checkSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch (error) {
      console.error("Failed to initialize subscription:", error);
      // Set default status on error
      setSubscriptionStatus({
        isPremium: false,
        isActive: false,
        features: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscriptionStatus = async () => {
    try {
      const status = await revenueCatService.checkSubscriptionStatus();
      setSubscriptionStatus(status);
      return status;
    } catch (error) {
      console.error("Failed to refresh subscription status:", error);
      return null;
    }
  };

  const isFeatureAvailable = (feature: string): boolean => {
    if (!subscriptionStatus) return false;
    return subscriptionStatus.features.includes(feature);
  };

  const hasPremiumAccess = (): boolean => {
    return subscriptionStatus?.isPremium || false;
  };

  const getSubscriptionFeatures = (): string[] => {
    return subscriptionStatus?.features || [];
  };

  const getExpirationDate = (): Date | undefined => {
    return subscriptionStatus?.expirationDate;
  };

  const getProductId = (): string | undefined => {
    return subscriptionStatus?.productId;
  };

  return {
    subscriptionStatus,
    loading,
    isFeatureAvailable,
    hasPremiumAccess,
    getSubscriptionFeatures,
    getExpirationDate,
    getProductId,
    refreshSubscriptionStatus,
    PREMIUM_FEATURES,
  };
};
