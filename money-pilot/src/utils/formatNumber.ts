// Utility function to format numbers with commas
export const formatNumberWithCommas = (value: string): string => {
  // Handle empty or null values
  if (!value || value === "") return "";

  // Remove any existing commas and non-numeric characters except decimal point
  const cleanValue = value.replace(/[^\d.]/g, "");

  // Handle decimal numbers
  if (cleanValue.includes(".")) {
    const [wholePart, decimalPart] = cleanValue.split(".");
    const formattedWhole = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${formattedWhole}.${decimalPart}`;
  }

  // Handle whole numbers
  return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Utility function to remove commas for processing
export const removeCommas = (value: string): string => {
  if (!value) return "";
  return value.replace(/,/g, "");
};

// Utility function to format currency with commas (DEPRECATED - use currency.ts instead)
export const formatCurrency = (value: string): string => {
  const formatted = formatNumberWithCommas(value);
  return formatted ? `$${formatted}` : "";
};
