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
  // Background colors - Deep financial blue
  background: "#0a0e1a",
  surface: "#1a1f2e",
  surfaceSecondary: "#2a2f3e",

  // Text colors - Professional whites and grays
  text: "#ffffff",
  textSecondary: "#b8c5d6",
  textTertiary: "#8a9bb3",

  // Primary colors - Financial green
  primary: "#10b981",
  primaryLight: "#34d399",
  primaryDark: "#059669",

  // Status colors - Financial indicators
  success: "#10b981",
  successLight: "#064e3b",
  warning: "#f59e0b",
  warningLight: "#451a03",
  error: "#ef4444",
  errorLight: "#450a0a",
  info: "#3b82f6",
  infoLight: "#1e3a8a",

  // Border colors - Subtle financial grays
  border: "#374151",
  borderLight: "#4b5563",

  // Shadow colors
  shadow: "#000000",

  // Card colors - Professional card backgrounds
  card: "#1a1f2e",
  cardSecondary: "#2a2f3e",

  // Input colors - Clean input styling
  input: "#1a1f2e",
  inputBorder: "#374151",
  inputPlaceholder: "#6b7280",

  // Button colors - Financial green buttons
  buttonPrimary: "#10b981",
  buttonSecondary: "#374151",
  buttonText: "#ffffff",
  buttonTextSecondary: "#f9fafb",

  // Navigation colors - Professional nav
  tabBar: "#1a1f2e",
  tabBarInactive: "#6b7280",
  tabBarActive: "#10b981",

  // Modal colors - Professional modals
  modal: "#1a1f2e",
  modalOverlay: "rgba(0, 0, 0, 0.8)",

  // Chart colors - Financial chart styling
  chartGrid: "#374151",
  chartText: "#8a9bb3",
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
