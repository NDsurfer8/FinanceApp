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
      // Check if user is new (created within last 5 minutes)
      const userIsNew = await isNewUser(user);

      // Check if setup was previously completed
      const savedProgress = await AsyncStorage.getItem(
        getSetupStorageKey(user.uid)
      );
      let setupWasCompleted = false;

      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setSetupProgress(progress);
        setupWasCompleted = progress.setupCompleted;
      }

      // Show setup wizard only if:
      // 1. User is new (created within last 5 minutes) AND
      // 2. Setup hasn't been completed yet
      // 3. If setup was completed, never show again regardless of user age
      const shouldShowSetup = userIsNew && !setupWasCompleted;

      setIsFirstTimeUser(shouldShowSetup);
      setIsLoading(false);
    } catch (error) {
      console.log("Error loading setup progress:", error);
      setIsFirstTimeUser(false);
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
      console.log("Error saving setup progress:", error);
    }
  };

  const updateSetupProgress = (updates: Partial<SetupProgress>) => {
    const newProgress = { ...setupProgress, ...updates };
    setSetupProgress(newProgress);
    saveSetupProgress(newProgress);
  };

  const completeSetup = () => {
    const completedProgress = { ...setupProgress, setupCompleted: true };
    setSetupProgress(completedProgress);
    saveSetupProgress(completedProgress);
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
