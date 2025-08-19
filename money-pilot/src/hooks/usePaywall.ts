import { useCallback } from "react";
import PurchasesUI from "react-native-purchases-ui";
import revenueCatService from "../services/revenueCat";

export const usePaywall = () => {
  const presentPaywall = useCallback(async () => {
    try {
      await PurchasesUI.presentPaywall();
      // Optionally refresh subscription status after paywall is dismissed
      await revenueCatService.checkSubscriptionStatus();
      return true;
    } catch (error) {
      console.error("Failed to present paywall:", error);
      return false;
    }
  }, []);

  return { presentPaywall };
};
