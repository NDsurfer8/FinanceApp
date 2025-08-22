import { useCallback, useMemo } from "react";
import { useData } from "../contexts/DataContext";

export const useZeroLoading = () => {
  const dataContext = useData();

  // Check if we have any data loaded
  const hasData = useMemo(() => {
    return (
      dataContext.transactions.length > 0 ||
      dataContext.assets.length > 0 ||
      dataContext.debts.length > 0 ||
      dataContext.goals.length > 0 ||
      dataContext.budgetSettings !== null ||
      dataContext.recurringTransactions.length > 0
    );
  }, [dataContext]);

  // Get data instantly without any loading
  const getDataInstantly = useCallback(() => {
    return {
      transactions: dataContext.transactions,
      assets: dataContext.assets,
      debts: dataContext.debts,
      goals: dataContext.goals,
      budgetSettings: dataContext.budgetSettings,
      recurringTransactions: dataContext.recurringTransactions,
      hasData,
      lastUpdated: dataContext.lastUpdated,
    };
  }, [dataContext, hasData]);

  // Update data optimistically (immediate UI update)
  const updateDataOptimistically = useCallback(
    (updates: {
      transactions?: any[];
      assets?: any[];
      debts?: any[];
      goals?: any[];
      budgetSettings?: any;
      recurringTransactions?: any[];
    }) => {
      if (updates.transactions) {
        dataContext.updateTransactionsOptimistically(updates.transactions);
      }
      if (updates.assets) {
        dataContext.updateAssetsOptimistically(updates.assets);
      }
      if (updates.debts) {
        dataContext.updateDebtsOptimistically(updates.debts);
      }
      if (updates.goals) {
        dataContext.updateGoalsOptimistically(updates.goals);
      }
      if (updates.budgetSettings) {
        dataContext.updateBudgetSettingsOptimistically(updates.budgetSettings);
      }
      if (updates.recurringTransactions) {
        dataContext.updateRecurringTransactionsOptimistically(
          updates.recurringTransactions
        );
      }
    },
    [dataContext]
  );

  // Background refresh (doesn't block UI)
  const refreshInBackground = useCallback(async () => {
    if (dataContext.isDataStale()) {
      console.log("Refreshing data in background...");
      // Don't await - let it run in background
      dataContext.refreshData().catch((error) => {
        console.error("Background refresh failed:", error);
      });
    }
  }, [dataContext]);

  return {
    ...dataContext,
    hasData,
    getDataInstantly,
    updateDataOptimistically,
    refreshInBackground,
  };
};
