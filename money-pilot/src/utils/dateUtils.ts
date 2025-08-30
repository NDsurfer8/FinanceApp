/**
 * Utility functions for consistent date handling across the app
 * Fixes timezone offset issues by using local date formatting instead of toISOString()
 */

/**
 * Creates a Date object from a timestamp or date string in local timezone
 * This prevents the timezone offset issue when parsing dates
 */
export const createLocalDate = (
  dateValue: string | number | undefined | null
): Date => {
  if (!dateValue) {
    return new Date(); // Return current date as fallback
  }

  // If it's a number (timestamp), create Date directly
  if (typeof dateValue === "number") {
    return new Date(dateValue);
  }

  // If it's a string in YYYY-MM-DD format, parse it as local date
  if (typeof dateValue === "string" && dateValue.includes("-")) {
    const [year, month, day] = dateValue.split("-").map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  }

  // For other string formats, use default Date constructor
  return new Date(dateValue);
};

/**
 * Converts a timestamp to YYYY-MM-DD format using local timezone
 * This ensures the displayed date matches the actual date without timezone shifts
 */
export const timestampToDateString = (
  timestamp: number | undefined | null
): string => {
  if (!timestamp) {
    return getTodayString();
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Converts a Date object to YYYY-MM-DD format using local timezone
 * This prevents the one-day offset issue that occurs with toISOString()
 */
export const formatDateToLocalString = (
  date: Date | string | number | undefined | null
): string => {
  if (!date) {
    return getTodayString(); // Return today's date as fallback
  }

  let dateObj: Date;

  if (typeof date === "string") {
    // If it's already in YYYY-MM-DD format, return it
    if (date.includes("-") && date.split("-").length === 3) {
      return date;
    }
    dateObj = new Date(date);
  } else if (typeof date === "number") {
    // If it's a timestamp, use our timestamp converter
    return timestampToDateString(date);
  } else {
    dateObj = date;
  }

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Gets today's date in YYYY-MM-DD format using local timezone
 */
export const getTodayString = (): string => {
  return formatDateToLocalString(new Date());
};

/**
 * Gets tomorrow's date in YYYY-MM-DD format using local timezone
 */
export const getTomorrowString = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateToLocalString(tomorrow);
};

/**
 * Formats a date value (Date, string, or number) to YYYY-MM-DD format
 * Handles various input types and returns a consistent format
 */
export const formatTransactionDate = (dateValue: any): string => {
  if (!dateValue) return getTodayString();

  // If it's already a string in YYYY-MM-DD format, return it
  if (typeof dateValue === "string" && dateValue.includes("-")) {
    return dateValue;
  }

  // Convert to Date object and format
  return formatDateToLocalString(dateValue);
};
