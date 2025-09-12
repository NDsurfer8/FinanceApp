import AsyncStorage from "@react-native-async-storage/async-storage";
import { processMonthAchievements } from "./achievementService";
import { calculateMonthlyBudgetResult } from "./userData";

export interface MonthTransitionState {
  userId: string;
  lastProcessedMonth: string; // YYYY-MM format
  lastCheckDate: string; // ISO date string
}

// Get current month in YYYY-MM format
const getCurrentMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

// Get previous month in YYYY-MM format
const getPreviousMonth = (): string => {
  const now = new Date();
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${previousMonth.getFullYear()}-${String(
    previousMonth.getMonth() + 1
  ).padStart(2, "0")}`;
};

// Check if we need to process month transitions
export const checkMonthTransitions = async (userId: string): Promise<void> => {
  try {
    const currentMonth = getCurrentMonth();
    const previousMonth = getPreviousMonth();

    // Get last processed month
    const lastProcessedMonth = await getLastProcessedMonth(userId);

    // If we haven't processed the previous month yet, do it now
    if (lastProcessedMonth !== previousMonth) {
      await processPreviousMonth(userId, previousMonth);
      await setLastProcessedMonth(userId, previousMonth);
    }
  } catch (error) {
    console.error("Error checking month transitions:", error);
  }
};

// Process achievements for the previous month
const processPreviousMonth = async (
  userId: string,
  month: string
): Promise<void> => {
  try {
    // Double-check that this is a completed month (not current month)
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}`;

    if (month === currentMonth) {
      return;
    }

    // Calculate monthly budget result for the previous month
    const monthDate = new Date(month + "-01");
    const monthlyResult = await calculateMonthlyBudgetResult(
      userId,
      monthDate.getFullYear(),
      monthDate.getMonth()
    );

    // Store historical budget data for this month
    const { storeMonthlyBudgetHistory } = await import(
      "./historicalBudgetService"
    );
    await storeMonthlyBudgetHistory(userId, month, monthlyResult);

    // Process achievements for this month
    const newAchievements = await processMonthAchievements(
      userId,
      month,
      monthlyResult
    );

    if (newAchievements.length > 0) {
    } else {
      console.log(`📝 No new achievements for ${month}`);
    }
  } catch (error) {
    console.error(`Error processing previous month ${month}:`, error);
  }
};

// Get last processed month for user
const getLastProcessedMonth = async (userId: string): Promise<string> => {
  try {
    const key = `lastProcessedMonth_${userId}`;
    const stored = await AsyncStorage.getItem(key);
    return stored || "";
  } catch (error) {
    console.error("Error getting last processed month:", error);
    return "";
  }
};

// Set last processed month for user
const setLastProcessedMonth = async (
  userId: string,
  month: string
): Promise<void> => {
  try {
    const key = `lastProcessedMonth_${userId}`;
    await AsyncStorage.setItem(key, month);
  } catch (error) {
    console.error("Error setting last processed month:", error);
  }
};

// Initialize month transition tracking for new users
export const initializeMonthTracking = async (
  userId: string
): Promise<void> => {
  try {
    const currentMonth = getCurrentMonth();
    await setLastProcessedMonth(userId, currentMonth);
  } catch (error) {
    console.error("Error initializing month tracking:", error);
  }
};
