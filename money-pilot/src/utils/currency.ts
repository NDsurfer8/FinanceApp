import { getLocales } from "expo-localization";

// Currency configuration for each supported language
export const CURRENCY_CONFIG = {
  en: { code: "USD", symbol: "$", locale: "en-US" },
  es: { code: "EUR", symbol: "€", locale: "es-ES" },
  fr: { code: "EUR", symbol: "€", locale: "fr-FR" },
  de: { code: "EUR", symbol: "€", locale: "de-DE" },
  pt: { code: "EUR", symbol: "€", locale: "pt-PT" },
  ja: { code: "JPY", symbol: "¥", locale: "ja-JP" },
  zh: { code: "CNY", symbol: "¥", locale: "zh-CN" },
  hi: { code: "INR", symbol: "₹", locale: "hi-IN" },
  ar: { code: "SAR", symbol: "ر.س", locale: "ar-SA" },
  ru: { code: "RUB", symbol: "₽", locale: "ru-RU" },
} as const;

// Available currencies for selection
export const AVAILABLE_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "en-US" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", locale: "ja-JP" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", locale: "hi-IN" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", locale: "en-CA" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc", locale: "de-CH" },
  { code: "SEK", symbol: "kr", name: "Swedish Krona", locale: "sv-SE" },
  { code: "NOK", symbol: "kr", name: "Norwegian Krone", locale: "nb-NO" },
  { code: "DKK", symbol: "kr", name: "Danish Krone", locale: "da-DK" },
  { code: "PLN", symbol: "zł", name: "Polish Zloty", locale: "pl-PL" },
  { code: "CZK", symbol: "Kč", name: "Czech Koruna", locale: "cs-CZ" },
  { code: "HUF", symbol: "Ft", name: "Hungarian Forint", locale: "hu-HU" },
  { code: "RUB", symbol: "₽", name: "Russian Ruble", locale: "ru-RU" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", locale: "pt-BR" },
  { code: "MXN", symbol: "$", name: "Mexican Peso", locale: "es-MX" },
  { code: "ARS", symbol: "$", name: "Argentine Peso", locale: "es-AR" },
  { code: "CLP", symbol: "$", name: "Chilean Peso", locale: "es-CL" },
  { code: "COP", symbol: "$", name: "Colombian Peso", locale: "es-CO" },
  { code: "PEN", symbol: "S/", name: "Peruvian Sol", locale: "es-PE" },
  { code: "UYU", symbol: "$U", name: "Uruguayan Peso", locale: "es-UY" },
  { code: "VEF", symbol: "Bs", name: "Venezuelan Bolivar", locale: "es-VE" },
  { code: "KRW", symbol: "₩", name: "South Korean Won", locale: "ko-KR" },
  { code: "THB", symbol: "฿", name: "Thai Baht", locale: "th-TH" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", locale: "en-SG" },
  { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", locale: "en-HK" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar", locale: "en-NZ" },
  { code: "ZAR", symbol: "R", name: "South African Rand", locale: "en-ZA" },
  { code: "TRY", symbol: "₺", name: "Turkish Lira", locale: "tr-TR" },
  { code: "ILS", symbol: "₪", name: "Israeli Shekel", locale: "he-IL" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
  { code: "SAR", symbol: "ر.س", name: "Saudi Riyal", locale: "ar-SA" },
  { code: "EGP", symbol: "£", name: "Egyptian Pound", locale: "ar-EG" },
  { code: "QAR", symbol: "ر.ق", name: "Qatari Riyal", locale: "ar-QA" },
  { code: "KWD", symbol: "د.ك", name: "Kuwaiti Dinar", locale: "ar-KW" },
  { code: "BHD", symbol: "د.ب", name: "Bahraini Dinar", locale: "ar-BH" },
  { code: "OMR", symbol: "ر.ع.", name: "Omani Rial", locale: "ar-OM" },
  { code: "JOD", symbol: "د.ا", name: "Jordanian Dinar", locale: "ar-JO" },
  { code: "LBP", symbol: "ل.ل", name: "Lebanese Pound", locale: "ar-LB" },
  { code: "MAD", symbol: "د.م.", name: "Moroccan Dirham", locale: "ar-MA" },
  { code: "TND", symbol: "د.ت", name: "Tunisian Dinar", locale: "ar-TN" },
  { code: "DZD", symbol: "د.ج", name: "Algerian Dinar", locale: "ar-DZ" },
  { code: "LYD", symbol: "ل.د", name: "Libyan Dinar", locale: "ar-LY" },
  { code: "SDG", symbol: "ج.س.", name: "Sudanese Pound", locale: "ar-SD" },
  { code: "ETB", symbol: "Br", name: "Ethiopian Birr", locale: "am-ET" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling", locale: "sw-KE" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling", locale: "sw-UG" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling", locale: "sw-TZ" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", locale: "en-NG" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi", locale: "en-GH" },
  {
    code: "XOF",
    symbol: "CFA",
    name: "West African CFA Franc",
    locale: "fr-SN",
  },
  {
    code: "XAF",
    symbol: "FCFA",
    name: "Central African CFA Franc",
    locale: "fr-CM",
  },
] as const;

export type CurrencyCode = (typeof AVAILABLE_CURRENCIES)[number]["code"];
export type LanguageCode = keyof typeof CURRENCY_CONFIG;

// Get currency configuration for a language
export const getCurrencyForLanguage = (languageCode: LanguageCode) => {
  return CURRENCY_CONFIG[languageCode] || CURRENCY_CONFIG.en;
};

// Get currency by code
export const getCurrencyByCode = (code: CurrencyCode) => {
  return (
    AVAILABLE_CURRENCIES.find((currency) => currency.code === code) ||
    AVAILABLE_CURRENCIES[0]
  );
};

// Format currency with proper locale and symbol placement
export const formatCurrency = (
  amount: number,
  currencyCode: CurrencyCode = "USD",
  locale?: string
): string => {
  try {
    const currency = getCurrencyByCode(currencyCode);
    const formatLocale = locale || currency.locale;

    return new Intl.NumberFormat(formatLocale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: currencyCode === "JPY" ? 0 : 2,
      maximumFractionDigits: currencyCode === "JPY" ? 0 : 2,
    }).format(amount);
  } catch (error) {
    console.error("Currency formatting error:", error);
    // Fallback to simple formatting
    const currency = getCurrencyByCode(currencyCode);
    return `${currency.symbol}${amount.toFixed(2)}`;
  }
};

// Format currency with custom symbol placement (for special cases)
export const formatCurrencyCustom = (
  amount: number,
  currencyCode: CurrencyCode = "USD",
  showSymbol: boolean = true
): string => {
  const currency = getCurrencyByCode(currencyCode);
  const formattedAmount = amount.toLocaleString("en-US", {
    minimumFractionDigits: currencyCode === "JPY" ? 0 : 2,
    maximumFractionDigits: currencyCode === "JPY" ? 0 : 2,
  });

  if (!showSymbol) {
    return formattedAmount;
  }

  // Handle currencies with symbols after the amount
  const afterSymbolCurrencies = [
    "EUR",
    "GBP",
    "CHF",
    "SEK",
    "NOK",
    "DKK",
    "PLN",
    "CZK",
    "HUF",
    "RUB",
    "BRL",
    "KRW",
    "THB",
    "TRY",
    "ILS",
  ];

  if (afterSymbolCurrencies.includes(currencyCode)) {
    return `${formattedAmount} ${currency.symbol}`;
  }

  return `${currency.symbol}${formattedAmount}`;
};

// Parse currency string to number
export const parseCurrency = (
  currencyString: string,
  currencyCode: CurrencyCode = "USD"
): number => {
  try {
    const currency = getCurrencyByCode(currencyCode);
    // Remove currency symbol and other non-numeric characters except decimal point
    const cleanString = currencyString
      .replace(new RegExp(`\\${currency.symbol}`, "g"), "")
      .replace(/[^\d.-]/g, "");

    return parseFloat(cleanString) || 0;
  } catch (error) {
    console.error("Currency parsing error:", error);
    return 0;
  }
};

// Get currency symbol only
export const getCurrencySymbol = (
  currencyCode: CurrencyCode = "USD"
): string => {
  const currency = getCurrencyByCode(currencyCode);
  return currency.symbol;
};

// Check if currency symbol should be placed after the amount
export const isCurrencySymbolAfter = (currencyCode: CurrencyCode): boolean => {
  const afterSymbolCurrencies = [
    "EUR",
    "GBP",
    "CHF",
    "SEK",
    "NOK",
    "DKK",
    "PLN",
    "CZK",
    "HUF",
    "RUB",
    "BRL",
    "KRW",
    "THB",
    "TRY",
    "ILS",
  ];
  return afterSymbolCurrencies.includes(currencyCode);
};

// Get device currency based on locale
export const getDeviceCurrency = (): CurrencyCode => {
  try {
    const locales = getLocales();
    const deviceLocale = locales[0];

    if (deviceLocale && deviceLocale.languageCode) {
      // Try to find currency by locale
      const currency = AVAILABLE_CURRENCIES.find((c) =>
        c.locale.startsWith(deviceLocale.languageCode!)
      );

      if (currency) {
        return currency.code;
      }

      // Fallback based on region
      const regionCode = deviceLocale.regionCode;
      if (regionCode) {
        switch (regionCode) {
          case "US":
            return "USD";
          case "GB":
            return "GBP";
          case "JP":
            return "JPY";
          case "CN":
            return "CNY";
          case "IN":
            return "INR";
          case "CA":
            return "CAD";
          case "AU":
            return "AUD";
          case "DE":
          case "FR":
          case "IT":
          case "ES":
          case "NL":
          case "BE":
          case "AT":
          case "FI":
          case "IE":
          case "PT":
          case "GR":
          case "LU":
          case "MT":
          case "CY":
          case "SK":
          case "SI":
          case "EE":
          case "LV":
          case "LT":
            return "EUR";
          case "BR":
            return "BRL";
          case "MX":
            return "MXN";
          case "AR":
            return "ARS";
          case "CL":
            return "CLP";
          case "CO":
            return "COP";
          case "PE":
            return "PEN";
          case "UY":
            return "UYU";
          case "VE":
            return "VEF";
          case "KR":
            return "KRW";
          case "TH":
            return "THB";
          case "SG":
            return "SGD";
          case "HK":
            return "HKD";
          case "NZ":
            return "NZD";
          case "ZA":
            return "ZAR";
          case "TR":
            return "TRY";
          case "IL":
            return "ILS";
          case "AE":
            return "AED";
          case "SA":
            return "SAR";
          case "EG":
            return "EGP";
          case "QA":
            return "QAR";
          case "KW":
            return "KWD";
          case "BH":
            return "BHD";
          case "OM":
            return "OMR";
          case "JO":
            return "JOD";
          case "LB":
            return "LBP";
          case "MA":
            return "MAD";
          case "TN":
            return "TND";
          case "DZ":
            return "DZD";
          case "LY":
            return "LYD";
          case "SD":
            return "SDG";
          case "ET":
            return "ETB";
          case "KE":
            return "KES";
          case "UG":
            return "UGX";
          case "TZ":
            return "TZS";
          case "NG":
            return "NGN";
          case "GH":
            return "GHS";
          case "SN":
          case "ML":
          case "BF":
          case "NE":
          case "CI":
          case "GW":
          case "GN":
          case "GM":
          case "LR":
          case "SL":
          case "TG":
          case "BJ":
            return "XOF";
          case "CM":
          case "CF":
          case "TD":
          case "GQ":
          case "GA":
          case "CG":
          case "CD":
          case "ST":
            return "XAF";
          default:
            return "USD";
        }
      }
    }
  } catch (error) {
    console.error("Error getting device currency:", error);
  }

  return "USD"; // Default fallback
};

// Format number with proper thousands separators for a locale
export const formatNumber = (
  value: number,
  locale: string = "en-US"
): string => {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch (error) {
    console.error("Number formatting error:", error);
    return value.toLocaleString();
  }
};

// Format percentage
export const formatPercentage = (
  value: number,
  locale: string = "en-US"
): string => {
  try {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }).format(value / 100);
  } catch (error) {
    console.error("Percentage formatting error:", error);
    return `${value.toFixed(1)}%`;
  }
};
