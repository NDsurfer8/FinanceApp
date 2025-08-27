import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../hooks/useAuth";

interface DataPreloaderProps {
  children: React.ReactNode;
}

export const DataPreloader: React.FC<DataPreloaderProps> = ({ children }) => {
  const { user } = useAuth();
  const {
    isLoading,
    transactions,
    assets,
    debts,
    goals,
    budgetSettings,
    recurringTransactions,
    refreshData,
    refreshBankData,
    isBankConnected,
    bankTransactions,
  } = useData();

  const [isPreloading, setIsPreloading] = useState(true);

  // Check if we have any data loaded
  const hasData =
    transactions.length > 0 ||
    assets.length > 0 ||
    debts.length > 0 ||
    goals.length > 0 ||
    budgetSettings !== null ||
    recurringTransactions.length > 0;

  // Check if we have bank data loaded
  const hasBankData = isBankConnected && bankTransactions.length > 0;

  useEffect(() => {
    const preloadData = async () => {
      console.log(
        "DataPreloader: Starting preload, user:",
        !!user,
        "hasData:",
        hasData,
        "isBankConnected:",
        isBankConnected
      );

      // Add a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setIsPreloading(false);
      }, 10000); // 10 seconds timeout

      if (user) {
        try {
          // Load main data if not already loaded
          if (!hasData) {
            await refreshData();
          }

          // Subscription status is loaded by DataContext when user changes

          // Load bank data if connected
          if (isBankConnected && !hasBankData) {
            try {
              await refreshBankData();
            } catch (error) {
              console.error("Failed to load bank data:", error);
            }
          }
        } catch (error) {
          console.error("DataPreloader: Error during preload:", error);
        }
      }

      clearTimeout(timeoutId);
      setIsPreloading(false);
    };

    preloadData();
  }, [
    user,
    hasData,
    hasBankData,
    refreshData,
    refreshBankData,
    isBankConnected,
  ]);

  // Show children immediately if no user or if preloading is complete
  if (!user || !isPreloading) {
    return <>{children}</>;
  }

  // Show minimal loading indicator only during initial preload
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#10b981" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
});
