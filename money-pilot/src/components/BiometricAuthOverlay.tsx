import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { biometricAuthService } from "../services/biometricAuth";

interface BiometricAuthOverlayProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  onUsePasscode?: () => void;
  onSignOut?: () => void;
}

export const BiometricAuthOverlay: React.FC<BiometricAuthOverlayProps> = ({
  visible,
  onSuccess,
  onCancel,
  onUsePasscode,
  onSignOut,
}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  const [showAlternativeOptions, setShowAlternativeOptions] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    if (visible) {
      // Reset failure count when overlay becomes visible
      setFailureCount(0);
      setShowAlternativeOptions(false);
      // Add a delay before triggering authentication to prevent screen shake
      const timer = setTimeout(() => {
        handleBiometricAuth();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleBiometricAuth = async () => {
    // Prevent multiple simultaneous authentication attempts
    if (isAuthenticating) {
      return;
    }

    setIsAuthenticating(true);
    setShowAlternativeOptions(false);

    try {
      // Add a delay to ensure the overlay is fully visible and prevent screen shake
      await new Promise((resolve) => setTimeout(resolve, 800));

      console.log("Starting biometric authentication with Expo...");

      // Check if biometric is available first
      const isAvailable = await biometricAuthService.isBiometricAvailable();

      if (!isAvailable) {
        Alert.alert(
          "Biometric Not Available",
          "Biometric authentication is not available on this device.",
          [
            { text: "OK", onPress: onCancel },
            { text: "Use Passcode", onPress: onUsePasscode },
          ]
        );
        return;
      }

      // Use Expo's Local Authentication for Face ID
      const result = await biometricAuthService.authenticate(
        "Please authenticate to access your financial data",
        true // Skip enabled check since we know it's enabled
      );

      console.log("Biometric authentication result:", result);

      if (result.success) {
        console.log("Biometric authentication successful");
        setFailureCount(0);
        onSuccess();
      } else {
        console.log("Biometric authentication failed:", result.error);
        const newFailureCount = failureCount + 1;
        setFailureCount(newFailureCount);

        // Progressive failure handling
        if (newFailureCount >= 3) {
          // After 3 failures, show alternative options
          setShowAlternativeOptions(true);
          Alert.alert(
            "Authentication Failed",
            "Multiple authentication attempts failed. Please choose an alternative method.",
            [
              { text: "Use Passcode", onPress: onUsePasscode },
              { text: "Sign Out", onPress: onSignOut, style: "destructive" },
              { text: "Cancel", onPress: onCancel },
            ]
          );
        } else if (newFailureCount >= 2) {
          // After 2 failures, suggest passcode
          Alert.alert(
            "Authentication Failed",
            result.error || "Please try again or use your device passcode.",
            [
              { text: "Try Again", onPress: handleBiometricAuth },
              { text: "Use Passcode", onPress: onUsePasscode },
              { text: "Cancel", onPress: onCancel },
            ]
          );
        } else {
          // First failure, just retry
          Alert.alert(
            "Authentication Failed",
            result.error || "Please try again or sign out",
            [
              { text: "Sign Out", onPress: onCancel, style: "destructive" },
              { text: "Try Again", onPress: handleBiometricAuth },
            ]
          );
        }
      }
    } catch (error) {
      console.error("Biometric authentication error:", error);
      const newFailureCount = failureCount + 1;
      setFailureCount(newFailureCount);

      if (newFailureCount >= 3) {
        setShowAlternativeOptions(true);
        Alert.alert(
          "Authentication Error",
          "An error occurred during authentication. Please choose an alternative method.",
          [
            { text: "Use Passcode", onPress: onUsePasscode },
            { text: "Sign Out", onPress: onSignOut, style: "destructive" },
            { text: "Cancel", onPress: onCancel },
          ]
        );
      } else {
        Alert.alert(
          "Authentication Error",
          "An error occurred during authentication. Please try again or sign out.",
          [
            { text: "Sign Out", onPress: onCancel, style: "destructive" },
            { text: "Try Again", onPress: handleBiometricAuth },
          ]
        );
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleUsePasscode = () => {
    if (onUsePasscode) {
      onUsePasscode();
    } else {
      // Fallback: try biometric again with passcode fallback enabled
      handleBiometricAuth();
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? You'll need to sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: onSignOut,
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        Alert.alert(
          "Sign Out",
          "Canceling biometric authentication will sign you out. Are you sure?",
          [
            { text: "Stay", style: "cancel" },
            {
              text: "Sign Out",
              style: "destructive",
              onPress: onCancel,
            },
          ]
        );
      }}
      statusBarTranslucent
      hardwareAccelerated
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
              : failureCount > 0
              ? `Authentication failed (${failureCount} attempt${
                  failureCount > 1 ? "s" : ""
                }). You can try again or sign out.`
              : "Please authenticate with Face ID to access your financial data"}
          </Text>

          {showAlternativeOptions && (
            <View style={styles.alternativeOptions}>
              <Text style={[styles.alternativeTitle, { color: colors.text }]}>
                Alternative Options
              </Text>
              <TouchableOpacity
                style={[
                  styles.alternativeButton,
                  { backgroundColor: colors.info },
                ]}
                onPress={handleUsePasscode}
              >
                <Ionicons name="key" size={20} color={colors.buttonText} />
                <Text
                  style={[
                    styles.alternativeButtonText,
                    { color: colors.buttonText },
                  ]}
                >
                  Use Device Passcode
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.alternativeButton,
                  { backgroundColor: colors.error },
                ]}
                onPress={handleSignOut}
              >
                <Ionicons name="log-out" size={20} color={colors.buttonText} />
                <Text
                  style={[
                    styles.alternativeButtonText,
                    { color: colors.buttonText },
                  ]}
                >
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.border }]}
              onPress={() => {
                Alert.alert(
                  "Sign Out",
                  "Canceling biometric authentication will sign you out. Are you sure?",
                  [
                    { text: "Stay", style: "cancel" },
                    {
                      text: "Sign Out",
                      style: "destructive",
                      onPress: onCancel,
                    },
                  ]
                );
              }}
              disabled={isAuthenticating}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                Sign Out
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleBiometricAuth}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={colors.card} />
                </View>
              ) : (
                <Text style={[styles.buttonText, { color: colors.card }]}>
                  {failureCount > 0 ? "Try Again" : "Use Face ID"}
                </Text>
              )}
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    maxWidth: 300,
    width: "80%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  alternativeOptions: {
    width: "100%",
    marginBottom: 24,
  },
  alternativeTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  alternativeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    minHeight: 44, // Ensure consistent height
  },
  alternativeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 12,
    minHeight: 52, // Ensure consistent container height
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52, // Ensure consistent height
    minWidth: 120, // Ensure minimum width
    maxWidth: 140, // Prevent buttons from getting too wide
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    minHeight: 20, // Ensure consistent text height
  },
  loadingContainer: {
    minHeight: 20, // Match the text height
    justifyContent: "center",
    alignItems: "center",
  },
});
