import { useCallback } from "react";
import { useData } from "../contexts/DataContext";

export const useOptimizedData = () => {
  const dataContext = useData();

  const refreshIfStale = useCallback(async () => {
    if (dataContext.isDataStale()) {
      console.log("Data is stale, refreshing...");
      await dataContext.refreshData();
    } else {
      console.log("Data is fresh, skipping refresh");
    }
  }, [dataContext]);

  const refreshSpecificData = useCallback(
    async (
      dataType:
        | "transactions"
        | "assets"
        | "goals"
        | "budgetSettings"
        | "recurringTransactions"
    ) => {
      console.log(`Refreshing ${dataType}...`);
      switch (dataType) {
        case "transactions":
          await dataContext.refreshTransactions();
          break;
        case "assets":
          await dataContext.refreshAssetsDebts();
          break;
        case "goals":
          await dataContext.refreshGoals();
          break;
        case "budgetSettings":
          await dataContext.refreshBudgetSettings();
          break;
        case "recurringTransactions":
          await dataContext.refreshRecurringTransactions();
          break;
      }
    },
    [dataContext]
  );

  return {
    ...dataContext,
    refreshIfStale,
    refreshSpecificData,
  };
};
