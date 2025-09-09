import AsyncStorage from "@react-native-async-storage/async-storage";
import { updateWeeklyStreak } from "./achievementService";

// Track when user enters a transaction
export const trackTransactionEntry = async (userId: string): Promise<void> => {
  try {
    const key = `transactionEntries_${userId}`;
    const stored = await AsyncStorage.getItem(key);

    const now = new Date();
    const currentWeek = getWeekKey(now);

    let entryData = stored
      ? JSON.parse(stored)
      : {
          entries: {},
          lastUpdated: "",
        };

    // Mark this week as having a transaction entry
    entryData.entries[currentWeek] = true;
    entryData.lastUpdated = currentWeek;

    await AsyncStorage.setItem(key, JSON.stringify(entryData));

    // Update the weekly streak
    await updateWeeklyStreak(userId);

    console.log(`📝 Tracked transaction entry for week: ${currentWeek}`);
  } catch (error) {
    console.error("Error tracking transaction entry:", error);
  }
};

// Get user's weekly transaction entry streak data
export const getWeeklyStreakData = async (
  userId: string
): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastWeek: string;
}> => {
  try {
    const key = `weeklyStreak_${userId}`;
    const stored = await AsyncStorage.getItem(key);

    if (stored) {
      return JSON.parse(stored);
    }

    return {
      currentStreak: 0,
      longestStreak: 0,
      lastWeek: "",
    };
  } catch (error) {
    console.error("Error getting weekly streak data:", error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastWeek: "",
    };
  }
};

// Helper function to get week key (YYYY-WW format)
const getWeekKey = (date: Date): string => {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, "0")}`;
};

// Helper function to get week number
const getWeekNumber = (date: Date): number => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};
