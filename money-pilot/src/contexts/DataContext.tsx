import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "./SubscriptionContext";
import {
  getUserTransactions,
  getUserAssets,
  getUserDebts,
  getUserGoals,
  getUserBudgetSettings,
  getUserRecurringTransactions,
} from "../services/userData";
import { plaidService } from "../services/plaid";
import AsyncStorage from "@react-native-async-storage/async-storage";
import revenueCatService from "../services/revenueCat";

interface DataContextType {
  // Data
  transactions: any[];
  assets: any[];
  debts: any[];
  goals: any[];
  budgetSettings: any;
  recurringTransactions: any[];

  // Bank Data
  bankTransactions: any[];
  bankRecurringSuggestions: any[];
  bankAccounts: any[];
  selectedBankAccount: string | null;
  isBankConnected: boolean;
  bankDataLastUpdated: Date | null;
  isBankDataLoading: boolean;
  bankConnectionError: string | null;

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
  refreshBankData: (forceRefresh?: boolean) => Promise<void>;

  // Cache management
  isDataStale: () => boolean;
  isBankDataStale: () => boolean;

  // Data setters for optimistic updates
  setTransactions: (transactions: any[]) => void;
  setBudgetSettings: (settings: any) => void;
  setGoals: (goals: any[]) => void;
  setRecurringTransactions: (transactions: any[]) => void;
  setBankAccounts: (accounts: any[]) => void;
  setSelectedBankAccount: (accountId: string | null) => void;
  setBankConnectionError: (error: string | null) => void;

  // Bank disconnection
  disconnectBankAndClearData: () => Promise<void>;

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
  const { subscriptionStatus } = useSubscription();

  // State for user data
  const [transactions, setTransactions] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [budgetSettings, setBudgetSettings] = useState<any>(null);
  const [recurringTransactions, setRecurringTransactions] = useState<any[]>([]);

  // State for bank data
  const [bankTransactions, setBankTransactions] = useState<any[]>([]);
  const [bankRecurringSuggestions, setBankRecurringSuggestions] = useState<
    any[]
  >([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string | null>(
    null
  );
  const [isBankConnected, setIsBankConnected] = useState<boolean>(false);
  const [bankDataLastUpdated, setBankDataLastUpdated] = useState<Date | null>(
    null
  );
  const [isBankDataLoading, setIsBankDataLoading] = useState<boolean>(false);
  const [bankConnectionError, setBankConnectionError] = useState<string | null>(
    null
  );

  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Refs for tracking staleness
  const lastDataRefresh = useRef<Date | null>(null);
  const lastBankDataRefresh = useRef<Date | null>(null);
  const isBankDataLoadingRef = useRef(false);

  // Bank Data Cache Keys
  const BANK_DATA_CACHE_KEY = `bank_data_${user?.uid || "anonymous"}`;
  const BANK_DATA_TIMESTAMP_KEY = `bank_data_timestamp_${
    user?.uid || "anonymous"
  }`;
  const LAST_TRANSACTION_DATE_KEY = `last_transaction_date_${
    user?.uid || "anonymous"
  }`;
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for recurring analysis
  const TRANSACTION_UPDATE_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours for new transactions

  // Comprehensive bank disconnection and data clearing
  const disconnectBankAndClearData = useCallback(async () => {
    try {
      // 1. Disconnect from Plaid service
      await plaidService.disconnectBank();

      // 2. Clear all bank data from state immediately
      setBankTransactions([]);
      setBankRecurringSuggestions([]);
      setBankAccounts([]);
      setSelectedBankAccount(null);
      setIsBankConnected(false);
      setBankDataLastUpdated(null);
      setBankConnectionError(null);

      // 3. Clear AsyncStorage cache
      const keysToClear = [
        "bankTransactions",
        "bankRecurringSuggestions",
        "bankAccounts",
        "bankDataLastUpdated",
        "isBankConnected",
        "plaid_access_token",
        "plaid_item_id",
        "selectedBankAccount",
      ];

      for (const key of keysToClear) {
        await AsyncStorage.removeItem(key);
      }

      // 4. Clear Plaid service cache
      (plaidService as any).requestCache?.clear();
    } catch (error) {
      console.error(
        "DataContext: Error disconnecting bank and clearing data:",
        error
      );
      throw error;
    }
  }, []);

  // Calculate frequency for recurring transactions
  const calculateFrequency = useCallback((transactions: any[]) => {
    if (transactions.length < 2) return null;

    const dates = transactions?.map((t) => new Date(t.date).getTime());
    const intervals = [];

    for (let i = 1; i < dates.length; i++) {
      intervals.push(dates[i] - dates[i - 1]);
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const days = avgInterval / (1000 * 60 * 60 * 24);

    // Determine frequency based on average interval
    if (days >= 25 && days <= 35) return "monthly";
    if (days >= 13 && days <= 15) return "biweekly";
    if (days >= 6 && days <= 8) return "weekly";
    if (days >= 85 && days <= 95) return "quarterly";
    if (days >= 360 && days <= 370) return "yearly";

    return null;
  }, []);

  // Analyze recurring patterns
  const analyzeRecurringPatterns = useCallback(
    (transactions: any[]) => {
      const patterns: { [key: string]: any[] } = {};
      const suggestions: any[] = [];

      // Group transactions by merchant name and amount
      transactions.forEach((transaction) => {
        const key = `${transaction.name}_${Math.abs(transaction.amount)}`;
        if (!patterns[key]) {
          patterns[key] = [];
        }
        patterns[key].push(transaction);
      });

      // Find transactions that appear multiple times (potential recurring)
      Object.entries(patterns).forEach(([key, transactions]) => {
        if (transactions.length >= 2) {
          const firstTransaction = transactions[0];
          const sortedTransactions = transactions.sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          // Calculate frequency
          const frequency = calculateFrequency(sortedTransactions);

          if (frequency) {
            suggestions.push({
              name: firstTransaction.name,
              amount: Math.abs(firstTransaction.amount),
              category: firstTransaction.category?.[0] || "Other",
              frequency,
              lastOccurrence: new Date(
                sortedTransactions[sortedTransactions.length - 1].date
              ),
              occurrences: transactions.length,
              type: Number(firstTransaction.amount) < 0 ? "income" : "expense",
            });
          }
        }
      });
      return suggestions.sort((a, b) => b.occurrences - a.occurrences);
    },
    [calculateFrequency]
  );

  // Load all user data
  const loadAllData = useCallback(async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
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
      lastDataRefresh.current = new Date();
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid]);

  // Load cached bank data with sophisticated caching
  const loadCachedBankData = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem(BANK_DATA_CACHE_KEY);
      const cachedTimestamp = await AsyncStorage.getItem(
        BANK_DATA_TIMESTAMP_KEY
      );

      if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp);
        const now = Date.now();

        // Check if cache is still valid (less than 24 hours old for recurring analysis)
        if (now - timestamp < CACHE_DURATION) {
          const parsedData = JSON.parse(cachedData);
          setBankTransactions(parsedData.transactions);
          setBankRecurringSuggestions(parsedData.suggestions);
          setBankAccounts(parsedData.accounts || []);
          setBankDataLastUpdated(new Date(timestamp));

          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Failed to load cached bank data:", error);
      return false;
    }
  }, []);

  // Save bank data to cache with sophisticated caching
  const saveBankDataToCache = useCallback(
    async (transactions: any[], suggestions: any[], accounts: any[]) => {
      try {
        const cacheData = {
          transactions,
          suggestions,
          accounts,
          timestamp: Date.now(),
        };

        await AsyncStorage.setItem(
          BANK_DATA_CACHE_KEY,
          JSON.stringify(cacheData)
        );
        await AsyncStorage.setItem(
          BANK_DATA_TIMESTAMP_KEY,
          Date.now().toString()
        );

        // Store the latest transaction date for incremental updates
        if (transactions.length > 0) {
          const latestDate = transactions
            .map((t) => new Date(t.date))
            .sort((a, b) => b.getTime() - a.getTime())[0]
            .toISOString()
            .split("T")[0];
          await AsyncStorage.setItem(LAST_TRANSACTION_DATE_KEY, latestDate);
        }
      } catch (error) {
        console.error("Failed to save bank data to cache:", error);
      }
    },
    []
  );

  // Refresh bank data with sophisticated logic
  const refreshBankData = useCallback(
    async (forceRefresh = false) => {
      // Add debouncing property to the function
      (refreshBankData as any).lastCallTime =
        (refreshBankData as any).lastCallTime || 0;
      try {
        // Enhanced debouncing: prevent rapid successive calls
        const now = Date.now();
        const lastCall = (refreshBankData as any).lastCallTime || 0;
        const timeSinceLastCall = now - lastCall;

        // Don't allow calls more frequent than 5 seconds apart (unless force refresh)
        if (timeSinceLastCall < 5000 && !forceRefresh) {
          return;
        }

        // Don't load if already loading
        if (isBankDataLoadingRef.current && !forceRefresh) {
          return;
        }

        // Smart app refresh detection
        const appStartTime = (global as any).appStartTime || now;
        const isAppJustStarted = now - appStartTime < 30000; // 30 seconds after app start

        if (isAppJustStarted && !forceRefresh) {
          // For app refresh, try cache first before making API calls
          const cacheLoaded = await loadCachedBankData();
          if (cacheLoaded) {
            return;
          }
        }

        // Update last call time
        (refreshBankData as any).lastCallTime = now;

        setIsBankDataLoading(true);
        isBankDataLoadingRef.current = true;

        const connected = await plaidService.isBankConnected();
        setIsBankConnected(connected);

        if (!connected) {
          setIsBankConnected(false);
          setIsBankDataLoading(false);
          return;
        }

        // Try to load from cache first (unless forcing refresh)
        if (!forceRefresh) {
          const cacheLoaded = await loadCachedBankData();
          if (cacheLoaded) {
            // Check if we have recurring suggestions in cache
            if (bankRecurringSuggestions.length === 0) {
              // Force refresh to regenerate recurring suggestions
              forceRefresh = true;
            } else {
              setIsBankDataLoading(false);
              return;
            }
          }
        }

        // Smart fetch strategy based on cache status and app refresh context
        const lastFetch = bankDataLastUpdated?.getTime() || 0;
        const timeSinceLastFetch = now - lastFetch;

        let startDate: string;
        let endDate = new Date().toISOString().split("T")[0];
        let fetchStrategy: "full" | "incremental" | "recurring-only";

        if (forceRefresh || lastFetch === 0) {
          // First time or force refresh: get 3 months of data for recurring analysis
          startDate = new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];
          fetchStrategy = "full";
          console.log("DataContext: Full refresh - fetching 3 months of data");
        } else if (timeSinceLastFetch > TRANSACTION_UPDATE_INTERVAL) {
          // Check for new transactions (incremental update)
          const lastTransactionDate = await AsyncStorage.getItem(
            LAST_TRANSACTION_DATE_KEY
          );
          startDate =
            lastTransactionDate ||
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0]; // Fallback to 7 days
          fetchStrategy = "incremental";
          console.log(
            "DataContext: Incremental update - fetching recent transactions"
          );
        } else {
          // Cache is fresh, no need to fetch
          console.log("DataContext: Cache is fresh, skipping API call");
          setIsBankDataLoading(false);
          return;
        }

        const [transactions, accounts] = await Promise.all([
          plaidService.getTransactions(startDate, endDate),
          plaidService.getAccounts(),
        ]);

        setBankAccounts(accounts);

        if (fetchStrategy === "incremental" && transactions.length === 0) {
          setIsBankDataLoading(false);
          return;
        }

        let allTransactions = transactions;

        // For incremental updates, merge with existing cached data
        if (fetchStrategy === "incremental" && lastFetch > 0) {
          const cachedData = await AsyncStorage.getItem(BANK_DATA_CACHE_KEY);
          if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            const existingTransactions = parsedData.transactions || [];

            // Merge and deduplicate transactions
            const transactionMap = new Map();
            [...existingTransactions, ...transactions].forEach((t) => {
              const key = `${t.name}_${t.amount}_${t.date}`;
              transactionMap.set(key, t);
            });

            allTransactions = Array.from(transactionMap.values());
          }
        }

        setBankTransactions(allTransactions);

        // Analyze recurring patterns (only for full refresh or if we have significant new data)
        const suggestions = analyzeRecurringPatterns(allTransactions);
        setBankRecurringSuggestions(suggestions);
        setBankDataLastUpdated(new Date());

        // Save to cache
        await saveBankDataToCache(allTransactions, suggestions, accounts);
      } catch (error) {
        console.error("Failed to load bank data:", error);

        // Check if it's a token error that requires reconnection
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isTokenError =
          errorMessage.includes("INVALID_ACCESS_TOKEN") ||
          errorMessage.includes("ITEM_LOGIN_REQUIRED") ||
          errorMessage.includes("ITEM_ERROR") ||
          errorMessage.includes("access token") ||
          errorMessage.includes("401") ||
          errorMessage.includes("403");

        if (isTokenError) {
          console.warn("🔑 Token error detected, user needs to reconnect bank");
          setBankConnectionError(
            "Your bank connection has expired. Please reconnect your bank account to continue."
          );
          // Don't set isBankConnected to false immediately, let the user see the error
          // and decide whether to reconnect
        } else {
          setIsBankConnected(false);
          setBankConnectionError(null);
        }
      } finally {
        setIsBankDataLoading(false);
        isBankDataLoadingRef.current = false;
      }
    },
    [loadCachedBankData, saveBankDataToCache, analyzeRecurringPatterns]
  );

  // Refresh functions
  const refreshData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  const refreshTransactions = useCallback(async () => {
    if (!user?.uid) return;
    const userTransactions = await getUserTransactions(user.uid);
    setTransactions(userTransactions);
  }, [user?.uid]);

  const refreshAssetsDebts = useCallback(async () => {
    if (!user?.uid) return;
    const [userAssets, userDebts] = await Promise.all([
      getUserAssets(user.uid),
      getUserDebts(user.uid),
    ]);
    setAssets(userAssets);
    setDebts(userDebts);
  }, [user?.uid]);

  const refreshGoals = useCallback(async () => {
    if (!user?.uid) return;
    const userGoals = await getUserGoals(user.uid);
    setGoals(userGoals);
  }, [user?.uid]);

  const refreshBudgetSettings = useCallback(async () => {
    if (!user?.uid) return;
    const userBudgetSettings = await getUserBudgetSettings(user.uid);
    setBudgetSettings(userBudgetSettings);
  }, [user?.uid]);

  const refreshRecurringTransactions = useCallback(async () => {
    if (!user?.uid) return;
    const userRecurringTransactions = await getUserRecurringTransactions(
      user.uid
    );
    setRecurringTransactions(userRecurringTransactions);
  }, [user?.uid]);

  // Staleness checks
  const isDataStale = useCallback(() => {
    if (!lastDataRefresh.current) return true;
    const now = new Date();
    const timeDiff = now.getTime() - lastDataRefresh.current.getTime();
    return timeDiff > 5 * 60 * 1000; // 5 minutes
  }, []);

  const isBankDataStale = useCallback(() => {
    if (!bankDataLastUpdated) return true;
    const now = Date.now();
    return now - bankDataLastUpdated.getTime() > TRANSACTION_UPDATE_INTERVAL;
  }, [bankDataLastUpdated]);

  // Optimistic update methods
  const updateTransactionsOptimistically = useCallback(
    (newTransactions: any[]) => {
      setTransactions(newTransactions);
    },
    []
  );

  const updateBudgetSettingsOptimistically = useCallback((newSettings: any) => {
    setBudgetSettings(newSettings);
  }, []);

  const updateGoalsOptimistically = useCallback((newGoals: any[]) => {
    setGoals(newGoals);
  }, []);

  const updateAssetsOptimistically = useCallback((newAssets: any[]) => {
    setAssets(newAssets);
  }, []);

  const updateDebtsOptimistically = useCallback((newDebts: any[]) => {
    setDebts(newDebts);
  }, []);

  const updateRecurringTransactionsOptimistically = useCallback(
    (newTransactions: any[]) => {
      setRecurringTransactions(newTransactions);
    },
    []
  );

  // Auto-load bank data when connection status changes (optimized)
  useEffect(() => {
    // Add startup coordination to prevent initialization cascade
    if (
      user &&
      isBankConnected &&
      bankRecurringSuggestions.length === 0 &&
      !isBankDataLoading &&
      bankTransactions.length === 0 && // Only auto-load if we have no transactions at all
      !(refreshBankData as any).isInitializing && // Prevent multiple simultaneous calls
      !(refreshBankData as any).hasAutoLoaded && // Prevent multiple auto-loads
      !(refreshBankData as any).isAppStarting // Prevent app startup cascade
    ) {
      (refreshBankData as any).isInitializing = true;
      (refreshBankData as any).hasAutoLoaded = true;
      refreshBankData(true).finally(() => {
        (refreshBankData as any).isInitializing = false;
      });
    }
  }, [
    user,
    isBankConnected,
    bankRecurringSuggestions.length,
    bankTransactions.length,
    isBankDataLoading,
  ]);

  // Load data when user changes (optimized for app refresh)
  useEffect(() => {
    if (user) {
      // Load user data (transactions, assets, debts, etc.) - this is fast from Firebase
      loadAllData();

      // Load bank data with smart caching
      const loadBankData = async () => {
        try {
          // Set user ID for PlaidService first
          plaidService.setUserId(user.uid);

          // Register callback for when bank is connected
          plaidService.onBankConnected(async () => {
            setIsBankConnected(true);
            await refreshBankData(true); // Force refresh when new bank connects
          });

          // Check if bank is connected
          const connected = await plaidService.isBankConnected();
          setIsBankConnected(connected);

          // If user is not premium, don't load bank data and disconnect if connected
          // Only disconnect if we have a definitive subscription status (not null/undefined)
          if (
            subscriptionStatus !== null &&
            subscriptionStatus !== undefined &&
            !subscriptionStatus.isPremium
          ) {
            console.log(
              "DataContext: User not premium, clearing bank connection"
            );
            if (connected) {
              await plaidService.disconnectBank();
            }
            setIsBankConnected(false);
            return;
          }

          if (!connected) {
            setIsBankConnected(false);
            return;
          }

          // Smart refresh strategy for app refresh:
          // 1. Try to load from cache first
          const cacheLoaded = await loadCachedBankData();

          if (cacheLoaded) {
            console.log("DataContext: Loaded bank data from cache");
            return;
          }

          // 2. Check if we need to fetch fresh data
          const lastFetch = bankDataLastUpdated?.getTime() || 0;
          const timeSinceLastFetch = Date.now() - lastFetch;
          const SIX_HOURS = 6 * 60 * 60 * 1000;

          if (timeSinceLastFetch < SIX_HOURS) {
            console.log("DataContext: Bank data is fresh, skipping API call");
            return;
          }

          // 3. Only fetch if data is stale or no cache exists
          console.log("DataContext: Bank data is stale, fetching fresh data");
          await refreshBankData(false); // Don't force refresh, use smart strategy
        } catch (error) {
          console.error("DataContext: Failed to load bank data:", error);
        }
      };
      loadBankData();

      // Load subscription status
      const loadSubscriptionStatus = async () => {
        try {
          await revenueCatService.setUser(user.uid);
          await revenueCatService.checkSubscriptionStatus();
        } catch (error) {
          console.error(
            "Failed to load subscription status in DataContext:",
            error
          );
        }
      };
      loadSubscriptionStatus();
    } else {
      // Clear data when user logs out
      setTransactions([]);
      setAssets([]);
      setDebts([]);
      setGoals([]);
      setBudgetSettings(null);
      setRecurringTransactions([]);
      setLastUpdated(null);

      // Clear bank data
      setBankTransactions([]);
      setBankRecurringSuggestions([]);
      setIsBankConnected(false);
      setBankDataLastUpdated(null);
    }
  }, [user, loadAllData, loadCachedBankData, subscriptionStatus?.isPremium]);

  // Clear bank data when subscription expires
  useEffect(() => {
    const handleSubscriptionExpiration = async () => {
      if (
        subscriptionStatus !== null &&
        subscriptionStatus !== undefined &&
        !subscriptionStatus.isPremium
      ) {
        console.log("DataContext: Subscription expired, clearing bank data");
        await disconnectBankAndClearData();
      }
    };

    handleSubscriptionExpiration();
  }, [subscriptionStatus?.isPremium, disconnectBankAndClearData]);

  const value: DataContextType = {
    transactions,
    assets,
    debts,
    goals,
    budgetSettings,
    recurringTransactions,
    bankTransactions,
    bankRecurringSuggestions,
    bankAccounts,
    selectedBankAccount,
    isBankConnected,
    bankDataLastUpdated,
    isBankDataLoading,
    bankConnectionError,
    isLoading,
    lastUpdated,
    refreshData,
    refreshTransactions,
    refreshAssetsDebts,
    refreshGoals,
    refreshBudgetSettings,
    refreshRecurringTransactions,
    refreshBankData,
    isDataStale,
    isBankDataStale,
    setTransactions,
    setBudgetSettings,
    setGoals,
    setRecurringTransactions,
    setBankAccounts,
    setSelectedBankAccount,
    setBankConnectionError,
    disconnectBankAndClearData,
    updateTransactionsOptimistically,
    updateBudgetSettingsOptimistically,
    updateGoalsOptimistically,
    updateAssetsOptimistically,
    updateDebtsOptimistically,
    updateRecurringTransactionsOptimistically,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
