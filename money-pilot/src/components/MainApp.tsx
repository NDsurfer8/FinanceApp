import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabParamList } from "../types/finance";
import { useAuth } from "../hooks/useAuth";
import { notificationService } from "../services/notifications";
import { UserProvider } from "../context/UserContext";
import {
  DashboardScreen,
  BudgetScreen,
  AssetsDebtsScreen,
  SettingsScreen,
  IntroSliderScreen,
  LoginScreen,
  SignUpScreen,
  AddTransactionScreen,
  AddAssetDebtScreen,
  GoalTrackingScreen,
  BalanceSheetScreen,
  SharedFinanceScreen,
  EditProfileScreen,
  NotificationSettingsScreen,
  PrivacySecurityScreen,
  AboutScreen,
  HelpSupportScreen,
  ForgotPasswordScreen,
  RecurringTransactionsScreen,
} from "../screens";

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createStackNavigator();

type AppState = "intro" | "login" | "signup" | "forgot-password" | "main";

export const MainApp: React.FC = () => {
  const [appState, setAppState] = useState<AppState>("intro");
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    checkFirstLaunch();
    setupNotifications();
  }, []);

  const setupNotifications = () => {
    // Setup notification listeners
    const cleanup = notificationService.setupNotificationListeners(
      (notification) => {
        console.log("Notification received:", notification);
      },
      (response) => {
        console.log("Notification response:", response);
        // Handle navigation based on notification type
        const data = response.notification.request.content.data;
        // You can add navigation logic here based on notification type
      }
    );

    return cleanup;
  };

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
        onForgotPassword={() => setAppState("forgot-password")}
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

  if (appState === "forgot-password") {
    return <ForgotPasswordScreen onBack={() => setAppState("login")} />;
  }

  const MainStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <Stack.Screen name="AddAssetDebt" component={AddAssetDebtScreen} />
      <Stack.Screen name="BalanceSheet" component={BalanceSheetScreen} />
      <Stack.Screen name="SharedFinance" component={SharedFinanceScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
      />
      <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen
        name="RecurringTransactions"
        component={RecurringTransactionsScreen}
      />
    </Stack.Navigator>
  );

  const MainTabs = () => (
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
            Budget: "wallet",
            Goals: "flag",
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
      <Tab.Screen name="Budget" component={BudgetScreen} />
      <Tab.Screen name="Goals" component={GoalTrackingScreen} />
      <Tab.Screen name="Assets/Debts" component={AssetsDebtsScreen} />
      <Tab.Screen name="Settings">
        {({ navigation }) => (
          <SettingsScreen onLogout={handleLogout} navigation={navigation} />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );

  return (
    <UserProvider>
      <NavigationContainer>
        <MainStack />
      </NavigationContainer>
    </UserProvider>
  );
};
