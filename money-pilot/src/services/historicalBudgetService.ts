import AsyncStorage from "@react-native-async-storage/async-storage";
import { calculateMonthlyBudgetResult } from "./userData";

export interface MonthlyBudgetHistory {
  month: string; // YYYY-MM format
  successRate: number;
  categoryResults: {
    [categoryId: string]: {
      success: boolean;
      spent: number;
      budget: number;
      percentage: number;
    };
  };
  processedAt: string; // ISO timestamp
}

export interface BudgetStreakData {
  currentStreak: number;
  longestStreak: number;
  categoryStreaks: {
    [categoryId: string]: number;
  };
  lastProcessedMonth: string;
}

// Store monthly budget history
export const storeMonthlyBudgetHistory = async (
  userId: string,
  month: string,
  monthlyResult: any
): Promise<void> => {
  try {
    const key = `budgetHistory_${userId}`;
    const stored = await AsyncStorage.getItem(key);

    let history = stored ? JSON.parse(stored) : {};

    // Store the monthly result
    history[month] = {
      month,
      successRate: monthlyResult.successRate,
      categoryResults: monthlyResult.categoryResults || {},
      processedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(key, JSON.stringify(history));
    console.log(
      `📊 Stored budget history for ${month}: ${monthlyResult.successRate}% success rate`
    );
  } catch (error) {
    console.error("Error storing monthly budget history:", error);
  }
};

// Get monthly budget history
export const getMonthlyBudgetHistory = async (
  userId: string,
  month: string
): Promise<MonthlyBudgetHistory | null> => {
  try {
    const key = `budgetHistory_${userId}`;
    const stored = await AsyncStorage.getItem(key);

    if (stored) {
      const history = JSON.parse(stored);
      return history[month] || null;
    }

    return null;
  } catch (error) {
    console.error("Error getting monthly budget history:", error);
    return null;
  }
};

// Get all budget history
export const getAllBudgetHistory = async (
  userId: string
): Promise<MonthlyBudgetHistory[]> => {
  try {
    const key = `budgetHistory_${userId}`;
    const stored = await AsyncStorage.getItem(key);

    if (stored) {
      const history = JSON.parse(stored);
      return Object.values(history).sort((a: any, b: any) =>
        a.month.localeCompare(b.month)
      );
    }

    return [];
  } catch (error) {
    console.error("Error getting all budget history:", error);
    return [];
  }
};

// Calculate current streak based on historical data
export const calculateCurrentStreak = async (
  userId: string
): Promise<number> => {
  try {
    const history = await getAllBudgetHistory(userId);

    if (history.length === 0) return 0;

    // Sort by month (newest first)
    const sortedHistory = history.sort((a, b) =>
      b.month.localeCompare(a.month)
    );

    let streak = 0;
    for (const monthData of sortedHistory) {
      if (monthData.successRate >= 80) {
        streak++;
      } else {
        break; // Streak broken
      }
    }

    return streak;
  } catch (error) {
    console.error("Error calculating current streak:", error);
    return 0;
  }
};

// Calculate category streak for a specific category
export const calculateCategoryStreak = async (
  userId: string,
  categoryId: string
): Promise<number> => {
  try {
    const history = await getAllBudgetHistory(userId);

    if (history.length === 0) return 0;

    // Sort by month (newest first)
    const sortedHistory = history.sort((a, b) =>
      b.month.localeCompare(a.month)
    );

    let streak = 0;
    for (const monthData of sortedHistory) {
      const categoryResult = monthData.categoryResults[categoryId];
      if (categoryResult && categoryResult.success) {
        streak++;
      } else {
        break; // Streak broken
      }
    }

    return streak;
  } catch (error) {
    console.error("Error calculating category streak:", error);
    return 0;
  }
};

// Process and store historical data for a specific month
export const processHistoricalMonth = async (
  userId: string,
  month: string
): Promise<void> => {
  try {
    console.log(`📊 Processing historical data for month: ${month}`);

    // Calculate the monthly budget result
    const monthDate = new Date(month + "-01");
    const monthlyResult = await calculateMonthlyBudgetResult(
      userId,
      monthDate.getFullYear(),
      monthDate.getMonth()
    );

    // Store the historical data
    await storeMonthlyBudgetHistory(userId, month, monthlyResult);

    console.log(
      `✅ Stored historical data for ${month}: ${monthlyResult.successRate}% success rate`
    );
  } catch (error) {
    console.error(`Error processing historical month ${month}:`, error);
  }
};

// Get budget streak data
export const getBudgetStreakData = async (
  userId: string
): Promise<BudgetStreakData> => {
  try {
    const currentStreak = await calculateCurrentStreak(userId);
    const history = await getAllBudgetHistory(userId);

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;

    for (const monthData of history) {
      if (monthData.successRate >= 80) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Calculate category streaks
    const categoryStreaks: { [categoryId: string]: number } = {};
    const allCategories = new Set<string>();

    // Get all unique category IDs from history
    history.forEach((monthData) => {
      Object.keys(monthData.categoryResults).forEach((categoryId) => {
        allCategories.add(categoryId);
      });
    });

    // Calculate streak for each category
    for (const categoryId of allCategories) {
      categoryStreaks[categoryId] = await calculateCategoryStreak(
        userId,
        categoryId
      );
    }

    return {
      currentStreak,
      longestStreak,
      categoryStreaks,
      lastProcessedMonth:
        history.length > 0 ? history[history.length - 1].month : "",
    };
  } catch (error) {
    console.error("Error getting budget streak data:", error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      categoryStreaks: {},
      lastProcessedMonth: "",
    };
  }
};
