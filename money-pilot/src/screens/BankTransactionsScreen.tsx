import React, { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
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
import { useTranslation } from "react-i18next";

interface BankTransactionsScreenProps {
  navigation: any;
}

export const BankTransactionsScreen: React.FC<BankTransactionsScreenProps> = ({
  navigation,
}) => {
  // Ensure navigation is properly defined
  if (!navigation) {
    console.error("BankTransactionsScreen: navigation prop is undefined");
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#ffffff", fontSize: 16 }}>
            Navigation error
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  try {
    const { user } = useAuth();
    const { colors } = useTheme();
    const { t } = useTranslation();
    const dataContext = useData();
    const {
      bankAccounts,
      bankTransactions,
      refreshAssetsDebts,
      refreshBankData,
      isBankConnected,
    } = dataContext;
    const { hasPremiumAccess } = useSubscription();
    const { presentPaywall } = usePaywall();

    // Local state for UI
    const [refreshing, setRefreshing] = useState(false);
    const [isUsingRealData, setIsUsingRealData] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [dataRefreshKey, setDataRefreshKey] = useState(0);

    // Use global state directly
    const displayBankAccounts = bankAccounts || [];

    // Safely filter and sanitize account data - handle real API data issues
    const safeBankAccounts = (displayBankAccounts || []).map(
      (account: any) => ({
        ...account,
        name:
          typeof account.name === "string"
            ? account.name.replace(/[^\x20-\x7E]/g, "") // Remove non-ASCII characters
            : t("bank_transactions.unknown_account"),
        mask:
          typeof account.mask === "string"
            ? account.mask.replace(/[^\x20-\x7E]/g, "") // Remove non-ASCII characters
            : "****",
        subtype:
          typeof account.subtype === "string"
            ? account.subtype.replace(/[^\x20-\x7E]/g, "") // Remove non-ASCII characters
            : "unknown",
      })
    );

    // Filter accounts to only show checking/savings accounts (not loans)
    const checkingAccounts = safeBankAccounts.filter(
      (account: any) =>
        account.type === "depository" &&
        ["checking", "savings"].includes(account.subtype)
    );

    // Filter loan accounts from Plaid
    const loanAccounts = safeBankAccounts.filter(
      (account: any) => account.type === "loan"
    );

    // Filter credit card accounts from Plaid
    const creditCardAccounts = safeBankAccounts.filter(
      (account: any) =>
        account.type === "credit" && account.subtype === "credit card"
    );

    // Filter investment accounts from Plaid
    const investmentAccounts = safeBankAccounts.filter(
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

    // Simple refresh function using global state
    const refreshBankDataLocal = async (forceRefresh = false) => {
      if (!user?.uid || !isBankConnected) return;

      try {
        console.log(
          "🔄 BankTransactionsScreen: Refreshing bank data via DataContext"
        );
        await refreshBankData(forceRefresh);
        console.log(
          "✅ BankTransactionsScreen: Bank data refreshed successfully"
        );
      } catch (error) {
        console.error(
          "❌ BankTransactionsScreen: Failed to refresh bank data:",
          error
        );
        Alert.alert(
          t("common.error"),
          t("bank_transactions.failed_to_refresh")
        );
      }
    };

    useEffect(() => {
      if (user?.uid) {
        plaidService.setUserId(user.uid);
        setIsUsingRealData(isBankConnected);

        // Refresh bank data when screen loads
        if (isBankConnected) {
          console.log(
            "🔄 BankTransactionsScreen: Refreshing bank data on load"
          );
          refreshBankDataLocal();
        }
      }
    }, [user, isBankConnected]);

    // Refresh bank data when screen comes into focus
    useFocusEffect(
      React.useCallback(() => {
        if (user?.uid && isBankConnected) {
          console.log(
            "🔄 BankTransactionsScreen: Screen focused, refreshing bank data"
          );
          refreshBankDataLocal();
        }
      }, [user?.uid, isBankConnected])
    );

    const onRefresh = async () => {
      setRefreshing(true);
      try {
        // Refresh bank data via DataContext
        await refreshBankDataLocal(true); // Force refresh
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
          if (refreshAssetsDebts) {
            await refreshAssetsDebts();
            // Assets and debts refreshed quickly
          }

          // Force a re-render of this screen to show updated data
          setDataRefreshKey((prev) => prev + 1);
          // Screen refresh triggered
        } catch (refreshError) {
          // Quick refresh completed
        }

        Alert.alert(
          t("bank_transactions.auto_import_complete"),
          t("bank_transactions.successfully_imported", {
            assets: result.importedAssets.length,
            debts: result.importedDebts.length,
          }),
          [
            {
              text: t("bank_transactions.view_assets_debts"),
              onPress: () => navigation.goBack(),
            },
            { text: t("common.ok") },
          ]
        );
      } catch (error) {
        console.error("Error during auto-import:", error);
        Alert.alert(
          t("bank_transactions.import_error"),
          t("bank_transactions.import_error_message"),
          [{ text: t("common.ok") }]
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
            title={t("bank_transactions.title")}
            subtitle={t("bank_transactions.subtitle")}
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
                {t("bank_transactions.account_summary")}
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
                      {t("bank_transactions.checking_savings")}
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
                      {checkingAccounts.length}{" "}
                      {checkingAccounts.length === 1
                        ? t("bank_transactions.account")
                        : t("bank_transactions.accounts")}
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
                      {t("bank_transactions.credit_cards")}
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
                      {creditCardAccounts.length}{" "}
                      {creditCardAccounts.length === 1
                        ? t("bank_transactions.account")
                        : t("bank_transactions.accounts")}
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
                      {t("bank_transactions.investments")}
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
                      {investmentAccounts.length}{" "}
                      {investmentAccounts.length === 1
                        ? t("bank_transactions.account")
                        : t("bank_transactions.accounts")}
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
                      {t("bank_transactions.loans")}
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
                      {loanAccounts.length}{" "}
                      {loanAccounts.length === 1
                        ? t("bank_transactions.account")
                        : t("bank_transactions.accounts")}
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
                {t("bank_transactions.connect_your_bank")}
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
                {t("bank_transactions.connect_your_bank_description")}
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
                  {t("bank_transactions.get_premium")}
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
                {t("bank_transactions.connect_bank_account")}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {t("bank_transactions.go_to_settings_description")}
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
                {t("bank_transactions.total_balance")}
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
                {checkingAccounts.length === 1
                  ? t("bank_transactions.across_accounts", {
                      count: checkingAccounts.length,
                    })
                  : t("bank_transactions.across_accounts_plural", {
                      count: checkingAccounts.length,
                    })}
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
                {t("bank_transactions.account_balances")}
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
                      {(account.name || "")
                        .toString()
                        .replace(/[^\x20-\x7E]/g, "")
                        .trim() || t("bank_transactions.checking_account")}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      ****
                      {(account.mask || "")
                        .toString()
                        .replace(/[^\x20-\x7E]/g, "")
                        .trim() || "0000"}{" "}
                      •{" "}
                      {(account.subtype || "")
                        .toString()
                        .replace(/[^\x20-\x7E]/g, "")
                        .trim() || t("bank_transactions.checking")}
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
                      {formatCurrency(account.balances?.current || 0)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {t("bank_transactions.available")}:{" "}
                      {formatCurrency(account.balances.available)}
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
                  {t("bank_transactions.connected_loan_accounts")}
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
                      {(account.name || "")
                        .toString()
                        .replace(/[^\x20-\x7E]/g, "")
                        .trim() || t("bank_transactions.loan_account")}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {(account.subtype || "")
                        .toString()
                        .replace(/[^\x20-\x7E]/g, "")
                        .trim() || t("bank_transactions.loan")}{" "}
                      • ****
                      {(account.mask || "")
                        .toString()
                        .replace(/[^\x20-\x7E]/g, "")
                        .trim() || "0000"}
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
                      {formatCurrency(Math.abs(account.balances?.current || 0))}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {t("bank_transactions.remaining_balance")}
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
                {t("bank_transactions.connected_loan_accounts_sync")}
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
                  {t("bank_transactions.connected_credit_cards")}
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
                      {(account.name || "")
                        .toString()
                        .replace(/[^\x20-\x7E]/g, "")
                        .trim() || t("bank_transactions.credit_card")}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {t("bank_transactions.credit_card")} • ****
                      {(account.mask || "")
                        .toString()
                        .replace(/[^\x20-\x7E]/g, "")
                        .trim() || "0000"}
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
                      {formatCurrency(Math.abs(account.balances?.current || 0))}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {t("bank_transactions.current_balance")}
                    </Text>
                    {account.balances?.limit && (
                      <Text
                        style={{
                          fontSize: 10,
                          color: colors.textSecondary,
                          marginTop: 1,
                        }}
                      >
                        {t("bank_transactions.limit")}:{" "}
                        {formatCurrency(account.balances.limit)}
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
                {t("bank_transactions.credit_card_balances_sync")}
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
                  {t("bank_transactions.connected_investment_accounts")}
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
                      {(account.name || "")
                        .toString()
                        .replace(/[^\x20-\x7E]/g, "")
                        .trim() || t("bank_transactions.investment_account")}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                      numberOfLines={1}
                    >
                      {(account.subtype || "")
                        .toString()
                        .replace(/[^\x20-\x7E]/g, "")
                        .trim() || t("bank_transactions.investment")}{" "}
                      • ****
                      {(account.mask || "")
                        .toString()
                        .replace(/[^\x20-\x7E]/g, "")
                        .trim() || "0000"}
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
                      {formatCurrency(account.balances?.current || 0)}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.textSecondary,
                        marginTop: 2,
                      }}
                    >
                      {t("bank_transactions.current_value")}
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
                {t("bank_transactions.investment_account_values_sync")}
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
                    {t("bank_transactions.auto_import_assets_debts")}
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
                  {t("bank_transactions.auto_import_description")}
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
                      {isImporting
                        ? t("bank_transactions.importing")
                        : t("bank_transactions.auto_import_now")}
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
                      {t("bank_transactions.view_assets_debts")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
        </ScrollView>
      </SafeAreaView>
    );
  } catch (error) {
    console.error("BankTransactionsScreen error:", error);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#ffffff", fontSize: 16 }}>
            Error loading bank transactions
          </Text>
        </View>
      </SafeAreaView>
    );
  }
};
