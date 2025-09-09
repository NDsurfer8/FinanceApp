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
import { StandardHeader } from "../components/StandardHeader";
import { useSubscription } from "../contexts/SubscriptionContext";
import { usePaywall } from "../hooks/usePaywall";
import { plaidService } from "../services/plaid";
import { plaidAssetDebtImporter } from "../services/plaidAssetDebtImporter";

interface BankTransactionsScreenProps {
  navigation: any;
}

export const BankTransactionsScreen: React.FC<BankTransactionsScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const dataContext = useData();
  const {
    bankAccounts,

    refreshBankData,
    isBankConnected,
  } = dataContext;
  const { hasPremiumAccess } = useSubscription();
  const { presentPaywall } = usePaywall();

  // Filter accounts to only show checking/savings accounts (not loans)
  const checkingAccounts = (bankAccounts || []).filter(
    (account: any) =>
      account.type === "depository" &&
      ["checking", "savings"].includes(account.subtype)
  );

  // Filter loan accounts from Plaid
  const loanAccounts = (bankAccounts || []).filter(
    (account: any) => account.type === "loan"
  );

  // Filter credit card accounts from Plaid
  const creditCardAccounts = (bankAccounts || []).filter(
    (account: any) =>
      account.type === "credit" && account.subtype === "credit card"
  );

  // Filter investment accounts from Plaid
  const investmentAccounts = (bankAccounts || []).filter(
    (account: any) =>
      account.type === "investment" ||
      ["401k", "ira", "brokerage", "cd", "mutual fund"].includes(
        account.subtype
      )
  );

  // Calculate total balances by account type
  const totalCheckingBalance = checkingAccounts.reduce(
    (sum: number, account: any) => sum + (account.balances?.current || 0),
    0
  );

  const totalCreditCardBalance = creditCardAccounts.reduce(
    (sum: number, account: any) =>
      sum + Math.abs(account.balances?.current || 0),
    0
  );

  const totalInvestmentBalance = investmentAccounts.reduce(
    (sum: number, account: any) => sum + (account.balances?.current || 0),
    0
  );

  const totalLoanBalance = loanAccounts.reduce(
    (sum: number, account: any) =>
      sum + Math.abs(account.balances?.current || 0),
    0
  );
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isUsingRealData, setIsUsingRealData] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

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
        // No bank connected, using cached data
        setIsUsingRealData(false);
        // Use DataContext data instead of making duplicate API calls
        return;
      }

      // Bank connected, using DataContext data
      setIsUsingRealData(true);

      // DataContext already manages bank data, no need for duplicate calls
      // The data is automatically loaded and cached by DataContext
    } catch (error) {
      console.error("Error checking bank connection:", error);
      // Using fallback data due to error
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

  const handleAutoImport = async () => {
    if (isImporting) return;

    setIsImporting(true);
    try {
      // Get all accounts that can be imported
      const allAccounts = [
        ...checkingAccounts,
        ...creditCardAccounts,
        ...investmentAccounts,
        ...loanAccounts,
      ];

      const result = await plaidAssetDebtImporter.importFromPlaidAccounts(
        allAccounts
      );

      // Quick refresh - only what's needed for immediate display
      try {
        // Starting quick refresh after import

        // Only refresh assets and debts - that's what we just imported
        if (dataContext.refreshAssetsDebts) {
          await dataContext.refreshAssetsDebts();
          // Assets and debts refreshed quickly
        }

        // Force a re-render of this screen to show updated data
        setDataRefreshKey((prev) => prev + 1);
        // Screen refresh triggered
      } catch (refreshError) {
        // Quick refresh completed
      }

      Alert.alert(
        "Auto-Import Complete!",
        `Successfully imported:\n` +
          `• ${result.importedAssets.length} assets (401ks, investments, etc.)\n` +
          `• ${result.importedDebts.length} debts (credit cards, loans)\n\n` +
          `Navigate to Assets & Debts to see your imported items!`,
        [
          {
            text: "View Assets & Debts",
            onPress: () => navigation.goBack(),
          },
          { text: "OK" },
        ]
      );
    } catch (error) {
      console.error("Error during auto-import:", error);
      Alert.alert(
        "Import Error",
        "There was an error importing your accounts. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsImporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${Math.abs(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const totalBalance = checkingAccounts.reduce(
    (sum: number, account: any) => sum + (account.balances?.current || 0),
    0
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        key={dataRefreshKey}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <StandardHeader
          title="Accounts Overview"
          subtitle="Real-time from your connected accounts"
          onBack={() => navigation.goBack()}
          showBackButton={true}
        />

        {/* Account Summary Section - Show when bank is connected */}
        {isBankConnected && (
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
                color: colors.text,
                marginBottom: 16,
              }}
            >
              Account Summary
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {/* Checking & Savings */}
              {checkingAccounts.length > 0 && (
                <View
                  style={{
                    backgroundColor: colors.success + "15",
                    padding: 12,
                    borderRadius: 12,
                    flex: 1,
                    minWidth: 120,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginBottom: 4,
                    }}
                  >
                    Checking & Savings
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: colors.success,
                    }}
                  >
                    {formatCurrency(totalCheckingBalance)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {checkingAccounts.length} account
                    {checkingAccounts.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}

              {/* Credit Cards */}
              {creditCardAccounts.length > 0 && (
                <View
                  style={{
                    backgroundColor: colors.error + "15",
                    padding: 12,
                    borderRadius: 12,
                    flex: 1,
                    minWidth: 120,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginBottom: 4,
                    }}
                  >
                    Credit Cards
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: colors.error,
                    }}
                  >
                    {formatCurrency(totalCreditCardBalance)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {creditCardAccounts.length} account
                    {creditCardAccounts.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}

              {/* Investments */}
              {investmentAccounts.length > 0 && (
                <View
                  style={{
                    backgroundColor: colors.success + "15",
                    padding: 12,
                    borderRadius: 12,
                    flex: 1,
                    minWidth: 120,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginBottom: 4,
                    }}
                  >
                    Investments
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: colors.success,
                    }}
                  >
                    {formatCurrency(totalInvestmentBalance)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {investmentAccounts.length} account
                    {investmentAccounts.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}

              {/* Loans */}
              {loanAccounts.length > 0 && (
                <View
                  style={{
                    backgroundColor: colors.error + "15",
                    padding: 12,
                    borderRadius: 12,
                    flex: 1,
                    minWidth: 120,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.textSecondary,
                      marginBottom: 4,
                    }}
                  >
                    Loans
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: colors.error,
                    }}
                  >
                    {formatCurrency(totalLoanBalance)}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {loanAccounts.length} account
                    {loanAccounts.length !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Premium Upgrade Card - Show when no bank connected and not premium */}
        {!isBankConnected && !hasPremiumAccess() && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 24,
              marginBottom: 16,
              shadowColor: colors.shadow,
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: colors.primary + "20",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Ionicons name="card" size={28} color={colors.primary} />
            </View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.text,
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              Connect Your Bank
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
                marginBottom: 20,
                lineHeight: 20,
              }}
            >
              Upgrade to Premium to connect your bank account and automatically
              sync transactions, balances, and account information.
            </Text>
            <TouchableOpacity
              onPress={presentPaywall}
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
                minWidth: 44,
                minHeight: 44,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.buttonText,
                }}
              >
                Get Premium
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Premium User Message - Show when premium but not connected */}
        {!isBankConnected && hasPremiumAccess() && (
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
              alignItems: "center",
            }}
          >
            <Ionicons
              name="information-circle"
              size={24}
              color={colors.primary}
              style={{ marginBottom: 12 }}
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              Connect Your Bank Account
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              Go to Settings to connect your bank account and view your
              transactions here.
            </Text>
          </View>
        )}

        {/* Total Balance Card - Only show when bank is connected */}
        {isBankConnected && (
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
        )}

        {/* Account Balances - Only show when bank is connected */}
        {isBankConnected && (
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
        )}

        {/* Connected Loan Accounts Section - Only show when bank is connected */}
        {isBankConnected && loanAccounts.length > 0 && (
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

        {/* Connected Credit Card Accounts Section */}
        {isBankConnected && creditCardAccounts.length > 0 && (
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
                name="card"
                size={20}
                color={colors.error}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                Connected Credit Cards
              </Text>
            </View>

            {creditCardAccounts.map((account: any) => (
              <View
                key={account.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderBottomWidth:
                    account.id ===
                    creditCardAccounts[creditCardAccounts.length - 1].id
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
                    Credit Card • ****{account.mask}
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
                    Current Balance
                  </Text>
                  {account.balances.limit && (
                    <Text
                      style={{
                        fontSize: 10,
                        color: colors.textSecondary,
                        marginTop: 1,
                      }}
                    >
                      Limit: {formatCurrency(account.balances.limit)}
                    </Text>
                  )}
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
              Credit card balances are automatically synced from your bank
            </Text>
          </View>
        )}

        {/* Connected Investment Accounts Section */}
        {isBankConnected && investmentAccounts.length > 0 && (
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
                name="trending-up"
                size={20}
                color={colors.success}
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                Connected Investment Accounts
              </Text>
            </View>

            {investmentAccounts.map((account: any) => (
              <View
                key={account.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderBottomWidth:
                    account.id ===
                    investmentAccounts[investmentAccounts.length - 1].id
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
                      color: colors.success,
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
                    Current Value
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
              Investment account values are automatically synced from your bank
            </Text>
          </View>
        )}

        {/* Auto-Import Section */}
        {isBankConnected &&
          (creditCardAccounts.length > 0 ||
            loanAccounts.length > 0 ||
            investmentAccounts.length > 0) && (
            <View
              style={{
                backgroundColor: colors.primary + "10",
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.primary + "30",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons
                  name="sync"
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: colors.primary,
                  }}
                >
                  Auto-Import Assets & Debts
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  marginBottom: 16,
                  lineHeight: 20,
                }}
              >
                Your connected accounts can automatically populate the Assets &
                Debts screen. Credit cards and loans appear as debts, while
                investment accounts appear as assets.
              </Text>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={handleAutoImport}
                  disabled={isImporting}
                  style={{
                    backgroundColor: colors.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    flex: 1,
                    opacity: isImporting ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: colors.buttonText,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    {isImporting ? "Importing..." : "Auto-Import Now"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{
                    backgroundColor: colors.surface,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                  >
                    View Assets & Debts
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
      </ScrollView>
    </SafeAreaView>
  );
};
