import AsyncStorage from "@react-native-async-storage/async-storage";
import { ref, get } from "firebase/database";
import { db } from "./firebase";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt?: string; // ISO date string
}

export interface AchievementProgress {
  userId: string;
  lastProcessedMonth: string; // YYYY-MM format
  achievements: Achievement[];
  seenAchievements: string[]; // Array of achievement IDs user has seen
}

// Achievement definitions
const ACHIEVEMENT_DEFINITIONS = {
  // Streak achievements
  streak_1: {
    title: "First Month",
    description: "Stayed on budget for your first month!",
    icon: "🎉",
  },
  streak_2: {
    title: "Getting Started",
    description: "Stayed on budget for 2 consecutive months!",
    icon: "⭐",
  },
  streak_3: {
    title: "3-Month Streak",
    description: "Stayed on budget for 3 consecutive months!",
    icon: "🏆",
  },
  streak_6: {
    title: "6-Month Streak",
    description: "Stayed on budget for 6 consecutive months!",
    icon: "🥇",
  },
  streak_12: {
    title: "1-Year Streak",
    description: "Stayed on budget for 12 consecutive months!",
    icon: "👑",
  },

  // Weekly transaction entry streak achievements
  weekly_4: {
    title: "Monthly Tracker",
    description: "Entered transactions for 4 consecutive weeks!",
    icon: "📅",
  },
  weekly_8: {
    title: "Two Month Champion",
    description: "Entered transactions for 8 consecutive weeks!",
    icon: "🥇",
  },
  weekly_12: {
    title: "Quarterly Master",
    description: "Entered transactions for 12 consecutive weeks!",
    icon: "🏆",
  },
  weekly_24: {
    title: "Half Year Hero",
    description: "Entered transactions for 24 consecutive weeks!",
    icon: "🌟",
  },
  weekly_52: {
    title: "Year Long Tracker",
    description: "Entered transactions for 52 consecutive weeks!",
    icon: "🎯",
  },
  // Category achievements
  category_1_1: {
    title: "Rent Starter",
    description: "Stayed under rent budget for 1 month!",
    icon: "🏠",
  },
  category_10_1: {
    title: "Food Starter",
    description: "Stayed under food budget for 1 month!",
    icon: "🍽️",
  },
  category_11_1: {
    title: "Transportation Starter",
    description: "Stayed under transportation budget for 1 month!",
    icon: "🚗",
  },
  category_12_1: {
    title: "Health Starter",
    description: "Stayed under health budget for 1 month!",
    icon: "💊",
  },
  category_13_1: {
    title: "Entertainment Starter",
    description: "Stayed under entertainment budget for 1 month!",
    icon: "🎬",
  },
  category_14_1: {
    title: "Shopping Starter",
    description: "Stayed under shopping budget for 1 month!",
    icon: "🛍️",
  },

  category_1_2: {
    title: "Rent Pro",
    description: "Stayed under rent budget for 2 months!",
    icon: "🏠",
  },
  category_10_2: {
    title: "Food Pro",
    description: "Stayed under food budget for 2 months!",
    icon: "🍽️",
  },
  category_11_2: {
    title: "Transportation Pro",
    description: "Stayed under transportation budget for 2 months!",
    icon: "🚗",
  },
  category_12_2: {
    title: "Health Pro",
    description: "Stayed under health budget for 2 months!",
    icon: "💊",
  },
  category_13_2: {
    title: "Entertainment Pro",
    description: "Stayed under entertainment budget for 2 months!",
    icon: "🎬",
  },
  category_14_2: {
    title: "Shopping Pro",
    description: "Stayed under shopping budget for 2 months!",
    icon: "🛍️",
  },

  category_1_3: {
    title: "Rent Master",
    description: "Stayed under rent budget for 3 months!",
    icon: "🏠",
  },
  category_10_3: {
    title: "Food Master",
    description: "Stayed under food budget for 3 months!",
    icon: "🍽️",
  },
  category_11_3: {
    title: "Transportation Master",
    description: "Stayed under transportation budget for 3 months!",
    icon: "🚗",
  },
  category_12_3: {
    title: "Health Master",
    description: "Stayed under health budget for 3 months!",
    icon: "💊",
  },
  category_13_3: {
    title: "Entertainment Master",
    description: "Stayed under entertainment budget for 3 months!",
    icon: "🎬",
  },
  category_14_3: {
    title: "Shopping Master",
    description: "Stayed under shopping budget for 3 months!",
    icon: "🛍️",
  },

  // Car Payment achievements
  category_2_1: {
    title: "Car Payment Starter",
    description: "Stayed under car payment budget for 1 month!",
    icon: "🚗",
  },
  category_2_2: {
    title: "Car Payment Pro",
    description: "Stayed under car payment budget for 2 months!",
    icon: "🚗",
  },
  category_2_3: {
    title: "Car Payment Master",
    description: "Stayed under car payment budget for 3 months!",
    icon: "🚗",
  },

  // Insurance achievements
  category_3_1: {
    title: "Insurance Starter",
    description: "Stayed under insurance budget for 1 month!",
    icon: "🛡️",
  },
  category_3_2: {
    title: "Insurance Pro",
    description: "Stayed under insurance budget for 2 months!",
    icon: "🛡️",
  },
  category_3_3: {
    title: "Insurance Master",
    description: "Stayed under insurance budget for 3 months!",
    icon: "🛡️",
  },

  // Utilities achievements
  category_4_1: {
    title: "Utilities Starter",
    description: "Stayed under utilities budget for 1 month!",
    icon: "⚡",
  },
  category_4_2: {
    title: "Utilities Pro",
    description: "Stayed under utilities budget for 2 months!",
    icon: "⚡",
  },
  category_4_3: {
    title: "Utilities Master",
    description: "Stayed under utilities budget for 3 months!",
    icon: "⚡",
  },

  // Internet achievements
  category_5_1: {
    title: "Internet Starter",
    description: "Stayed under internet budget for 1 month!",
    icon: "🌐",
  },
  category_5_2: {
    title: "Internet Pro",
    description: "Stayed under internet budget for 2 months!",
    icon: "🌐",
  },
  category_5_3: {
    title: "Internet Master",
    description: "Stayed under internet budget for 3 months!",
    icon: "🌐",
  },

  // Phone achievements
  category_6_1: {
    title: "Phone Starter",
    description: "Stayed under phone budget for 1 month!",
    icon: "📱",
  },
  category_6_2: {
    title: "Phone Pro",
    description: "Stayed under phone budget for 2 months!",
    icon: "📱",
  },
  category_6_3: {
    title: "Phone Master",
    description: "Stayed under phone budget for 3 months!",
    icon: "📱",
  },

  // Subscriptions achievements
  category_7_1: {
    title: "Subscriptions Starter",
    description: "Stayed under subscriptions budget for 1 month!",
    icon: "📺",
  },
  category_7_2: {
    title: "Subscriptions Pro",
    description: "Stayed under subscriptions budget for 2 months!",
    icon: "📺",
  },
  category_7_3: {
    title: "Subscriptions Master",
    description: "Stayed under subscriptions budget for 3 months!",
    icon: "📺",
  },

  // Credit Card achievements
  category_8_1: {
    title: "Credit Card Starter",
    description: "Stayed under credit card budget for 1 month!",
    icon: "💳",
  },
  category_8_2: {
    title: "Credit Card Pro",
    description: "Stayed under credit card budget for 2 months!",
    icon: "💳",
  },
  category_8_3: {
    title: "Credit Card Master",
    description: "Stayed under credit card budget for 3 months!",
    icon: "💳",
  },

  // Loan Payment achievements
  category_9_1: {
    title: "Loan Payment Starter",
    description: "Stayed under loan payment budget for 1 month!",
    icon: "🏦",
  },
  category_9_2: {
    title: "Loan Payment Pro",
    description: "Stayed under loan payment budget for 2 months!",
    icon: "🏦",
  },
  category_9_3: {
    title: "Loan Payment Master",
    description: "Stayed under loan payment budget for 3 months!",
    icon: "🏦",
  },

  // Business achievements
  category_15_1: {
    title: "Business Starter",
    description: "Stayed under business budget for 1 month!",
    icon: "💼",
  },
  category_15_2: {
    title: "Business Pro",
    description: "Stayed under business budget for 2 months!",
    icon: "💼",
  },
  category_15_3: {
    title: "Business Master",
    description: "Stayed under business budget for 3 months!",
    icon: "💼",
  },

  // Other Expenses achievements
  category_16_1: {
    title: "Other Expenses Starter",
    description: "Stayed under other expenses budget for 1 month!",
    icon: "📋",
  },
  category_16_2: {
    title: "Other Expenses Pro",
    description: "Stayed under other expenses budget for 2 months!",
    icon: "📋",
  },
  category_16_3: {
    title: "Other Expenses Master",
    description: "Stayed under other expenses budget for 3 months!",
    icon: "📋",
  },
};

// Helper function to get week key (YYYY-WW format)
const getWeekKey = (date: Date): string => {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, "0")}`;
};

// Helper function to get week number
const getWeekNumber = (date: Date): number => {
  try {
    if (isNaN(date.getTime())) {
      console.error("Invalid date in getWeekNumber");
      return 1;
    }

    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    if (isNaN(firstDayOfYear.getTime())) {
      console.error("Invalid first day of year in getWeekNumber");
      return 1;
    }

    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  } catch (error) {
    console.error("Error in getWeekNumber:", error);
    return 1;
  }
};

// Helper function to check if weeks are consecutive
const isConsecutiveWeek = (lastWeek: string, currentWeek: string): boolean => {
  if (!lastWeek) return true; // First week

  const [lastYear, lastWeekNum] = lastWeek.split("-W").map(Number);
  const [currentYear, currentWeekNum] = currentWeek.split("-W").map(Number);

  // Same year, consecutive weeks
  if (lastYear === currentYear) {
    return currentWeekNum === lastWeekNum + 1;
  }

  // Different year, check if it's week 1 of next year
  if (currentYear === lastYear + 1 && currentWeekNum === 1) {
    // Check if last week was the last week of the previous year
    const lastWeekOfYear = getWeekNumber(new Date(lastYear, 11, 31));
    return lastWeekNum === lastWeekOfYear;
  }

  return false;
};

// Get user's weekly transaction entry streak
const getUserWeeklyStreak = async (userId: string): Promise<number> => {
  try {
    const key = `weeklyStreak_${userId}`;
    const stored = await AsyncStorage.getItem(key);

    if (stored) {
      try {
        const streakData = JSON.parse(stored);
        return streakData?.currentStreak || 0;
      } catch (parseError) {
        console.error("Error parsing weekly streak JSON:", parseError);
        return 0;
      }
    }

    return 0;
  } catch (error) {
    console.error("Error getting user weekly streak:", error);
    return 0;
  }
};

// Update user's weekly transaction entry streak
export const updateWeeklyStreak = async (userId: string): Promise<void> => {
  try {
    const key = `weeklyStreak_${userId}`;
    const stored = await AsyncStorage.getItem(key);

    const now = new Date();
    if (isNaN(now.getTime())) {
      console.error("Invalid current date in updateWeeklyStreak");
      return;
    }

    const currentWeek = getWeekKey(now);

    let streakData;
    if (stored) {
      try {
        streakData = JSON.parse(stored);
      } catch (parseError) {
        console.error(
          "Error parsing weekly streak JSON in updateWeeklyStreak:",
          parseError
        );
        streakData = {
          currentStreak: 0,
          longestStreak: 0,
          lastWeek: "",
        };
      }
    } else {
      streakData = {
        currentStreak: 0,
        longestStreak: 0,
        lastWeek: "",
      };
    }

    // If this is a new week, update the streak
    if (streakData.lastWeek !== currentWeek) {
      const lastWeek = streakData.lastWeek;
      const isConsecutive = isConsecutiveWeek(lastWeek, currentWeek);

      if (isConsecutive) {
        streakData.currentStreak += 1;
      } else {
        streakData.currentStreak = 1; // Reset streak
      }

      streakData.longestStreak = Math.max(
        streakData.longestStreak,
        streakData.currentStreak
      );
      streakData.lastWeek = currentWeek;

      await AsyncStorage.setItem(key, JSON.stringify(streakData));
    }
  } catch (error) {
    console.error("Error updating weekly streak:", error);
  }
};

// Get user's active budget categories (categories with monthlyLimit > 0)
const getUserActiveCategories = async (userId: string): Promise<string[]> => {
  try {
    const key = `budgetCategories_${userId}`;
    const stored = await AsyncStorage.getItem(key);

    if (stored) {
      try {
        const categories = JSON.parse(stored);
        // Return only category IDs that have a monthly limit set
        return (
          categories
            ?.filter((cat: any) => cat?.monthlyLimit > 0)
            ?.map((cat: any) => cat?.id) || []
        );
      } catch (parseError) {
        console.error("Error parsing categories JSON:", parseError);
        return [];
      }
    }

    return [];
  } catch (error) {
    console.error("Error getting user active categories:", error);
    return [];
  }
};

// Get user's account creation date
const getUserAccountAge = async (userId: string): Promise<number> => {
  try {
    // Check for simulated date first (for testing)
    const simulatedDate = await AsyncStorage.getItem(
      `simulated_createdAt_${userId}`
    );
    if (simulatedDate) {
      const createdDate = new Date(simulatedDate);
      const now = new Date();

      // Validate dates before calculation
      if (isNaN(createdDate.getTime()) || isNaN(now.getTime())) {
        console.error("Invalid date detected in getUserAccountAge");
        return 0;
      }

      // Calculate the difference in milliseconds
      const diffInMs = now.getTime() - createdDate.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
      const diffInMonths = diffInDays / 30; // Approximate months

      return Math.max(0, Math.round(diffInMonths * 10) / 10);
    }

    // Use real user profile data
    const userRef = ref(db, `users/${userId}/profile`);
    const userSnapshot = await get(userRef);

    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      if (userData.createdAt) {
        const accountCreationDate = new Date(userData.createdAt);
        const currentDate = new Date();

        // Validate dates before calculation
        if (
          isNaN(accountCreationDate.getTime()) ||
          isNaN(currentDate.getTime())
        ) {
          console.error(
            "Invalid date detected in getUserAccountAge from Firebase"
          );
          return 0;
        }

        // Calculate the difference in milliseconds
        const diffInMs = currentDate.getTime() - accountCreationDate.getTime();
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
        const monthsSinceCreation = diffInDays / 30; // Approximate months

        return Math.max(0, Math.round(monthsSinceCreation * 10) / 10);
      }
    }
    return 0; // Default to 0 months for new users
  } catch (error) {
    console.error("Error getting user account age:", error);
    return 0;
  }
};

// Check if a month is complete (not the current month)
const isMonthComplete = (month: string): boolean => {
  try {
    const currentDate = new Date();
    if (isNaN(currentDate.getTime())) {
      console.error("Invalid current date in isMonthComplete");
      return false;
    }

    const currentMonth = `${currentDate.getFullYear()}-${String(
      currentDate.getMonth() + 1
    ).padStart(2, "0")}`;
    return month !== currentMonth;
  } catch (error) {
    console.error("Error in isMonthComplete:", error);
    return false;
  }
};

// Get achievement progress for user
export const getAchievementProgress = async (
  userId: string
): Promise<AchievementProgress> => {
  try {
    const key = `achievementProgress_${userId}`;
    const stored = await AsyncStorage.getItem(key);

    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (parseError) {
        console.error("Error parsing achievement progress JSON:", parseError);
        return {
          userId,
          lastProcessedMonth: "",
          achievements: [],
          seenAchievements: [],
        };
      }
    }

    // Return default progress
    return {
      userId,
      lastProcessedMonth: "",
      achievements: [],
      seenAchievements: [],
    };
  } catch (error) {
    console.error("Error getting achievement progress:", error);
    return {
      userId,
      lastProcessedMonth: "",
      achievements: [],
      seenAchievements: [],
    };
  }
};

// Save achievement progress for user
export const saveAchievementProgress = async (
  progress: AchievementProgress
): Promise<void> => {
  try {
    const key = `achievementProgress_${progress.userId}`;
    await AsyncStorage.setItem(key, JSON.stringify(progress));
  } catch (error) {
    console.error("Error saving achievement progress:", error);
    throw error;
  }
};

// Process achievements for a specific month
export const processMonthAchievements = async (
  userId: string,
  month: string,
  monthlyResult: any
): Promise<Achievement[]> => {
  try {
    // Only process completed months
    if (!isMonthComplete(month)) {
      return [];
    }

    const progress = await getAchievementProgress(userId);
    const accountAge = await getUserAccountAge(userId);
    const activeCategories = await getUserActiveCategories(userId);
    const weeklyStreak = await getUserWeeklyStreak(userId);
    const newAchievements: Achievement[] = [];

    // Check if this month was successful (80%+ success rate)
    if (monthlyResult?.successRate >= 80) {
      // Calculate current streak using historical data
      const currentStreak = await calculateCurrentStreak(userId, month);

      // Award streak achievements based on account age
      // Only award if user has had the app long enough AND has the required streak
      if (
        accountAge >= 1 &&
        currentStreak >= 1 &&
        !hasAchievement(progress, "streak_1")
      ) {
        newAchievements.push(await createAchievement("streak_1", userId));
      } else if (currentStreak >= 1) {
        console.log(
          `⏸️ Skipping streak_1 achievement: accountAge=${accountAge} < 1 month required`
        );
      }
      if (
        accountAge >= 2 &&
        currentStreak >= 2 &&
        !hasAchievement(progress, "streak_2")
      ) {
        newAchievements.push(await createAchievement("streak_2", userId));
      }
      if (
        accountAge >= 3 &&
        currentStreak >= 3 &&
        !hasAchievement(progress, "streak_3")
      ) {
        newAchievements.push(await createAchievement("streak_3", userId));
      }
      if (
        accountAge >= 6 &&
        currentStreak >= 6 &&
        !hasAchievement(progress, "streak_6")
      ) {
        newAchievements.push(await createAchievement("streak_6", userId));
      }
      if (
        accountAge >= 12 &&
        currentStreak >= 12 &&
        !hasAchievement(progress, "streak_12")
      ) {
        newAchievements.push(await createAchievement("streak_12", userId));
      }

      // Award weekly streak achievements based on account age
      if (
        accountAge >= 1 &&
        weeklyStreak >= 4 &&
        !hasAchievement(progress, "weekly_4")
      ) {
        newAchievements.push(await createAchievement("weekly_4", userId));
      }
      if (
        accountAge >= 2 &&
        weeklyStreak >= 8 &&
        !hasAchievement(progress, "weekly_8")
      ) {
        newAchievements.push(await createAchievement("weekly_8", userId));
      }
      if (
        accountAge >= 3 &&
        weeklyStreak >= 12 &&
        !hasAchievement(progress, "weekly_12")
      ) {
        newAchievements.push(await createAchievement("weekly_12", userId));
      }
      if (
        accountAge >= 6 &&
        weeklyStreak >= 24 &&
        !hasAchievement(progress, "weekly_24")
      ) {
        newAchievements.push(await createAchievement("weekly_24", userId));
      }
      if (
        accountAge >= 12 &&
        weeklyStreak >= 52 &&
        !hasAchievement(progress, "weekly_52")
      ) {
        newAchievements.push(await createAchievement("weekly_52", userId));
      }

      // Award category achievements ONLY for categories the user actually budgets for
      // AND only for completed months (not the current month)
      if (monthlyResult?.categoryResults) {
        const categoryResults = Object.values(monthlyResult.categoryResults);
        for (const result of categoryResults) {
          const categoryResult = result as any; // Type assertion for category result
          // Only process achievements for categories the user has set budgets for
          // AND only if this is a completed month (not current month)
          if (
            categoryResult.success &&
            activeCategories.includes(categoryResult.categoryId)
          ) {
            // Double-check that this is a completed month
            if (!isMonthComplete(month)) {
              console.log(
                `⏸️ Skipping category achievement for ${categoryResult.categoryId} - current month not complete`
              );
              continue;
            }

            const categoryStreak = await calculateCategoryStreak(
              userId,
              categoryResult.categoryId,
              month
            );

            // Award category achievements based on account age
            if (
              accountAge >= 1 &&
              categoryStreak === 1 &&
              !hasAchievement(
                progress,
                `category_${categoryResult.categoryId}_1`
              )
            ) {
              newAchievements.push(
                await createAchievement(
                  `category_${categoryResult.categoryId}_1`,
                  userId
                )
              );
            }
            if (
              accountAge >= 2 &&
              categoryStreak === 2 &&
              !hasAchievement(
                progress,
                `category_${categoryResult.categoryId}_2`
              )
            ) {
              newAchievements.push(
                await createAchievement(
                  `category_${categoryResult.categoryId}_2`,
                  userId
                )
              );
            }
            if (
              accountAge >= 3 &&
              categoryStreak === 3 &&
              !hasAchievement(
                progress,
                `category_${categoryResult.categoryId}_3`
              )
            ) {
              newAchievements.push(
                await createAchievement(
                  `category_${categoryResult.categoryId}_3`,
                  userId
                )
              );
            }
          }
        }
      } else {
        console.log(
          "No category results found for month, skipping category achievements"
        );
      }
    }

    // Update progress with new achievements
    if (newAchievements.length > 0) {
      progress.achievements = [...progress.achievements, ...newAchievements];
      progress.lastProcessedMonth = month;
      await saveAchievementProgress(progress);
    }

    return newAchievements;
  } catch (error) {
    console.error("Error processing month achievements:", error);
    return [];
  }
};

// Helper functions
const hasAchievement = (
  progress: AchievementProgress,
  achievementId: string
): boolean => {
  return progress.achievements.some(
    (achievement) => achievement.id === achievementId
  );
};

const createAchievement = async (
  achievementId: string,
  userId?: string
): Promise<Achievement> => {
  const definition =
    ACHIEVEMENT_DEFINITIONS[
      achievementId as keyof typeof ACHIEVEMENT_DEFINITIONS
    ];

  if (!definition) {
    // Check if this is a custom category achievement
    const categoryMatch = achievementId.match(/^category_(\d+)_(\d+)$/);
    if (categoryMatch && userId) {
      const [, categoryId, streakLevel] = categoryMatch;

      try {
        // Get the category name
        const { getUserBudgetCategories } = await import("./userData");
        const categories = await getUserBudgetCategories(userId);
        const category = categories.find((cat) => cat.id === categoryId);

        if (category) {
          const streakText =
            streakLevel === "1"
              ? "Starter"
              : streakLevel === "2"
              ? "Pro"
              : "Master";
          const monthText =
            streakLevel === "1"
              ? "1 month"
              : streakLevel === "2"
              ? "2 months"
              : "3 months";

          return {
            id: achievementId,
            title: `${category.name} ${streakText}`,
            description: `Stayed under ${category.name} budget for ${monthText}!`,
            icon: "🎯",
            earnedAt: new Date().toISOString(),
          };
        }
      } catch (error) {
        console.error("Error getting category name for achievement:", error);
      }
    }

    // Fallback for unknown achievements
    return {
      id: achievementId,
      title: "Unknown Achievement",
      description: "This achievement is no longer available.",
      icon: "❓",
      earnedAt: new Date().toISOString(),
    };
  }

  return {
    id: achievementId,
    title: definition.title,
    description: definition.description,
    icon: definition.icon,
    earnedAt: new Date().toISOString(),
  };
};

// Calculate current streak using historical data
const calculateCurrentStreak = async (
  userId: string,
  month: string
): Promise<number> => {
  try {
    const { calculateCurrentStreak: getCurrentStreak } = await import(
      "./historicalBudgetService"
    );
    return await getCurrentStreak(userId);
  } catch (error) {
    console.error("Error calculating current streak:", error);
    return 0;
  }
};

// Calculate category streak using historical data
const calculateCategoryStreak = async (
  userId: string,
  categoryId: string,
  month: string
): Promise<number> => {
  try {
    const { calculateCategoryStreak: getCategoryStreak } = await import(
      "./historicalBudgetService"
    );
    return await getCategoryStreak(userId, categoryId);
  } catch (error) {
    console.error("Error calculating category streak:", error);
    return 0;
  }
};

// Mark achievements as seen
export const markAchievementsAsSeen = async (
  userId: string,
  achievementIds: string[]
): Promise<void> => {
  try {
    const progress = await getAchievementProgress(userId);
    progress.seenAchievements = [
      ...new Set([...progress.seenAchievements, ...achievementIds]),
    ];
    await saveAchievementProgress(progress);
  } catch (error) {
    console.error("Error marking achievements as seen:", error);
  }
};

// Get unseen achievements
export const getUnseenAchievements = async (
  userId: string
): Promise<Achievement[]> => {
  try {
    const progress = await getAchievementProgress(userId);
    return progress.achievements.filter(
      (achievement) => !progress.seenAchievements.includes(achievement.id)
    );
  } catch (error) {
    console.error("Error getting unseen achievements:", error);
    return [];
  }
};

// Get display streak that respects account age (for UI display)
export const getDisplayStreak = async (
  userId: string
): Promise<{
  currentStreak: number;
  longestStreak: number;
  accountAge: number;
}> => {
  try {
    const accountAge = await getUserAccountAge(userId);
    const { getBudgetStreakData } = await import("./historicalBudgetService");
    const streakData = await getBudgetStreakData(userId);

    // Only show streaks that the user has had the app long enough to earn
    const displayCurrentStreak = Math.min(streakData.currentStreak, accountAge);
    const displayLongestStreak = Math.min(streakData.longestStreak, accountAge);

    return {
      currentStreak: displayCurrentStreak,
      longestStreak: displayLongestStreak,
      accountAge,
    };
  } catch (error) {
    console.error("Error getting display streak:", error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      accountAge: 0,
    };
  }
};

// Clear any simulated dates (for production cleanup)
export const clearSimulatedDates = async (userId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(`simulated_createdAt_${userId}`);
  } catch (error) {
    console.error("Error clearing simulated date:", error);
  }
};

// Clean up achievements for categories the user no longer budgets for
export const cleanupIrrelevantAchievements = async (
  userId: string
): Promise<void> => {
  try {
    const progress = await getAchievementProgress(userId);
    const activeCategories = await getUserActiveCategories(userId);

    // Keep streak achievements, weekly achievements, and achievements for active categories only
    const relevantAchievements = progress.achievements.filter((achievement) => {
      // Always keep streak achievements
      if (achievement.id.startsWith("streak_")) {
        return true;
      }

      // Always keep weekly achievements
      if (achievement.id.startsWith("weekly_")) {
        return true;
      }

      // For category achievements, only keep if the category is still active
      if (achievement.id.startsWith("category_")) {
        const categoryId = achievement.id.split("_")[1];
        return activeCategories.includes(categoryId);
      }

      return false;
    });

    // Update progress if we removed any achievements
    if (relevantAchievements.length !== progress.achievements.length) {
      progress.achievements = relevantAchievements;
      await saveAchievementProgress(progress);
    }
  } catch (error) {
    console.error("Error cleaning up irrelevant achievements:", error);
  }
};
