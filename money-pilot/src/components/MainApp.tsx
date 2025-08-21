import React, { useState, useEffect } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import * as Font from "expo-font";
import { fontsToLoad } from "../config/fonts";
import { BottomTabParamList } from "../types/finance";
import { useAuth } from "../hooks/useAuth";
import { notificationService } from "../services/notifications";
import { billReminderService } from "../services/billReminders";
import { UserProvider } from "../context/UserContext";
import { DataProvider } from "../contexts/DataContext";
import { SubscriptionProvider } from "../contexts/SubscriptionContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { DataPreloader } from "./DataPreloader";
import { SplashScreen } from "./SplashScreen";
import revenueCatService from "../services/revenueCat";
import { plaidService } from "../services/plaid";
import { useBiometricAuth } from "../hooks/useBiometricAuth";
import { BiometricAuthOverlay } from "./BiometricAuthOverlay";
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
  SubscriptionScreen,
  BankTransactionsScreen,
  AIFinancialAdvisorScreen,
  FinancialPlansScreen,
} from "../screens";

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createStackNavigator();

type AppScreenState =
  | "splash"
  | "intro"
  | "login"
  | "signup"
  | "forgot-password"
  | "main";

export const MainApp: React.FC = () => {
  const [appState, setAppState] = useState<AppScreenState>("splash");
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const {
    isBiometricEnabled,
    isAutoLockEnabled,
    isBiometricAuthenticated,
    setBiometricAuthenticated,
  } = useBiometricAuth();

  const [showBiometricOverlay, setShowBiometricOverlay] = useState(false);
  const [wasPreviouslyAuthenticated, setWasPreviouslyAuthenticated] =
    useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  // Fallback timeout to prevent getting stuck
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (isLoading) {
        console.log("Fallback timeout reached, forcing app to proceed");
        setIsLoading(false);
      }
    }, 10000); // 10 seconds max

    return () => clearTimeout(fallbackTimeout);
  }, [isLoading]);

  const initializeApp = async () => {
    try {
      setLoadingMessage("Loading fonts...");
      await Font.loadAsync(fontsToLoad);

      setLoadingMessage("Checking authentication...");

      // Wait for auth to finish loading with timeout
      let authWaitTime = 0;
      const maxWaitTime = 5000; // 5 seconds max

      while (authLoading && authWaitTime < maxWaitTime) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        authWaitTime += 100;
      }

      if (authWaitTime >= maxWaitTime) {
        console.log("Auth loading timeout, proceeding anyway");
      }

      setLoadingMessage("Loading app settings...");
      await checkFirstLaunch();

      setLoadingMessage("Setting up notifications...");
      setupNotifications();

      setLoadingMessage("Initializing RevenueCat...");
      try {
        await revenueCatService.initialize();
        console.log("RevenueCat initialized successfully in MainApp");
      } catch (error) {
        console.error("Failed to initialize RevenueCat in MainApp:", error);
      }

      // Set up user for services (actual data loading will be handled by DataPreloader)
      if (user?.uid) {
        setLoadingMessage("Setting up user services...");
        try {
          await revenueCatService.setUser(user.uid);
          plaidService.setUserId(user.uid);
          console.log("User services configured in MainApp");
        } catch (error) {
          console.error("Failed to configure user services in MainApp:", error);
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error initializing app:", error);
      setIsLoading(false);
    }
  };

  // Setup bill reminders when user is authenticated
  useEffect(() => {
    if (user && isAuthenticated) {
      setupBillReminders();
    }
  }, [user, isAuthenticated]);

  const setupBillReminders = async () => {
    if (!user) return;

    try {
      console.log("Setting up bill reminders for user:", user.uid);
      await billReminderService.scheduleAllBillReminders(user.uid);
    } catch (error) {
      console.error("Error setting up bill reminders:", error);
    }
  };

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

  // Handle app state changes for biometric authentication
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log("App state changed to:", nextAppState);

      if (nextAppState === "background" || nextAppState === "inactive") {
        if (
          isBiometricEnabled &&
          isAutoLockEnabled &&
          wasPreviouslyAuthenticated
        ) {
          console.log(
            "App going to background, resetting biometric authentication"
          );
          setBiometricAuthenticated(false);
        }
      } else if (nextAppState === "active") {
        // When app becomes active, check if biometric auth is required
        if (
          isBiometricEnabled &&
          isAutoLockEnabled &&
          wasPreviouslyAuthenticated &&
          !isBiometricAuthenticated
        ) {
          setShowBiometricOverlay(true);
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [
    isBiometricEnabled,
    isAutoLockEnabled,
    wasPreviouslyAuthenticated,
    isBiometricAuthenticated,
    setBiometricAuthenticated,
  ]);

  // Handle app state changes based on authentication
  useEffect(() => {
    console.log("Auth state changed:", {
      isLoading,
      authLoading,
      isAuthenticated,
      appState,
      user: user?.uid,
      isBiometricEnabled,
      isAutoLockEnabled,
      isBiometricAuthenticated,
    });

    if (!isLoading && !authLoading) {
      if (isAuthenticated && appState !== "main") {
        // User is authenticated, go to main app
        console.log("User is authenticated, going to main app");
        setWasPreviouslyAuthenticated(true);
        setAppState("main");
      } else if (!isAuthenticated && appState === "main") {
        console.log("User is not authenticated, going to login");
        setAppState("login");
      } else if (!isAuthenticated && appState === "splash") {
        console.log("User is not authenticated, going to login from splash");
        setAppState("login");
      }
    }
  }, [
    isLoading,
    authLoading,
    isAuthenticated,
    appState,
    user,
    isBiometricEnabled,
    isAutoLockEnabled,
    isBiometricAuthenticated,
  ]);

  const checkFirstLaunch = async () => {
    try {
      const hasSeenIntro = await AsyncStorage.getItem("hasSeenIntro");

      if (!hasSeenIntro) {
        console.log("First launch detected, showing intro");
        setAppState("intro");
      } else if (!isAuthenticated) {
        console.log("User not authenticated, showing login");
        setAppState("login");
      } else {
        console.log("User authenticated, going to main app");
        setAppState("main");
      }
    } catch (error) {
      console.error("Error checking app state:", error);
      setAppState("intro");
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

  // Show splash screen while loading
  if (isLoading || authLoading) {
    return <SplashScreen message={loadingMessage} />;
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

  if (appState === "main") {
    return (
      <ThemeProvider>
        <UserProvider>
          <DataProvider>
            <SubscriptionProvider>
              <DataPreloader>
                <NavigationContainer>
                  <Stack.Navigator
                    screenOptions={{
                      headerShown: false,
                    }}
                  >
                    <Stack.Screen
                      name="MainTabs"
                      component={MainTabNavigator}
                    />
                    <Stack.Screen
                      name="AddTransaction"
                      component={AddTransactionScreen}
                    />
                    <Stack.Screen
                      name="AddAssetDebt"
                      component={AddAssetDebtScreen}
                    />
                    <Stack.Screen
                      name="BalanceSheet"
                      component={BalanceSheetScreen}
                    />
                    <Stack.Screen
                      name="SharedFinance"
                      component={SharedFinanceScreen}
                    />
                    <Stack.Screen
                      name="EditProfile"
                      component={EditProfileScreen}
                    />
                    <Stack.Screen
                      name="NotificationSettings"
                      component={NotificationSettingsScreen}
                    />
                    <Stack.Screen
                      name="PrivacySecurity"
                      component={PrivacySecurityScreen}
                    />
                    <Stack.Screen name="About" component={AboutScreen} />
                    <Stack.Screen
                      name="HelpSupport"
                      component={HelpSupportScreen}
                    />
                    <Stack.Screen
                      name="RecurringTransactions"
                      component={RecurringTransactionsScreen}
                    />
                    <Stack.Screen
                      name="Subscription"
                      component={SubscriptionScreen}
                    />
                    <Stack.Screen
                      name="BankTransactions"
                      component={BankTransactionsScreen}
                    />
                    <Stack.Screen
                      name="AIFinancialAdvisor"
                      component={AIFinancialAdvisorScreen}
                    />
                    <Stack.Screen
                      name="FinancialPlans"
                      component={FinancialPlansScreen}
                    />
                  </Stack.Navigator>
                </NavigationContainer>
              </DataPreloader>

              {/* Biometric Authentication Overlay */}
              <BiometricAuthOverlay
                visible={showBiometricOverlay}
                onSuccess={() => {
                  setShowBiometricOverlay(false);
                  setBiometricAuthenticated(true);
                  setAppState("main");
                }}
                onCancel={() => {
                  setShowBiometricOverlay(false);
                  setBiometricAuthenticated(false);
                  setAppState("login");
                }}
              />
            </SubscriptionProvider>
          </DataProvider>
        </UserProvider>
      </ThemeProvider>
    );
  }

  // If we reach here, something went wrong - show splash screen with better message
  return <SplashScreen message="Preparing your financial dashboard..." />;
};

const MainTabNavigator = () => {
  const { colors } = useTheme();

  const handleLogout = async () => {
    try {
      const { signOutUser } = await import("../services/auth");
      await signOutUser();
      // The auth state change will be handled by the useEffect in MainApp
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
        },
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
};
