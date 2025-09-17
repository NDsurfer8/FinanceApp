/**
 * Error tracking and metrics utility
 * Follows best practices for error monitoring
 */

import { logger } from "./logger";

export interface ErrorMetrics {
  encryptionFailures: number;
  connectionFailures: number;
  webhookFailures: number;
  lastErrorTime: number;
  errorHistory: Array<{
    timestamp: number;
    type: string;
    message: string;
    context?: any;
  }>;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private metrics: ErrorMetrics = {
    encryptionFailures: 0,
    connectionFailures: 0,
    webhookFailures: 0,
    lastErrorTime: 0,
    errorHistory: [],
  };

  static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  trackError(
    type: "encryption" | "connection" | "webhook",
    error: Error,
    context?: any
  ): void {
    const timestamp = Date.now();

    // Update metrics
    switch (type) {
      case "encryption":
        this.metrics.encryptionFailures++;
        break;
      case "connection":
        this.metrics.connectionFailures++;
        break;
      case "webhook":
        this.metrics.webhookFailures++;
        break;
    }

    this.metrics.lastErrorTime = timestamp;

    // Add to history (keep last 50 errors)
    this.metrics.errorHistory.push({
      timestamp,
      type,
      message: error.message,
      context,
    });

    if (this.metrics.errorHistory.length > 50) {
      this.metrics.errorHistory.shift();
    }

    // Log the error
    logger.error(`${type.toUpperCase()} Error: ${error.message}`, {
      type,
      stack: error.stack,
      context,
    });

    // In production, you might want to send this to an error tracking service
    // like Sentry, Bugsnag, or Firebase Crashlytics
    if (!__DEV__) {
      // Example: Sentry.captureException(error, { tags: { type }, extra: context });
    }
  }

  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  getErrorRate(
    type: "encryption" | "connection" | "webhook",
    timeWindowMs: number = 3600000
  ): number {
    const cutoff = Date.now() - timeWindowMs;
    const recentErrors = this.metrics.errorHistory.filter(
      (error) => error.timestamp > cutoff && error.type === type
    );

    // Calculate rate per hour
    return recentErrors.length / (timeWindowMs / 3600000);
  }

  resetMetrics(): void {
    this.metrics = {
      encryptionFailures: 0,
      connectionFailures: 0,
      webhookFailures: 0,
      lastErrorTime: 0,
      errorHistory: [],
    };
  }

  // Health check method
  isHealthy(): boolean {
    const oneHourAgo = Date.now() - 3600000;
    const recentErrors = this.metrics.errorHistory.filter(
      (error) => error.timestamp > oneHourAgo
    );

    // Consider unhealthy if more than 10 errors in the last hour
    return recentErrors.length < 10;
  }
}

export const errorTracker = ErrorTracker.getInstance();
