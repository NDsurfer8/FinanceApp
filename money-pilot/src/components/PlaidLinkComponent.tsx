import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { plaidService } from "../services/plaid";
import { fontFamily } from "../config/fonts";
import { useAuth } from "../hooks/useAuth";

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
      await plaidService.initializePlaidLink();

      // For now, we'll simulate the Plaid Link flow
      // In a real implementation, you would use the actual Plaid Link SDK
      Alert.alert(
        "Plaid Integration",
        "This is a placeholder for Plaid Link integration. In a real implementation, this would open the Plaid Link interface to connect your bank account.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setIsLoading(false);
              onExit?.();
            },
          },
          {
            text: "Simulate Success",
            onPress: async () => {
              // Simulate successful connection
              await plaidService.handlePlaidSuccess("mock_public_token", {
                institution: { name: "Demo Bank" },
                item_id: "mock_item_id",
                accounts: [
                  {
                    id: "mock_account_1",
                    name: "Checking Account",
                    mask: "1234",
                    type: "depository",
                    subtype: "checking",
                  },
                ],
              });
              await checkConnectionStatus(); // Refresh connection status
              setIsLoading(false);
              onSuccess?.();
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error connecting bank:", error);
      Alert.alert("Error", "Failed to connect bank account");
      setIsLoading(false);
    }
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
