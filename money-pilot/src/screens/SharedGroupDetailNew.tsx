import React, { useState, useEffect } from "react";
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
import { SharedGroup, getSharedGroup } from "../services/userData";
import {
  getGroupSharedData,
  SharedFinanceData,
} from "../services/sharedFinanceDataSync";

interface SharedGroupDetailProps {
  navigation: any;
  route: {
    params: {
      groupId: string;
    };
  };
}

export default function SharedGroupDetailNew({
  navigation,
  route,
}: SharedGroupDetailProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { groupId } = route.params;
  const [group, setGroup] = useState<SharedGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState({
    netWorth: 0,
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

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  const loadGroupData = async () => {
    try {
      setLoading(true);
      const realGroup = await getSharedGroup(groupId);

      if (realGroup) {
        setGroup(realGroup);
        await loadGroupFinancialData(realGroup);
      } else {
        Alert.alert("Error", "Group not found");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error loading group data:", error);
      Alert.alert("Error", "Failed to load group data");
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
          if (memberData.netWorth) {
            totalNetWorth += memberData.netWorth.current;
          }

          if (memberData.monthlyIncome) {
            totalMonthlyIncome += memberData.monthlyIncome;
          }

          if (memberData.monthlyExpenses) {
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
          if (memberData.transactions) {
            for (const transaction of memberData.transactions) {
              allTransactions.push({
                id: transaction.id || "",
                description: transaction.description,
                amount: transaction.amount,
                ownerId: userId,
                ownerName: memberData.displayName,
                date: transaction.date,
              });
            }
          }

          // Add recurring transactions if shared
          if (memberData.recurringTransactions) {
            for (const recurring of memberData.recurringTransactions) {
              allTransactions.push({
                id: recurring.id || "",
                description: recurring.name,
                amount: recurring.amount,
                ownerId: userId,
                ownerName: memberData.displayName,
                date: recurring.startDate,
              });
            }
          }
        }

        setGroupData({
          netWorth: totalNetWorth,
          monthlyIncome: totalMonthlyIncome,
          monthlyExpenses: totalMonthlyExpenses,
          memberIncomes,
          recentTransactions: allTransactions.sort((a, b) => b.date - a.date),
        });
      } else {
        // Show empty state if no shared data exists
        setGroupData({
          netWorth: 0,
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
      console.error("Error loading group financial data:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Group not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {group.name}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            {group.description}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Cards */}
        <View style={styles.overviewSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Group Overview
          </Text>

          <View style={styles.overviewGrid}>
            <View
              style={[styles.overviewCard, { backgroundColor: colors.surface }]}
            >
              <Text
                style={[styles.overviewLabel, { color: colors.textSecondary }]}
              >
                Total Net Worth
              </Text>
              <Text style={[styles.overviewValue, { color: colors.text }]}>
                {formatCurrency(groupData.netWorth)}
              </Text>
            </View>

            <View
              style={[styles.overviewCard, { backgroundColor: colors.surface }]}
            >
              <Text
                style={[styles.overviewLabel, { color: colors.textSecondary }]}
              >
                Monthly Income
              </Text>
              <Text style={[styles.overviewValue, { color: colors.text }]}>
                {formatCurrency(groupData.monthlyIncome)}
              </Text>
            </View>

            <View
              style={[styles.overviewCard, { backgroundColor: colors.surface }]}
            >
              <Text
                style={[styles.overviewLabel, { color: colors.textSecondary }]}
              >
                Monthly Expenses
              </Text>
              <Text style={[styles.overviewValue, { color: colors.text }]}>
                {formatCurrency(groupData.monthlyExpenses)}
              </Text>
            </View>
          </View>
        </View>

        {/* Member Breakdown */}
        <View style={styles.membersSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Member Breakdown
          </Text>

          {groupData.memberIncomes.map((member) => (
            <View
              key={member.memberId}
              style={[styles.memberCard, { backgroundColor: colors.surface }]}
            >
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: colors.text }]}>
                  {member.displayName}
                </Text>
              </View>
              <View style={styles.memberFinancials}>
                <View style={styles.memberIncome}>
                  <Text
                    style={[
                      styles.memberLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Income
                  </Text>
                  <Text style={[styles.memberValue, { color: colors.success }]}>
                    {formatCurrency(member.income)}
                  </Text>
                </View>
                <View style={styles.memberExpenses}>
                  <Text
                    style={[
                      styles.memberLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Expenses
                  </Text>
                  <Text style={[styles.memberValue, { color: colors.error }]}>
                    {formatCurrency(member.expenses)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent Transactions
          </Text>

          {groupData.recentTransactions.length > 0 ? (
            groupData.recentTransactions.slice(0, 10).map((transaction) => (
              <View
                key={transaction.id}
                style={[
                  styles.transactionCard,
                  { backgroundColor: colors.surface },
                ]}
              >
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
                    {transaction.ownerName}
                  </Text>
                  <Text
                    style={[
                      styles.transactionDate,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {formatDate(transaction.date)}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text
                    style={[
                      styles.transactionAmountText,
                      {
                        color:
                          transaction.amount >= 0
                            ? colors.success
                            : colors.error,
                      },
                    ]}
                  >
                    {transaction.amount >= 0 ? "+" : ""}
                    {formatCurrency(transaction.amount)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View
              style={[styles.emptyState, { backgroundColor: colors.surface }]}
            >
              <Ionicons
                name="receipt-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.emptyStateText, { color: colors.textSecondary }]}
              >
                No transactions to show
              </Text>
              <Text
                style={[
                  styles.emptyStateSubtext,
                  { color: colors.textSecondary },
                ]}
              >
                Members need to share their transaction data to see it here
              </Text>
            </View>
          )}
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
    padding: 8,
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#8E8E93",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 18,
    color: "#FF3B30",
  },
  overviewSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: "row",
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  overviewLabel: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  membersSection: {
    marginBottom: 32,
  },
  memberCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  memberInfo: {
    marginBottom: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
  },
  memberFinancials: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  memberIncome: {
    alignItems: "center",
  },
  memberExpenses: {
    alignItems: "center",
  },
  memberLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  memberValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  transactionsSection: {
    marginBottom: 32,
  },
  transactionCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
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
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionAmount: {
    marginLeft: 16,
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
