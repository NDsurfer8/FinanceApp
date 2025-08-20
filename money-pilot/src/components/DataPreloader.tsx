import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
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
        console.log("DataPreloader: Timeout reached, forcing completion");
        setIsPreloading(false);
      }, 10000); // 10 seconds timeout

      if (user) {
        console.log("Preloading all data for instant navigation...");

        try {
          // Load main data if not already loaded
          if (!hasData) {
            console.log("DataPreloader: Loading main data...");
            await refreshData();
            console.log("DataPreloader: Main data loaded");
          } else {
            console.log("DataPreloader: Main data already available");
          }

          // Subscription status is loaded by DataContext when user changes

          // Load bank data if connected
          if (isBankConnected && !hasBankData) {
            try {
              console.log("DataPreloader: Loading bank data...");
              await refreshBankData();
              console.log("Bank data loaded in DataPreloader");
            } catch (error) {
              console.error("Failed to load bank data:", error);
            }
          } else {
            console.log(
              "DataPreloader: Bank data already available or not connected"
            );
          }
        } catch (error) {
          console.error("DataPreloader: Error during preload:", error);
        }
      } else {
        console.log("DataPreloader: No user, skipping preload");
      }

      clearTimeout(timeoutId);
      console.log("DataPreloader: Setting isPreloading to false");
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
      <Text style={styles.text}>Loading your financial data...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  text: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
  },
});
