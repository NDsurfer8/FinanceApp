import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "../hooks/useAuth";
import {
  getUserTransactions,
  getUserAssets,
  getUserDebts,
  getUserGoals,
  getUserBudgetSettings,
  getUserRecurringTransactions,
} from "../services/userData";

interface DataContextType {
  // Data
  transactions: any[];
  assets: any[];
  debts: any[];
  goals: any[];
  budgetSettings: any;
  recurringTransactions: any[];

  // Loading states
  isLoading: boolean;
  lastUpdated: Date | null;

  // Actions
  refreshData: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshAssetsDebts: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  refreshBudgetSettings: () => Promise<void>;
  refreshRecurringTransactions: () => Promise<void>;

  // Cache management
  isDataStale: () => boolean;

  // Data setters for optimistic updates
  setTransactions: (transactions: any[]) => void;
  setBudgetSettings: (settings: any) => void;
  setGoals: (goals: any[]) => void;
  setRecurringTransactions: (transactions: any[]) => void;

  // Optimistic update methods
  updateTransactionsOptimistically: (transactions: any[]) => void;
  updateBudgetSettingsOptimistically: (settings: any) => void;
  updateGoalsOptimistically: (goals: any[]) => void;
  updateAssetsOptimistically: (assets: any[]) => void;
  updateDebtsOptimistically: (debts: any[]) => void;
  updateRecurringTransactionsOptimistically: (transactions: any[]) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

interface DataProviderProps {
  children: React.ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [budgetSettings, setBudgetSettings] = useState<any>(null);
  const [recurringTransactions, setRecurringTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Check if data is stale (older than 30 minutes instead of 5)
  const isDataStale = useCallback(() => {
    if (!lastUpdated) return true;
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    return lastUpdated < thirtyMinutesAgo;
  }, [lastUpdated]);

  // Load all data with aggressive caching
  const loadAllData = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      console.log("Loading all data for user:", user.uid);

      const [
        userTransactions,
        userAssets,
        userDebts,
        userGoals,
        userBudgetSettings,
        userRecurringTransactions,
      ] = await Promise.all([
        getUserTransactions(user.uid),
        getUserAssets(user.uid),
        getUserDebts(user.uid),
        getUserGoals(user.uid),
        getUserBudgetSettings(user.uid),
        getUserRecurringTransactions(user.uid),
      ]);

      setTransactions(userTransactions);
      setAssets(userAssets);
      setDebts(userDebts);
      setGoals(userGoals);
      setBudgetSettings(userBudgetSettings);
      setRecurringTransactions(userRecurringTransactions);
      setLastUpdated(new Date());

      console.log("All data loaded successfully");
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Optimistic data updates - update immediately without waiting for server
  const updateTransactionsOptimistically = useCallback(
    (newTransactions: any[]) => {
      setTransactions(newTransactions);
      setLastUpdated(new Date());
    },
    []
  );

  const updateBudgetSettingsOptimistically = useCallback((newSettings: any) => {
    setBudgetSettings(newSettings);
    setLastUpdated(new Date());
  }, []);

  const updateGoalsOptimistically = useCallback((newGoals: any[]) => {
    setGoals(newGoals);
    setLastUpdated(new Date());
  }, []);

  const updateAssetsOptimistically = useCallback((newAssets: any[]) => {
    setAssets(newAssets);
    setLastUpdated(new Date());
  }, []);

  const updateDebtsOptimistically = useCallback((newDebts: any[]) => {
    setDebts(newDebts);
    setLastUpdated(new Date());
  }, []);

  const updateRecurringTransactionsOptimistically = useCallback(
    (newRecurring: any[]) => {
      setRecurringTransactions(newRecurring);
      setLastUpdated(new Date());
    },
    []
  );

  // Refresh specific data types
  const refreshTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const userTransactions = await getUserTransactions(user.uid);
      setTransactions(userTransactions);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error refreshing transactions:", error);
    }
  }, [user]);

  const refreshAssetsDebts = useCallback(async () => {
    if (!user) return;
    try {
      const [userAssets, userDebts] = await Promise.all([
        getUserAssets(user.uid),
        getUserDebts(user.uid),
      ]);
      setAssets(userAssets);
      setDebts(userDebts);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error refreshing assets/debts:", error);
    }
  }, [user]);

  const refreshGoals = useCallback(async () => {
    if (!user) return;
    try {
      const userGoals = await getUserGoals(user.uid);
      setGoals(userGoals);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error refreshing goals:", error);
    }
  }, [user]);

  const refreshBudgetSettings = useCallback(async () => {
    if (!user) return;
    try {
      const userBudgetSettings = await getUserBudgetSettings(user.uid);
      setBudgetSettings(userBudgetSettings);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error refreshing budget settings:", error);
    }
  }, [user]);

  const refreshRecurringTransactions = useCallback(async () => {
    if (!user) return;
    try {
      const userRecurringTransactions = await getUserRecurringTransactions(
        user.uid
      );
      setRecurringTransactions(userRecurringTransactions);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error refreshing recurring transactions:", error);
    }
  }, [user]);

  const refreshData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      loadAllData();
    } else {
      // Clear data when user logs out
      setTransactions([]);
      setAssets([]);
      setDebts([]);
      setGoals([]);
      setBudgetSettings(null);
      setRecurringTransactions([]);
      setLastUpdated(null);
    }
  }, [user, loadAllData]);

  const value: DataContextType = {
    transactions,
    assets,
    debts,
    goals,
    budgetSettings,
    recurringTransactions,
    isLoading,
    lastUpdated,
    refreshData,
    refreshTransactions,
    refreshAssetsDebts,
    refreshGoals,
    refreshBudgetSettings,
    refreshRecurringTransactions,
    isDataStale,
    setTransactions,
    setBudgetSettings,
    setGoals,
    setRecurringTransactions,
    updateTransactionsOptimistically,
    updateBudgetSettingsOptimistically,
    updateGoalsOptimistically,
    updateAssetsOptimistically,
    updateDebtsOptimistically,
    updateRecurringTransactionsOptimistically,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
