import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabParamList } from "../types/finance";
import { useAuth } from "../hooks/useAuth";
import {
  DashboardScreen,
  TransactionsScreen,
  AssetsDebtsScreen,
  SettingsScreen,
  IntroSliderScreen,
  LoginScreen,
  SignUpScreen,
} from "../screens";

const Tab = createBottomTabNavigator<BottomTabParamList>();

type AppState = "intro" | "login" | "signup" | "main";

export const MainApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>("intro");
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        setAppState("main");
      } else if (appState === "main") {
        setAppState("login");
      }
    }
  }, [authLoading, isAuthenticated, appState]);

  const checkFirstLaunch = async () => {
    try {
      const hasSeenIntro = await AsyncStorage.getItem("hasSeenIntro");

      if (!hasSeenIntro) {
        setAppState("intro");
      } else if (!isAuthenticated) {
        setAppState("login");
      } else {
        setAppState("main");
      }
    } catch (error) {
      console.error("Error checking app state:", error);
      setAppState("intro");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntroComplete = async () => {
    try {
      await AsyncStorage.setItem("hasSeenIntro", "true");
      setAppState("login");
    } catch (error) {
      console.error("Error saving intro state:", error);
      setAppState("login");
    }
  };

  const handleLogin = () => {
    // Firebase auth will handle the state change automatically
    setAppState("main");
  };

  const handleSignUp = () => {
    // Firebase auth will handle the state change automatically
    setAppState("main");
  };

  const handleLogout = async () => {
    try {
      const { signOutUser } = await import("../services/auth");
      await signOutUser();
      setAppState("login");
    } catch (error) {
      console.error("Error logging out:", error);
      setAppState("login");
    }
  };

  if (isLoading) {
    return null; // You could add a splash screen here
  }

  if (appState === "intro") {
    return <IntroSliderScreen onDone={handleIntroComplete} />;
  }

  if (appState === "login") {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onSignUp={() => setAppState("signup")}
      />
    );
  }

  if (appState === "signup") {
    return (
      <SignUpScreen
        onSignUp={handleSignUp}
        onBackToLogin={() => setAppState("login")}
      />
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: "#0ea5e9",
          tabBarIcon: ({ color, size }) => {
            const map: Record<
              keyof BottomTabParamList,
              keyof typeof Ionicons.glyphMap
            > = {
              Dashboard: "trending-up",
              Transactions: "swap-vertical",
              "Assets/Debts": "pie-chart",
              Settings: "settings",
            };
            return (
              <Ionicons
                name={map[route.name as keyof BottomTabParamList]}
                color={color}
                size={size}
              />
            );
          },
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Transactions" component={TransactionsScreen} />
        <Tab.Screen name="Assets/Debts" component={AssetsDebtsScreen} />
        <Tab.Screen name="Settings">
          {() => <SettingsScreen onLogout={handleLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
};
