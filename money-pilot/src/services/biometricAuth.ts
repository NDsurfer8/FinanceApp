import * as LocalAuthentication from "expo-local-authentication";
import { getBiometricAuthEnabled } from "./settings";

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometryType?: string;
}

// Simple event emitter for biometric status changes
class BiometricEventEmitter {
  private listeners: (() => void)[] = [];

  addListener(callback: () => void) {
    this.listeners.push(callback);
  }

  removeListener(callback: () => void) {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  emit() {
    this.listeners.forEach((callback) => callback());
  }
}

export const biometricEventEmitter = new BiometricEventEmitter();

export class BiometricAuthService {
  private static instance: BiometricAuthService;
  private isAvailable: boolean = false;
  private biometryType: string | null = null;

  static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  async initialize(): Promise<void> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      this.isAvailable = hasHardware && isEnrolled;

      if (this.isAvailable) {
        const supportedTypes =
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (
          supportedTypes.includes(
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
          )
        ) {
          this.biometryType = "FaceID";
        } else if (
          supportedTypes.includes(
            LocalAuthentication.AuthenticationType.FINGERPRINT
          )
        ) {
          this.biometryType = "TouchID";
        } else {
          this.biometryType = "Biometrics";
        }
      }
    } catch (error) {
      console.error("Error initializing expo biometric auth:", error);
      // Don't let biometric auth failure crash the app
      this.isAvailable = false;
      this.biometryType = null;
    }
  }

  async isBiometricAvailable(): Promise<boolean> {
    if (!this.isAvailable) {
      await this.initialize();
    }
    return this.isAvailable;
  }

  async getBiometryType(): Promise<string | null> {
    if (!this.isAvailable) {
      await this.initialize();
    }
    return this.biometryType;
  }

  async authenticate(
    reason: string = "Please authenticate to continue",
    skipEnabledCheck: boolean = false
  ): Promise<BiometricAuthResult> {
    try {
      // Check if biometric auth is enabled in settings (unless skipping for setup)
      if (!skipEnabledCheck) {
        const isEnabled = await getBiometricAuthEnabled();
        if (!isEnabled) {
          return {
            success: false,
            error: "Biometric authentication is not enabled",
          };
        }
      }

      // Re-initialize to ensure we have the latest settings
      await this.initialize();

      // Check if biometric sensor is available
      const isAvailable = await this.isBiometricAvailable();

      if (!isAvailable) {
        return {
          success: false,
          error: "Biometric authentication is not available on this device",
        };
      }

      // Perform biometric authentication using Expo's Local Authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: "Cancel",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });

      if (result.success) {
        return {
          success: true,
          biometryType: this.biometryType || undefined,
        };
      } else {
        return {
          success: false,
          error: "Authentication failed",
        };
      }
    } catch (error) {
      console.error("ExpoBiometricAuth: Authentication error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    }
  }

  async createKeys(): Promise<boolean> {
    // Expo Local Authentication doesn't require key creation
    // The system handles this automatically
    return true;
  }

  async deleteKeys(): Promise<boolean> {
    // Expo Local Authentication doesn't require key deletion
    // The system handles this automatically
    return true;
  }

  getBiometricTypeName(): string {
    switch (this.biometryType) {
      case "TouchID":
        return "Touch ID";
      case "FaceID":
        return "Face ID";
      case "Biometrics":
        return "Biometric Authentication";
      default:
        return "Biometric Authentication";
    }
  }

  // Force refresh biometric status and notify all listeners
  async refreshStatus(): Promise<void> {
    await this.initialize();
    // Notify all components that biometric status has changed
    biometricEventEmitter.emit();
  }
}

export const biometricAuthService = BiometricAuthService.getInstance();
