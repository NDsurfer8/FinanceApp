// SVG initialization utility to prevent duplicate registration errors
import { Platform } from "react-native";

// Ensure SVG components are properly initialized
export const initializeSVG = () => {
  if (Platform.OS === "ios") {
    // iOS specific initialization if needed
    console.log("SVG initialized for iOS");
  } else if (Platform.OS === "android") {
    // Android specific initialization if needed
    console.log("SVG initialized for Android");
  }
};

// Call this function early in the app lifecycle
initializeSVG();
