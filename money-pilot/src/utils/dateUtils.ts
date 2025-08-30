/**
 * Utility functions for consistent date handling across the app
 * Professional finance app approach: Store timestamps, display in local timezone
 */

/**
 * Converts a timestamp to YYYY-MM-DD format using local timezone
 * This ensures the displayed date matches the actual date without timezone shifts
 */
export const timestampToDateString = (
  timestamp: number | undefined | null
): string => {
  if (!timestamp) {
    return new Date().toLocaleDateString("en-CA");
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Converts a Date object to YYYY-MM-DD format using local timezone
 * Used for date picker inputs and form handling
 */
export const formatDateToLocalString = (
  date: Date | string | number | undefined | null
): string => {
  if (!date) {
    return new Date().toLocaleDateString("en-CA");
  }

  if (typeof date === "string") {
    // If it's already in YYYY-MM-DD format, return it
    if (date.includes("-") && date.split("-").length === 3) {
      return date;
    }
    return new Date(date).toLocaleDateString("en-CA"); // YYYY-MM-DD format
  } else if (typeof date === "number") {
    // If it's a timestamp, use our timestamp converter
    return timestampToDateString(date);
  } else {
    // Date object
    return date.toLocaleDateString("en-CA"); // YYYY-MM-DD format
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
