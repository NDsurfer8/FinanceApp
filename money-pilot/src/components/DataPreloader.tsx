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

  useEffect(() => {
    const preloadData = async () => {
      if (user && !hasData) {
        console.log("Preloading all data for instant navigation...");
        await refreshData();
      }
      setIsPreloading(false);
    };

    preloadData();
  }, [user, hasData, refreshData]);

  // Show children immediately if we have data or no user
  if (!user || hasData || !isPreloading) {
    return <>{children}</>;
  }

  // Show minimal loading indicator only during initial preload
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Preparing your financial data...</Text>
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
