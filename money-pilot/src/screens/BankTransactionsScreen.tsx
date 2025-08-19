import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { plaidService } from "../services/plaid";
import { PlaidAccount, PlaidTransaction } from "../services/plaid";

interface BankTransactionsScreenProps {
  navigation: any;
}

export const BankTransactionsScreen: React.FC<BankTransactionsScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<PlaidAccount[]>([]);
  const [transactions, setTransactions] = useState<PlaidTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [isUsingRealData, setIsUsingRealData] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      plaidService.setUserId(user.uid);
      loadBankData();
    }
  }, [user]);

  const loadBankData = async () => {
    setIsLoading(true);
    try {
      const isConnected = await plaidService.isBankConnected();
      if (!isConnected) {
        console.log("No bank connected, showing demo data");
        setIsUsingRealData(false);
        // For demo purposes, show mock data even without connection
        const [accountsData, transactionsData] = await Promise.all([
          plaidService.getAccounts(),
          plaidService.getTransactions(
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0], // 30 days ago
            new Date().toISOString().split("T")[0] // today
          ),
        ]);

        setAccounts(accountsData);
        setTransactions(transactionsData);
        return;
      }

      console.log("Bank connected, attempting to load real data");
      setIsUsingRealData(true);

      const [accountsData, transactionsData] = await Promise.all([
        plaidService.getAccounts(),
        plaidService.getTransactions(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // 30 days ago
          new Date().toISOString().split("T")[0] // today
        ),
      ]);

      setAccounts(accountsData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Error loading bank data:", error);
      // Don't show error alert, just log it
      console.log("Using fallback data due to error");
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBankData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getCategoryIcon = (categories: string[] | undefined) => {
    if (!categories || categories.length === 0) return "card-outline";

    const category = categories[0].toLowerCase();
    if (category.includes("food") || category.includes("restaurant"))
      return "restaurant-outline";
    if (category.includes("transport") || category.includes("gas"))
      return "car-outline";
    if (category.includes("shopping") || category.includes("retail"))
      return "bag-outline";
    if (category.includes("entertainment")) return "game-controller-outline";
    if (category.includes("health") || category.includes("medical"))
      return "medical-outline";
    if (category.includes("transfer") || category.includes("payroll"))
      return "swap-horizontal-outline";
    if (category.includes("utilities") || category.includes("bill"))
      return "flash-outline";

    return "card-outline";
  };

  const getCategoryColor = (categories: string[] | undefined) => {
    if (!categories || categories.length === 0) return "#6b7280";

    const category = categories[0].toLowerCase();
    if (category.includes("food") || category.includes("restaurant"))
      return "#f59e0b";
    if (category.includes("transport") || category.includes("gas"))
      return "#3b82f6";
    if (category.includes("shopping") || category.includes("retail"))
      return "#8b5cf6";
    if (category.includes("entertainment")) return "#ec4899";
    if (category.includes("health") || category.includes("medical"))
      return "#ef4444";
    if (category.includes("transfer") || category.includes("payroll"))
      return "#10b981";
    if (category.includes("utilities") || category.includes("bill"))
      return "#f97316";

    return "#6b7280";
  };

  const filteredTransactions = selectedAccount
    ? transactions.filter((t) => t.account_id === selectedAccount)
    : transactions;

  const totalBalance = accounts.reduce(
    (sum, account) => sum + account.balances.current,
    0
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                backgroundColor: "#f3f4f6",
                padding: 12,
                borderRadius: 12,
                marginRight: 16,
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#374151" />
            </TouchableOpacity>
            <View>
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "800",
                  color: "#1f2937",
                  letterSpacing: -0.5,
                }}
              >
                Bank Transactions
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: "#6b7280",
                  marginTop: 4,
                  fontWeight: "500",
                }}
              >
                Real-time from your connected accounts
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: isUsingRealData ? "#10b981" : "#f59e0b",
                  marginTop: 2,
                  fontWeight: "500",
                }}
              >
                {isLoading
                  ? "Loading..."
                  : isUsingRealData
                  ? "Real sandbox data"
                  : "Demo mode - showing sample data"}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            style={{
              backgroundColor: "#6366f1",
              padding: 12,
              borderRadius: 12,
            }}
          >
            <Ionicons name="settings-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Total Balance Card */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#6b7280",
              marginBottom: 8,
            }}
          >
            Total Balance
          </Text>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              color: totalBalance >= 0 ? "#16a34a" : "#dc2626",
              letterSpacing: -0.5,
            }}
          >
            {formatCurrency(totalBalance)}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginTop: 4,
            }}
          >
            Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Account Selector */}
        {accounts.length > 1 && (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#374151",
                marginBottom: 12,
              }}
            >
              Select Account
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => setSelectedAccount(null)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor:
                    selectedAccount === null ? "#6366f1" : "#f3f4f6",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: selectedAccount === null ? "#fff" : "#374151",
                  }}
                >
                  All Accounts
                </Text>
              </TouchableOpacity>
              {accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  onPress={() => setSelectedAccount(account.id)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor:
                      selectedAccount === account.id ? "#6366f1" : "#f3f4f6",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color:
                        selectedAccount === account.id ? "#fff" : "#374151",
                    }}
                  >
                    {account.name} ({account.mask})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Account Balances */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 20,
              color: "#1f2937",
            }}
          >
            Account Balances
          </Text>
          {accounts.map((account) => (
            <View
              key={account.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth:
                  account.id === accounts[accounts.length - 1].id ? 0 : 1,
                borderBottomColor: "#f3f4f6",
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  {account.name}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#6b7280",
                    marginTop: 2,
                  }}
                >
                  ****{account.mask} • {account.subtype}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color:
                      account.balances.current >= 0 ? "#16a34a" : "#dc2626",
                  }}
                >
                  {formatCurrency(account.balances.current)}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginTop: 2,
                  }}
                >
                  Available: {formatCurrency(account.balances.available)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Transactions */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 24,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: "#1f2937",
              }}
            >
              Recent Transactions
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#6b7280",
              }}
            >
              {filteredTransactions.length} transactions
            </Text>
          </View>

          {filteredTransactions.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Ionicons name="card-outline" size={48} color="#d1d5db" />
              <Text
                style={{
                  fontSize: 16,
                  color: "#6b7280",
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                No transactions found
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#9ca3af",
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                Pull down to refresh or check your account selection
              </Text>
            </View>
          ) : (
            filteredTransactions.map((transaction) => (
              <View
                key={transaction.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 16,
                  borderBottomWidth:
                    transaction.id ===
                    filteredTransactions[filteredTransactions.length - 1].id
                      ? 0
                      : 1,
                  borderBottomColor: "#f3f4f6",
                }}
              >
                <View
                  style={{
                    backgroundColor:
                      getCategoryColor(transaction.category) + "15",
                    padding: 12,
                    borderRadius: 12,
                    marginRight: 16,
                  }}
                >
                  <Ionicons
                    name={getCategoryIcon(transaction.category) as any}
                    size={20}
                    color={getCategoryColor(transaction.category)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    {transaction.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#6b7280",
                      marginTop: 2,
                    }}
                  >
                    {formatDate(transaction.date)}
                    {transaction.merchant_name &&
                      ` • ${transaction.merchant_name}`}
                    {transaction.category &&
                      transaction.category.length > 0 &&
                      ` • ${transaction.category[0]}`}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: transaction.amount >= 0 ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {transaction.amount >= 0 ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </Text>
                  {transaction.pending && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#f59e0b",
                        marginTop: 2,
                        fontWeight: "500",
                      }}
                    >
                      Pending
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
