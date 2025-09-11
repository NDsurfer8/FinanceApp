import { formatCurrency, getCurrencyByCode } from "./currency";

/**
 * Format an amount using either the filtered currency (when filtering by bank)
 * or the user's default currency
 * @param amount - The amount to format
 * @param filteredCurrency - The currency from the selected bank filter (null if not filtering by bank)
 * @param userDefaultCurrency - The user's default currency
 * @returns Formatted amount string
 */
export function formatAmountWithFilteredCurrency(
  amount: number,
  filteredCurrency: string | null,
  userDefaultCurrency: string
): string {
  // If filtering by a specific bank, use that bank's currency
  if (filteredCurrency) {
    return formatCurrency(amount, filteredCurrency);
  }

  // Otherwise, use the user's default currency
  return formatCurrency(amount, userDefaultCurrency);
}

/**
 * Format an amount without currency symbols (just the number)
 * @param amount - The amount to format
 * @param filteredCurrency - The currency from the selected bank filter (null if not filtering by bank)
 * @param userDefaultCurrency - The user's default currency
 * @returns Formatted amount string without currency symbol
 */
export function formatAmountWithoutSymbol(
  amount: number,
  filteredCurrency: string | null,
  userDefaultCurrency: string
): string {
  const currencyCode = filteredCurrency || userDefaultCurrency;

  try {
    const currency = getCurrencyByCode(currencyCode);
    if (currency) {
      // Use Intl.NumberFormat to format the number without currency symbol
      const formatter = new Intl.NumberFormat(currency.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return formatter.format(amount);
    }
  } catch (error) {
    console.warn(
      `Failed to format amount without symbol for ${currencyCode}:`,
      error
    );
  }

  // Fallback to simple number formatting
  return amount.toFixed(2);
}
