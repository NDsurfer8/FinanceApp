/**
 * Retry utility with exponential backoff
 * Follows best practices for handling transient failures
 */

import { logger } from "./logger";
import { errorTracker } from "./errorTracker";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error) => boolean;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public originalError: Error,
    public attempts: number
  ) {
    super(message);
    this.name = "RetryError";
  }
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    retryCondition = () => true,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await operation();

      if (attempt > 1) {
        logger.info(`Operation succeeded on attempt ${attempt}`);
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry this error
      if (!retryCondition(lastError)) {
        logger.warn(
          `Non-retryable error on attempt ${attempt}: ${lastError.message}`
        );
        throw lastError;
      }

      // Don't delay after the last attempt
      if (attempt === maxAttempts) {
        logger.error(
          `Operation failed after ${maxAttempts} attempts: ${lastError.message}`
        );
        throw new RetryError(
          `Operation failed after ${maxAttempts} attempts`,
          lastError,
          maxAttempts
        );
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );

      logger.warn(
        `Attempt ${attempt} failed, retrying in ${delay}ms: ${lastError.message}`
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new RetryError(
    `Operation failed after ${maxAttempts} attempts`,
    lastError!,
    maxAttempts
  );
}

/**
 * Retry conditions for common error types
 */
export const retryConditions = {
  // Retry on network errors
  networkError: (error: Error) => {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("connection") ||
      message.includes("econnreset") ||
      message.includes("enotfound")
    );
  },

  // Retry on rate limiting
  rateLimit: (error: Error) => {
    const message = error.message.toLowerCase();
    return (
      message.includes("rate limit") ||
      message.includes("429") ||
      message.includes("too many requests")
    );
  },

  // Retry on temporary service errors
  serviceError: (error: Error) => {
    const message = error.message.toLowerCase();
    return (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("service unavailable")
    );
  },

  // Retry on encryption/decryption errors (might be transient)
  encryptionError: (error: Error) => {
    const message = error.message.toLowerCase();
    return (
      message.includes("encrypt") ||
      message.includes("decrypt") ||
      message.includes("crypto") ||
      message.includes("key")
    );
  },

  // Combined retry condition for most common cases
  common: (error: Error) => {
    return (
      retryConditions.networkError(error) ||
      retryConditions.rateLimit(error) ||
      retryConditions.serviceError(error)
    );
  },
};
