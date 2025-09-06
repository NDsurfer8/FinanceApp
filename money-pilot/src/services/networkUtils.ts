// Network utility functions for handling connectivity and retries

// Check if device has internet connectivity
export const checkNetworkConnectivity = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://www.google.com", {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log("Network connectivity check failed:", error);
    return false;
  }
};

// Retry function with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Check if it's a network error
      if (error && typeof error === "object" && "code" in error) {
        const firebaseError = error as any;
        if (firebaseError.code === "auth/network-request-failed") {
          console.log(`Network error on attempt ${attempt}, retrying...`);

          // Wait with exponential backoff
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));

          continue;
        }
      }

      // For non-network errors, don't retry
      throw lastError;
    }
  }

  throw lastError!;
};

// Debounce function to prevent rapid network requests
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
