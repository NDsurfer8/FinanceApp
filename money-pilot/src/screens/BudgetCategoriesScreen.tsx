import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";
import { StandardHeader } from "../components/StandardHeader";
import { useData } from "../contexts/DataContext";

interface BudgetCategory {
  id: string;
  name: string;
  monthlyLimit: number;
  color: string;
}

interface BudgetCategoriesScreenProps {
  navigation: any;
}

export const BudgetCategoriesScreen: React.FC<BudgetCategoriesScreenProps> = ({
  navigation,
}) => {
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();
  const { transactions, recurringTransactions, goals, budgetSettings } =
    useData();

  const [categories, setCategories] = useState<BudgetCategory[]>([
    { id: "1", name: "Rent", monthlyLimit: 1200, color: "#FF6B6B" },
    { id: "2", name: "Car Payment", monthlyLimit: 400, color: "#4ECDC4" },
    { id: "3", name: "Insurance", monthlyLimit: 200, color: "#45B7D1" },
    { id: "4", name: "Utilities", monthlyLimit: 150, color: "#96CEB4" },
    { id: "5", name: "Internet", monthlyLimit: 80, color: "#FFEAA7" },
    { id: "6", name: "Phone", monthlyLimit: 100, color: "#DDA0DD" },
    { id: "7", name: "Subscriptions", monthlyLimit: 50, color: "#FFB6C1" },
    { id: "8", name: "Credit Card", monthlyLimit: 300, color: "#98FB98" },
    { id: "9", name: "Loan Payment", monthlyLimit: 200, color: "#F0E68C" },
    { id: "10", name: "Food", monthlyLimit: 400, color: "#FFA07A" },
    { id: "11", name: "Transport", monthlyLimit: 150, color: "#87CEEB" },
    { id: "12", name: "Health", monthlyLimit: 100, color: "#D8BFD8" },
    { id: "13", name: "Entertainment", monthlyLimit: 100, color: "#FFD700" },
    { id: "14", name: "Shopping", monthlyLimit: 200, color: "#FF69B4" },
    { id: "15", name: "Business", monthlyLimit: 100, color: "#20B2AA" },
    { id: "16", name: "Other", monthlyLimit: 100, color: "#C0C0C0" },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(
    null
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryLimit, setNewCategoryLimit] = useState("");

  // Calculate current month data
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.date);
    return (
      transactionDate.getMonth() === currentMonth &&
      transactionDate.getFullYear() === currentYear &&
      transaction.type === "expense"
    );
  });

  const monthlyRecurringExpenses = recurringTransactions
    .filter((t) => t.type === "expense" && t.isActive)
    .reduce((sum: number, rt: any) => {
      let monthlyAmount = rt.amount;
      if (rt.frequency === "weekly") {
        monthlyAmount = rt.amount * 4;
      } else if (rt.frequency === "biweekly") {
        monthlyAmount = rt.amount * 2;
      }
      return sum + monthlyAmount;
    }, 0);

  // Calculate total income (recurring and non-recurring)
  const monthlyIncome = transactions
    .filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear &&
        t.type === "income"
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const recurringMonthlyIncome = recurringTransactions
    .filter((t) => t.type === "income" && t.isActive)
    .reduce((sum: number, rt: any) => {
      let monthlyAmount = rt.amount;
      if (rt.frequency === "weekly") {
        monthlyAmount = rt.amount * 4;
      } else if (rt.frequency === "biweekly") {
        monthlyAmount = rt.amount * 2;
      }
      return sum + monthlyAmount;
    }, 0);

  const totalIncome = monthlyIncome + recurringMonthlyIncome;

  // Calculate savings and debt payoff amounts (using Total Income only)
  const savingsPercentage = budgetSettings?.savingsPercentage ?? 20;
  const debtPayoffPercentage = budgetSettings?.debtPayoffPercentage ?? 5;

  const savingsAmount = (totalIncome * savingsPercentage) / 100;
  const debtPayoffAmount = (totalIncome * debtPayoffPercentage) / 100;

  // Calculate monthly financial goals contribution
  const monthlyGoalsContribution = goals
    .filter((goal) => goal.monthlyContribution > 0)
    .reduce((sum, goal) => sum + goal.monthlyContribution, 0);

  // Calculate total budget: Total Income - Savings - Debt Payoff - Goal Contribution
  const totalBudget =
    totalIncome - savingsAmount - debtPayoffAmount - monthlyGoalsContribution;

  const getCategorySpending = (categoryName: string) => {
    const actualSpending = monthlyTransactions
      .filter((t) => t.category.toLowerCase() === categoryName.toLowerCase())
      .reduce((sum, t) => sum + t.amount, 0);

    const expectedSpending = monthlyRecurringExpenses * 0.2; // Simplified calculation

    return {
      actual: actualSpending,
      expected: expectedSpending,
      remaining: 0, // Will be calculated per category
    };
  };

  const addCategory = () => {
    if (!newCategoryName.trim() || !newCategoryLimit.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const limit = parseFloat(newCategoryLimit);
    if (isNaN(limit) || limit <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    const newCategory: BudgetCategory = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      monthlyLimit: limit,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    };

    setCategories([...categories, newCategory]);
    setNewCategoryName("");
    setNewCategoryLimit("");
    setShowAddModal(false);
  };

  const editCategory = () => {
    if (
      !editingCategory ||
      !newCategoryName.trim() ||
      !newCategoryLimit.trim()
    ) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    const limit = parseFloat(newCategoryLimit);
    if (isNaN(limit) || limit <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    const updatedCategories = categories.map((cat) =>
      cat.id === editingCategory.id
        ? { ...cat, name: newCategoryName.trim(), monthlyLimit: limit }
        : cat
    );

    setCategories(updatedCategories);
    setEditingCategory(null);
    setNewCategoryName("");
    setNewCategoryLimit("");
  };

  const deleteCategory = (categoryId: string) => {
    Alert.alert(
      "Delete Category",
      "Are you sure you want to delete this category?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setCategories(categories.filter((cat) => cat.id !== categoryId));
          },
        },
      ]
    );
  };

  const openEditModal = (category: BudgetCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryLimit(category.monthlyLimit.toString());
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingCategory(null);
    setNewCategoryName("");
    setNewCategoryLimit("");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StandardHeader
        title="Budget Categories"
        subtitle="Manage your monthly spending limits"
        showBackButton={true}
        onBack={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={{
              backgroundColor: colors.primary,
              padding: 12,
              borderRadius: 12,
              marginRight: 20,
            }}
          >
            <Ionicons name="add" size={20} color={colors.buttonText} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
            marginBottom: 20,
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
            Monthly Overview
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              marginBottom: 16,
            }}
          >
            Total Budget = Total Income - Savings ({savingsPercentage}%) - Debt
            Payoff ({debtPayoffPercentage}%) - Goal Contribution
          </Text>

          <View style={{ gap: 16 }}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                Total Budget
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: colors.text }}
              >
                ${totalBudget.toLocaleString()}
              </Text>
            </View>

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                Expected Expenses
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: colors.text }}
              >
                ${monthlyRecurringExpenses.toLocaleString()}
              </Text>
            </View>

            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                Actual Spending
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "600", color: colors.text }}
              >
                $
                {monthlyTransactions
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Categories List */}
        {categories.map((category) => {
          const spending = getCategorySpending(category.name);
          const remaining = category.monthlyLimit - spending.actual;
          const progressPercentage = Math.min(
            (spending.actual / category.monthlyLimit) * 100,
            100
          );

          return (
            <View
              key={category.id}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                padding: 24,
                marginBottom: 16,
                shadowColor: colors.shadow,
                shadowOpacity: 0.08,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
                elevation: 4,
              }}
            >
              {/* Category Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: category.color,
                      marginRight: 12,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {category.name}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => openEditModal(category)}
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: colors.surfaceSecondary,
                    }}
                  >
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => deleteCategory(category.id)}
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: colors.error,
                    }}
                  >
                    <Ionicons
                      name="trash"
                      size={16}
                      color={colors.buttonText}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Budget vs Actual */}
              <View style={{ gap: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                    Monthly Limit
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    ${category.monthlyLimit.toLocaleString()}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                    Expected
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.warning }}>
                    ${spending.expected.toFixed(0)}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                    Actual
                  </Text>
                  <Text style={{ fontSize: 14, color: colors.primary }}>
                    ${spending.actual.toFixed(0)}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                    Remaining
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: remaining >= 0 ? colors.success : colors.error,
                    }}
                  >
                    ${remaining.toFixed(0)}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={{ marginTop: 16 }}>
                <View
                  style={{
                    height: 8,
                    backgroundColor: colors.border,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${progressPercentage}%`,
                      height: 8,
                      backgroundColor:
                        progressPercentage > 100
                          ? colors.error
                          : colors.primary,
                      borderRadius: 4,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.textSecondary,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  {progressPercentage.toFixed(1)}% of budget used
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Add/Edit Category Modal */}
      <Modal
        visible={showAddModal || !!editingCategory}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              width: "90%",
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.text,
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              {editingCategory ? "Edit Category" : "Add New Category"}
            </Text>

            <View style={{ gap: 16 }}>
              <View>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Category Name
                </Text>
                <TextInput
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="e.g., Food & Dining"
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: 12,
                    padding: 16,
                    fontSize: 16,
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Monthly Limit
                </Text>
                <TextInput
                  value={newCategoryLimit}
                  onChangeText={setNewCategoryLimit}
                  placeholder="0.00"
                  keyboardType="numeric"
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: 12,
                    padding: 16,
                    fontSize: 16,
                    color: colors.text,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginTop: 24,
              }}
            >
              <TouchableOpacity
                onPress={closeModal}
                style={{
                  flex: 1,
                  backgroundColor: colors.surfaceSecondary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={editingCategory ? editCategory : addCategory}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary,
                  padding: 16,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.buttonText,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {editingCategory ? "Save" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
