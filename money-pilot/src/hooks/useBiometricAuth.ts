import { useState, useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  biometricAuthService,
  biometricEventEmitter,
  BiometricAuthResult,
} from "../services/biometricAuth";
import {
  getBiometricAuthEnabled,
  getAutoLockEnabled,
} from "../services/settings";

export interface UseBiometricAuthReturn {
  isBiometricEnabled: boolean;
  isAutoLockEnabled: boolean;
  isBiometricAvailable: boolean;
  biometryType: string;
  isBiometricAuthenticated: boolean;
  requireBiometricAuth: () => Promise<BiometricAuthResult>;
  checkBiometricStatus: () => Promise<void>;
  setBiometricAuthenticated: (authenticated: boolean) => void;
}

export const useBiometricAuth = (): UseBiometricAuthReturn => {
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isAutoLockEnabled, setIsAutoLockEnabled] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState("");
  const [isBiometricAuthenticated, setIsBiometricAuthenticated] =
    useState(false);

  useEffect(() => {
    checkBiometricStatus();

    // Listen for app state changes to handle auto-lock
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  // Listen for biometric status changes from other components
  useEffect(() => {
    const handleBiometricChange = () => {
      console.log("Biometric status changed, refreshing...");
      checkBiometricStatus();
    };

    biometricEventEmitter.addListener(handleBiometricChange);

    return () => {
      biometricEventEmitter.removeListener(handleBiometricChange);
    };
  }, []);

  // Add a focus listener to refresh biometric status when returning to the app
  useEffect(() => {
    const refreshOnFocus = () => {
      checkBiometricStatus();
    };

    // Refresh biometric status when the app comes into focus
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        refreshOnFocus();
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const checkBiometricStatus = async () => {
    try {
      const [biometricEnabled, autoLockEnabled, isAvailable, type] =
        await Promise.all([
          getBiometricAuthEnabled(),
          getAutoLockEnabled(),
          biometricAuthService.isBiometricAvailable(),
          biometricAuthService.getBiometryType(),
        ]);

      setIsBiometricEnabled(biometricEnabled);
      setIsAutoLockEnabled(autoLockEnabled);
      setIsBiometricAvailable(isAvailable);
      setBiometryType(biometricAuthService.getBiometricTypeName());
    } catch (error) {
      console.error("Error checking biometric status:", error);
      // Set safe defaults to prevent crashes
      setIsBiometricEnabled(false);
      setIsAutoLockEnabled(false);
      setIsBiometricAvailable(false);
      setBiometryType("");
    }
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    // When app becomes active, check if biometric auth is required
    // The MainApp component will handle showing the authentication overlay
    if (nextAppState === "background" || nextAppState === "inactive") {
      if (isBiometricEnabled && isAutoLockEnabled) {
        console.log(
          "App going to background, will require biometric auth on return"
        );
      }
    }
  };

  const requireBiometricAuth = async (): Promise<BiometricAuthResult> => {
    if (!isBiometricEnabled) {
      return { success: true }; // No biometric auth required
    }

    if (!isBiometricAvailable) {
      return {
        success: false,
        error: "Biometric authentication is not available on this device",
      };
    }

    return await biometricAuthService.authenticate(
      "Please authenticate to access your financial data"
    );
  };

  return {
    isBiometricEnabled,
    isAutoLockEnabled,
    isBiometricAvailable,
    biometryType,
    isBiometricAuthenticated,
    requireBiometricAuth,
    checkBiometricStatus,
    setBiometricAuthenticated: setIsBiometricAuthenticated,
  };
};
