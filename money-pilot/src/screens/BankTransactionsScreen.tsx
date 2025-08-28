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
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";
import { plaidService } from "../services/plaid";
import { AccountSelector } from "../components/AccountSelector";
import { PlaidAccount, PlaidTransaction } from "../services/plaid";

interface BankTransactionsScreenProps {
  navigation: any;
}

export const BankTransactionsScreen: React.FC<BankTransactionsScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const {
    bankAccounts,
    setSelectedBankAccount,
    selectedBankAccount,
    refreshBankData,
  } = useData();

  // Filter accounts to only show checking/savings accounts (not loans)
  const checkingAccounts = bankAccounts.filter(
    (account: any) =>
      account.type === "depository" &&
      ["checking", "savings"].includes(account.subtype)
  );

  // Filter loan accounts from Plaid
  const loanAccounts = bankAccounts.filter(
    (account: any) => account.type === "loan"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
        console.log("No bank connected, using cached data");
        setIsUsingRealData(false);
        // Use DataContext data instead of making duplicate API calls
        return;
      }

      console.log("Bank connected, using DataContext data");
      setIsUsingRealData(true);

      // DataContext already manages bank data, no need for duplicate calls
      // The data is automatically loaded and cached by DataContext
    } catch (error) {
      console.error("Error checking bank connection:", error);
      console.log("Using fallback data due to error");
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Use DataContext refresh instead of making direct API calls
      await refreshBankData(true); // Force refresh
    } catch (error) {
      console.error("Error refreshing bank data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const totalBalance = checkingAccounts.reduce(
    (sum: number, account: any) => sum + account.balances.current,
    0
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{
                  padding: 12, // Increased from 10 to ensure minimum 44px touch target
                  marginRight: 12,
                  minWidth: 44, // Ensure minimum width
                  minHeight: 44, // Ensure minimum height
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="arrow-back" size={18} color={colors.text} />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "800",
                  color: colors.text,
                  letterSpacing: -0.5,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                Accounts Overview
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                marginLeft: 46,
                fontWeight: "500",
              }}
              numberOfLines={1}
            >
              Real-time from your connected accounts
            </Text>
          </View>
        </View>

        {/* Total Balance Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            shadowColor: colors.shadow,
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.textSecondary,
              marginBottom: 6,
            }}
          >
            Total Balance
          </Text>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "800",
              color: totalBalance >= 0 ? colors.success : colors.error,
              letterSpacing: -0.5,
            }}
          >
            {formatCurrency(totalBalance)}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              marginTop: 2,
            }}
          >
            Across {checkingAccounts.length} account
            {checkingAccounts.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Account Selector */}
        {checkingAccounts.length > 1 && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              shadowColor: colors.shadow,
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
                color: colors.text,
                marginBottom: 12,
              }}
            >
              Select Account
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              <TouchableOpacity
                onPress={() => setSelectedBankAccount(null)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor:
                    selectedBankAccount === null
                      ? colors.primary
                      : colors.surfaceSecondary,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color:
                      selectedBankAccount === null
                        ? colors.buttonText
                        : colors.text,
                  }}
                >
                  All Accounts
                </Text>
              </TouchableOpacity>
              {checkingAccounts.map((account: any) => (
                <TouchableOpacity
                  key={account.id}
                  onPress={() => setSelectedBankAccount(account.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor:
                      selectedBankAccount === account.id
                        ? colors.primary
                        : colors.surfaceSecondary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color:
                        selectedBankAccount === account.id
                          ? colors.buttonText
                          : colors.text,
                    }}
                    numberOfLines={1}
                  >
                    {account.name} ({account.mask})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Account Balances */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            shadowColor: colors.shadow,
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 16,
              color: colors.text,
            }}
          >
            Account Balances
          </Text>
          {checkingAccounts.map((account: any) => (
            <View
              key={account.id}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                borderBottomWidth:
                  account.id ===
                  checkingAccounts[checkingAccounts.length - 1].id
                    ? 0
                    : 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                  numberOfLines={1}
                >
                  {account.name}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  ****{account.mask} • {account.subtype}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color:
                      account.balances.current >= 0
                        ? colors.success
                        : colors.error,
                  }}
                >
                  {formatCurrency(account.balances.current)}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  Available: {formatCurrency(account.balances.available)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Connected Loan Accounts Section */}
        {loanAccounts.length > 0 && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
              shadowColor: colors.shadow,
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons
                name="link"
                size={20}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                Connected Loan Accounts
              </Text>
            </View>

            {loanAccounts.map((account: any) => (
              <View
                key={account.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderBottomWidth:
                    account.id === loanAccounts[loanAccounts.length - 1].id
                      ? 0
                      : 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                    numberOfLines={1}
                  >
                    {account.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    {account.subtype} • ****{account.mask}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: "#dc2626",
                    }}
                  >
                    {formatCurrency(Math.abs(account.balances.current))}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    Remaining Balance
                  </Text>
                </View>
              </View>
            ))}

            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 12,
                fontStyle: "italic",
              }}
            >
              Connected loan accounts are automatically synced from your bank
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
