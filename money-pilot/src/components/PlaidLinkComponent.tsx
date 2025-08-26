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
  const { user } = useAuth();
  const { isFeatureAvailable, PREMIUM_FEATURES } = useSubscription();
  const { presentPaywall } = usePaywall();

  useEffect(() => {
    // Set user ID for Plaid service
    if (user?.uid) {
      plaidService.setUserId(user.uid);
      checkConnectionStatus();
    }
  }, [user]);

  const checkConnectionStatus = async () => {
    try {
      const connected = await plaidService.isBankConnected();
      setIsConnected(connected);

      // If we were loading and now we're connected, stop the loading
      if (isLoading && connected) {
        setIsLoading(false);
        onLoadingChange?.(false);
      }
    } catch (error) {
      console.error("Error checking connection status:", error);
      // If there's an error checking status, stop loading
      if (isLoading) {
        setIsLoading(false);
        onLoadingChange?.(false);
      }
    }
  };

  const pollConnectionStatus = async () => {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    const pollInterval = 1000; // 1 second

    while (attempts < maxAttempts && isLoading) {
      try {
        const connected = await plaidService.isBankConnected();
        setIsConnected(connected);

        if (connected) {
          console.log(
            "Bank connection confirmed after",
            attempts + 1,
            "attempts"
          );
          setIsLoading(false);
          onLoadingChange?.(false);
          return;
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error("Error polling connection status:", error);
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    // If we reach here, connection wasn't confirmed
    if (isLoading) {
      console.log(
        "Bank connection not confirmed after",
        maxAttempts,
        "attempts"
      );
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleConnectBank = async () => {
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
    }
  };

  const handlePlaidSuccess = async (linkSuccess: LinkSuccess) => {
    try {
      console.log("Plaid Link success received:", linkSuccess);

      await plaidService.handlePlaidSuccess(
        linkSuccess.publicToken,
        linkSuccess.metadata
      );

      // Keep loading until connection is confirmed
      await checkConnectionStatus();
      onSuccess?.();

      // Start polling for connection confirmation
      pollConnectionStatus();
    } catch (error) {
      console.error("Error handling Plaid success:", error);
      Alert.alert("Error", "Failed to complete bank connection");
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handlePlaidExit = (linkExit: LinkExit) => {
    // Don't stop loading here - let it continue until bank is actually connected
    console.log("Plaid Link exit:", linkExit);

    if (linkExit.error) {
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
            errorMessage =
              "Bank is temporarily unavailable. Please try again later.";
            break;
          default:
            errorMessage = linkExit.error.errorMessage || errorMessage;
        }
      }

      Alert.alert("Connection Error", errorMessage);
    } else {
      console.log("Plaid exit without error:", linkExit.metadata);
    }

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
          disabled={isLoading}
          style={{
            backgroundColor: "#111827",
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            opacity: isLoading ? 0.6 : 1,
          }}
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
