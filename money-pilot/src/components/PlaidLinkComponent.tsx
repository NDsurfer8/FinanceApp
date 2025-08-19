import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { plaidService } from "../services/plaid";
import { fontFamily } from "../config/fonts";
import { useAuth } from "../hooks/useAuth";
import { PlaidLink } from "react-native-plaid-link-sdk";

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
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [showPlaidLink, setShowPlaidLink] = useState(false);
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
      setLinkToken(token);
      setShowPlaidLink(true);
      setIsLoading(false);
    } catch (error) {
      console.error("Error connecting bank:", error);
      Alert.alert("Error", "Failed to connect bank account");
      setIsLoading(false);
    }
  };

  const handlePlaidSuccess = async (publicToken: string, metadata: any) => {
    try {
      await plaidService.handlePlaidSuccess(publicToken, metadata);
      await checkConnectionStatus();
      setShowPlaidLink(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error handling Plaid success:", error);
      Alert.alert("Error", "Failed to complete bank connection");
    }
  };

  const handlePlaidExit = (error: any, metadata: any) => {
    setShowPlaidLink(false);
    setIsLoading(false);

    if (error) {
      console.error("Plaid exit with error:", error);
      Alert.alert("Error", "Failed to connect bank account");
    } else {
      console.log("Plaid exit without error:", metadata);
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

      {/* Plaid Link Modal - Temporarily replaced with simple modal for testing */}
      {showPlaidLink && linkToken && (
        <Modal
          visible={showPlaidLink}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPlaidLink(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
          >
            <View
              style={{
                backgroundColor: "white",
                padding: 20,
                borderRadius: 10,
                margin: 20,
                maxWidth: 300,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.bold,
                  fontSize: 18,
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                Plaid Link Token Created!
              </Text>
              <Text
                style={{
                  fontFamily: fontFamily.regular,
                  fontSize: 12,
                  marginBottom: 15,
                  textAlign: "center",
                }}
              >
                Link Token: {linkToken.substring(0, 20)}...
              </Text>
              <Text
                style={{
                  fontFamily: fontFamily.regular,
                  fontSize: 14,
                  marginBottom: 20,
                  textAlign: "center",
                }}
              >
                The Plaid integration is working! The link token was
                successfully created.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPlaidLink(false);
                  // Simulate success for testing
                  handlePlaidSuccess("test_public_token", {
                    institution: { name: "Test Bank" },
                    accounts: [],
                  });
                }}
                style={{
                  backgroundColor: "#6366f1",
                  padding: 12,
                  borderRadius: 8,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.semiBold,
                    color: "white",
                    fontSize: 16,
                  }}
                >
                  Simulate Success
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};
