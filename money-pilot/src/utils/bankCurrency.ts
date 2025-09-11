import {
  formatCurrency as formatCurrencyUtil,
  getCurrencyByCode,
  isCurrencySymbolAfter,
  CurrencyCode,
} from "./currency";

export interface BankCurrencyInfo {
  currencyCode: string;
  symbol: string;
  isSymbolAfter: boolean;
  formatAmount: (amount: number) => string;
}

/**
 * Detects the currency from a bank account or transaction
 * @param accountOrTransaction - Bank account or transaction object
 * @returns Currency code (e.g., "USD", "EUR", "GBP")
 */
export function detectBankCurrency(accountOrTransaction: any): string {
  // Check for ISO currency code in balances object first (Plaid format)
  if (accountOrTransaction?.balances?.iso_currency_code) {
    return accountOrTransaction.balances.iso_currency_code;
  }

  // Check for ISO currency code at top level (fallback)
  if (accountOrTransaction?.iso_currency_code) {
    return accountOrTransaction.iso_currency_code;
  }

  // Fall back to unofficial currency code
  if (accountOrTransaction?.unofficial_currency_code) {
    return accountOrTransaction.unofficial_currency_code;
  }

  // Default to USD if no currency information is available
  return "USD";
}

/**
 * Gets currency information for a bank account or transaction
 * @param accountOrTransaction - Bank account or transaction object
 * @returns BankCurrencyInfo object with formatting functions
 */
export function getBankCurrencyInfo(
  accountOrTransaction: any
): BankCurrencyInfo {
  const currencyCode = detectBankCurrency(accountOrTransaction);

  // Ensure currencyCode is a valid CurrencyCode type
  const validCurrencyCode = currencyCode as CurrencyCode;
  const currency = getCurrencyByCode(validCurrencyCode);

  if (!currency) {
    // Fallback to USD if currency not found
    const usdCurrency = getCurrencyByCode("USD");
    return {
      currencyCode: "USD",
      symbol: usdCurrency?.symbol || "$",
      isSymbolAfter: isCurrencySymbolAfter("USD"),
      formatAmount: (amount: number) => formatCurrencyUtil(amount, "USD"),
    };
  }

  return {
    currencyCode: currency.code,
    symbol: currency.symbol,
    isSymbolAfter: isCurrencySymbolAfter(currency.code),
    formatAmount: (amount: number) => formatCurrencyUtil(amount, currency.code),
  };
}

/**
 * Formats a bank transaction amount with the correct currency
 * @param amount - Transaction amount
 * @param accountOrTransaction - Bank account or transaction object
 * @returns Formatted currency string
 */
export function formatBankAmount(
  amount: number,
  accountOrTransaction: any
): string {
  const currencyInfo = getBankCurrencyInfo(accountOrTransaction);
  return currencyInfo.formatAmount(amount);
}

/**
 * Gets a list of unique currencies from bank accounts
 * @param accounts - Array of bank accounts
 * @returns Array of unique currency codes
 */
export function getUniqueBankCurrencies(accounts: any[]): string[] {
  const currencies = new Set<string>();

  accounts.forEach((account) => {
    const currency = detectBankCurrency(account);
    currencies.add(currency);
  });

  return Array.from(currencies);
}

/**
 * Groups bank accounts by currency
 * @param accounts - Array of bank accounts
 * @returns Object with currency codes as keys and account arrays as values
 */
export function groupAccountsByCurrency(
  accounts: any[]
): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};

  accounts.forEach((account) => {
    const currency = detectBankCurrency(account);
    if (!grouped[currency]) {
      grouped[currency] = [];
    }
    grouped[currency].push(account);
  });

  return grouped;
}
