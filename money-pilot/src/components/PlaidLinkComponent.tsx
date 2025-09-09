import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { plaidService } from "../services/plaid";
import { fontFamily } from "../config/fonts";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../contexts/SubscriptionContext";
import { useData } from "../contexts/DataContext";
import { usePaywall } from "../hooks/usePaywall";
import { LinkSuccess, LinkExit } from "react-native-plaid-link-sdk";
import { useTheme } from "../contexts/ThemeContext";

interface PlaidLinkComponentProps {
  onSuccess?: () => void;
  onExit?: () => void;
  onLoadingChange?: (loading: boolean) => void;
}

export const PlaidLinkComponent: React.FC<PlaidLinkComponentProps> = ({
  onSuccess,
  onExit,
  onLoadingChange,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [connectionStartTime, setConnectionStartTime] = useState(0);
  const BUTTON_DEBOUNCE_TIME = 1000; // 1 second debounce between button taps
  const MIN_CONNECTION_TIME = 3000; // Minimum 3 seconds for connection process
  const { user } = useAuth();

  // Helper function to ensure minimum connection time has passed
  const ensureMinimumConnectionTime = async () => {
    const elapsed = Date.now() - connectionStartTime;
    if (elapsed < MIN_CONNECTION_TIME) {
      const remaining = MIN_CONNECTION_TIME - elapsed;
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  };
  const { isFeatureAvailable, PREMIUM_FEATURES, hasPremiumAccess } =
    useSubscription();
  const {
    disconnectBankAndClearData,
    isBankConnected,
    connectedBanks,
    refreshBankData,
  } = useData();
  const { presentPaywall } = usePaywall();

  useEffect(() => {
    // Set user ID for Plaid service
    if (user?.uid) {
      plaidService.setUserId(user.uid);
    }
  }, [user]);

  // Cleanup effect to stop loading when component unmounts or connection status changes
  useEffect(() => {
    if (!isLoading) {
      onLoadingChange?.(false);
    }
  }, [isLoading, onLoadingChange]);

  const pollConnectionStatus = async () => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    const pollInterval = 1000; // 1 second
    const initialDelay = 2000; // 2 seconds initial delay

    // Initial delay to allow Firebase to update
    await new Promise((resolve) => setTimeout(resolve, initialDelay));

    while (attempts < maxAttempts && isLoading) {
      try {
        const connected = await plaidService.isBankConnected();
        const isPremium = hasPremiumAccess();

        // If user is not premium, don't show as connected even if bank is connected
        if (!isPremium) {
          setIsLoading(false);
          onLoadingChange?.(false);
          setIsButtonDisabled(false);
          return;
        }

        // Stop polling if we're no longer loading (user might have disconnected)
        if (!isLoading) {
          return;
        }

        if (connected) {
          await ensureMinimumConnectionTime();
          setIsLoading(false);
          onLoadingChange?.(false);
          setIsButtonDisabled(false); // Re-enable button
          onSuccess?.(); // Call success callback now that connection is confirmed
          return;
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error("❌ Error polling connection status:", error);
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    // If we reach here, connection wasn't confirmed
    if (isLoading) {
      await ensureMinimumConnectionTime();
      setIsLoading(false);
      onLoadingChange?.(false);
      setIsButtonDisabled(false); // Re-enable button
    }
  };

  const handleConnectBank = async () => {
    const now = Date.now();

    // Enhanced debouncing: prevent rapid taps with time-based check
    if (isButtonDisabled || isLoading) {
      return;
    }

    // Check if enough time has passed since last tap
    if (now - lastTapTime < BUTTON_DEBOUNCE_TIME) {
      return;
    }

    // Update last tap time
    setLastTapTime(now);

    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check if user has premium access
    if (!hasPremiumAccess()) {
      Alert.alert(
        "Premium Feature",
        "Bank connection is a premium feature. Upgrade to Premium to connect your bank account and automatically sync transactions!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade to Premium", onPress: presentPaywall },
        ]
      );
      return;
    }

    // Disable button to prevent multiple taps
    setIsButtonDisabled(true);
    setIsLoading(true);
    setConnectionStartTime(Date.now());
    onLoadingChange?.(true);

    try {
      // Starting Plaid Link flow

      // Use the new modern pattern with better error handling
      await plaidService.startPlaidLinkFlow(
        handlePlaidSuccess,
        handlePlaidExit
      );

      // Don't stop loading here - let it continue until bank is actually connected
    } catch (error) {
      console.error("Error connecting bank:", error);

      // Check if it's a rate limiting error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("Too many connection attempts") ||
        errorMessage.includes("Please wait") ||
        errorMessage.includes("rate limit")
      ) {
        Alert.alert(
          "Connection Limit Reached",
          "Please wait a moment before trying to connect another bank. This helps ensure a smooth connection process."
        );
      } else {
        Alert.alert("Error", "Failed to connect bank account");
      }

      // Ensure minimum connection time has passed before re-enabling button
      await ensureMinimumConnectionTime();
      setIsLoading(false);
      onLoadingChange?.(false);
      setIsButtonDisabled(false); // Re-enable button
    }
  };

  const handlePlaidSuccess = async (linkSuccess: LinkSuccess) => {
    try {
      // Process the success first
      await plaidService.handlePlaidSuccess(
        linkSuccess.publicToken,
        linkSuccess.metadata
      );

      // Immediate check after success processing
      setTimeout(async () => {
        const connected = await plaidService.isBankConnected();
        const isPremium = hasPremiumAccess();

        if (connected && isPremium) {
          await ensureMinimumConnectionTime();
          setIsLoading(false);
          onLoadingChange?.(false);
          setIsButtonDisabled(false);
          onSuccess?.();
          return; // Don't start polling if we're already connected
        } else if (!isPremium) {
          await ensureMinimumConnectionTime();
          setIsLoading(false);
          onLoadingChange?.(false);
          setIsButtonDisabled(false);
          return;
        }
      }, 500); // Check after 500ms

      // Give Firebase a moment to update, then start polling
      setTimeout(() => {
        pollConnectionStatus();
      }, 1000); // 1 second delay to allow Firebase to update

      // Add a fallback timeout to stop loading if polling doesn't work
      setTimeout(async () => {
        if (isLoading) {
          await ensureMinimumConnectionTime();
          setIsLoading(false);
          onLoadingChange?.(false);
          setIsButtonDisabled(false);

          // Force set connected state if we're still loading after timeout
          const forceConnected = async () => {
            const connected = await plaidService.isBankConnected();
            const isPremium = hasPremiumAccess();

            // Connection status is now managed by DataContext
          };
          forceConnected();

          onSuccess?.(); // Call success callback as fallback
        }
      }, 3000); // 3 second fallback timeout (reduced from 5)

      // Don't stop loading here - let polling handle it
      // Don't call onSuccess here - let polling handle it when connection is confirmed
    } catch (error) {
      console.error("Error handling Plaid success:", error);
      Alert.alert("Error", "Failed to complete bank connection");
      await ensureMinimumConnectionTime();
      setIsLoading(false);
      onLoadingChange?.(false);
      setIsButtonDisabled(false); // Re-enable button
    }
  };

  const handlePlaidExit = async (linkExit: LinkExit) => {
    // Stop loading when user exits (cancels or completes)
    await ensureMinimumConnectionTime();
    setIsLoading(false);
    onLoadingChange?.(false);
    setIsButtonDisabled(false); // Re-enable button

    // Check if user cancelled (no error or empty error object means user cancelled)
    if (
      !linkExit.error ||
      (typeof linkExit.error === "object" &&
        Object.keys(linkExit.error).length === 0) ||
      (linkExit.error &&
        !linkExit.error.errorCode &&
        !linkExit.error.errorMessage)
    ) {
      // Don't show any error message for user cancellation
      onExit?.();
      return;
    }

    // Handle actual errors
    console.error("Plaid exit with error:", linkExit.error);

    // Enhanced error messaging
    let errorMessage = "Failed to connect bank account";

    if (linkExit.error.errorCode) {
      switch (linkExit.error.errorCode) {
        case "INVALID_LINK_TOKEN":
          errorMessage = "Connection session expired. Please try again.";
          break;
        case "ITEM_LOGIN_REQUIRED":
          errorMessage = "Bank login required. Please try again.";
          break;
        case "INSTITUTION_DOWN":
        case "INSTITUTION_NOT_RESPONDING":
          errorMessage =
            "Bank is temporarily unavailable. Please try again later.";
          break;
        case "RATE_LIMIT":
          errorMessage =
            "There were too many connection attempts in a short time. For security, the bank has temporarily paused new logins. Try again in about an hour.";
          // Log the request IDs for debugging
          if (linkExit.metadata) {
            // Plaid request metadata available
          }
          // Reset rate limiting counters when we hit a rate limit
          plaidService.resetRateLimiting();
          // Show more specific alert for RATE_LIMIT
          Alert.alert(
            "Please try again later",
            "There were too many connection attempts in a short time. For security, the bank has temporarily paused new logins. Try again in about an hour."
          );
          break;
        default:
          // Check for common Plaid errors in the error message
          if (linkExit.error.errorMessage) {
            if (
              linkExit.error.errorMessage.includes("RATE_LIMIT") ||
              linkExit.error.errorMessage.includes("RATE_LIMIT_EXCEEDED") ||
              linkExit.error.errorMessage.includes("rate limit")
            ) {
              errorMessage =
                "Too many connection attempts. Please wait 2-3 minutes and try again.";
            } else if (
              linkExit.error.errorMessage.includes("PRODUCT_NOT_READY") ||
              linkExit.error.errorMessage.includes("product not ready")
            ) {
              // Don't show error for PRODUCT_NOT_READY during link process
              // This is handled by retry logic in the background
              onExit?.();
              return;
            } else if (
              linkExit.error.errorMessage.includes("INSTITUTION_DOWN") ||
              linkExit.error.errorMessage.includes("institution down")
            ) {
              errorMessage =
                "Bank is temporarily unavailable. Please try again later.";
            } else {
              errorMessage = linkExit.error.errorMessage || errorMessage;
            }
          } else {
            errorMessage = linkExit.error.errorMessage || errorMessage;
          }
      }
    }

    Alert.alert("Connection Error", errorMessage);
    onExit?.();
  };

  const handleDisconnectBank = async (itemId?: string) => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const bankName = itemId
      ? connectedBanks.find((bank) => bank.itemId === itemId)?.name ||
        "this bank"
      : "all your banks";

    Alert.alert(
      "Disconnect Bank",
      `Are you sure you want to disconnect ${bankName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            try {
              // Stop any ongoing loading/polling
              setIsLoading(false);
              onLoadingChange?.(false);

              if (itemId) {
                // Disconnect specific bank
                await plaidService.disconnectBank(itemId);
                // Refresh bank data to update the UI
                await refreshBankData(true);
              } else {
                // Disconnect all banks
                await disconnectBankAndClearData();
              }
            } catch (error) {
              console.error("Error disconnecting bank:", error);
              Alert.alert("Error", "Failed to disconnect bank account");
            }
          },
        },
      ]
    );
  };

  return (
    <View>
      {/* Connected Banks List */}
      {isBankConnected && connectedBanks.length > 0 && (
        <View style={{ marginBottom: 12 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 8,
            }}
          >
            Connected Banks ({connectedBanks.length})
          </Text>
          {connectedBanks.map((bank, index) => (
            <View
              key={bank.itemId || index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 12,
                paddingHorizontal: 14,
                backgroundColor: colors.surfaceSecondary,
                borderRadius: 12,
                marginBottom: 8,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.success || "#4CAF50"}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: colors.text,
                    }}
                  >
                    {bank.name || "Unknown Bank"}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {bank.accounts?.length || 0} account
                    {bank.accounts?.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleDisconnectBank(bank.itemId)}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: colors.error + "20",
                }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.error || "#F44336"}
                />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add Bank Button */}
      <TouchableOpacity
        onPress={handleConnectBank}
        disabled={isLoading || isButtonDisabled}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: colors.primary,
          borderRadius: 12,
          opacity: isLoading || isButtonDisabled ? 0.6 : 1,
        }}
        activeOpacity={0.7}
      >
        {isLoading && (
          <ActivityIndicator
            size="small"
            color="#fff"
            style={{ marginRight: 8 }}
          />
        )}
        <Ionicons
          name="add-circle"
          size={20}
          color="#fff"
          style={{ marginRight: 8 }}
        />
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#fff",
          }}
        >
          {isBankConnected ? "Add Another Bank" : "Connect Bank"}
        </Text>
      </TouchableOpacity>

      {/* Disconnect All Button (only show if multiple banks) */}
      {isBankConnected && connectedBanks.length > 1 && (
        <TouchableOpacity
          onPress={() => handleDisconnectBank()}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: colors.surfaceSecondary,
            borderRadius: 12,
            marginTop: 8,
            borderWidth: 1,
            borderColor: colors.error + "40",
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={colors.error || "#F44336"}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: colors.error || "#F44336",
            }}
          >
            Disconnect All Banks
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
