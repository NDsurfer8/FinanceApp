import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../hooks/useAuth";
import { useData } from "../contexts/DataContext";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../contexts/CurrencyContext";
import {
  SharedGroup,
  getSharedGroup,
  deleteSharedGroup,
  leaveGroup,
  transferGroupOwnership,
  removeGroupMember,
} from "../services/userData";
import {
  getGroupSharedData,
  syncUserDataToGroup,
  getUserGroupSharingSettings,
} from "../services/sharedFinanceDataSync";
import { StandardHeader } from "../components/StandardHeader";

interface SharedGroupDetailProps {
  navigation: any;
  route: {
    params: {
      groupId: string;
      onGroupDeleted?: (groupId: string) => void;
      onGroupLeft?: (groupId: string) => void;
    };
  };
}

export default function SharedGroupDetailFixed({
  navigation,
  route,
}: SharedGroupDetailProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const { transactions, assets, debts, goals, recurringTransactions } =
    useData();
  const { groupId, onGroupDeleted, onGroupLeft } = route.params;
  const [group, setGroup] = useState<SharedGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState({
    netWorth: 0,
    assets: 0,
    debts: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    memberIncomes: [] as {
      memberId: string;
      displayName: string;
      income: number;
      expenses: number;
    }[],
    recentTransactions: [] as {
      id: string;
      description: string;
      amount: number;
      ownerId: string;
      ownerName: string;
      date: number;
    }[],
  });
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showGroupOptions, setShowGroupOptions] = useState(false);

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  // Set up header with refresh button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleManualRefresh}
          style={{ marginRight: 15 }}
          disabled={loading}
        >
          <Ionicons
            name={loading ? "refresh" : "refresh-outline"}
            size={24}
            color={loading ? colors.primary : colors.text}
            style={loading ? { opacity: 0.5 } : {}}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, loading, colors.primary, colors.text]);

  const handleManualRefresh = async () => {
    if (!user?.uid || !group) return;

    try {
      setLoading(true);

      // Get user's current sharing settings for this group
      const userSharingSettings = await getUserGroupSharingSettings(
        user.uid,
        groupId
      );

      if (userSharingSettings) {
        // Get user's current financial data from context
        const userData = {
          transactions,
          assets,
          debts,
          goals,
          recurringTransactions,
        };

        await syncUserDataToGroup(
          user.uid,
          groupId,
          userSharingSettings,
          userData
        );

        // Reload the group data to show updated information
        await loadGroupData();

        Alert.alert(
          t("common.success"),
          t("group_detail.group_data_refreshed")
        );
      } else {
        Alert.alert(t("common.info"), t("group_detail.no_sharing_settings"));
      }
    } catch (error) {
      console.error("Error refreshing group data:", error);
      Alert.alert(t("common.error"), t("group_detail.error_refreshing_group"));
    } finally {
      setLoading(false);
    }
  };

  const loadGroupData = async () => {
    try {
      setLoading(true);
      const realGroup = await getSharedGroup(groupId);

      if (realGroup) {
        setGroup(realGroup);

        // Automatically sync user's data when opening the group
        if (user?.uid) {
          try {
            // Get user's current sharing settings for this group
            const userSharingSettings = await getUserGroupSharingSettings(
              user.uid,
              groupId
            );

            if (userSharingSettings) {
              // Get user's current financial data from context
              const userData = {
                transactions,
                assets,
                debts,
                goals,
                recurringTransactions,
              };

              await syncUserDataToGroup(
                user.uid,
                groupId,
                userSharingSettings,
                userData
              );
            } else {
              console.log("⚠️ No sharing settings found for auto-sync");
            }
          } catch (syncError) {
            // console.error("❌ Error during auto-sync:", syncError);
            // Don't show error to user for auto-sync, just log it
          }
        }

        await loadGroupFinancialData(realGroup);
      } else {
        Alert.alert(t("common.error"), t("group_detail.group_not_found_error"));
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error loading group data:", error);
      Alert.alert(
        t("common.error"),
        t("group_detail.failed_to_load_group_data")
      );
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadGroupFinancialData = async (group: SharedGroup) => {
    try {
      // Try to load shared finance data first
      const sharedData = await getGroupSharedData(groupId);

      if (sharedData && Object.keys(sharedData.members).length > 0) {
        // Use the shared data structure
        let totalNetWorth = 0;
        let totalAssets = 0;
        let totalDebts = 0;
        let totalMonthlyIncome = 0;
        let totalMonthlyExpenses = 0;
        const memberIncomes: {
          memberId: string;
          displayName: string;
          income: number;
          expenses: number;
        }[] = [];
        const allTransactions: {
          id: string;
          description: string;
          amount: number;
          ownerId: string;
          ownerName: string;
          date: number;
        }[] = [];

        // Process shared data from each member
        for (const [userId, memberData] of Object.entries(sharedData.members)) {
          // Process assets and debts for net worth breakdown
          if (memberData.assets && memberData.assets.length > 0) {
            const memberAssets = memberData.assets.reduce(
              (sum, asset) => sum + (asset.balance || 0),
              0
            );
            totalAssets += memberAssets;
          }

          if (memberData.debts && memberData.debts.length > 0) {
            const memberDebts = memberData.debts.reduce(
              (sum, debt) => sum + (debt.balance || 0),
              0
            );
            totalDebts += memberDebts;
          }

          // Calculate net worth from assets and debts
          if (memberData.assets || memberData.debts) {
            const memberAssets = memberData.assets
              ? memberData.assets.reduce(
                  (sum, asset) => sum + (asset.balance || 0),
                  0
                )
              : 0;
            const memberDebts = memberData.debts
              ? memberData.debts.reduce(
                  (sum, debt) => sum + (debt.balance || 0),
                  0
                )
              : 0;
            const memberNetWorth = memberAssets - memberDebts;
            totalNetWorth += memberNetWorth;
          }

          if (memberData.monthlyIncome !== undefined) {
            totalMonthlyIncome += memberData.monthlyIncome;
          }

          if (memberData.monthlyExpenses !== undefined) {
            totalMonthlyExpenses += memberData.monthlyExpenses;
          }

          // Add member to income list
          memberIncomes.push({
            memberId: userId,
            displayName: memberData.displayName,
            income: memberData.monthlyIncome || 0,
            expenses: memberData.monthlyExpenses || 0,
          });

          // Add transactions if shared
          if (memberData.transactions && memberData.transactions.length > 0) {
            for (const transaction of memberData.transactions) {
              // Skip transactions that were created from recurring transactions and marked as paid
              // to avoid duplicates with recurring transaction templates
              if (
                transaction.recurringTransactionId &&
                transaction.status === "paid"
              ) {
                continue;
              }

              allTransactions.push({
                id: transaction.id || "",
                description: transaction.description,
                amount:
                  transaction.type === "expense"
                    ? -Math.abs(transaction.amount)
                    : Math.abs(transaction.amount),
                ownerId: userId,
                ownerName: memberData.displayName,
                date: transaction.date,
              });
            }
          }

          // Add recurring transactions if shared
          if (
            memberData.recurringTransactions &&
            memberData.recurringTransactions.length > 0
          ) {
            for (const recurring of memberData.recurringTransactions) {
              allTransactions.push({
                id: recurring.id || "",
                description: recurring.name,
                amount:
                  recurring.type === "expense"
                    ? -Math.abs(recurring.amount)
                    : Math.abs(recurring.amount),
                ownerId: userId,
                ownerName: memberData.displayName,
                date: recurring.startDate,
              });
            }
          }
        }

        setGroupData({
          netWorth: totalNetWorth,
          assets: totalAssets,
          debts: totalDebts,
          monthlyIncome: totalMonthlyIncome,
          monthlyExpenses: totalMonthlyExpenses,
          memberIncomes,
          recentTransactions: allTransactions.sort((a, b) => b.date - a.date),
        });
      } else {
        // Show empty state if no shared data exists
        setGroupData({
          netWorth: 0,
          assets: 0,
          debts: 0,
          monthlyIncome: 0,
          monthlyExpenses: 0,
          memberIncomes: group.members.map((member) => ({
            memberId: member.userId,
            displayName: member.displayName,
            income: 0,
            expenses: 0,
          })),
          recentTransactions: [],
        });
      }
    } catch (error) {
      console.error("❌ Error loading group financial data:", error);

      // Show empty state on error
      setGroupData({
        netWorth: 0,
        assets: 0,
        debts: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        memberIncomes: group.members.map((member) => ({
          memberId: member.userId,
          displayName: member.displayName,
          income: 0,
          expenses: 0,
        })),
        recentTransactions: [],
      });
    }
  };

  // formatCurrency is now provided by useCurrency() hook

  const handleRefreshGroup = async () => {
    try {
      // Refresh all group data
      await loadGroupData();

      Alert.alert(
        t("common.success"),
        t("group_detail.group_data_refreshed_success")
      );
    } catch (error) {
      console.error("Error refreshing group data:", error);
      Alert.alert(
        t("common.error"),
        t("group_detail.failed_to_refresh_group_data")
      );
    }
  };

  const handleLeaveGroup = async () => {
    if (!user?.uid || !group) return;

    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave "${group.name}"? You will no longer see shared data from this group.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave Group",
          style: "destructive",
          onPress: async () => {
            try {
              // Stop real-time data sharing
              // Note: Real-time data sharing cleanup will be handled when implementing the new sync system

              // Leave the group
              await leaveGroup(groupId, user.uid);

              Alert.alert(
                t("common.success"),
                "You have left the group successfully."
              );
              navigation.goBack();
              onGroupLeft?.(groupId);
            } catch (error) {
              console.error("Error leaving group:", error);
              Alert.alert("Error", "Failed to leave group. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = async () => {
    if (!user?.uid || !group) return;

    Alert.alert(
      "Delete Group",
      `Are you sure you want to delete "${group.name}"? This action cannot be undone and will remove all shared data for all members.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Group",
          style: "destructive",
          onPress: async () => {
            try {
              // Stop real-time data sharing for all members first
              if (group.members) {
                for (const member of group.members) {
                  try {
                    // Note: Real-time data sharing cleanup will be handled when implementing the new sync system
                  } catch (error) {
                    console.error(
                      `Error stopping real-time sharing for ${member.userId}:`,
                      error
                    );
                    // Continue with other members even if one fails
                  }
                }
              }

              // Delete the group (this will also clean up all shared financial data)
              await deleteSharedGroup(groupId, user.uid);

              Alert.alert(
                t("common.success"),
                "Group deleted successfully. All shared data has been removed."
              );

              // Call the callback to update parent screen state
              onGroupDeleted?.(groupId);

              // Navigate back to the shared finance screen
              navigation.goBack();
            } catch (error) {
              console.error("Error deleting group:", error);
              Alert.alert("Error", "Failed to delete group. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleTransferOwnership = () => {
    if (!group?.members) return;

    const nonOwnerMembers = group.members.filter(
      (member) => member.role !== "owner"
    );

    if (nonOwnerMembers.length === 0) {
      Alert.alert(
        "No Members",
        "There are no other members to transfer ownership to."
      );
      return;
    }

    const memberOptions = nonOwnerMembers.map((member) => ({
      text: member.displayName,
      onPress: () =>
        confirmTransferOwnership(member.userId, member.displayName),
    }));

    Alert.alert(
      "Transfer Ownership",
      "Select a member to transfer ownership to:",
      [{ text: "Cancel", style: "cancel" }, ...memberOptions]
    );
  };

  const confirmTransferOwnership = async (
    newOwnerId: string,
    newOwnerName: string
  ) => {
    if (!user?.uid || !group) return;

    Alert.alert(
      "Confirm Transfer",
      `Are you sure you want to transfer ownership of "${group.name}" to ${newOwnerName}? You will become a regular member.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer Ownership",
          style: "destructive",
          onPress: async () => {
            try {
              await transferGroupOwnership(groupId, user.uid, newOwnerId);

              Alert.alert(
                t("common.success"),
                `Ownership transferred to ${newOwnerName} successfully.`
              );
              await loadGroupData(); // Reload to show updated roles
            } catch (error) {
              console.error("Error transferring ownership:", error);
              Alert.alert(
                "Error",
                "Failed to transfer ownership. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (member: any) => {
    if (!user?.uid || !group) return;

    // Don't allow removing yourself
    if (member.userId === user.uid) {
      Alert.alert(
        "Cannot Remove Self",
        "You cannot remove yourself from the group. Use 'Leave Group' instead."
      );
      return;
    }

    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${member.displayName} from "${group.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove Member",
          style: "destructive",
          onPress: async () => {
            try {
              // Stop real-time data sharing for the removed member
              // Note: Real-time data sharing cleanup will be handled when implementing the new sync system

              // Remove the member
              await removeGroupMember(groupId, member.userId);

              Alert.alert(
                t("common.success"),
                `${member.displayName} has been removed from the group.`
              );
              await loadGroupData(); // Reload to show updated members
            } catch (error) {
              console.error("Error removing member:", error);
              Alert.alert(
                "Error",
                "Failed to remove member. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const isOwner =
    group?.members?.some(
      (member) => member.userId === user?.uid && member.role === "owner"
    ) || false;
  const isMember =
    group?.members?.some((member) => member.userId === user?.uid) || false;

  const renderHeader = () => (
    <StandardHeader
      title={group?.name || t("group_detail.title")}
      subtitle={t("group_detail.subtitle", { count: group?.members.length })}
      onBack={() => navigation.goBack()}
      rightComponent={
        <TouchableOpacity
          style={styles.optionsButton}
          onPress={() => setShowGroupOptions(!showGroupOptions)}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={colors.primary} />
        </TouchableOpacity>
      }
    />
  );

  const renderGroupOptionsModal = () =>
    showGroupOptions && (
      <View
        style={[
          styles.optionsModal,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {isOwner && (
          <>
            <TouchableOpacity
              style={[styles.optionItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setShowGroupOptions(false);
                navigation.navigate("GroupMembers", { groupId, group });
              }}
            >
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={[styles.optionText, { color: colors.text }]}>
                {t("group_detail.manage_members")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, { borderBottomColor: colors.border }]}
              onPress={handleTransferOwnership}
            >
              <Ionicons
                name="swap-horizontal"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.optionText, { color: colors.text }]}>
                {t("group_detail.transfer_ownership")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionItem, { borderBottomColor: colors.border }]}
              onPress={handleDeleteGroup}
            >
              <Ionicons name="trash" size={20} color={colors.error} />
              <Text style={[styles.optionText, { color: colors.error }]}>
                {t("group_detail.delete_group")}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {isMember && !isOwner && (
          <TouchableOpacity
            style={[styles.optionItem, { borderBottomColor: colors.border }]}
            onPress={handleLeaveGroup}
          >
            <Ionicons name="exit" size={20} color={colors.warning} />
            <Text style={[styles.optionText, { color: colors.warning }]}>
              {t("group_detail.leave_group")}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.optionItem}
          onPress={() => setShowGroupOptions(false)}
        >
          <Ionicons name="close" size={20} color={colors.textSecondary} />
          <Text style={[styles.optionText, { color: colors.textSecondary }]}>
            {t("group_detail.close")}
          </Text>
        </TouchableOpacity>
      </View>
    );

  const renderNetWorthCard = () => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View
          style={[styles.cardIcon, { backgroundColor: colors.primary + "20" }]}
        >
          <Ionicons name="trending-up" size={24} color={colors.primary} />
        </View>
        <View style={styles.cardTitleSection}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t("group_detail.shared_net_worth")}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {t("group_detail.combined_assets_debts")}
          </Text>
        </View>
      </View>

      <View style={styles.netWorthSection}>
        <View style={styles.netWorthMain}>
          <Text
            style={[
              styles.netWorthAmount,
              {
                color: groupData.netWorth >= 0 ? colors.text : colors.error,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.6}
          >
            {groupData.netWorth >= 0 ? "" : "-"}
            {formatCurrency(Math.abs(groupData.netWorth))}
          </Text>
          <Text style={[styles.netWorthLabel, { color: colors.textSecondary }]}>
            {t("group_detail.total_net_worth_current")}
          </Text>
        </View>

        <View style={styles.netWorthBreakdown}>
          <View style={styles.breakdownItem}>
            <Text
              style={[styles.breakdownLabel, { color: colors.textSecondary }]}
            >
              {t("group_detail.assets")}
            </Text>
            <Text
              style={[styles.breakdownAmount, { color: colors.success }]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
            >
              {formatCurrency(groupData.assets)}
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text
              style={[styles.breakdownLabel, { color: colors.textSecondary }]}
            >
              {t("group_detail.debts")}
            </Text>
            <Text
              style={[styles.breakdownAmount, { color: colors.error }]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
            >
              {formatCurrency(groupData.debts)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderIncomeCard = () => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View
          style={[styles.cardIcon, { backgroundColor: colors.success + "20" }]}
        >
          <Ionicons name="cash" size={24} color={colors.success} />
        </View>
        <View style={styles.cardTitleSection}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t("group_detail.monthly_income")}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {t("group_detail.combined_monthly_earnings")}
          </Text>
        </View>
      </View>

      <View style={styles.incomeSection}>
        <View style={styles.incomeMain}>
          <Text
            style={[styles.incomeAmount, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.6}
          >
            {formatCurrency(groupData.monthlyIncome)}
          </Text>
          <Text style={[styles.incomeLabel, { color: colors.textSecondary }]}>
            {t("group_detail.total_monthly_income_current")}
          </Text>
        </View>

        <View style={styles.incomeBreakdown}>
          {groupData.memberIncomes.length > 0 ? (
            groupData.memberIncomes.map((memberIncome, index) => (
              <View key={index} style={styles.breakdownItem}>
                <View style={styles.memberInfo}>
                  <Text
                    style={[
                      styles.breakdownLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {memberIncome.displayName}
                  </Text>
                  <Text
                    style={[
                      styles.breakdownSubtext,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Income: {formatCurrency(memberIncome.income)}
                  </Text>
                  <Text
                    style={[
                      styles.breakdownSubtext,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Expenses: {formatCurrency(memberIncome.expenses)}
                  </Text>
                </View>
                <Text
                  style={[styles.breakdownAmount, { color: colors.success }]}
                >
                  {formatCurrency(memberIncome.income - memberIncome.expenses)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
              {t("group_detail.no_income_data_available")}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderTransactionsCard = () => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View
          style={[styles.cardIcon, { backgroundColor: colors.info + "20" }]}
        >
          <Ionicons name="list" size={24} color={colors.info} />
        </View>
        <View style={styles.cardTitleSection}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t("group_detail.recent_transactions")}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {t("group_detail.shared_spending_income")}
          </Text>
        </View>
        {groupData.recentTransactions.length > 5 && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => setShowAllTransactions(!showAllTransactions)}
          >
            <Text style={[styles.viewAllText, { color: colors.primary }]}>
              {showAllTransactions
                ? t("group_detail.show_less")
                : t("group_detail.view_all")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.transactionsList}>
        {groupData.recentTransactions.length > 0 ? (
          <>
            {/* Show first 5 transactions */}
            {groupData.recentTransactions.slice(0, 5).map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionInfo}>
                  <Text
                    style={[
                      styles.transactionDescription,
                      { color: colors.text },
                    ]}
                  >
                    {transaction.description}
                  </Text>
                  <Text
                    style={[
                      styles.transactionOwner,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {transaction.ownerName} •{" "}
                    {new Date(transaction.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    {
                      color:
                        transaction.amount >= 0 ? colors.success : colors.error,
                    },
                  ]}
                >
                  {transaction.amount >= 0 ? "+" : ""}
                  {formatCurrency(Math.abs(transaction.amount))}
                </Text>
              </View>
            ))}

            {/* Show remaining transactions if "View All" is expanded */}
            {showAllTransactions && groupData.recentTransactions.length > 5 && (
              <>
                {groupData.recentTransactions
                  .slice(5, 10)
                  .map((transaction) => (
                    <View key={transaction.id} style={styles.transactionItem}>
                      <View style={styles.transactionInfo}>
                        <Text
                          style={[
                            styles.transactionDescription,
                            { color: colors.text },
                          ]}
                        >
                          {transaction.description}
                        </Text>
                        <Text
                          style={[
                            styles.transactionOwner,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {transaction.ownerName} •{" "}
                          {new Date(transaction.date).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.transactionAmount,
                          {
                            color:
                              transaction.amount >= 0
                                ? colors.success
                                : colors.error,
                          },
                        ]}
                      >
                        {transaction.amount >= 0 ? "+" : ""}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </Text>
                    </View>
                  ))}
              </>
            )}
          </>
        ) : (
          <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
            {t("group_detail.no_transactions_available")}
          </Text>
        )}
      </View>
    </View>
  );

  const renderMembersCard = () => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View
          style={[styles.cardIcon, { backgroundColor: colors.warning + "20" }]}
        >
          <Ionicons name="people" size={24} color={colors.warning} />
        </View>
        <View style={styles.cardTitleSection}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {t("group_detail.group_members")}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {t("group_detail.subtitle", { count: group?.members.length })}
          </Text>
        </View>
      </View>

      <View style={styles.membersList}>
        {group?.members.map((member) => (
          <View key={member.id} style={styles.memberItem}>
            <View
              style={[
                styles.memberAvatar,
                { backgroundColor: colors.primary + "20" },
              ]}
            >
              <Text style={[styles.memberInitial, { color: colors.primary }]}>
                {member.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={[styles.memberName, { color: colors.text }]}>
                {member.displayName}
              </Text>
              <Text
                style={[styles.memberRole, { color: colors.textSecondary }]}
              >
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </Text>
            </View>
            <View
              style={[
                styles.memberStatus,
                { backgroundColor: colors.success + "20" },
              ]}
            >
              <Text
                style={[styles.memberStatusText, { color: colors.success }]}
              >
                {t("group_detail.active")}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  if (loading || !group) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t("group_detail.loading_group_data")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {renderGroupOptionsModal()}

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}

        <View style={styles.cardsContainer}>
          {renderNetWorthCard()}
          {renderIncomeCard()}
          {renderTransactionsCard()}
          {renderMembersCard()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    marginRight: 20,
    padding: 10,
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  menuButton: {
    padding: 8,
  },
  cardsContainer: {
    paddingVertical: 20,
    gap: 20,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardTitleSection: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  viewAllButton: {
    padding: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  netWorthSection: {
    alignItems: "center",
  },
  netWorthMain: {
    alignItems: "center",
    marginBottom: 20,
  },
  netWorthAmount: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 8,
  },
  netWorthLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  netWorthBreakdown: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  breakdownItem: {
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  breakdownAmount: {
    fontSize: 18,
    fontWeight: "700",
  },
  breakdownSubtext: {
    fontSize: 12,
    marginBottom: 2,
  },
  noDataText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 20,
  },
  incomeSection: {
    alignItems: "center",
  },
  incomeMain: {
    alignItems: "center",
    marginBottom: 20,
  },
  incomeAmount: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  incomeLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 20,
  },
  incomeBreakdown: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  transactionsList: {
    gap: 16,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  transactionOwner: {
    fontSize: 14,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  membersList: {
    gap: 16,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: "700",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 14,
  },
  memberStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  memberStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  optionsButton: {
    padding: 8,
  },
  optionsModal: {
    position: "absolute",
    top: 80,
    right: 20,
    width: 200,
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
    borderWidth: 1,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "500",
  },
});
