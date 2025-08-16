import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabParamList } from "../types/finance";
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

  useEffect(() => {
    checkFirstLaunch();
  }, []);

  const checkFirstLaunch = async () => {
    try {
      const hasSeenIntro = await AsyncStorage.getItem("hasSeenIntro");
      const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");

      if (!hasSeenIntro) {
        setAppState("intro");
      } else if (!isLoggedIn) {
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

  const handleLogin = async () => {
    try {
      await AsyncStorage.setItem("isLoggedIn", "true");
      setAppState("main");
    } catch (error) {
      console.error("Error saving login state:", error);
      setAppState("main");
    }
  };

  const handleSignUp = async () => {
    try {
      await AsyncStorage.setItem("isLoggedIn", "true");
      setAppState("main");
    } catch (error) {
      console.error("Error saving signup state:", error);
      setAppState("main");
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("isLoggedIn");
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
        <Tab.Screen
          name="Settings"
          component={() => <SettingsScreen onLogout={handleLogout} />}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
