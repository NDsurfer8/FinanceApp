import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { biometricAuthService } from "../services/biometricAuth";
import { useTheme } from "../contexts/ThemeContext";

interface BiometricAuthOverlayProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const BiometricAuthOverlay: React.FC<BiometricAuthOverlayProps> = ({
  visible,
  onSuccess,
  onCancel,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    if (visible) {
      // Automatically trigger authentication when overlay becomes visible
      handleBiometricAuth();
    }
  }, [visible]);

  const handleBiometricAuth = async () => {
    setIsAuthenticating(true);

    try {
      // Add a delay to ensure the overlay is fully visible
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if biometric is available first
      const isAvailable = await biometricAuthService.isBiometricAvailable();

      if (!isAvailable) {
        Alert.alert(
          "Biometric Not Available",
          "Biometric authentication is not available on this device.",
          [{ text: "OK", onPress: onCancel }]
        );
        return;
      }

      // Use Expo's Local Authentication for Face ID
      const result = await biometricAuthService.authenticate(
        "Please authenticate to access your financial data",
        true // Skip enabled check since we know it's enabled
      );

      if (result.success) {
        onSuccess();
      } else {
        Alert.alert(
          "Authentication Failed",
          result.error || "Please try again",
          [
            { text: "Cancel", onPress: onCancel },
            { text: "Try Again", onPress: handleBiometricAuth },
          ]
        );
      }
    } catch (error) {
      console.error("Biometric authentication error:", error);
      Alert.alert(
        "Authentication Error",
        "An error occurred during authentication. Please try again.",
        [
          { text: "Cancel", onPress: onCancel },
          { text: "Try Again", onPress: handleBiometricAuth },
        ]
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={[styles.overlay, { backgroundColor: colors.background }]}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View
            style={[styles.iconContainer, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="finger-print" size={48} color={colors.card} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Biometric Authentication
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isAuthenticating
              ? "Authenticating with Face ID..."
              : "Please authenticate with Face ID to access your financial data"}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.border }]}
              onPress={onCancel}
              disabled={isAuthenticating}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleBiometricAuth}
              disabled={isAuthenticating}
            >
              <Text style={[styles.buttonText, { color: colors.card }]}>
                {isAuthenticating ? "Authenticating..." : "Use Face ID"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  container: {
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    maxWidth: 300,
    width: "80%",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
