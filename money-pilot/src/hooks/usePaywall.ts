import { useCallback } from "react";
import PurchasesUI from "react-native-purchases-ui";
import { useSubscription } from "../contexts/SubscriptionContext";
import revenueCatService from "../services/revenueCat";

export const usePaywall = () => {
  const { refreshSubscriptionStatus } = useSubscription();

  const presentPaywall = useCallback(async () => {
    try {
      console.log("Presenting RevenueCat paywall...");
      await PurchasesUI.presentPaywall();
      console.log("Paywall dismissed, handling purchase completion...");

      // Handle purchase completion with multiple attempts
      let attempts = 0;
      const maxAttempts = 3;
      let subscriptionStatus = null;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`Purchase completion attempt ${attempts}/${maxAttempts}`);

        // Add a delay between attempts to allow RevenueCat to process
        if (attempts > 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        try {
          // Use the new handlePurchaseCompletion method
          subscriptionStatus =
            await revenueCatService.handlePurchaseCompletion();
          console.log(
            `Attempt ${attempts} - Subscription status:`,
            subscriptionStatus
          );

          // If we get a premium status, we can stop trying
          if (subscriptionStatus?.isPremium) {
            console.log("Premium subscription detected, stopping attempts");
            break;
          }
        } catch (error) {
          console.error(`Attempt ${attempts} failed:`, error);
        }
      }

      // Also refresh the global subscription context
      if (subscriptionStatus?.isPremium) {
        await refreshSubscriptionStatus(true);
      }

      return true;
    } catch (error) {
      console.error("Failed to present paywall:", error);
      return false;
    }
  }, [refreshSubscriptionStatus]);

  return { presentPaywall };
};
