import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { plaidService } from "../services/plaid";
import { fontFamily } from "../config/fonts";
import { useAuth } from "../hooks/useAuth";
import { create, open, usePlaidEmitter } from "react-native-plaid-link-sdk";

interface PlaidLinkComponentProps {
  onSuccess?: () => void;
  onExit?: () => void;
}

export const PlaidLinkComponent: React.FC<PlaidLinkComponentProps> = ({
  onSuccess,
  onExit,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

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
    } catch (error) {
      console.error("Error checking connection status:", error);
    }
  };

  const handleConnectBank = async () => {
    setIsLoading(true);
    try {
      // Get link token from Firebase Cloud Function
      const token = await plaidService.initializePlaidLink();

      // Create Plaid Link configuration
      create({
        token: token,
      });

      // Open Plaid Link with handlers
      open({
        onSuccess: handlePlaidSuccess,
        onExit: handlePlaidExit,
      });

      setIsLoading(false);
    } catch (error) {
      console.error("Error connecting bank:", error);
      Alert.alert("Error", "Failed to connect bank account");
      setIsLoading(false);
    }
  };

  const handlePlaidSuccess = async (linkSuccess: any) => {
    try {
      await plaidService.handlePlaidSuccess(
        linkSuccess.publicToken,
        linkSuccess.metadata
      );
      await checkConnectionStatus();
      onSuccess?.();
    } catch (error) {
      console.error("Error handling Plaid success:", error);
      Alert.alert("Error", "Failed to complete bank connection");
    }
  };

  const handlePlaidExit = (linkExit: any) => {
    setIsLoading(false);

    if (linkExit.error) {
      console.error("Plaid exit with error:", linkExit.error);
      Alert.alert("Error", "Failed to connect bank account");
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
            await plaidService.disconnectBank();
            await checkConnectionStatus(); // Refresh connection status
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
            backgroundColor: "#ef4444",
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
            <Ionicons
              name="refresh"
              size={16}
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
