import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSubscription } from "../contexts/SubscriptionContext";

export interface AIUsageConfig {
  enabled: boolean;
  freeTierLimit: number;
  premiumTierLimit: number | null; // null = unlimited
  resetFrequency: "monthly" | "weekly" | "daily";
  trackingEnabled: boolean;
}

export interface AIUsageStats {
  userId: string;
  currentPeriod: string; // YYYY-MM format for monthly
  usageCount: number;
  lastUsed: number;
  periodStart: number;
  periodEnd: number;
}

export interface AIUsageResponse {
  canUse: boolean;
  remainingQueries: number;
  limit: number;
  periodEnd: number;
  isPremium: boolean;
}

class AIUsageTracker {
  private static instance: AIUsageTracker;
  private config: AIUsageConfig = {
    enabled: true,
    freeTierLimit: 10,
    premiumTierLimit: null, // unlimited for premium
    resetFrequency: "monthly",
    trackingEnabled: true,
  };

  private static CONFIG_KEY = "ai_usage_config";
  private static USAGE_PREFIX = "ai_usage_";

  static getInstance(): AIUsageTracker {
    if (!AIUsageTracker.instance) {
      AIUsageTracker.instance = new AIUsageTracker();
    }
    return AIUsageTracker.instance;
  }

  // Load configuration from storage
  async loadConfig(): Promise<AIUsageConfig> {
    try {
      const configString = await AsyncStorage.getItem(
        AIUsageTracker.CONFIG_KEY
      );
      if (configString) {
        this.config = { ...this.config, ...JSON.parse(configString) };
      }
    } catch (error) {
      console.error("Error loading AI usage config:", error);
    }
    return this.config;
  }

  // Save configuration to storage
  async saveConfig(config: Partial<AIUsageConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem(
        AIUsageTracker.CONFIG_KEY,
        JSON.stringify(this.config)
      );
    } catch (error) {
      console.error("Error saving AI usage config:", error);
    }
  }

  // Get current configuration
  getConfig(): AIUsageConfig {
    return { ...this.config };
  }

  // Enable/disable usage tracking
  async setTrackingEnabled(enabled: boolean): Promise<void> {
    await this.saveConfig({ trackingEnabled: enabled });
  }

  // Set free tier limit
  async setFreeTierLimit(limit: number): Promise<void> {
    await this.saveConfig({ freeTierLimit: limit });
  }

  // Set premium tier limit (null for unlimited)
  async setPremiumTierLimit(limit: number | null): Promise<void> {
    await this.saveConfig({ premiumTierLimit: limit });
  }

  // Set reset frequency
  async setResetFrequency(
    frequency: "monthly" | "weekly" | "daily"
  ): Promise<void> {
    await this.saveConfig({ resetFrequency: frequency });
  }

  // Enable/disable entire system
  async setEnabled(enabled: boolean): Promise<void> {
    await this.saveConfig({ enabled: enabled });
  }

  // Get current period string based on frequency
  private getCurrentPeriod(): string {
    const now = new Date();
    switch (this.config.resetFrequency) {
      case "daily":
        return now.toISOString().split("T")[0]; // YYYY-MM-DD
      case "weekly":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return weekStart.toISOString().split("T")[0]; // YYYY-MM-DD
      case "monthly":
      default:
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
          2,
          "0"
        )}`; // YYYY-MM
    }
  }

  // Get period start and end timestamps
  private getPeriodTimestamps(): { start: number; end: number } {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (this.config.resetFrequency) {
      case "daily":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "weekly":
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
    }

    return {
      start: start.getTime(),
      end: end.getTime(),
    };
  }

  // Get usage stats for a user
  async getUsageStats(userId: string): Promise<AIUsageStats> {
    try {
      const key = `${AIUsageTracker.USAGE_PREFIX}${userId}`;
      const statsString = await AsyncStorage.getItem(key);

      if (statsString) {
        const stats: AIUsageStats = JSON.parse(statsString);
        const currentPeriod = this.getCurrentPeriod();

        // Check if we need to reset for new period
        if (stats.currentPeriod !== currentPeriod) {
          const { start, end } = this.getPeriodTimestamps();
          const newStats: AIUsageStats = {
            userId,
            currentPeriod,
            usageCount: 0,
            lastUsed: Date.now(),
            periodStart: start,
            periodEnd: end,
          };
          await this.saveUsageStats(userId, newStats);
          return newStats;
        }

        return stats;
      } else {
        // First time user
        const { start, end } = this.getPeriodTimestamps();
        const newStats: AIUsageStats = {
          userId,
          currentPeriod: this.getCurrentPeriod(),
          usageCount: 0,
          lastUsed: Date.now(),
          periodStart: start,
          periodEnd: end,
        };
        await this.saveUsageStats(userId, newStats);
        return newStats;
      }
    } catch (error) {
      console.error("Error getting usage stats:", error);
      // Return default stats on error
      const { start, end } = this.getPeriodTimestamps();
      return {
        userId,
        currentPeriod: this.getCurrentPeriod(),
        usageCount: 0,
        lastUsed: Date.now(),
        periodStart: start,
        periodEnd: end,
      };
    }
  }

  // Save usage stats
  private async saveUsageStats(
    userId: string,
    stats: AIUsageStats
  ): Promise<void> {
    try {
      const key = `${AIUsageTracker.USAGE_PREFIX}${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(stats));
    } catch (error) {
      console.error("Error saving usage stats:", error);
    }
  }

  // Check if user can use AI (main function)
  async checkAIUsage(
    userId: string,
    isPremium: boolean = false
  ): Promise<AIUsageResponse> {
    // If tracking is disabled, allow all usage
    if (!this.config.trackingEnabled) {
      return {
        canUse: true,
        remainingQueries: 999,
        limit: 999,
        periodEnd: Date.now() + 24 * 60 * 60 * 1000,
        isPremium,
      };
    }

    // If system is disabled, allow all usage
    if (!this.config.enabled) {
      return {
        canUse: true,
        remainingQueries: 999,
        limit: 999,
        periodEnd: Date.now() + 24 * 60 * 60 * 1000,
        isPremium,
      };
    }

    const stats = await this.getUsageStats(userId);
    const limit = isPremium
      ? this.config.premiumTierLimit || 999
      : this.config.freeTierLimit;

    const remainingQueries = Math.max(0, limit - stats.usageCount);
    const canUse = remainingQueries > 0;

    return {
      canUse,
      remainingQueries,
      limit,
      periodEnd: stats.periodEnd,
      isPremium,
    };
  }

  // Record AI usage
  async recordAIUsage(userId: string): Promise<void> {
    if (!this.config.trackingEnabled || !this.config.enabled) {
      return; // Don't track if disabled
    }

    try {
      const stats = await this.getUsageStats(userId);
      stats.usageCount += 1;
      stats.lastUsed = Date.now();
      await this.saveUsageStats(userId, stats);
    } catch (error) {
      console.error("Error recording AI usage:", error);
    }
  }

  // Reset usage for a user (admin function)
  async resetUsage(userId: string): Promise<void> {
    try {
      const key = `${AIUsageTracker.USAGE_PREFIX}${userId}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error("Error resetting AI usage:", error);
    }
  }

  // Get all usage stats (admin function)
  async getAllUsageStats(): Promise<{ [userId: string]: AIUsageStats }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const usageKeys = keys.filter((key) =>
        key.startsWith(AIUsageTracker.USAGE_PREFIX)
      );
      const stats: { [userId: string]: AIUsageStats } = {};

      for (const key of usageKeys) {
        const userId = key.replace(AIUsageTracker.USAGE_PREFIX, "");
        const statsString = await AsyncStorage.getItem(key);
        if (statsString) {
          stats[userId] = JSON.parse(statsString);
        }
      }

      return stats;
    } catch (error) {
      console.error("Error getting all usage stats:", error);
      return {};
    }
  }

  // Quick setup functions for different pricing strategies
  async setupFreeTier(limit: number = 5): Promise<void> {
    await this.saveConfig({
      enabled: true,
      trackingEnabled: true,
      freeTierLimit: limit,
      premiumTierLimit: null, // unlimited
      resetFrequency: "monthly",
    });
  }

  async setupWeeklyReset(limit: number = 10): Promise<void> {
    await this.saveConfig({
      enabled: true,
      trackingEnabled: true,
      freeTierLimit: limit,
      premiumTierLimit: null,
      resetFrequency: "weekly",
    });
  }

  async setupDailyReset(limit: number = 2): Promise<void> {
    await this.saveConfig({
      enabled: true,
      trackingEnabled: true,
      freeTierLimit: limit,
      premiumTierLimit: null,
      resetFrequency: "daily",
    });
  }

  async disableTracking(): Promise<void> {
    await this.saveConfig({
      enabled: false,
      trackingEnabled: false,
    });
  }

  async enableUnlimited(): Promise<void> {
    await this.saveConfig({
      enabled: true,
      trackingEnabled: false,
    });
  }
}

export const aiUsageTracker = AIUsageTracker.getInstance();
