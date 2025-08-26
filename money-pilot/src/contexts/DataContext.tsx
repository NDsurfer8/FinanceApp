import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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

  // Bank Data State
  const [bankTransactions, setBankTransactions] = useState<any[]>([]);
  const [bankRecurringSuggestions, setBankRecurringSuggestions] = useState<
    any[]
  >([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string | null>(
    null
  );
  const [isBankConnected, setIsBankConnected] = useState(false);
  const [bankDataLastUpdated, setBankDataLastUpdated] = useState<Date | null>(
    null
  );
  const [isBankDataLoading, setIsBankDataLoading] = useState(false);
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
  const TRANSACTION_UPDATE_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours for new transactions

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
      console.log("DataContext: loadAllData called for user:", user.uid);
      console.log(
        "DataContext: loadAllData timestamp:",
        new Date().toISOString()
      );

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

  // Bank Data Methods
  const analyzeRecurringPatterns = useCallback((transactions: any[]) => {
    console.log(
      "DataContext: Analyzing recurring patterns for",
      transactions.length,
      "transactions"
    );

    // Debug: Log first few transactions to see their amounts
    console.log("DataContext: Sample transactions for debugging:");
    transactions.slice(0, 5).forEach((t, i) => {
      console.log(
        `Transaction ${i + 1}: ${t.name} - Amount: ${t.amount} (${
          t.amount > 0 ? "positive" : "negative"
        })`
      );
    });
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

    console.log(
      "DataContext: Found",
      Object.keys(patterns).length,
      "unique transaction patterns"
    );

    // Find transactions that appear multiple times (potential recurring)
    Object.entries(patterns).forEach(([key, transactions]) => {
      console.log(
        "DataContext: Pattern",
        key,
        "has",
        transactions.length,
        "occurrences"
      );
      if (transactions.length >= 2) {
        const firstTransaction = transactions[0];
        const sortedTransactions = transactions.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Calculate frequency
        const frequency = calculateFrequency(sortedTransactions);
        console.log("DataContext: Pattern", key, "frequency:", frequency);

        if (frequency) {
          console.log("DataContext: Creating suggestion for pattern:", key);
          console.log(
            "DataContext: First transaction amount:",
            firstTransaction.amount,
            "Type:",
            typeof firstTransaction.amount
          );
          console.log(
            "DataContext: First transaction name:",
            firstTransaction.name
          );
          console.log(
            "DataContext: Number(firstTransaction.amount):",
            Number(firstTransaction.amount)
          );
          console.log(
            "DataContext: Determined type:",
            Number(firstTransaction.amount) < 0 ? "income" : "expense"
          );

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

    console.log(
      "DataContext: Generated",
      suggestions.length,
      "recurring suggestions"
    );
    return suggestions.sort((a, b) => b.occurrences - a.occurrences);
  }, []);

  const calculateFrequency = useCallback((transactions: any[]) => {
    if (transactions.length < 2) return null;

    const dates = transactions.map((t) => new Date(t.date).getTime());
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
          console.log(
            "Loaded cached bank data, age:",
            Math.round((now - timestamp) / 1000 / 60),
            "minutes"
          );
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Failed to load cached bank data:", error);
      return false;
    }
  }, []);

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

        console.log("Saved bank data to cache");
      } catch (error) {
        console.error("Failed to save bank data to cache:", error);
      }
    },
    []
  );

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

        // Don't allow calls more frequent than 2 seconds apart (unless force refresh)
        if (timeSinceLastCall < 2000 && !forceRefresh) {
          console.log(
            `⏳ Rate limited: Last call was ${Math.round(
              timeSinceLastCall / 1000
            )}s ago, skipping...`
          );
          return;
        }

        // Don't load if already loading
        if (isBankDataLoadingRef.current && !forceRefresh) {
          console.log("Bank data already loading, skipping...");
          return;
        }

        // Update last call time
        (refreshBankData as any).lastCallTime = now;

        setIsBankDataLoading(true);
        isBankDataLoadingRef.current = true;

        const connected = await plaidService.isBankConnected();
        console.log("DataContext: Bank connection status:", connected);
        setIsBankConnected(connected);

        if (!connected) {
          console.log(
            "DataContext: No bank connected, skipping bank data load"
          );
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
              console.log(
                "DataContext: Cache loaded but no recurring suggestions, forcing refresh"
              );
              // Force refresh to regenerate recurring suggestions
              forceRefresh = true;
            } else {
              setIsBankDataLoading(false);
              return;
            }
          }
        }

        // Determine what data to fetch based on cache status
        const lastFetch = bankDataLastUpdated?.getTime() || 0;
        const timeSinceLastFetch = now - lastFetch;

        let startDate: string;
        let endDate = new Date().toISOString().split("T")[0];
        let fetchStrategy: "full" | "incremental" | "recurring-only";

        if (forceRefresh || lastFetch === 0) {
          // First time or force refresh: get 3 months of data for recurring analysis
          console.log(
            "🔄 Full refresh: Fetching 3 months of data for recurring analysis..."
          );
          startDate = new Date(Date.now() - 3 * 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];
          fetchStrategy = "full";
        } else if (timeSinceLastFetch > TRANSACTION_UPDATE_INTERVAL) {
          // Check for new transactions (last 4 hours)
          console.log(
            "📈 Incremental update: Checking for new transactions..."
          );
          const lastTransactionDate = await AsyncStorage.getItem(
            LAST_TRANSACTION_DATE_KEY
          );
          startDate =
            lastTransactionDate ||
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0]; // Fallback to 7 days
          fetchStrategy = "incremental";
        } else {
          // Cache is fresh, no need to fetch
          console.log("✅ Cache is fresh, no API call needed");
          setIsBankDataLoading(false);
          return;
        }

        const [transactions, accounts] = await Promise.all([
          plaidService.getTransactions(startDate, endDate),
          plaidService.getAccounts(),
        ]);

        setBankAccounts(accounts);

        if (fetchStrategy === "incremental" && transactions.length === 0) {
          console.log("✅ No new transactions found, keeping existing cache");
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
            console.log(
              `🔄 Merged ${existingTransactions.length} existing + ${transactions.length} new = ${allTransactions.length} total transactions`
            );
          }
        }

        setBankTransactions(allTransactions);

        // Analyze recurring patterns (only for full refresh or if we have significant new data)
        const suggestions = analyzeRecurringPatterns(allTransactions);
        setBankRecurringSuggestions(suggestions);
        setBankDataLastUpdated(new Date());

        // Save to cache
        await saveBankDataToCache(allTransactions, suggestions, accounts);

        console.log(
          `✅ ${
            fetchStrategy === "full" ? "Full refresh" : "Incremental update"
          } complete: ${suggestions.length} recurring suggestions found`
        );
      } catch (error) {
        console.error("Failed to load bank data:", error);
        setIsBankConnected(false);
      } finally {
        setIsBankDataLoading(false);
        isBankDataLoadingRef.current = false;
      }
    },
    [loadCachedBankData, saveBankDataToCache, analyzeRecurringPatterns]
  );

  const isBankDataStale = useCallback(() => {
    if (!bankDataLastUpdated) return true;
    const now = Date.now();
    return now - bankDataLastUpdated.getTime() > TRANSACTION_UPDATE_INTERVAL;
  }, [bankDataLastUpdated]);

  // Auto-load bank data when connection status changes
  useEffect(() => {
    // Add startup coordination to prevent initialization cascade
    if (
      user &&
      isBankConnected &&
      bankRecurringSuggestions.length === 0 &&
      !isBankDataLoading &&
      bankTransactions.length === 0 && // Only auto-load if we have no transactions at all
      !(refreshBankData as any).isInitializing // Prevent multiple simultaneous calls
    ) {
      console.log(
        "DataContext: Bank connected but no transactions, auto-loading..."
      );
      (refreshBankData as any).isInitializing = true;
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

  const refreshData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // Load data when user changes
  useEffect(() => {
    console.log("DataContext: useEffect triggered for user:", user?.uid);
    if (user) {
      loadAllData();

      // Load bank data
      const loadBankData = async () => {
        try {
          console.log("DataContext: Starting bank data loading...");
          // Set user ID for PlaidService first
          plaidService.setUserId(user.uid);

          // Register callback for when bank is connected
          plaidService.onBankConnected(async () => {
            console.log("DataContext: Bank connected callback triggered");
            setIsBankConnected(true);
            await refreshBankData(true);
          });

          // Call refreshBankData directly without including it in dependencies
          const connected = await plaidService.isBankConnected();
          console.log("DataContext: Bank connection status:", connected);
          setIsBankConnected(connected);

          if (!connected) {
            console.log(
              "DataContext: No bank connected, skipping bank data load"
            );
            setIsBankConnected(false);
            return;
          }

          // Try to load from cache first
          const cacheLoaded = await loadCachedBankData();
          if (cacheLoaded) {
            return;
          }

          // Force refresh if no cache
          await refreshBankData(true);
          console.log("DataContext: Bank data loading completed");
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
          console.log("Subscription status loaded in DataContext");
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
  }, [user, loadAllData, loadCachedBankData]);

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
    updateTransactionsOptimistically,
    updateBudgetSettingsOptimistically,
    updateGoalsOptimistically,
    updateAssetsOptimistically,
    updateDebtsOptimistically,
    updateRecurringTransactionsOptimistically,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
