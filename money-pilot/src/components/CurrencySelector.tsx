import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useCurrency } from "../contexts/CurrencyContext";
import { useTranslation } from "react-i18next";
import { LanguageAwareText } from "./LanguageAwareText";

interface CurrencySelectorProps {
  visible: boolean;
  onClose: () => void;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { selectedCurrency, setSelectedCurrency, availableCurrencies } =
    useCurrency();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleCurrencySelect = async (currencyCode: string) => {
    try {
      await setSelectedCurrency(currencyCode as any);
      onClose();
    } catch (error) {
      console.error("Error setting currency:", error);
      Alert.alert(t("common.error"), t("settings.currency_change_failed"));
    }
  };

  // Filter currencies based on search query
  const filteredCurrencies = availableCurrencies.filter(
    (currency) =>
      currency.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.symbol.includes(searchQuery)
  );

  // Group currencies by region for better organization
  const groupedCurrencies = {
    "Major Currencies": filteredCurrencies.filter((c) =>
      ["USD", "EUR", "GBP", "JPY", "CNY", "INR", "CAD", "AUD", "CHF"].includes(
        c.code
      )
    ),
    Americas: filteredCurrencies.filter((c) =>
      ["BRL", "MXN", "ARS", "CLP", "COP", "PEN", "UYU", "VEF"].includes(c.code)
    ),
    Europe: filteredCurrencies.filter((c) =>
      ["SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RUB", "TRY"].includes(c.code)
    ),
    "Asia Pacific": filteredCurrencies.filter((c) =>
      ["KRW", "THB", "SGD", "HKD", "NZD", "ILS"].includes(c.code)
    ),
    "Middle East & Africa": filteredCurrencies.filter((c) =>
      [
        "AED",
        "SAR",
        "EGP",
        "QAR",
        "KWD",
        "BHD",
        "OMR",
        "JOD",
        "LBP",
        "MAD",
        "TND",
        "DZD",
        "LYD",
        "SDG",
        "ETB",
        "KES",
        "UGX",
        "TZS",
        "NGN",
        "GHS",
        "XOF",
        "XAF",
      ].includes(c.code)
    ),
  };

  const renderCurrencyItem = (
    currency: (typeof availableCurrencies)[number]
  ) => (
    <TouchableOpacity
      key={currency.code}
      style={[
        styles.currencyItem,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.borderLight,
        },
        selectedCurrency === currency.code && {
          backgroundColor: colors.primary + "20",
        },
      ]}
      onPress={() => handleCurrencySelect(currency.code)}
    >
      <View style={styles.currencyInfo}>
        <View style={styles.currencyMain}>
          <Text style={[styles.currencySymbol, { color: colors.text }]}>
            {currency.symbol}
          </Text>
          <View style={styles.currencyDetails}>
            <LanguageAwareText
              style={[styles.currencyName, { color: colors.text }]}
              maxLines={1}
            >
              {currency.name}
            </LanguageAwareText>
            <Text
              style={[styles.currencyCode, { color: colors.textSecondary }]}
            >
              {currency.code}
            </Text>
          </View>
        </View>
        {selectedCurrency === currency.code && (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: colors.borderLight }]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("settings.select_currency")}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View
          style={[styles.searchContainer, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={t("settings.search_currencies")}
            placeholderTextColor={colors.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Currency List */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {Object.entries(groupedCurrencies).map(([groupName, currencies]) => {
            if (currencies.length === 0) return null;

            return (
              <View key={groupName} style={styles.group}>
                <Text
                  style={[styles.groupTitle, { color: colors.textSecondary }]}
                >
                  {groupName}
                </Text>
                {currencies.map(renderCurrencyItem)}
              </View>
            );
          })}

          {filteredCurrencies.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="search" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t("settings.no_currencies_found")}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  group: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: 20,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  currencyItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  currencyInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currencyMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "600",
    width: 40,
    textAlign: "center",
  },
  currencyDetails: {
    marginLeft: 16,
    flex: 1,
  },
  currencyName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  currencyCode: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});
