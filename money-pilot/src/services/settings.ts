import AsyncStorage from "@react-native-async-storage/async-storage";

// Settings keys
const ENCRYPTION_ENABLED_KEY = "finance_app_encryption_enabled";
const BIOMETRIC_AUTH_ENABLED_KEY = "finance_app_biometric_auth_enabled";
const AUTO_LOCK_ENABLED_KEY = "finance_app_auto_lock_enabled";

// Default settings
const DEFAULT_SETTINGS = {
  encryptionEnabled: true,
  biometricAuthEnabled: false,
  autoLockEnabled: true,
};

export interface AppSettings {
  encryptionEnabled: boolean;
  biometricAuthEnabled: boolean;
  autoLockEnabled: boolean;
}

// Get encryption enabled setting
export const getEncryptionEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ENCRYPTION_ENABLED_KEY);
    return value !== null
      ? value === "true"
      : DEFAULT_SETTINGS.encryptionEnabled;
  } catch (error) {
    console.error("Error getting encryption setting:", error);
    return DEFAULT_SETTINGS.encryptionEnabled;
  }
};

// Set encryption enabled setting
export const setEncryptionEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(ENCRYPTION_ENABLED_KEY, enabled.toString());
  } catch (error) {
    console.error("Error setting encryption setting:", error);
  }
};

// Get biometric auth enabled setting
export const getBiometricAuthEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(BIOMETRIC_AUTH_ENABLED_KEY);
    return value !== null
      ? value === "true"
      : DEFAULT_SETTINGS.biometricAuthEnabled;
  } catch (error) {
    console.error("Error getting biometric auth setting:", error);
    return DEFAULT_SETTINGS.biometricAuthEnabled;
  }
};

// Set biometric auth enabled setting
export const setBiometricAuthEnabled = async (
  enabled: boolean
): Promise<void> => {
  try {
    await AsyncStorage.setItem(BIOMETRIC_AUTH_ENABLED_KEY, enabled.toString());
  } catch (error) {
    console.error("Error setting biometric auth setting:", error);
  }
};

// Get auto lock enabled setting
export const getAutoLockEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(AUTO_LOCK_ENABLED_KEY);
    return value !== null ? value === "true" : DEFAULT_SETTINGS.autoLockEnabled;
  } catch (error) {
    console.error("Error getting auto lock setting:", error);
    return DEFAULT_SETTINGS.autoLockEnabled;
  }
};

// Set auto lock enabled setting
export const setAutoLockEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTO_LOCK_ENABLED_KEY, enabled.toString());
  } catch (error) {
    console.error("Error setting auto lock setting:", error);
  }
};

// Get all settings
export const getAllSettings = async (): Promise<AppSettings> => {
  try {
    const [encryptionEnabled, biometricAuthEnabled, autoLockEnabled] =
      await Promise.all([
        getEncryptionEnabled(),
        getBiometricAuthEnabled(),
        getAutoLockEnabled(),
      ]);
    return {
      encryptionEnabled,
      biometricAuthEnabled,
      autoLockEnabled,
    };
  } catch (error) {
    console.error("Error getting all settings:", error);
    return DEFAULT_SETTINGS;
  }
};

// Reset settings to defaults
export const resetSettingsToDefaults = async (): Promise<void> => {
  try {
    await Promise.all([
      setEncryptionEnabled(DEFAULT_SETTINGS.encryptionEnabled),
      setBiometricAuthEnabled(DEFAULT_SETTINGS.biometricAuthEnabled),
      setAutoLockEnabled(DEFAULT_SETTINGS.autoLockEnabled),
    ]);
  } catch (error) {
    console.error("Error resetting settings:", error);
  }
};
