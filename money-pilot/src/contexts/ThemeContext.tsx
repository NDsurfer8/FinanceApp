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
  // Background colors
  background: "#0f172a",
  surface: "#1e293b",
  surfaceSecondary: "#334155",

  // Text colors
  text: "#f8fafc",
  textSecondary: "#cbd5e1",
  textTertiary: "#94a3b8",

  // Primary colors
  primary: "#818cf8",
  primaryLight: "#a5b4fc",
  primaryDark: "#6366f1",

  // Status colors
  success: "#22c55e",
  successLight: "#14532d",
  warning: "#fbbf24",
  warningLight: "#451a03",
  error: "#f87171",
  errorLight: "#450a0a",
  info: "#38bdf8",
  infoLight: "#0c4a6e",

  // Border colors
  border: "#334155",
  borderLight: "#475569",

  // Shadow colors
  shadow: "#000000",

  // Card colors
  card: "#1e293b",
  cardSecondary: "#334155",

  // Input colors
  input: "#1e293b",
  inputBorder: "#475569",
  inputPlaceholder: "#64748b",

  // Button colors
  buttonPrimary: "#818cf8",
  buttonSecondary: "#334155",
  buttonText: "#ffffff",
  buttonTextSecondary: "#f1f5f9",

  // Navigation colors
  tabBar: "#1e293b",
  tabBarInactive: "#64748b",
  tabBarActive: "#818cf8",

  // Modal colors
  modal: "#1e293b",
  modalOverlay: "rgba(0, 0, 0, 0.7)",

  // Chart colors
  chartGrid: "#334155",
  chartText: "#94a3b8",
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
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme) {
        setThemeState(savedTheme as ThemeMode);
        setIsDark(savedTheme === "dark");
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
