import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  colors: typeof lightColors | typeof darkColors;
}

const lightColors = {
  // Background colors
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceSecondary: "#f1f5f9",

  // Text colors
  text: "#1f2937",
  textSecondary: "#6b7280",
  textTertiary: "#9ca3af",

  // Primary colors
  primary: "#6366f1",
  primaryLight: "#818cf8",
  primaryDark: "#4f46e5",

  // Status colors
  success: "#16a34a",
  successLight: "#dcfce7",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  error: "#ef4444",
  errorLight: "#fee2e2",
  info: "#0ea5e9",
  infoLight: "#e0f2fe",

  // Border colors
  border: "#e2e8f0",
  borderLight: "#f1f5f9",

  // Shadow colors
  shadow: "#000000",

  // Card colors
  card: "#ffffff",
  cardSecondary: "#f8fafc",

  // Input colors
  input: "#ffffff",
  inputBorder: "#d1d5db",
  inputPlaceholder: "#9ca3af",

  // Button colors
  buttonPrimary: "#6366f1",
  buttonSecondary: "#f3f4f6",
  buttonText: "#ffffff",
  buttonTextSecondary: "#374151",

  // Navigation colors
  tabBar: "#ffffff",
  tabBarInactive: "#9ca3af",
  tabBarActive: "#6366f1",

  // Modal colors
  modal: "#ffffff",
  modalOverlay: "rgba(0, 0, 0, 0.5)",

  // Chart colors
  chartGrid: "#e5e7eb",
  chartText: "#6b7280",
};

const darkColors = {
  // Background colors - Optimized for readability and modern standards
  background: "#0f1419", // Slightly lighter, better for long viewing
  surface: "#1a1f2e", // Keep current - good contrast
  surfaceSecondary: "#2a2f3e", // Keep current - good hierarchy

  // Text colors - Improved hierarchy and accessibility
  text: "#f8fafc", // Slightly softer than pure white
  textSecondary: "#cbd5e1", // Better contrast than current
  textTertiary: "#94a3b8", // More readable tertiary text

  // Primary colors - Keep financial green (excellent choice)
  primary: "#10b981",
  primaryLight: "#34d399",
  primaryDark: "#059669",

  // Status colors - Enhanced for better visibility
  success: "#22c55e", // Slightly brighter for better visibility
  successLight: "#14532d", // Darker background for better contrast
  warning: "#fbbf24", // Brighter amber for better visibility
  warningLight: "#451a03", // Keep current
  error: "#f87171", // Slightly softer red
  errorLight: "#450a0a", // Keep current
  info: "#38bdf8", // Brighter blue for better visibility
  infoLight: "#0c4a6e", // Keep current

  // Border colors - Enhanced for better definition
  border: "#334155", // Slightly lighter for better visibility
  borderLight: "#475569", // Better contrast

  // Shadow colors
  shadow: "#000000",

  // Card colors - Enhanced for better depth perception
  card: "#1e293b", // Slightly lighter for better contrast
  cardSecondary: "#334155", // Better hierarchy

  // Input colors - Improved for better usability
  input: "#1e293b", // Better contrast with text
  inputBorder: "#475569", // More visible borders
  inputPlaceholder: "#64748b", // Better contrast for placeholders

  // Button colors - Enhanced for better interaction
  buttonPrimary: "#10b981", // Keep financial green
  buttonSecondary: "#334155", // Better contrast
  buttonText: "#ffffff", // Keep pure white for buttons
  buttonTextSecondary: "#f1f5f9", // Better contrast

  // Navigation colors - Enhanced for better usability
  tabBar: "#1e293b", // Better contrast
  tabBarInactive: "#64748b", // More visible inactive state
  tabBarActive: "#10b981", // Keep financial green

  // Modal colors - Enhanced for better focus
  modal: "#1e293b", // Better contrast
  modalOverlay: "rgba(0, 0, 0, 0.75)", // Slightly lighter for better visibility

  // Chart colors - Enhanced for better data visualization
  chartGrid: "#334155", // Better grid visibility
  chartText: "#94a3b8", // Better text contrast
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme) {
        setThemeState(savedTheme as ThemeMode);
        setIsDark(savedTheme === "dark");
      } else {
        // Default to dark mode if no theme is saved
        setThemeState("dark");
        setIsDark(true);
        await AsyncStorage.setItem("theme", "dark");
      }
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  };

  const setTheme = async (newTheme: ThemeMode) => {
    try {
      await AsyncStorage.setItem("theme", newTheme);
      setThemeState(newTheme);
      setIsDark(newTheme === "dark");
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  const colors = isDark ? darkColors : lightColors;

  const value: ThemeContextType = {
    theme,
    isDark,
    toggleTheme,
    setTheme,
    colors,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
