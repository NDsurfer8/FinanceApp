import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";

export const checkAppleAuthAvailability = async (): Promise<boolean> => {
  // Only check on iOS devices
  if (Platform.OS !== "ios") {
    return false;
  }

  // Check if it's a simulator
  if (Device.isDevice === false) {
    return false;
  }

  // Check if running in Expo Go (Apple Auth doesn't work in Expo Go)
  const isExpoGo = Constants.appOwnership === "expo";
  if (isExpoGo) {
    console.log("Apple Authentication not available in Expo Go");
    return false;
  }

  // For now, return false to prevent crashes in development builds
  // Apple Authentication can be properly implemented later when the module is fully configured
  console.log(
    "Apple Authentication temporarily disabled for development build stability"
  );
  return false;
};
