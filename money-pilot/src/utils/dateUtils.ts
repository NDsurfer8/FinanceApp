/**
 * Utility functions for consistent date handling across the app
 * Professional finance app approach: Store timestamps, display in user's locale
 */

/**
 * Gets the user's locale for date formatting
 * Falls back to 'en-US' if locale is not available
 */
const getUserLocale = (): string => {
  try {
    // Try to get the device locale
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale || 'en-US';
  } catch (error) {
    return 'en-US'; // Fallback to US format
  }
};

/**
 * Converts a timestamp to YYYY-MM-DD format using user's locale
 * This ensures the displayed date matches the actual date without timezone shifts
 */
export const timestampToDateString = (
  timestamp: number | undefined | null
): string => {
  if (!timestamp) {
    return new Date().toLocaleDateString(getUserLocale());
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Converts a Date object to YYYY-MM-DD format using user's locale
 * Used for date picker inputs and form handling
 */
export const formatDateToLocalString = (
  date: Date | string | number | undefined | null
): string => {
  if (!date) {
    return new Date().toLocaleDateString(getUserLocale());
  }

  if (typeof date === "string") {
    // If it's already in YYYY-MM-DD format, return it
    if (date.includes("-") && date.split("-").length === 3) {
      return date;
    }
    return new Date(date).toLocaleDateString(getUserLocale());
  } else if (typeof date === "number") {
    // If it's a timestamp, use our timestamp converter
    return timestampToDateString(date);
  } else {
    // Date object
    return date.toLocaleDateString(getUserLocale());
  }
};

/**
 * Creates a Date object from a YYYY-MM-DD string in local timezone
 * Used for date picker inputs
 */
export const createLocalDate = (
  dateString: string | undefined | null
): Date => {
  if (!dateString) {
    return new Date();
  }

  // If it's a string in YYYY-MM-DD format, parse it as local date
  if (typeof dateString === "string" && dateString.includes("-")) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  }

  return new Date(dateString);
};
