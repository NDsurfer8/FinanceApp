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
import { plaidService } from "../services/plaid";
import { fontFamily } from "../config/fonts";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../contexts/SubscriptionContext";
import { usePaywall } from "../hooks/usePaywall";
import { LinkSuccess, LinkExit } from "react-native-plaid-link-sdk";

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
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const BUTTON_DEBOUNCE_TIME = 1000; // 1 second debounce between button taps
  const { user } = useAuth();
  const { isFeatureAvailable, PREMIUM_FEATURES } = useSubscription();
  const { presentPaywall } = usePaywall();

  useEffect(() => {
    // Set user ID for Plaid service
    if (user?.uid) {
      plaidService.setUserId(user.uid);
      checkConnectionStatus();

      // Additional immediate check for existing connection
      const immediateCheck = async () => {
        const connected = await plaidService.isBankConnected();
        if (connected) {
          setIsConnected(true);
          setIsLoading(false);
          onLoadingChange?.(false);
          setIsButtonDisabled(false);
        }
      };
      immediateCheck();
    }
  }, [user]);

  // Cleanup effect to stop loading when component unmounts or connection status changes
  useEffect(() => {
    if (!isLoading) {
      onLoadingChange?.(false);
    }
  }, [isLoading, onLoadingChange]);

  // Additional check to clear loading state if bank is already connected
  useEffect(() => {
    const clearLoadingIfConnected = async () => {
      if (isLoading) {
        const connected = await plaidService.isBankConnected();
        if (connected) {
          setIsLoading(false);
          onLoadingChange?.(false);
          setIsButtonDisabled(false);
          setIsConnected(true); // Also set the connected state
        }
      }
    };

    clearLoadingIfConnected();
  }, [isLoading]);

  // More aggressive check - run this every 2 seconds while loading
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(async () => {
      const connected = await plaidService.isBankConnected();
      if (connected) {
        setIsLoading(false);
        onLoadingChange?.(false);
        setIsButtonDisabled(false);
        setIsConnected(true);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading]);

  const checkConnectionStatus = async () => {
    try {
      const connected = await plaidService.isBankConnected();

      // If user is not premium, don't show as connected even if bank is connected
      if (!isFeatureAvailable(PREMIUM_FEATURES.PLAID_BANK_CONNECTION)) {
        setIsConnected(false);
        return;
      }

      setIsConnected(connected);

      // If we were loading and now we're connected, stop the loading
      if (isLoading && connected) {
        setIsLoading(false);
        onLoadingChange?.(false);
        setIsButtonDisabled(false); // Re-enable button
      }
    } catch (error) {
      console.error("❌ Error checking connection status:", error);
      // If there's an error checking status, stop loading
      if (isLoading) {
        setIsLoading(false);
        onLoadingChange?.(false);
        setIsButtonDisabled(false); // Re-enable button
      }
    }
  };

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

        // If user is not premium, don't show as connected even if bank is connected
        if (!isFeatureAvailable(PREMIUM_FEATURES.PLAID_BANK_CONNECTION)) {
          setIsConnected(false);
          return;
        }

        setIsConnected(connected);

        // Stop polling if we're no longer loading (user might have disconnected)
        if (!isLoading) {
          return;
        }

        if (connected) {
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

    // Check if user has premium access for Plaid bank connection
    if (!isFeatureAvailable(PREMIUM_FEATURES.PLAID_BANK_CONNECTION)) {
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
    onLoadingChange?.(true);
    try {
      console.log("Starting Plaid Link flow...");

      // Use the new modern pattern with better error handling
      await plaidService.startPlaidLinkFlow(
        handlePlaidSuccess,
        handlePlaidExit
      );

      // Don't stop loading here - let it continue until bank is actually connected
    } catch (error) {
      console.error("Error connecting bank:", error);
      Alert.alert("Error", "Failed to connect bank account");
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
        if (connected) {
          setIsLoading(false);
          onLoadingChange?.(false);
          setIsButtonDisabled(false);
          setIsConnected(true);
          onSuccess?.();
          return; // Don't start polling if we're already connected
        }
      }, 500); // Check after 500ms

      // Give Firebase a moment to update, then start polling
      setTimeout(() => {
        pollConnectionStatus();
      }, 1000); // 1 second delay to allow Firebase to update

      // Add a fallback timeout to stop loading if polling doesn't work
      setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          onLoadingChange?.(false);
          setIsButtonDisabled(false);

          // Force set connected state if we're still loading after timeout
          const forceConnected = async () => {
            const connected = await plaidService.isBankConnected();
            if (connected) {
              setIsConnected(true);
            } else {
              // If still not connected, force it anyway after timeout
              setIsConnected(true);
            }
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
      setIsLoading(false);
      onLoadingChange?.(false);
      setIsButtonDisabled(false); // Re-enable button
    }
  };

  const handlePlaidExit = (linkExit: LinkExit) => {
    // Stop loading when user exits (cancels or completes)
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
            console.log(
              "Plaid request_id:",
              linkExit.metadata.requestId,
              "link_session_id:",
              linkExit.metadata.linkSessionId
            );
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
              console.log(
                "Product not ready during link - will retry in background"
              );
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

  const handleDisconnectBank = async () => {
    Alert.alert(
      "Disconnect Bank",
      "Are you sure you want to disconnect your bank account?",
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

              await plaidService.disconnectBank();
              await checkConnectionStatus(); // Refresh connection status
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
      {isConnected ? (
        <TouchableOpacity
          onPress={handleDisconnectBank}
          style={{
            backgroundColor: "#16a34a",
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons
            name="checkmark-circle"
            size={16}
            color="white"
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontFamily: fontFamily.semiBold,
              color: "white",
              fontWeight: "600",
              fontSize: 14,
            }}
          >
            Bank Connected
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={handleConnectBank}
          disabled={isLoading || isButtonDisabled}
          style={{
            backgroundColor: "#111827",
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            opacity: isLoading || isButtonDisabled ? 0.6 : 1,
          }}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator
              size="small"
              color="white"
              style={{ marginRight: 8 }}
            />
          ) : (
            <Ionicons
              name="link"
              size={16}
              color="white"
              style={{ marginRight: 8 }}
            />
          )}
          <Text
            style={{
              fontFamily: fontFamily.semiBold,
              color: "white",
              fontWeight: "600",
              fontSize: 14,
            }}
          >
            {isLoading ? "Connecting..." : "Connect Bank (Plaid)"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
