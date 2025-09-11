import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AVAILABLE_CURRENCIES,
  CurrencyCode,
  getDeviceCurrency,
  getCurrencyForLanguage,
  formatCurrency as formatCurrencyUtil,
  getCurrencySymbol as getCurrencySymbolUtil,
  isCurrencySymbolAfter as isCurrencySymbolAfterUtil,
} from "../utils/currency";
import { useTranslation } from "react-i18next";

interface CurrencyContextType {
  selectedCurrency: CurrencyCode;
  setSelectedCurrency: (currency: CurrencyCode) => Promise<void>;
  availableCurrencies: typeof AVAILABLE_CURRENCIES;
  formatCurrency: (amount: number) => string;
  getCurrencySymbol: () => string;
  isCurrencySymbolAfter: () => boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

const CURRENCY_STORAGE_KEY = "selected_currency";

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({
  children,
}) => {
  const [selectedCurrency, setSelectedCurrencyState] =
    useState<CurrencyCode>("USD");
  const { i18n } = useTranslation();

  // Load saved currency on mount
  useEffect(() => {
    loadSavedCurrency();
  }, []);

  // Auto-select currency based on language when language changes
  useEffect(() => {
    const currentLanguage =
      i18n.language as keyof typeof getCurrencyForLanguage;
    if (currentLanguage) {
      const languageCurrency = getCurrencyForLanguage(currentLanguage);
      if (languageCurrency && languageCurrency.code !== selectedCurrency) {
        // Only auto-select if user hasn't manually chosen a currency
        AsyncStorage.getItem(CURRENCY_STORAGE_KEY).then((saved) => {
          if (!saved) {
            setSelectedCurrencyState(languageCurrency.code as CurrencyCode);
            AsyncStorage.setItem(CURRENCY_STORAGE_KEY, languageCurrency.code);
          }
        });
      }
    }
  }, [i18n.language, selectedCurrency]);

  const loadSavedCurrency = async () => {
    try {
      const saved = await AsyncStorage.getItem(CURRENCY_STORAGE_KEY);
      if (saved) {
        setSelectedCurrencyState(saved as CurrencyCode);
      } else {
        // Auto-detect currency based on device locale
        const deviceCurrency = getDeviceCurrency();
        setSelectedCurrencyState(deviceCurrency);
        await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, deviceCurrency);
      }
    } catch (error) {
      console.error("Error loading saved currency:", error);
      setSelectedCurrencyState("USD");
    }
  };

  const setSelectedCurrency = async (currency: CurrencyCode) => {
    try {
      setSelectedCurrencyState(currency);
      await AsyncStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch (error) {
      console.error("Error saving currency:", error);
    }
  };

  const formatCurrency = (amount: number): string => {
    return formatCurrencyUtil(amount, selectedCurrency);
  };

  const getCurrencySymbol = (): string => {
    return getCurrencySymbolUtil(selectedCurrency);
  };

  const isCurrencySymbolAfter = (): boolean => {
    return isCurrencySymbolAfterUtil(selectedCurrency);
  };

  const value: CurrencyContextType = {
    selectedCurrency,
    setSelectedCurrency,
    availableCurrencies: AVAILABLE_CURRENCIES,
    formatCurrency,
    getCurrencySymbol,
    isCurrencySymbolAfter,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
