import React, { useState, useEffect } from "react";
import { AppState, AppStateStatus, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import * as Font from "expo-font";
import { fontsToLoad } from "../config/fonts";
import { BottomTabParamList } from "../types/finance";
import { RootStackParamList } from "../types/navigation";
import { useAuth } from "../hooks/useAuth";
import { notificationService } from "../services/notifications";
import { billReminderService } from "../services/billReminders";
import { UserProvider } from "../context/UserContext";
import { DataProvider } from "../contexts/DataContext";
import { SubscriptionProvider } from "../contexts/SubscriptionContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { ChatbotProvider } from "../contexts/ChatbotContext";
import { FriendlyModeProvider } from "../contexts/FriendlyModeContext";
import { TourProvider } from "../contexts/TourContext";
import { DataPreloader } from "./DataPreloader";
import { SplashScreen } from "./SplashScreen";
import revenueCatService from "../services/revenueCat";
import { plaidService } from "../services/plaid";
import { useBiometricAuth } from "../hooks/useBiometricAuth";
import { BiometricAuthOverlay } from "./BiometricAuthOverlay";
import { FloatingAIChatbot } from "./FloatingAIChatbot";
import { PlaidUpdateMode } from "./PlaidUpdateMode";
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
  AddGoalScreen,
  FinancialRiskScreen,
  SharedFinanceScreen,
  SharedGroupDetailFixed,
  GroupDataSharingScreen,
  EditProfileScreen,
  NotificationSettingsScreen,
  PrivacySecurityScreen,
  AboutScreen,
  HelpSupportScreen,
  ForgotPasswordScreen,
  SubscriptionScreen,
  BankTransactionsScreen,
  AIFinancialAdvisorScreen,
  FinancialPlansScreen,
  BudgetCategoriesScreen,
} from "../screens";
import { AIUsageAdminScreen } from "../screens/AIUsageAdminScreen";
import { PrivacyPolicyScreen } from "../screens/PrivacyPolicyScreen";
import { TermsOfServiceScreen } from "../screens/TermsOfServiceScreen";
import GroupMembersScreen from "../screens/GroupMembersScreen";

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

// Budget Stack Navigator
const BudgetStack = createStackNavigator();
const BudgetStackNavigator = () => (
  <BudgetStack.Navigator screenOptions={{ headerShown: false }}>
    <BudgetStack.Screen name="BudgetMain" component={BudgetScreen} />
    <BudgetStack.Screen
      name="BudgetCategories"
      component={BudgetCategoriesScreen}
    />
  </BudgetStack.Navigator>
);

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
  const [justLoggedIn, setJustLoggedIn] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Plaid Update Mode state
  const [showPlaidUpdateMode, setShowPlaidUpdateMode] = useState(false);
  const [plaidUpdateType, setPlaidUpdateType] = useState<
    "reauth" | "new_accounts" | "expiring" | "disconnect"
  >("reauth");
  const [plaidNewAccounts, setPlaidNewAccounts] = useState<any[]>([]);
  const [plaidUpdateChecked, setPlaidUpdateChecked] = useState(false);

  useEffect(() => {
    // Set app start time for smart refresh detection
    (global as any).appStartTime = Date.now();
    initializeApp();
  }, []);

  // Fallback timeout to prevent getting stuck
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 10000); // 10 seconds max

    return () => clearTimeout(fallbackTimeout);
  }, [isLoading]);

  // Additional timeout to prevent staying on splash screen indefinitely
  useEffect(() => {
    const splashTimeout = setTimeout(() => {
      if (appState === "splash" && !isLoading && !authLoading) {
        if (isAuthenticated) {
          setAppState("main");
        } else {
          setAppState("login");
        }
      }
    }, 15000); // 15 seconds max on splash screen

    return () => clearTimeout(splashTimeout);
  }, [appState, isLoading, authLoading, isAuthenticated]);

  const checkPlaidUpdateMode = async () => {
    try {
      if (!user?.uid || plaidUpdateChecked) return;

      const updateStatus = await plaidService.checkUpdateModeStatus();

      if (updateStatus.needsReauth) {
        setPlaidUpdateType("reauth");
        setShowPlaidUpdateMode(true);
      } else if (updateStatus.hasNewAccounts) {
        setPlaidUpdateType("new_accounts");
        setPlaidNewAccounts(updateStatus.lastWebhook?.newAccounts || []);
        setShowPlaidUpdateMode(true);
      } else if (updateStatus.credentialsExpiring) {
        setPlaidUpdateType("expiring");
        setShowPlaidUpdateMode(true);
      } else if (updateStatus.isDisconnecting) {
        setPlaidUpdateType("disconnect");
        setShowPlaidUpdateMode(true);
      }

      setPlaidUpdateChecked(true);
    } catch (error) {
      console.error("Error checking Plaid update mode:", error);
    }
  };

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
        // Auth loading timeout, proceeding anyway
      }

      setLoadingMessage("Loading app settings...");
      await checkFirstLaunch();

      setLoadingMessage("Setting up notifications...");
      await setupNotifications();

      setLoadingMessage("Checking authentication...");
      try {
        await revenueCatService.initialize();
      } catch (error) {
        console.error("Failed to initialize RevenueCat in MainApp:", error);
      }

      // Set up user for services (actual data loading will be handled by DataPreloader)
      if (user?.uid) {
        setLoadingMessage("Setting up user services...");
        try {
          await revenueCatService.setUser(user.uid);
          plaidService.setUserId(user.uid);

          // Check for Plaid update mode status
          setLoadingMessage("Checking bank connection status...");
          await checkPlaidUpdateMode();
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

  // Check for Plaid updates when user changes (with debouncing)
  useEffect(() => {
    if (user?.uid && isAuthenticated && !plaidUpdateChecked) {
      // Add a small delay to prevent rapid calls
      const timeoutId = setTimeout(() => {
        checkPlaidUpdateMode();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [user, isAuthenticated, plaidUpdateChecked]);

  const setupBillReminders = async () => {
    if (!user) return;

    try {
      await billReminderService.scheduleAllBillReminders(user.uid);
    } catch (error) {
      console.error("Error setting up bill reminders:", error);
    }
  };

  const setupNotifications = async () => {
    // Load persisted badge count first
    try {
      await notificationService.loadPersistedBadgeCount();
    } catch (error) {
      console.error("Error loading persisted badge count:", error);
    }

    // Clear badge when app opens
    try {
      await notificationService.clearBadge();
    } catch (error) {
      console.error("Error clearing badge on app open:", error);
    }

    // Setup notification listeners
    const cleanup = notificationService.setupNotificationListeners(
      (notification) => {
        // Notification received
      },
      (response) => {
        // Notification response
        const data = response.notification.request.content.data;
        // You can add navigation logic here based on notification type
      }
    );

    return cleanup;
  };

  // Handle app state changes for biometric authentication
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        if (
          isBiometricEnabled &&
          isAutoLockEnabled &&
          wasPreviouslyAuthenticated
        ) {
          setBiometricAuthenticated(false);
        }
      } else if (nextAppState === "active") {
        // When app becomes active, check if biometric auth is required
        // Add a longer delay to prevent immediate trigger after fresh login
        setTimeout(() => {
          if (
            isBiometricEnabled &&
            isAutoLockEnabled &&
            wasPreviouslyAuthenticated &&
            !isBiometricAuthenticated &&
            !justLoggedIn && // Don't show biometric overlay if user just logged in
            !showBiometricOverlay // Prevent multiple overlays
          ) {
            setShowBiometricOverlay(true);
          }
        }, 2000); // 2 second delay to prevent double verification
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
    justLoggedIn,
    setBiometricAuthenticated,
    showBiometricOverlay,
  ]);

  // Handle app state changes based on authentication
  useEffect(() => {
    if (!isLoading && !authLoading && !isTransitioning) {
      // Add a small delay to prevent rapid state changes that might cause network errors
      const timeoutId = setTimeout(() => {
        if (isAuthenticated && appState !== "main") {
          // Prevent rapid state changes by using transition protection
          setIsTransitioning(true);
          setWasPreviouslyAuthenticated(true);
          setJustLoggedIn(true);
          setAppState("main");

          // Clear the justLoggedIn flag after a longer delay
          setTimeout(() => {
            setJustLoggedIn(false);
            setIsTransitioning(false);
          }, 3000); // 3 seconds to prevent immediate biometric prompt
        } else if (isAuthenticated && appState === "main") {
          // Ensure wasPreviouslyAuthenticated is true when user is in main app
          if (!wasPreviouslyAuthenticated) {
            setWasPreviouslyAuthenticated(true);
          }
        } else if (!isAuthenticated && appState === "main") {
          setIsTransitioning(true);
          setWasPreviouslyAuthenticated(false);
          setAppState("login");
          setTimeout(() => setIsTransitioning(false), 1000);
        } else if (!isAuthenticated && appState === "splash") {
          setIsTransitioning(true);
          setAppState("login");
          setTimeout(() => setIsTransitioning(false), 1000);
        } else if (isAuthenticated && appState === "splash") {
          setIsTransitioning(true);
          setWasPreviouslyAuthenticated(true);
          setAppState("main");
          setTimeout(() => setIsTransitioning(false), 1000);
        }
      }, 500); // 500ms delay to prevent rapid state changes

      return () => clearTimeout(timeoutId);
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
    wasPreviouslyAuthenticated,
    isTransitioning,
  ]);

  const checkFirstLaunch = async () => {
    try {
      const hasSeenIntro = await AsyncStorage.getItem("hasSeenIntro");

      if (!hasSeenIntro) {
        setAppState("intro");
      }
      // Don't set app state here - let the auth state effect handle it
      // This prevents jumping to login screen during refresh
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
          <SubscriptionProvider>
            <DataProvider>
              <ChatbotProvider>
                <FriendlyModeProvider>
                  <TourProvider>
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
                            name="AddGoal"
                            component={AddGoalScreen}
                          />

                          <Stack.Screen
                            name="FinancialRisk"
                            component={FinancialRiskScreen}
                          />
                          <Stack.Screen
                            name="SharedFinance"
                            component={SharedFinanceScreen}
                          />

                          <Stack.Screen
                            name="SharedGroupDetailFixed"
                            component={SharedGroupDetailFixed}
                          />

                          <Stack.Screen
                            name="GroupDataSharing"
                            component={GroupDataSharingScreen}
                            options={{ headerShown: false }}
                          />
                          <Stack.Screen
                            name="GroupMembers"
                            component={GroupMembersScreen}
                            options={{ headerShown: false }}
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
                            name="AIUsageAdmin"
                            component={AIUsageAdminScreen}
                          />
                          <Stack.Screen
                            name="HelpSupport"
                            component={HelpSupportScreen}
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
                          <Stack.Screen
                            name="PrivacyPolicy"
                            component={PrivacyPolicyScreen}
                          />
                          <Stack.Screen
                            name="TermsOfService"
                            component={TermsOfServiceScreen}
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
                      onCancel={async () => {
                        try {
                          // Handle Plaid logout cleanup
                          await plaidService.handleLogout();

                          const { signOutUser } = await import(
                            "../services/auth"
                          );
                          await signOutUser();

                          setShowBiometricOverlay(false);
                          setBiometricAuthenticated(false);
                          setAppState("login");
                        } catch (error) {
                          console.error("Error signing out on cancel:", error);
                          // Fallback to login screen even if signout fails
                          setShowBiometricOverlay(false);
                          setBiometricAuthenticated(false);
                          setAppState("login");
                        }
                      }}
                      onUsePasscode={() => {
                        // Allow access with device passcode fallback
                        setShowBiometricOverlay(false);
                        setBiometricAuthenticated(true);
                        setAppState("main");
                      }}
                      onSignOut={async () => {
                        try {
                          // Handle Plaid logout cleanup
                          await plaidService.handleLogout();

                          const { signOutUser } = await import(
                            "../services/auth"
                          );
                          await signOutUser();

                          setShowBiometricOverlay(false);
                          setBiometricAuthenticated(false);
                          setAppState("login");
                        } catch (error) {
                          console.error("Error signing out:", error);
                          // Fallback to login screen even if signout fails
                          setShowBiometricOverlay(false);
                          setBiometricAuthenticated(false);
                          setAppState("login");
                        }
                      }}
                    />

                    {/* Plaid Update Mode Modal */}
                    <PlaidUpdateMode
                      visible={showPlaidUpdateMode}
                      onClose={() => setShowPlaidUpdateMode(false)}
                      updateType={plaidUpdateType}
                      newAccounts={plaidNewAccounts}
                    />
                  </TourProvider>
                </FriendlyModeProvider>
              </ChatbotProvider>
            </DataProvider>
          </SubscriptionProvider>
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
      // Handle Plaid logout cleanup
      await plaidService.handleLogout();

      const { signOutUser } = await import("../services/auth");
      await signOutUser();
      // The auth state change will be handled by the useEffect in MainApp
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          lazy: false, // Pre-mount all tabs to prevent jumpy behavior
          animation: "fade",
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
          },
          // Add theme-aware background to prevent white flash
          cardStyle: {
            backgroundColor: colors.background,
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
        detachInactiveScreens={false} // Keep screens attached to prevent layout shifts
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Budget" component={BudgetStackNavigator} />
        <Tab.Screen name="Goals" component={GoalTrackingScreen} />
        <Tab.Screen name="Assets/Debts" component={AssetsDebtsScreen} />
        <Tab.Screen name="Settings">
          {({ navigation }) => (
            <SettingsScreen onLogout={handleLogout} navigation={navigation} />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
};
