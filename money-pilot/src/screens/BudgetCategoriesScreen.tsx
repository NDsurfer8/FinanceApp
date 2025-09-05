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
import { useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { useFriendlyMode } from "../contexts/FriendlyModeContext";
import { translate } from "../services/translations";
import { StandardHeader } from "../components/StandardHeader";
import { useData } from "../contexts/DataContext";
import { useAuth } from "../hooks/useAuth";
import { useRoute } from "@react-navigation/native";
import {
  saveBudgetCategories,
  getUserBudgetCategories,
  BudgetCategory,
} from "../services/userData";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

interface BudgetCategoriesScreenProps {
  navigation: any;
}

export const BudgetCategoriesScreen: React.FC<BudgetCategoriesScreenProps> = ({
  navigation,
}) => {
  const { colors } = useTheme();
  const { isFriendlyMode } = useFriendlyMode();
  const { user } = useAuth();
  const route = useRoute();
  const selectedMonth = (route.params as any)?.selectedMonth || new Date();
  const {
    transactions,
    recurringTransactions,
    goals,
    budgetSettings,
    refreshBudgetSettings,
  } = useData();

  const [categories, setCategories] = useState<BudgetCategory[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(
    null
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryLimit, setNewCategoryLimit] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tempCategoryLimit, setTempCategoryLimit] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  // Budget allocation settings
  const [includeSavings, setIncludeSavings] = useState(true);
  const [includeDebtPayoff, setIncludeDebtPayoff] = useState(true);
  const [includeGoalContributions, setIncludeGoalContributions] =
    useState(true);
  const [showBudgetSettingsModal, setShowBudgetSettingsModal] = useState(false);

  // AsyncStorage keys for budget settings
  const BUDGET_SETTINGS_KEY = `budget_allocation_settings_${
    user?.uid || "anonymous"
  }`;

  // Load budget settings from AsyncStorage
  const loadBudgetSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem(BUDGET_SETTINGS_KEY);
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setIncludeSavings(settings.includeSavings ?? true);
        setIncludeDebtPayoff(settings.includeDebtPayoff ?? true);
        setIncludeGoalContributions(settings.includeGoalContributions ?? true);
      }
    } catch (error) {
      console.error("Error loading budget settings:", error);
    }
  };

  // Save budget settings to AsyncStorage
  const saveBudgetSettings = async (settings: {
    includeSavings: boolean;
    includeDebtPayoff: boolean;
    includeGoalContributions: boolean;
  }) => {
    try {
      await AsyncStorage.setItem(BUDGET_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Error saving budget settings:", error);
    }
  };

  // Toggle handlers with haptic feedback and persistence
  const toggleSavings = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !includeSavings;
    setIncludeSavings(newValue);
    await saveBudgetSettings({
      includeSavings: newValue,
      includeDebtPayoff,
      includeGoalContributions,
    });
  };

  const toggleDebtPayoff = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !includeDebtPayoff;
    setIncludeDebtPayoff(newValue);
    await saveBudgetSettings({
      includeSavings,
      includeDebtPayoff: newValue,
      includeGoalContributions,
    });
  };

  const toggleGoalContributions = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !includeGoalContributions;
    setIncludeGoalContributions(newValue);
    await saveBudgetSettings({
      includeSavings,
      includeDebtPayoff,
      includeGoalContributions: newValue,
    });
  };

  // Check if a category is over budget
  const isCategoryOverBudget = (category: BudgetCategory) => {
    const targetMonth = selectedMonth.getMonth();
    const targetYear = selectedMonth.getFullYear();

    // Get actual spending for this category (transactions + recurring)
    const categoryTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getMonth() === targetMonth &&
        transactionDate.getFullYear() === targetYear &&
        t.type === "expense" &&
        t.category === category.name
      );
    });

    const categoryRecurring = recurringTransactions.filter((rt) => {
      // Only include recurring expenses that are active in the selected month
      if (
        rt.type !== "expense" ||
        !rt.isActive ||
        rt.category !== category.name
      )
        return false;

      // Check if the recurring transaction was created before or during the selected month
      const startDate = new Date(rt.startDate || rt.date);
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();

      // If start date is after the selected month, exclude it
      if (
        startYear > targetYear ||
        (startYear === targetYear && startMonth > targetMonth)
      ) {
        return false;
      }

      // If there's an end date, check if the selected month is before the end date
      if (rt.endDate) {
        const endDate = new Date(rt.endDate);
        const endMonth = endDate.getMonth();
        const endYear = endDate.getFullYear();

        // If selected month is after the end date, exclude it
        if (
          targetYear > endYear ||
          (targetYear === endYear && targetMonth > endMonth)
        ) {
          return false;
        }
      }

      return true;
    });

    const actualSpending =
      categoryTransactions.reduce((sum, t) => sum + t.amount, 0) +
      categoryRecurring.reduce((sum, rt) => {
        let monthlyAmount = rt.amount;
        if (rt.frequency === "weekly") monthlyAmount = rt.amount * 4;
        else if (rt.frequency === "biweekly") monthlyAmount = rt.amount * 2;
        return sum + monthlyAmount;
      }, 0);

    return actualSpending > category.monthlyLimit;
  };

  // Handle input focus and scroll to input
  const handleInputFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Load categories from AsyncStorage on component mount
  useEffect(() => {
    const loadCategories = async () => {
      if (user?.uid) {
        try {
          const savedCategories = await getUserBudgetCategories(user.uid);

          // Migrate to updated category names
          const migratedCategories = savedCategories.map((category) => {
            // Map old category names to new ones
            const categoryMappings: { [key: string]: string } = {
              Transport: "Transportation",
              Other: "Other Expenses",
            };

            const newCategoryName =
              categoryMappings[category.name] || category.name;
            return {
              ...category,
              name: newCategoryName,
            };
          });

          // Remove duplicates by category name
          const uniqueCategories = migratedCategories.filter(
            (category, index, self) =>
              index === self.findIndex((c) => c.name === category.name)
          );

          // If categories were migrated or duplicates were found, save the updated list
          if (
            JSON.stringify(savedCategories) !== JSON.stringify(uniqueCategories)
          ) {
            await saveBudgetCategories(uniqueCategories, user.uid);
            console.log(
              "Categories migrated to updated names and deduplicated"
            );
          }

          // Always ensure all default categories are present
          const defaultCategories = [
            { id: "1", name: "Rent", monthlyLimit: 0, color: "#FF6B6B" },
            {
              id: "2",
              name: "Car Payment",
              monthlyLimit: 0,
              color: "#4ECDC4",
            },
            { id: "3", name: "Insurance", monthlyLimit: 0, color: "#45B7D1" },
            { id: "4", name: "Utilities", monthlyLimit: 0, color: "#96CEB4" },
            { id: "5", name: "Internet", monthlyLimit: 0, color: "#FFEAA7" },
            { id: "6", name: "Phone", monthlyLimit: 0, color: "#DDA0DD" },
            {
              id: "7",
              name: "Subscriptions",
              monthlyLimit: 0,
              color: "#98D8C8",
            },
            {
              id: "8",
              name: "Credit Card",
              monthlyLimit: 0,
              color: "#F7DC6F",
            },
            {
              id: "9",
              name: "Loan Payment",
              monthlyLimit: 0,
              color: "#BB8FCE",
            },
            { id: "10", name: "Food", monthlyLimit: 0, color: "#85C1E9" },
            {
              id: "11",
              name: "Transportation",
              monthlyLimit: 0,
              color: "#F8C471",
            },
            { id: "12", name: "Health", monthlyLimit: 0, color: "#82E0AA" },
            {
              id: "13",
              name: "Entertainment",
              monthlyLimit: 0,
              color: "#F1948A",
            },
            { id: "14", name: "Shopping", monthlyLimit: 0, color: "#85C1E9" },
            { id: "15", name: "Business", monthlyLimit: 0, color: "#D7BDE2" },
            {
              id: "16",
              name: "Other Expenses",
              monthlyLimit: 0,
              color: "#A9CCE3",
            },
          ];

          // Merge saved categories with default categories
          const mergedCategories = defaultCategories.map((defaultCat) => {
            const savedCat = uniqueCategories.find(
              (cat) => cat.name === defaultCat.name
            );
            if (savedCat) {
              return {
                ...defaultCat,
                monthlyLimit: savedCat.monthlyLimit,
                color: savedCat.color || defaultCat.color,
              };
            }
            return defaultCat;
          });

          // Save merged categories if they're different from saved ones
          if (
            JSON.stringify(uniqueCategories) !==
            JSON.stringify(mergedCategories)
          ) {
            await saveBudgetCategories(mergedCategories, user.uid);
            console.log("Updated categories with defaults");
          }

          setCategories(mergedCategories);
        } catch (error) {
          console.error("Error loading budget categories:", error);
        }
      }
    };

    loadCategories();
  }, [user?.uid]);

  // Refresh budget settings when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.uid) {
        refreshBudgetSettings();
        loadBudgetSettings(); // Load budget allocation settings
      }
    }, [user?.uid, refreshBudgetSettings])
  );

  // Calculate data for the selected month
  const targetMonth = selectedMonth.getMonth();
  const targetYear = selectedMonth.getFullYear();

  const monthlyTransactions = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.date);
    return (
      transactionDate.getMonth() === targetMonth &&
      transactionDate.getFullYear() === targetYear &&
      transaction.type === "expense"
    );
  });

  const monthlyRecurringExpenses = recurringTransactions
    .filter((t) => {
      // Only include recurring expenses that are active in the selected month
      if (t.type !== "expense" || !t.isActive) return false;

      // Check if the recurring transaction was created before or during the selected month
      const startDate = new Date(t.startDate || t.date);
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();

      // If start date is after the selected month, exclude it
      if (
        startYear > targetYear ||
        (startYear === targetYear && startMonth > targetMonth)
      ) {
        return false;
      }

      // If there's an end date, check if the selected month is before the end date
      if (t.endDate) {
        const endDate = new Date(t.endDate);
        const endMonth = endDate.getMonth();
        const endYear = endDate.getFullYear();

        // If selected month is after the end date, exclude it
        if (
          targetYear > endYear ||
          (targetYear === endYear && targetMonth > endMonth)
        ) {
          return false;
        }
      }

      return true;
    })
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
        transactionDate.getMonth() === targetMonth &&
        transactionDate.getFullYear() === targetYear &&
        t.type === "income"
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const recurringMonthlyIncome = recurringTransactions
    .filter((t) => {
      // Only include recurring income that is active in the selected month
      if (t.type !== "income" || !t.isActive) return false;

      // Check if the recurring transaction was created before or during the selected month
      const startDate = new Date(t.startDate || t.date);
      const startMonth = startDate.getMonth();
      const startYear = startDate.getFullYear();

      // If start date is after the selected month, exclude it
      if (
        startYear > targetYear ||
        (startYear === targetYear && startMonth > targetMonth)
      ) {
        return false;
      }

      // If there's an end date, check if the selected month is before the end date
      if (t.endDate) {
        const endDate = new Date(t.endDate);
        const endMonth = endDate.getMonth();
        const endYear = endDate.getFullYear();

        // If selected month is after the end date, exclude it
        if (
          targetYear > endYear ||
          (targetYear === endYear && targetMonth > endMonth)
        ) {
          return false;
        }
      }

      return true;
    })
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

  // Calculate total budget based on user settings
  const totalBudget =
    totalIncome -
    (includeSavings ? savingsAmount : 0) -
    (includeDebtPayoff ? debtPayoffAmount : 0) -
    (includeGoalContributions ? monthlyGoalsContribution : 0);

  const getCategorySpending = (categoryName: string) => {
    // Get actual spending from transactions in this category
    const actualSpending = monthlyTransactions
      .filter((t) => t.category.toLowerCase() === categoryName.toLowerCase())
      .reduce((sum, t) => sum + t.amount, 0);

    // Get actual spending from recurring transactions in this category
    const actualRecurringSpending = recurringTransactions
      .filter((t) => {
        // Only include recurring expenses that are active in the selected month
        if (t.type !== "expense" || !t.isActive) return false;
        if (t.category.toLowerCase() !== categoryName.toLowerCase())
          return false;

        // Check if the recurring transaction was created before or during the selected month
        const startDate = new Date(t.startDate || t.date);
        const startMonth = startDate.getMonth();
        const startYear = startDate.getFullYear();

        // If start date is after the selected month, exclude it
        if (
          startYear > targetYear ||
          (startYear === targetYear && startMonth > targetMonth)
        ) {
          return false;
        }

        // If there's an end date, check if the selected month is before the end date
        if (t.endDate) {
          const endDate = new Date(t.endDate);
          const endMonth = endDate.getMonth();
          const endYear = endDate.getFullYear();

          // If selected month is after the end date, exclude it
          if (
            targetYear > endYear ||
            (targetYear === endYear && targetMonth > endMonth)
          ) {
            return false;
          }
        }

        return true;
      })
      .reduce((sum: number, rt: any) => {
        let monthlyAmount = rt.amount;
        if (rt.frequency === "weekly") {
          monthlyAmount = rt.amount * 4;
        } else if (rt.frequency === "biweekly") {
          monthlyAmount = rt.amount * 2;
        }
        return sum + monthlyAmount;
      }, 0);

    // Total actual spending = one-time transactions + recurring transactions
    const totalActualSpending = actualSpending + actualRecurringSpending;

    // Get the budget limit for this category
    const category = categories.find(
      (cat) => cat.name.toLowerCase() === categoryName.toLowerCase()
    );
    const budgetLimit = category?.monthlyLimit || 0;

    // Calculate remaining budget
    const remaining = budgetLimit - totalActualSpending;

    return {
      actual: totalActualSpending,
      budget: budgetLimit,
      remaining: remaining,
    };
  };

  const addCategory = async () => {
    if (!newCategoryName.trim() || !newCategoryLimit.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!user?.uid) {
      Alert.alert("Error", "User not authenticated");
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

    const updatedCategories = [...categories, newCategory];
    setCategories(updatedCategories);

    try {
      await saveBudgetCategories(updatedCategories, user.uid);
    } catch (error) {
      console.error("Error saving budget categories:", error);
      Alert.alert("Error", "Failed to save budget categories");
    }

    setNewCategoryName("");
    setNewCategoryLimit("");
    setShowAddModal(false);
  };

  const editCategory = async () => {
    if (!editingCategory || !tempCategoryLimit.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!user?.uid) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    const limit = parseFloat(tempCategoryLimit);
    if (isNaN(limit) || limit <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    // For default categories, keep the original name
    const updatedCategories = categories.map((cat) =>
      cat.id === editingCategory.id
        ? {
            ...cat,
            name: isDefaultCategory(editingCategory.name)
              ? editingCategory.name
              : newCategoryName.trim(),
            monthlyLimit: limit,
          }
        : cat
    );

    setCategories(updatedCategories);

    try {
      await saveBudgetCategories(updatedCategories, user.uid);
    } catch (error) {
      console.error("Error saving budget categories:", error);
      Alert.alert("Error", "Failed to save budget categories");
    }

    setEditingCategory(null);
    setNewCategoryName("");
    setNewCategoryLimit("");
  };

  const deleteCategory = (categoryId: string) => {
    // Find the category to check if it's default
    const categoryToDelete = categories.find((cat) => cat.id === categoryId);

    if (!categoryToDelete) {
      Alert.alert("Error", "Category not found");
      return;
    }

    // Prevent deletion of default categories
    if (isDefaultCategory(categoryToDelete.name)) {
      Alert.alert(
        "Cannot Delete",
        "Default categories cannot be deleted as they are essential for the app to function properly.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    Alert.alert(
      "Delete Category",
      "Are you sure you want to delete this category?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (!user?.uid) {
              Alert.alert("Error", "User not authenticated");
              return;
            }

            const updatedCategories = categories.filter(
              (cat) => cat.id !== categoryId
            );
            setCategories(updatedCategories);

            try {
              await saveBudgetCategories(updatedCategories, user.uid);
            } catch (error) {
              console.error("Error saving budget categories:", error);
              Alert.alert("Error", "Failed to save budget categories");
            }
          },
        },
      ]
    );
  };

  const openEditModal = (category: BudgetCategory) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
    setNewCategoryLimit(category.monthlyLimit.toString());
    setTempCategoryLimit(category.monthlyLimit.toString());
  };

  // Check if a category is a default category (name cannot be changed)
  const isDefaultCategory = (categoryName: string): boolean => {
    const defaultCategories = [
      "Rent",
      "Car Payment",
      "Insurance",
      "Utilities",
      "Internet",
      "Phone",
      "Subscriptions",
      "Credit Card",
      "Loan Payment",
      "Food",
      "Transportation",
      "Health",
      "Entertainment",
      "Shopping",
      "Business",
      "Other Expenses",
    ];
    return defaultCategories.includes(categoryName);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingCategory(null);
    setNewCategoryName("");
    setNewCategoryLimit("");
    setTempCategoryLimit("");
  };

  // Filter and sort categories - overbudget items first, then alphabetically
  const filteredCategories = categories
    .filter((category) =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aOverBudget = isCategoryOverBudget(a);
      const bOverBudget = isCategoryOverBudget(b);

      // If one is over budget and the other isn't, prioritize the overbudget one
      if (aOverBudget && !bOverBudget) return -1;
      if (!aOverBudget && bOverBudget) return 1;

      // If both are over budget or both are not over budget, sort alphabetically
      return a.name.localeCompare(b.name);
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StandardHeader
        title="Set Your Budget"
        subtitle="Budget your monthly spending"
        showBackButton={true}
        onBack={() => navigation.goBack()}
        rightComponent={
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginRight: 20,
            }}
          >
            <TouchableOpacity
              onPress={() => setShowBudgetSettingsModal(true)}
              style={{
                backgroundColor: colors.surface,
                padding: 12,
                borderRadius: 12,
                marginRight: 8,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={{
                backgroundColor: colors.primary,
                padding: 12,
                borderRadius: 12,
              }}
            >
              <Ionicons name="add" size={20} color={colors.buttonText} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            shadowColor: colors.shadow,
            shadowOpacity: 0.06,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 12,
            }}
          >
            {selectedMonth.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}{" "}
            Overview
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 16,
              lineHeight: 16,
            }}
          >
            Total Budget = Total Income - Savings ({savingsPercentage}%) - Debt
            Payoff ({debtPayoffPercentage}%) - Goal Contribution
          </Text>

          <View style={{ gap: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>
                Total Income
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.success,
                }}
              >
                ${totalIncome.toLocaleString()}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>
                Total Budget
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: colors.primary,
                }}
              >
                ${totalBudget.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            shadowColor: colors.shadow,
            shadowOpacity: 0.04,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 1 },
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="search"
              size={18}
              color={colors.textSecondary}
              style={{ marginRight: 12 }}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search categories..."
              placeholderTextColor={colors.textSecondary}
              style={{
                flex: 1,
                fontSize: 16,
                color: colors.text,
                padding: 0,
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={{
                  padding: 4,
                  borderRadius: 12,
                  backgroundColor: colors.surfaceSecondary,
                }}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories List */}
        {filteredCategories.map((category) => {
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
                borderRadius: 16,
                padding: 18,
                marginBottom: 12,
                shadowColor: colors.shadow,
                shadowOpacity: 0.06,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}
            >
              {/* Category Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: category.color,
                      marginRight: 10,
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: colors.text,
                    }}
                  >
                    {category.name}
                  </Text>
                  {isCategoryOverBudget(category) && (
                    <View
                      style={{
                        marginLeft: 8,
                        backgroundColor: colors.error,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: colors.buttonText,
                        }}
                      >
                        OVER
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ flexDirection: "row", gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => openEditModal(category)}
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      backgroundColor: colors.surfaceSecondary,
                    }}
                  >
                    <Ionicons name="pencil" size={24} color={colors.primary} />
                  </TouchableOpacity>

                  {/* Only show delete button for user-added categories */}
                  {!isDefaultCategory(category.name) && (
                    <TouchableOpacity
                      onPress={() => deleteCategory(category.id)}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        backgroundColor: colors.error,
                      }}
                    >
                      <Ionicons
                        name="trash"
                        size={24}
                        color={colors.buttonText}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Budget vs Actual */}
              <View style={{ gap: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 18, color: colors.textSecondary }}>
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
                    {totalIncome > 0 && (
                      <Text
                        style={{ fontSize: 14, color: colors.textSecondary }}
                      >
                        {" "}
                        (
                        {((category.monthlyLimit / totalIncome) * 100).toFixed(
                          1
                        )}
                        %)
                      </Text>
                    )}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 16, color: colors.textSecondary }}>
                    Spent
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      color:
                        spending.actual === 0
                          ? colors.textSecondary
                          : colors.error,
                    }}
                  >
                    {spending.actual === 0
                      ? "$0"
                      : `-$${spending.actual.toFixed(0)}`}
                  </Text>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 16, color: colors.textSecondary }}>
                    Remaining
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: remaining >= 0 ? colors.success : colors.error,
                    }}
                  >
                    {remaining >= 0 ? `$${remaining.toFixed(0)}` : "$0"}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={{ marginTop: 14 }}>
                <View
                  style={{
                    height: 10,
                    backgroundColor: colors.border,
                    borderRadius: 5,
                    overflow: "hidden",
                  }}
                >
                  <View
                    style={{
                      width: `${progressPercentage}%`,
                      height: 18,
                      backgroundColor:
                        progressPercentage > 100
                          ? colors.error
                          : colors.primary,
                      borderRadius: 3,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSecondary,
                    marginTop: 3,
                    textAlign: "center",
                  }}
                >
                  {progressPercentage.toFixed(1)}% of budget used
                </Text>
                {isCategoryOverBudget(category) && (
                  <View
                    style={{
                      marginTop: 8,
                      padding: 8,
                      backgroundColor: colors.error + "15",
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.error + "30",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.error,
                        textAlign: "center",
                        fontWeight: "600",
                      }}
                    >
                      ⚠️ Over budget by $
                      {(spending.actual - category.monthlyLimit).toFixed(0)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* No Results Message */}
        {searchQuery.length > 0 && filteredCategories.length === 0 && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 24,
              alignItems: "center",
              shadowColor: colors.shadow,
              shadowOpacity: 0.06,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
          >
            <Ionicons
              name="search"
              size={32}
              color={colors.textSecondary}
              style={{ marginBottom: 12 }}
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              No categories found
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: "center",
              }}
            >
              Try adjusting your search terms or add a new category
            </Text>
          </View>
        )}
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
              width: "90%",
              maxWidth: 400,
              maxHeight: "80%",
              justifyContent: "flex-start", // Align to top when keyboard appears
            }}
          >
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={{
                padding: 24,
                paddingBottom: 40, // Extra padding at bottom for keyboard
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets={true}
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
                    {editingCategory &&
                      isDefaultCategory(editingCategory.name) && (
                        <Text style={{ color: colors.warning, fontSize: 12 }}>
                          {" "}
                          (Default - Cannot Change)
                        </Text>
                      )}
                  </Text>
                  <TextInput
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    placeholder="e.g., Food & Dining"
                    editable={
                      !editingCategory ||
                      !isDefaultCategory(editingCategory.name)
                    }
                    style={{
                      backgroundColor:
                        editingCategory &&
                        isDefaultCategory(editingCategory.name)
                          ? colors.border
                          : colors.surfaceSecondary,
                      borderRadius: 12,
                      padding: 16,
                      fontSize: 16,
                      color:
                        editingCategory &&
                        isDefaultCategory(editingCategory.name)
                          ? colors.textSecondary
                          : colors.text,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onFocus={handleInputFocus}
                  />
                </View>

                {/* Budget Summary */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    backgroundColor: colors.primary + "10",
                    borderRadius: 16,
                    borderLeftWidth: 4,
                    borderLeftColor: colors.primary,
                  }}
                >
                  <View style={{ alignItems: "flex-start" }}>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginBottom: 2,
                        fontWeight: "500",
                      }}
                    >
                      Budget Status
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.textSecondary,
                      }}
                    >
                      $
                      {editingCategory
                        ? categories
                            .filter((cat) => cat.id !== editingCategory.id)
                            .reduce((sum, cat) => sum + cat.monthlyLimit, 0) +
                          (parseFloat(tempCategoryLimit) || 0)
                        : categories
                            .reduce((sum, cat) => sum + cat.monthlyLimit, 0)
                            .toLocaleString()}{" "}
                      allocated
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: "800",
                        color: (() => {
                          const available =
                            totalBudget -
                            (editingCategory
                              ? categories
                                  .filter(
                                    (cat) => cat.id !== editingCategory.id
                                  )
                                  .reduce(
                                    (sum, cat) => sum + cat.monthlyLimit,
                                    0
                                  ) + (parseFloat(tempCategoryLimit) || 0)
                              : categories.reduce(
                                  (sum, cat) => sum + cat.monthlyLimit,
                                  0
                                ));
                          return available < 0 ? colors.error : colors.success;
                        })(),
                      }}
                    >
                      $
                      {(
                        totalBudget -
                        (editingCategory
                          ? categories
                              .filter((cat) => cat.id !== editingCategory.id)
                              .reduce((sum, cat) => sum + cat.monthlyLimit, 0) +
                            (parseFloat(tempCategoryLimit) || 0)
                          : categories.reduce(
                              (sum, cat) => sum + cat.monthlyLimit,
                              0
                            ))
                      ).toLocaleString()}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: (() => {
                          const available =
                            totalBudget -
                            (editingCategory
                              ? categories
                                  .filter(
                                    (cat) => cat.id !== editingCategory.id
                                  )
                                  .reduce(
                                    (sum, cat) => sum + cat.monthlyLimit,
                                    0
                                  ) +
                                (editingCategory
                                  ? parseFloat(tempCategoryLimit) || 0
                                  : 0)
                              : categories.reduce(
                                  (sum, cat) => sum + cat.monthlyLimit,
                                  0
                                ));
                          return available < 0 ? colors.error : colors.success;
                        })(),
                        fontWeight: "600",
                      }}
                    >
                      {(() => {
                        const available =
                          totalBudget -
                          (editingCategory
                            ? categories
                                .filter((cat) => cat.id !== editingCategory.id)
                                .reduce(
                                  (sum, cat) => sum + cat.monthlyLimit,
                                  0
                                ) +
                              (editingCategory
                                ? parseFloat(tempCategoryLimit) || 0
                                : 0)
                            : categories.reduce(
                                (sum, cat) => sum + cat.monthlyLimit,
                                0
                              ));
                        return available < 0
                          ? "Over budget"
                          : "Available to allocate";
                      })()}
                    </Text>
                  </View>
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
                    value={
                      editingCategory ? tempCategoryLimit : newCategoryLimit
                    }
                    onChangeText={(text) => {
                      if (editingCategory) {
                        setTempCategoryLimit(text);
                      } else {
                        setNewCategoryLimit(text);
                      }
                    }}
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
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Budget Settings Modal */}
      <Modal
        visible={showBudgetSettingsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBudgetSettingsModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: "80%",
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
                  color: colors.text,
                }}
              >
                Budget Allocation Settings
              </Text>
              <TouchableOpacity
                onPress={() => setShowBudgetSettingsModal(false)}
                style={{
                  padding: 8,
                }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 16,
                color: colors.textSecondary,
                marginBottom: 20,
                lineHeight: 22,
              }}
            >
              Choose which allocations to include in your total budget
              calculation:
            </Text>

            <View style={{ gap: 16 }}>
              {/* Savings Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    Include Savings ({savingsPercentage}%)
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    ${savingsAmount.toLocaleString()}/month
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={toggleSavings}
                  style={{
                    width: 50,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: includeSavings
                      ? colors.primary
                      : colors.border,
                    justifyContent: "center",
                    alignItems: includeSavings ? "flex-end" : "flex-start",
                    paddingHorizontal: 2,
                  }}
                >
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: "#fff",
                    }}
                  />
                </TouchableOpacity>
              </View>

              {/* Debt Payoff Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    Include Debt Payoff ({debtPayoffPercentage}%)
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    ${debtPayoffAmount.toLocaleString()}/month
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={toggleDebtPayoff}
                  style={{
                    width: 50,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: includeDebtPayoff
                      ? colors.primary
                      : colors.border,
                    justifyContent: "center",
                    alignItems: includeDebtPayoff ? "flex-end" : "flex-start",
                    paddingHorizontal: 2,
                  }}
                >
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: "#fff",
                    }}
                  />
                </TouchableOpacity>
              </View>

              {/* Goal Contributions Toggle */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    Include Goal Contributions
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    ${monthlyGoalsContribution.toLocaleString()}/month
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={toggleGoalContributions}
                  style={{
                    width: 50,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: includeGoalContributions
                      ? colors.primary
                      : colors.border,
                    justifyContent: "center",
                    alignItems: includeGoalContributions
                      ? "flex-end"
                      : "flex-start",
                    paddingHorizontal: 2,
                  }}
                >
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: "#fff",
                    }}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={{
                marginTop: 30,
                paddingTop: 20,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 8,
                }}
              >
                Current Total Budget
              </Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                ${totalBudget.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
