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

// Get user's active budget categories (categories with monthlyLimit > 0)
const getUserActiveCategories = async (userId: string): Promise<string[]> => {
  try {
    const key = `budgetCategories_${userId}`;
    const stored = await AsyncStorage.getItem(key);

    if (stored) {
      const categories = JSON.parse(stored);
      // Return only category IDs that have a monthly limit set
      return categories
        .filter((cat: any) => cat.monthlyLimit > 0)
        .map((cat: any) => cat.id);
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
    const userRef = ref(db, `users/${userId}/profile`);
    const userSnapshot = await get(userRef);

    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      if (userData.createdAt) {
        const accountCreationDate = new Date(userData.createdAt);
        const currentDate = new Date();
        const monthsSinceCreation =
          (currentDate.getFullYear() - accountCreationDate.getFullYear()) * 12 +
          (currentDate.getMonth() - accountCreationDate.getMonth()) +
          1;
        return monthsSinceCreation;
      }
    }
    return 1; // Default to 1 month if no creation date
  } catch (error) {
    console.error("Error getting user account age:", error);
    return 1;
  }
};

// Check if a month is complete (not the current month)
const isMonthComplete = (month: string): boolean => {
  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}`;
  return month !== currentMonth;
};

// Check if a category was active during a specific month
const wasCategoryActiveInMonth = async (
  userId: string,
  categoryId: string,
  month: string
): Promise<boolean> => {
  try {
    // For now, we'll use the current active categories
    // In a more sophisticated system, we'd track category history
    const activeCategories = await getUserActiveCategories(userId);
    return activeCategories.includes(categoryId);
  } catch (error) {
    console.error("Error checking if category was active in month:", error);
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
      return JSON.parse(stored);
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
      console.log("Skipping achievement processing for current month:", month);
      return [];
    }

    const progress = await getAchievementProgress(userId);
    const accountAge = await getUserAccountAge(userId);
    const activeCategories = await getUserActiveCategories(userId);
    const newAchievements: Achievement[] = [];

    console.log(
      `🎯 Processing achievements for user with ${activeCategories.length} active categories:`,
      activeCategories
    );

    // Check if this month was successful (80%+ success rate)
    if (monthlyResult.successRate >= 80) {
      // Calculate current streak (simplified - you might want to get this from budget streak data)
      const currentStreak = await calculateCurrentStreak(userId, month);

      // Award streak achievements based on account age
      if (
        accountAge >= 1 &&
        currentStreak === 1 &&
        !hasAchievement(progress, "streak_1")
      ) {
        newAchievements.push(createAchievement("streak_1"));
      }
      if (
        accountAge >= 2 &&
        currentStreak === 2 &&
        !hasAchievement(progress, "streak_2")
      ) {
        newAchievements.push(createAchievement("streak_2"));
      }
      if (
        accountAge >= 3 &&
        currentStreak === 3 &&
        !hasAchievement(progress, "streak_3")
      ) {
        newAchievements.push(createAchievement("streak_3"));
      }
      if (
        accountAge >= 6 &&
        currentStreak === 6 &&
        !hasAchievement(progress, "streak_6")
      ) {
        newAchievements.push(createAchievement("streak_6"));
      }
      if (
        accountAge >= 12 &&
        currentStreak === 12 &&
        !hasAchievement(progress, "streak_12")
      ) {
        newAchievements.push(createAchievement("streak_12"));
      }

      // Award category achievements ONLY for categories the user actually budgets for
      // AND only for completed months (not the current month)
      const categoryResults = Object.values(
        monthlyResult.categoryResults || {}
      );
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
            !hasAchievement(progress, `category_${categoryResult.categoryId}_1`)
          ) {
            newAchievements.push(
              createAchievement(`category_${categoryResult.categoryId}_1`)
            );
          }
          if (
            accountAge >= 2 &&
            categoryStreak === 2 &&
            !hasAchievement(progress, `category_${categoryResult.categoryId}_2`)
          ) {
            newAchievements.push(
              createAchievement(`category_${categoryResult.categoryId}_2`)
            );
          }
          if (
            accountAge >= 3 &&
            categoryStreak === 3 &&
            !hasAchievement(progress, `category_${categoryResult.categoryId}_3`)
          ) {
            newAchievements.push(
              createAchievement(`category_${categoryResult.categoryId}_3`)
            );
          }
        }
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

const createAchievement = (achievementId: string): Achievement => {
  const definition =
    ACHIEVEMENT_DEFINITIONS[
      achievementId as keyof typeof ACHIEVEMENT_DEFINITIONS
    ];
  if (!definition) {
    return {
      id: achievementId,
      title: "Unknown Achievement",
      description: "This achievement is no longer available.",
      icon: "❓",
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

// Calculate current streak (simplified - you might want to get this from existing budget streak data)
const calculateCurrentStreak = async (
  userId: string,
  month: string
): Promise<number> => {
  // This is a simplified version - you might want to integrate with existing streak calculation
  // For now, return a placeholder
  return 1;
};

// Calculate category streak (simplified)
const calculateCategoryStreak = async (
  userId: string,
  categoryId: string,
  month: string
): Promise<number> => {
  // This is a simplified version - you might want to integrate with existing streak calculation
  // For now, return a placeholder
  return 1;
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

// Clean up achievements for categories the user no longer budgets for
export const cleanupIrrelevantAchievements = async (
  userId: string
): Promise<void> => {
  try {
    const progress = await getAchievementProgress(userId);
    const activeCategories = await getUserActiveCategories(userId);

    // Keep streak achievements and achievements for active categories only
    const relevantAchievements = progress.achievements.filter((achievement) => {
      // Always keep streak achievements
      if (achievement.id.startsWith("streak_")) {
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
      console.log(
        `🧹 Cleaned up ${
          progress.achievements.length - relevantAchievements.length
        } irrelevant achievements`
      );
    }
  } catch (error) {
    console.error("Error cleaning up irrelevant achievements:", error);
  }
};
