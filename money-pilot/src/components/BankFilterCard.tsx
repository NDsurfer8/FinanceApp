import React, { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import {
  getUniqueTransactionSources,
  TransactionSource,
} from "../utils/transactionFilters";
import { Transaction } from "../services/userData";

interface BankFilterCardProps {
  transactions: Transaction[];
  selectedSource: string;
  onSourceChange: (source: string) => void;
}

export const BankFilterCard: React.FC<BankFilterCardProps> = ({
  transactions,
  selectedSource,
  onSourceChange,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [showSourceFilter, setShowSourceFilter] = useState(false);

  // Get unique transaction sources
  const transactionSources = useMemo(() => {
    const sources = getUniqueTransactionSources(transactions);

    // Translate the source names
    const translatedSources = sources.map((source) => {
      if (source.type === "manual") {
        return { ...source, name: t("transactions.manual_entries") };
      }
      if (source.type === "auto-imported") {
        return { ...source, name: t("transactions.auto_imported") };
      }
      return source; // Bank names don't need translation
    });

    return [
      { id: "all", name: t("transactions.all"), type: "all" as const },
      ...translatedSources,
    ];
  }, [transactions, t]);

  // Get display name for selected source
  const getSelectedSourceName = () => {
    const source = transactionSources.find((s) => s.id === selectedSource);
    return source ? source.name : t("transactions.all");
  };

  const hasMultipleSources = transactionSources.length > 1;
  const hasAutoImported = transactions.some((t) => t.isAutoImported);

  // Don't render if no sources are available
  if (!hasMultipleSources && !hasAutoImported) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: colors.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 4,
            }}
          >
            {t("transactions.filter_by_source")}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
            }}
          >
            {t("showing")}: {getSelectedSourceName()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowSourceFilter(!showSourceFilter)}
          style={{
            backgroundColor: colors.primary + "20",
            borderRadius: 8,
            padding: 8,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Ionicons
            name="filter"
            size={16}
            color={colors.primary}
            style={{ marginRight: 4 }}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: colors.primary,
            }}
          >
            {t("filter")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Source Filter Options */}
      {showSourceFilter && (
        <View
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
          }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {transactionSources.map((source) => (
              <TouchableOpacity
                key={source.id}
                onPress={() => {
                  onSourceChange(source.id);
                  setShowSourceFilter(false);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                  marginRight: 8,
                  backgroundColor:
                    selectedSource === source.id
                      ? colors.primary
                      : colors.surfaceSecondary,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color:
                      selectedSource === source.id
                        ? "white"
                        : colors.textSecondary,
                  }}
                >
                  {source.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};
