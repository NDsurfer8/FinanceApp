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
import {
  SharedGroup,
  getSharedGroup,
  getUserNetWorthEntries,
  getUserTransactions,
  getUserRecurringTransactions,
} from "../services/userData";
import { getGroupSharedData } from "../services/sharedFinanceDataSync";

interface SharedGroupDetailProps {
  navigation: any;
  route: {
    params: {
      groupId: string;
    };
  };
}

export default function SharedGroupDetail({
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

      // Load financial data for each member
      for (const member of group.members) {
        let monthlyIncome = 0;
        let monthlyExpenses = 0;

        try {
          // Load net worth data
          const netWorthEntries = await getUserNetWorthEntries(member.userId);
          if (netWorthEntries.length > 0) {
            const latestEntry = netWorthEntries[0]; // Most recent entry
            totalNetWorth += latestEntry.netWorth;
            totalAssets += latestEntry.assets;
            totalDebts += latestEntry.debts;
          }

          // Load both regular transactions and recurring transactions for monthly income calculation
          const [transactions, recurringTransactions] = await Promise.all([
            getUserTransactions(member.userId),
            getUserRecurringTransactions(member.userId),
          ]);

          console.log(
            `Regular transactions for ${member.displayName}:`,
            transactions.length
          );
          console.log(
            `Recurring transactions for ${member.displayName}:`,
            recurringTransactions.length
          );

          // Helper function to check if recurring transaction should be counted for current month
          const shouldCountRecurringTransaction = (
            recurring: any,
            monthStart: number,
            monthEnd: number
          ) => {
            if (!recurring.isActive) return false;

            // For recurring transactions, use startDate to determine which month they belong to
            if (
              recurring.startDate >= monthStart &&
              recurring.startDate <= monthEnd
            ) {
              return true;
            }

            return false;
          };

          // Process regular transactions and recurring transactions separately
          if (transactions.length > 0 || recurringTransactions.length > 0) {
            // Use current month for income/expense calculations
            const currentDate = new Date();
            const currentMonthStart = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              1
            ).getTime();
            const currentMonthEnd = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth() + 1,
              0,
              23,
              59,
              59,
              999
            ).getTime(); // End of current month (last millisecond of last day)

            console.log(`Current month: ${currentDate.toLocaleDateString()}`);
            console.log(
              `Current month range: ${new Date(
                currentMonthStart
              ).toLocaleDateString()} - ${new Date(
                currentMonthEnd
              ).toLocaleDateString()}`
            );

            // Check if we have any transactions in current month
            const currentMonthRegularTransactions = transactions.filter(
              (t) => t.date >= currentMonthStart && t.date <= currentMonthEnd
            );
            const currentMonthRecurringTransactions =
              recurringTransactions.filter((r) =>
                shouldCountRecurringTransaction(
                  r,
                  currentMonthStart,
                  currentMonthEnd
                )
              );

            const totalCurrentMonthTransactions =
              currentMonthRegularTransactions.length +
              currentMonthRecurringTransactions.length;

            if (totalCurrentMonthTransactions === 0) {
              console.log(
                "No transactions in current month, using most recent month with data"
              );
              // Find the most recent month from transactions
              const mostRecentDate = Math.max(
                ...transactions.map((t) => t.date)
              );
              const mostRecentMonth = new Date(mostRecentDate);
              const monthStart = new Date(
                mostRecentMonth.getFullYear(),
                mostRecentMonth.getMonth(),
                1
              ).getTime();
              const monthEnd = new Date(
                mostRecentMonth.getFullYear(),
                mostRecentMonth.getMonth() + 1,
                0,
                23,
                59,
                59,
                999
              ).getTime();

              console.log(
                `Most recent month with data: ${mostRecentMonth.toLocaleDateString()}`
              );
              console.log(
                `Month range: ${new Date(
                  monthStart
                ).toLocaleDateString()} - ${new Date(
                  monthEnd
                ).toLocaleDateString()}`
              );

              // Use the most recent month for calculations
              transactions.forEach((transaction) => {
                console.log(
                  `Transaction: ${transaction.description}, Type: ${
                    transaction.type
                  }, Amount: ${transaction.amount}, Date: ${new Date(
                    transaction.date
                  ).toLocaleDateString()}`
                );

                if (
                  transaction.date >= monthStart &&
                  transaction.date <= monthEnd
                ) {
                  if (transaction.type === "income") {
                    monthlyIncome += transaction.amount;
                    console.log(
                      `Added income: ${transaction.amount}, Total: ${monthlyIncome}`
                    );
                  } else if (transaction.type === "expense") {
                    monthlyExpenses += transaction.amount;
                    console.log(
                      `Added expense: ${transaction.amount}, Total: ${monthlyExpenses}`
                    );
                  }
                }

                // Add to all transactions for recent transactions display
                allTransactions.push({
                  id: transaction.id || `temp-${Date.now()}-${Math.random()}`,
                  description: transaction.description,
                  amount:
                    transaction.type === "income"
                      ? transaction.amount
                      : -transaction.amount,
                  ownerId: member.userId,
                  ownerName: member.displayName,
                  date: transaction.date,
                });
              });
            } else {
              console.log(
                `Found ${totalCurrentMonthTransactions} transactions in current month (${currentMonthRegularTransactions.length} regular + ${currentMonthRecurringTransactions.length} recurring)`
              );
              // Process regular transactions for current month
              transactions.forEach((transaction) => {
                console.log(
                  `Regular Transaction: ${transaction.description}, Type: ${
                    transaction.type
                  }, Amount: ${transaction.amount}, Date: ${new Date(
                    transaction.date
                  ).toLocaleDateString()}`
                );

                if (
                  transaction.date >= currentMonthStart &&
                  transaction.date <= currentMonthEnd
                ) {
                  if (transaction.type === "income") {
                    monthlyIncome += transaction.amount;
                    console.log(
                      `Added regular income: ${transaction.amount}, Total: ${monthlyIncome}`
                    );
                  } else if (transaction.type === "expense") {
                    monthlyExpenses += transaction.amount;
                    console.log(
                      `Added regular expense: ${transaction.amount}, Total: ${monthlyExpenses}`
                    );
                  }
                }

                // Add to all transactions for recent transactions display
                allTransactions.push({
                  id: transaction.id || `temp-${Date.now()}-${Math.random()}`,
                  description: transaction.description,
                  amount:
                    transaction.type === "income"
                      ? transaction.amount
                      : -transaction.amount,
                  ownerId: member.userId,
                  ownerName: member.displayName,
                  date: transaction.date,
                });
              });

              // Process recurring transactions for current month
              recurringTransactions.forEach((recurring) => {
                if (
                  shouldCountRecurringTransaction(
                    recurring,
                    currentMonthStart,
                    currentMonthEnd
                  )
                ) {
                  console.log(
                    `Recurring Transaction: ${recurring.name}, Type: ${recurring.type}, Amount: ${recurring.amount}, Frequency: ${recurring.frequency}`
                  );

                  if (recurring.type === "income") {
                    monthlyIncome += recurring.amount;
                    console.log(
                      `Added recurring income: ${recurring.amount}, Total: ${monthlyIncome}`
                    );
                  } else if (recurring.type === "expense") {
                    monthlyExpenses += recurring.amount;
                    console.log(
                      `Added recurring expense: ${recurring.amount}, Total: ${monthlyExpenses}`
                    );
                  }

                  // Add to all transactions for recent transactions display
                  allTransactions.push({
                    id: recurring.id || `temp-${Date.now()}-${Math.random()}`,
                    description: recurring.name,
                    amount:
                      recurring.type === "income"
                        ? recurring.amount
                        : -recurring.amount,
                    ownerId: member.userId,
                    ownerName: member.displayName,
                    date: recurring.startDate,
                  });
                }
              });
            }

            transactions.forEach((transaction) => {
              console.log(
                `Transaction: ${transaction.description}, Type: ${
                  transaction.type
                }, Amount: ${transaction.amount}, Date: ${new Date(
                  transaction.date
                ).toLocaleDateString()}`
              );

              console.log(
                `Transaction date: ${transaction.date}, Month start: ${currentMonthStart}, Month end: ${currentMonthEnd}`
              );
              console.log(
                `Transaction date (readable): ${new Date(
                  transaction.date
                ).toLocaleDateString()}`
              );
              console.log(
                `Month start (readable): ${new Date(
                  currentMonthStart
                ).toLocaleDateString()}`
              );
              console.log(
                `Month end (readable): ${new Date(
                  currentMonthEnd
                ).toLocaleDateString()}`
              );

              if (
                transaction.date >= currentMonthStart &&
                transaction.date <= currentMonthEnd
              ) {
                if (transaction.type === "income") {
                  monthlyIncome += transaction.amount;
                  console.log(
                    `Added income: ${transaction.amount}, Total: ${monthlyIncome}`
                  );
                } else if (transaction.type === "expense") {
                  monthlyExpenses += transaction.amount;
                  console.log(
                    `Added expense: ${transaction.amount}, Total: ${monthlyExpenses}`
                  );
                }
              }

              // Add to all transactions for recent transactions display
              allTransactions.push({
                id: transaction.id || `temp-${Date.now()}-${Math.random()}`,
                description: transaction.description,
                amount:
                  transaction.type === "income"
                    ? transaction.amount
                    : -transaction.amount,
                ownerId: member.userId,
                ownerName: member.displayName,
                date: transaction.date,
              });
            });
          } else {
            console.log(`No transactions found for ${member.displayName}`);
          }

          console.log(
            `Final monthly income for ${member.displayName}: ${monthlyIncome}`
          );
          console.log(
            `Final monthly expenses for ${member.displayName}: ${monthlyExpenses}`
          );

          totalMonthlyIncome += monthlyIncome;
          totalMonthlyExpenses += monthlyExpenses;
        } catch (error) {
          console.error(
            `Error loading data for member ${member.userId}:`,
            error
          );
        }

        // Always add member to the list, even if they have no financial data
        memberIncomes.push({
          memberId: member.userId,
          displayName: member.displayName,
          income: monthlyIncome || 0,
          expenses: monthlyExpenses || 0,
        });
      }

      // Sort transactions by date (most recent first)
      allTransactions.sort((a, b) => b.date - a.date);

      console.log("=== FINAL GROUP DATA ===");
      console.log("Total Net Worth:", totalNetWorth);
      console.log("Total Assets:", totalAssets);
      console.log("Total Debts:", totalDebts);
      console.log("Total Monthly Income:", totalMonthlyIncome);
      console.log("Total Monthly Expenses:", totalMonthlyExpenses);
      console.log("Member Incomes:", memberIncomes);
      console.log("All Transactions Count:", allTransactions.length);

      // Only show sample data if absolutely no financial data exists from any member
      if (
        totalNetWorth === 0 &&
        totalMonthlyIncome === 0 &&
        allTransactions.length === 0
      ) {
        console.log(
          "No financial data found from any member, showing sample data for testing"
        );
        setGroupData({
          netWorth: 125000,
          assets: 200000,
          debts: 75000,
          monthlyIncome: 8500,
          monthlyExpenses: 4200,
          memberIncomes: [
            {
              memberId: "sample-1",
              displayName: "You",
              income: 4500,
              expenses: 2200,
            },
            {
              memberId: "sample-2",
              displayName: "Partner",
              income: 4000,
              expenses: 2000,
            },
          ],
          recentTransactions: [
            {
              id: "sample-1",
              description: "Salary deposit",
              amount: 4500,
              ownerId: "sample-1",
              ownerName: "You",
              date: Date.now(),
            },
            {
              id: "sample-2",
              description: "Grocery shopping",
              amount: -120,
              ownerId: "sample-1",
              ownerName: "You",
              date: Date.now() - 86400000,
            },
          ],
        });
      } else {
        // Show real data even if some members have no financial data
        console.log("Showing real financial data from group members");
        setGroupData({
          netWorth: totalNetWorth,
          assets: totalAssets,
          debts: totalDebts,
          monthlyIncome: totalMonthlyIncome,
          monthlyExpenses: totalMonthlyExpenses,
          memberIncomes,
          recentTransactions: allTransactions.slice(0, 10), // Show only 10 most recent
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

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {group?.name}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
          >
            {group?.members.length} members • {group?.type}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => Alert.alert("Menu", "Group settings coming soon")}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
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
            Shared Net Worth
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Combined assets and debts
          </Text>
        </View>
      </View>

      <View style={styles.netWorthSection}>
        <View style={styles.netWorthMain}>
          <Text style={[styles.netWorthAmount, { color: colors.text }]}>
            {formatCurrency(groupData.netWorth)}
          </Text>
          <Text style={[styles.netWorthLabel, { color: colors.textSecondary }]}>
            Total Net Worth (Current)
          </Text>
        </View>

        <View style={styles.netWorthBreakdown}>
          <View style={styles.breakdownItem}>
            <Text
              style={[styles.breakdownLabel, { color: colors.textSecondary }]}
            >
              Assets
            </Text>
            <Text style={[styles.breakdownAmount, { color: colors.success }]}>
              {formatCurrency(groupData.assets)}
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text
              style={[styles.breakdownLabel, { color: colors.textSecondary }]}
            >
              Debts
            </Text>
            <Text style={[styles.breakdownAmount, { color: colors.error }]}>
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
            Monthly Income
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Combined monthly earnings
          </Text>
        </View>
      </View>

      <View style={styles.incomeSection}>
        <View style={styles.incomeMain}>
          <Text style={[styles.incomeAmount, { color: colors.text }]}>
            {formatCurrency(groupData.monthlyIncome)}
          </Text>
          <Text style={[styles.incomeLabel, { color: colors.textSecondary }]}>
            Total Monthly Income (Current Month)
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
              No income data available
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
            Recent Transactions
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Shared spending and income
          </Text>
        </View>
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() =>
            Alert.alert("Transactions", "Full transaction list coming soon")
          }
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>
            View All
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.transactionsList}>
        {groupData.recentTransactions.length > 0 ? (
          groupData.recentTransactions.map((transaction) => (
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
                      transaction.amount > 0 ? colors.success : colors.error,
                  },
                ]}
              >
                {transaction.amount > 0 ? "+" : ""}
                {formatCurrency(Math.abs(transaction.amount))}
              </Text>
            </View>
          ))
        ) : (
          <Text style={[styles.noDataText, { color: colors.textSecondary }]}>
            No transactions available
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
            Group Members
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            {group?.members.length} people sharing finances
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
                Active
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
            Loading group data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {renderHeader()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  menuButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
});
