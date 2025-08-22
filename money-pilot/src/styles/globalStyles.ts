import { StyleSheet } from "react-native";
import { fontFamily } from "../config/fonts";

export const globalStyles = StyleSheet.create({
  // Typography
  heading1: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    fontWeight: "700",
  },
  heading2: {
    fontFamily: fontFamily.semiBold,
    fontSize: 28,
    fontWeight: "600",
  },
  heading3: {
    fontFamily: fontFamily.semiBold,
    fontSize: 24,
    fontWeight: "600",
  },
  heading4: {
    fontFamily: fontFamily.medium,
    fontSize: 20,
    fontWeight: "500",
  },
  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: 18,
    fontWeight: "400",
  },
  bodyMedium: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    fontWeight: "400",
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    fontWeight: "400",
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    fontWeight: "400",
  },
  button: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    fontWeight: "400",
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    fontWeight: "500",
  },
});

// Color palette for consistent theming
export const colors = {
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  primaryLight: "#818cf8",

  secondary: "#10b981",
  secondaryDark: "#059669",
  secondaryLight: "#34d399",

  success: "#16a34a",
  warning: "#f59e0b",
  error: "#dc2626",

  background: "#ffffff",
  surface: "#f8fafc",
  surfaceDark: "#f1f5f9",

  text: {
    primary: "#111827",
    secondary: "#374151",
    tertiary: "#6b7280",
    inverse: "#ffffff",
  },

  border: "#e5e7eb",
  borderLight: "#f3f4f6",

  shadow: "rgba(0, 0, 0, 0.1)",
};

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
