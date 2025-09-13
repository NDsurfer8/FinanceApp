import React, { useState, useEffect, useMemo } from "react";
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
import { useTranslation } from "react-i18next";
import { useCurrency } from "../contexts/CurrencyContext";
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
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const { user } = useAuth();
  const route = useRoute();

  // Helper function to translate category names
  const translateCategoryName = (categoryName: string): string => {
    const categoryMap: { [key: string]: string } = {
      Rent: t("categories.rent"),
      "Car Payment": t("categories.car_payment"),
      Insurance: t("categories.insurance"),
      Utilities: t("categories.utilities"),
      Internet: t("categories.internet"),
      Phone: t("categories.phone"),
      Subscriptions: t("categories.subscriptions"),
      "Credit Card": t("categories.credit_card"),
      "Loan Payment": t("categories.loan_payment"),
      Food: t("categories.food"),
      Transportation: t("categories.transportation"),
      Health: t("categories.health"),
      Entertainment: t("categories.entertainment"),
      Shopping: t("categories.shopping"),
      Business: t("categories.business"),
      "Other Expenses": t("categories.other_expenses"),
    };
    return categoryMap[categoryName] || categoryName;
  };

  // Helper function to check if a category name is a default category (only checks English names since that's what's stored in database)
  const isDefaultCategoryName = (categoryName: string): boolean => {
    const defaultCategoriesEnglish = [
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
    return defaultCategoriesEnglish.includes(categoryName);
  };
  const selectedMonthParam = (route.params as any)?.selectedMonth;
  const selectedMonth = selectedMonthParam
    ? new Date(selectedMonthParam)
    : new Date();
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
    // Exclude transactions that were created from recurring transactions to avoid double counting
    const categoryTransactions = transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getMonth() === targetMonth &&
        transactionDate.getFullYear() === targetYear &&
        t.type === "expense" &&
        t.category === category.name &&
        !t.recurringTransactionId // Exclude transactions created from recurring transactions
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

    // Only include recurring expenses that have been marked as paid this month
    const paidRecurringExpenses = transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      return (
        transactionDate.getMonth() === targetMonth &&
        transactionDate.getFullYear() === targetYear &&
        t.type === "expense" &&
        t.category === category.name &&
        t.recurringTransactionId &&
        t.status === "paid"
      );
    });

    const actualSpending =
      categoryTransactions.reduce((sum, t) => sum + t.amount, 0) +
      paidRecurringExpenses.reduce((sum, t) => sum + t.amount, 0);

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
          }

          // Only add missing default categories for new users (when no custom categories exist)
          const hasCustomCategories = uniqueCategories.some(
            (cat) => !isDefaultCategoryName(cat.name)
          );

          if (!hasCustomCategories && uniqueCategories.length <= 16) {
            // Only add missing default categories for new users
            const defaultCategories = [
              {
                id: "1",
                name: "Rent",
                monthlyLimit: 0,
                color: "#FF6B6B",
              },
              {
                id: "2",
                name: "Car Payment",
                monthlyLimit: 0,
                color: "#4ECDC4",
              },
              {
                id: "3",
                name: "Insurance",
                monthlyLimit: 0,
                color: "#45B7D1",
              },
              {
                id: "4",
                name: "Utilities",
                monthlyLimit: 0,
                color: "#96CEB4",
              },
              {
                id: "5",
                name: "Internet",
                monthlyLimit: 0,
                color: "#FFEAA7",
              },
              {
                id: "6",
                name: "Phone",
                monthlyLimit: 0,
                color: "#DDA0DD",
              },
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
              {
                id: "10",
                name: "Food",
                monthlyLimit: 0,
                color: "#85C1E9",
              },
              {
                id: "11",
                name: "Transportation",
                monthlyLimit: 0,
                color: "#F8C471",
              },
              {
                id: "12",
                name: "Health",
                monthlyLimit: 0,
                color: "#82E0AA",
              },
              {
                id: "13",
                name: "Entertainment",
                monthlyLimit: 0,
                color: "#F1948A",
              },
              {
                id: "14",
                name: "Shopping",
                monthlyLimit: 0,
                color: "#85C1E9",
              },
              {
                id: "15",
                name: "Business",
                monthlyLimit: 0,
                color: "#D7BDE2",
              },
              {
                id: "16",
                name: "Other Expenses",
                monthlyLimit: 0,
                color: "#A9CCE3",
              },
            ];

            // Add only missing default categories
            const mergedCategories = [...uniqueCategories];
            defaultCategories.forEach((defaultCat) => {
              const exists = mergedCategories.find(
                (cat) => cat.name === defaultCat.name
              );
              if (!exists) {
                mergedCategories.push(defaultCat);
              }
            });

            // Only save if new categories were actually added
            if (mergedCategories.length > uniqueCategories.length) {
              await saveBudgetCategories(mergedCategories, user.uid);
            }

            setCategories(mergedCategories);
          } else {
            // User has custom categories, preserve them
            setCategories(uniqueCategories);
          }
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

  // Calculate available amount for allocation
  const availableAmount = useMemo(() => {
    return (
      totalBudget -
      (editingCategory
        ? categories
            .filter((cat) => cat.id !== editingCategory.id)
            .reduce((sum, cat) => sum + cat.monthlyLimit, 0) +
          (parseFloat(tempCategoryLimit) || 0)
        : categories.reduce((sum, cat) => sum + cat.monthlyLimit, 0) +
          (parseFloat(newCategoryLimit) || 0))
    );
  }, [
    totalBudget,
    editingCategory,
    categories,
    tempCategoryLimit,
    newCategoryLimit,
  ]);

  const getCategorySpending = (categoryName: string) => {
    // Get actual spending from transactions in this category
    // Only count actual transactions that have been paid/spent
    const actualSpending = monthlyTransactions
      .filter((t) => t.category.toLowerCase() === categoryName.toLowerCase())
      .reduce((sum, t) => sum + t.amount, 0);

    // Note: We no longer count recurring transactions in budget categories
    // Budget categories should only show money that has actually been spent
    // Recurring transactions are projected/planned spending, not actual spending
    const totalActualSpending = actualSpending;

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
      Alert.alert(t("common.error"), t("budget_categories.fill_all_fields"));
      return;
    }

    if (!user?.uid) {
      Alert.alert(
        t("common.error"),
        t("budget_categories.user_not_authenticated")
      );
      return;
    }

    const limit = parseFloat(newCategoryLimit);
    if (isNaN(limit) || limit < 0) {
      Alert.alert(t("common.error"), t("budget_categories.valid_amount"));
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
      Alert.alert(t("common.error"), t("budget_categories.failed_to_save"));
    }

    setNewCategoryName("");
    setNewCategoryLimit("");
    setShowAddModal(false);
  };

  const editCategory = async () => {
    if (!editingCategory || !tempCategoryLimit.trim()) {
      Alert.alert(t("common.error"), t("budget_categories.fill_all_fields"));
      return;
    }

    if (!user?.uid) {
      Alert.alert(
        t("common.error"),
        t("budget_categories.user_not_authenticated")
      );
      return;
    }

    const limit = parseFloat(tempCategoryLimit);
    if (isNaN(limit) || limit < 0) {
      Alert.alert(t("common.error"), t("budget_categories.valid_amount"));
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
      Alert.alert(t("common.error"), t("budget_categories.failed_to_save"));
    }

    setEditingCategory(null);
    setNewCategoryName("");
    setNewCategoryLimit("");
  };

  const deleteCategory = (categoryId: string) => {
    // Find the category to check if it's default
    const categoryToDelete = categories.find((cat) => cat.id === categoryId);

    if (!categoryToDelete) {
      Alert.alert(t("common.error"), t("budget_categories.category_not_found"));
      return;
    }

    // Prevent deletion of default categories
    if (isDefaultCategory(categoryToDelete.name)) {
      Alert.alert(
        t("budget_categories.cannot_delete"),
        t("budget_categories.default_categories_cannot_delete"),
        [{ text: t("common.ok"), style: "default" }]
      );
      return;
    }

    Alert.alert(
      t("budget_categories.delete_category"),
      t("budget_categories.delete_category_confirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            if (!user?.uid) {
              Alert.alert(
                t("common.error"),
                t("budget_categories.user_not_authenticated")
              );
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
              Alert.alert(
                t("common.error"),
                t("budget_categories.failed_to_save")
              );
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

  // Calculate total spending across all categories
  const totalActualSpending = filteredCategories.reduce((sum, category) => {
    const spending = getCategorySpending(category.name);
    return sum + spending.actual;
  }, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <StandardHeader
          title={t("budget_categories.title")}
          subtitle={t("budget_categories.subtitle")}
          showBackButton={true}
          onBack={() => navigation.goBack()}
          rightComponent={
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={{
                backgroundColor: colors.primary,
                padding: 12,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: colors.shadow,
                shadowOpacity: 0.1,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={colors.buttonText} />
            </TouchableOpacity>
          }
        />
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
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: colors.text,
                flex: 1,
              }}
            >
              {selectedMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}{" "}
              {t("budget_categories.overview")}
            </Text>
            <TouchableOpacity
              onPress={() => setShowBudgetSettingsModal(true)}
              style={{
                backgroundColor: colors.surfaceSecondary,
                padding: 10,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: colors.shadow,
                shadowOpacity: 0.06,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 1 },
                elevation: 1,
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="settings-outline"
                size={18}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={{ gap: 16 }}>
            {/* Income Section */}
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: 8,
                }}
              >
                {t("budget_categories.starting_point")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 16, color: colors.text }}>
                  {t("budget_categories.total_income")}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: colors.success,
                  }}
                >
                  {formatCurrency(totalIncome)}
                </Text>
              </View>
            </View>

            {/* Deductions Section */}
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: 8,
                }}
              >
                {t("budget_categories.automatic_allocations")}
              </Text>
              <View
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 8,
                  padding: 12,
                  gap: 8,
                }}
              >
                {/* Savings */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name={
                        includeSavings ? "checkmark-circle" : "close-circle"
                      }
                      size={16}
                      color={includeSavings ? colors.success : colors.error}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.text,
                        textDecorationLine: includeSavings
                          ? "none"
                          : "line-through",
                      }}
                    >
                      {t("budget_categories.savings_percentage", {
                        percentage: savingsPercentage,
                      })}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: includeSavings
                        ? colors.error
                        : colors.textSecondary,
                      textDecorationLine: includeSavings
                        ? "none"
                        : "line-through",
                    }}
                  >
                    {includeSavings ? "-" : ""}
                    {formatCurrency(savingsAmount)}
                  </Text>
                </View>

                {/* Debt Payoff */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name={
                        includeDebtPayoff ? "checkmark-circle" : "close-circle"
                      }
                      size={16}
                      color={includeDebtPayoff ? colors.success : colors.error}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.text,
                        textDecorationLine: includeDebtPayoff
                          ? "none"
                          : "line-through",
                      }}
                    >
                      {t("budget_categories.debt_payoff_percentage", {
                        percentage: debtPayoffPercentage,
                      })}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: includeDebtPayoff
                        ? colors.error
                        : colors.textSecondary,
                      textDecorationLine: includeDebtPayoff
                        ? "none"
                        : "line-through",
                    }}
                  >
                    {includeDebtPayoff ? "-" : ""}
                    {formatCurrency(debtPayoffAmount)}
                  </Text>
                </View>

                {/* Goal Contributions */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons
                      name={
                        includeGoalContributions
                          ? "checkmark-circle"
                          : "close-circle"
                      }
                      size={16}
                      color={
                        includeGoalContributions ? colors.success : colors.error
                      }
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: colors.text,
                        textDecorationLine: includeGoalContributions
                          ? "none"
                          : "line-through",
                      }}
                    >
                      {t("budget_categories.goal_contributions")}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: includeGoalContributions
                        ? colors.error
                        : colors.textSecondary,
                      textDecorationLine: includeGoalContributions
                        ? "none"
                        : "line-through",
                    }}
                  >
                    {includeGoalContributions ? "-" : ""}
                    {formatCurrency(monthlyGoalsContribution)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Available Budget Section */}
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: colors.textSecondary,
                  marginBottom: 8,
                }}
              >
                {t("budget_categories.available_for_categories")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor:
                    totalBudget < 0
                      ? colors.error + "15"
                      : colors.primary + "15",
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor:
                    totalBudget < 0
                      ? colors.error + "30"
                      : colors.primary + "30",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {t("budget_categories.total_budget")}
                </Text>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color: totalBudget < 0 ? colors.error : colors.primary,
                  }}
                >
                  {formatCurrency(totalBudget)}
                </Text>
              </View>

              {/* Allocated to Categories */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  marginTop: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                  }}
                >
                  {t("budget_categories.allocated_to_categories")}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  {formatCurrency(
                    categories.reduce((sum, cat) => sum + cat.monthlyLimit, 0)
                  )}
                </Text>
              </View>
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
              placeholder={t("budget_categories.search_placeholder")}
              placeholderTextColor={colors.inputPlaceholder}
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
          const progressPercentage =
            category.monthlyLimit > 0
              ? Math.min((spending.actual / category.monthlyLimit) * 100, 100)
              : 0;

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
                    {translateCategoryName(category.name)}
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
                    {t("budget_categories.monthly_limit")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    {formatCurrency(category.monthlyLimit)}
                    {totalIncome > 0 && (
                      <Text
                        style={{ fontSize: 14, color: colors.textSecondary }}
                      >
                        {" "}
                        (
                        {((category.monthlyLimit / totalIncome) * 100).toFixed(
                          1
                        )}
                        % {t("budget_categories.of_income")})
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
                    {t("budget_categories.spent")}
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
                      ? t("budget_categories.no_spending_yet")
                      : formatCurrency(spending.actual)}
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
                    {t("budget_categories.remaining")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: remaining >= 0 ? colors.success : colors.error,
                    }}
                  >
                    {remaining >= 0
                      ? formatCurrency(remaining)
                      : formatCurrency(0)}
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
                  {category.monthlyLimit > 0
                    ? `${progressPercentage.toFixed(1)}% ${t(
                        "budget_categories.of_budget_used"
                      )}`
                    : t("budget_categories.no_budget_set")}
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
                      ⚠️ Over budget by{" "}
                      {formatCurrency(spending.actual - category.monthlyLimit)}
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
                {editingCategory
                  ? t("budget_categories.edit_category")
                  : t("budget_categories.add_new_category")}
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
                    placeholder={t(
                      "budget_categories.category_name_placeholder"
                    )}
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
                    placeholderTextColor={colors.inputPlaceholder}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onFocus={handleInputFocus}
                  />
                </View>

                {/* Available to Allocate */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor:
                      availableAmount < 0
                        ? colors.error + "15"
                        : colors.success + "15",
                    borderRadius: 12,
                    marginBottom: 20,
                    borderWidth: 1,
                    borderColor:
                      availableAmount < 0
                        ? colors.error + "30"
                        : colors.success + "30",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: colors.text,
                    }}
                  >
                    {availableAmount < 0
                      ? t("budget_categories.over_budget")
                      : t("budget_categories.available_to_allocate")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color:
                        availableAmount < 0 ? colors.error : colors.success,
                    }}
                  >
                    {formatCurrency(availableAmount)}
                  </Text>
                </View>

                <View>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginBottom: 8,
                    }}
                  >
                    {t("budget_categories.monthly_limit")}
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
                    placeholder={t(
                      "budget_categories.budget_amount_placeholder"
                    )}
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
                    placeholderTextColor={colors.inputPlaceholder}
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
                    {editingCategory ? t("common.save") : t("common.add")}
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
                {t("budget_categories.budget_allocation_settings")}
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
              {t("budget_categories.choose_allocations_description")}
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
                    {t("budget_categories.include_savings", {
                      percentage: savingsPercentage,
                    })}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {formatCurrency(savingsAmount)}/month
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
                    {t("budget_categories.include_debt_payoff", {
                      percentage: debtPayoffPercentage,
                    })}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {formatCurrency(debtPayoffAmount)}/month
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
                    {t("budget_categories.include_goal_contributions")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {formatCurrency(monthlyGoalsContribution)}/month
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
                paddingBottom: 30,
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
                {t("budget_categories.current_total_budget")}
              </Text>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "700",
                  color: colors.primary,
                }}
              >
                {formatCurrency(totalBudget)}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
