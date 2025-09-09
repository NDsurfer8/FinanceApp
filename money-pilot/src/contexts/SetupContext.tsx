import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../hooks/useAuth";
import { isNewUser } from "../services/userData";
import { ref, get } from "firebase/database";
import { db } from "../services/firebase";

interface SetupProgress {
  bankConnected: boolean;
  budgetSet: boolean;
  aiUsed: boolean;
  goalSet: boolean;
  setupCompleted: boolean;
}

interface SetupContextType {
  setupProgress: SetupProgress;
  updateSetupProgress: (updates: Partial<SetupProgress>) => void;
  isFirstTimeUser: boolean;
  isLoading: boolean;
  completeSetup: () => void;
  resetSetup: () => void;
}

const SetupContext = createContext<SetupContextType | undefined>(undefined);

const getSetupStorageKey = (userId: string) => `user_setup_progress_${userId}`;

export const SetupProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [setupProgress, setSetupProgress] = useState<SetupProgress>({
    bankConnected: false,
    budgetSet: false,
    aiUsed: false,
    goalSet: false,
    setupCompleted: false,
  });

  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load setup progress and check if user is new
  useEffect(() => {
    if (user) {
      loadSetupProgress();
    }
  }, [user]);

  const loadSetupProgress = async () => {
    if (!user) return;

    try {
      // Multiple detection methods for bulletproof setup wizard
      const detectionResults = await Promise.allSettled([
        // Method 1: Check if user is new (created within last 30 minutes)
        isNewUser(user),
        // Method 2: Check if user has any data (transactions, assets, etc.)
        checkUserHasData(user.uid),
        // Method 3: Check if setup was previously completed
        getSetupCompletionStatus(user.uid),
        // Method 4: Check if user has ever seen the setup wizard
        checkSetupWizardSeen(user.uid),
      ]);

      const [
        userIsNewResult,
        hasDataResult,
        setupCompletedResult,
        wizardSeenResult,
      ] = detectionResults;

      const userIsNew =
        userIsNewResult.status === "fulfilled" ? userIsNewResult.value : false;
      const hasData =
        hasDataResult.status === "fulfilled" ? hasDataResult.value : false;
      const setupWasCompleted =
        setupCompletedResult.status === "fulfilled"
          ? setupCompletedResult.value
          : false;
      const wizardWasSeen =
        wizardSeenResult.status === "fulfilled"
          ? wizardSeenResult.value
          : false;

      // Bulletproof logic: Show setup wizard if ANY of these conditions are true:
      // 1. User is new (created within last 30 minutes) AND setup not completed
      // 2. User has no data AND setup not completed (fallback for timing issues)
      // 3. User has never seen the setup wizard (ultimate fallback)
      const shouldShowSetup =
        (userIsNew && !setupWasCompleted) ||
        (!hasData && !setupWasCompleted) ||
        (!wizardWasSeen && !setupWasCompleted);

      // Load saved progress if it exists
      const savedProgress = await AsyncStorage.getItem(
        getSetupStorageKey(user.uid)
      );
      if (savedProgress) {
        try {
          const progress = JSON.parse(savedProgress);
          setSetupProgress(progress);
        } catch (parseError) {
          console.error("Error parsing saved setup progress:", parseError);
        }
      }

      // Debug logging for troubleshooting
      console.log("🔍 Setup Wizard Detection:", {
        userId: user.uid,
        userIsNew,
        hasData,
        setupWasCompleted,
        wizardWasSeen,
        shouldShowSetup,
        detectionResults: detectionResults.map((r) => r.status),
      });

      setIsFirstTimeUser(shouldShowSetup);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading setup progress:", error);
      // Fallback: Show setup wizard if we can't determine status
      setIsFirstTimeUser(true);
      setIsLoading(false);
    }
  };

  const saveSetupProgress = async (progress: SetupProgress) => {
    if (!user) return;
    try {
      await AsyncStorage.setItem(
        getSetupStorageKey(user.uid),
        JSON.stringify(progress)
      );
    } catch (error) {
      // console.log("Error saving setup progress:", error);
    }
  };

  const updateSetupProgress = (updates: Partial<SetupProgress>) => {
    const newProgress = { ...setupProgress, ...updates };
    setSetupProgress(newProgress);
    saveSetupProgress(newProgress);
  };

  const completeSetup = async () => {
    const completedProgress = { ...setupProgress, setupCompleted: true };
    setSetupProgress(completedProgress);
    await saveSetupProgress(completedProgress);

    // Mark that user has seen the setup wizard
    if (user?.uid) {
      await markSetupWizardSeen(user.uid);
    }

    setIsFirstTimeUser(false);
  };

  const resetSetup = () => {
    const resetProgress = {
      bankConnected: false,
      budgetSet: false,
      aiUsed: false,
      goalSet: false,
      setupCompleted: false,
    };
    setSetupProgress(resetProgress);
    saveSetupProgress(resetProgress);
    setIsFirstTimeUser(true);
  };

  const value: SetupContextType = {
    setupProgress,
    updateSetupProgress,
    isFirstTimeUser,
    isLoading,
    completeSetup,
    resetSetup,
  };

  return (
    <SetupContext.Provider value={value}>{children}</SetupContext.Provider>
  );
};

export const useSetup = (): SetupContextType => {
  const context = useContext(SetupContext);
  if (context === undefined) {
    throw new Error("useSetup must be used within a SetupProvider");
  }
  return context;
};

// Helper functions for bulletproof setup wizard detection

// Check if user has any data (transactions, assets, debts, goals, budget settings)
const checkUserHasData = async (userId: string): Promise<boolean> => {
  try {
    const checks = await Promise.allSettled([
      // Check transactions
      get(ref(db, `users/${userId}/transactions`)),
      // Check assets
      get(ref(db, `users/${userId}/assets`)),
      // Check debts
      get(ref(db, `users/${userId}/debts`)),
      // Check goals
      get(ref(db, `users/${userId}/goals`)),
      // Check budget settings
      get(ref(db, `users/${userId}/budgetSettings`)),
      // Check bank connections
      get(ref(db, `users/${userId}/plaidConnections`)),
    ]);

    // User has data if ANY of these collections have data
    return checks.some(
      (result) =>
        result.status === "fulfilled" &&
        result.value.exists() &&
        Object.keys(result.value.val() || {}).length > 0
    );
  } catch (error) {
    console.error("Error checking user data:", error);
    return false; // Assume no data if we can't check
  }
};

// Check if setup was previously completed
const getSetupCompletionStatus = async (userId: string): Promise<boolean> => {
  try {
    const setupKey = getSetupStorageKey(userId);
    const savedProgress = await AsyncStorage.getItem(setupKey);

    if (savedProgress) {
      const progress = JSON.parse(savedProgress);
      return progress.setupCompleted === true;
    }

    return false;
  } catch (error) {
    console.error("Error checking setup completion status:", error);
    return false;
  }
};

// Check if user has ever seen the setup wizard
const checkSetupWizardSeen = async (userId: string): Promise<boolean> => {
  try {
    const wizardSeenKey = `setup_wizard_seen_${userId}`;
    const hasSeen = await AsyncStorage.getItem(wizardSeenKey);
    return hasSeen === "true";
  } catch (error) {
    console.error("Error checking if setup wizard was seen:", error);
    return false;
  }
};

// Mark that user has seen the setup wizard
export const markSetupWizardSeen = async (userId: string): Promise<void> => {
  try {
    const wizardSeenKey = `setup_wizard_seen_${userId}`;
    await AsyncStorage.setItem(wizardSeenKey, "true");
  } catch (error) {
    console.error("Error marking setup wizard as seen:", error);
  }
};
