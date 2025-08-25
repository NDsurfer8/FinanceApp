import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useData } from "../contexts/DataContext";

interface AccountSelectorProps {
  selectedAccountId: string | null;
  onAccountSelect: (accountId: string | null) => void;
  showAllAccounts?: boolean;
  accounts?: any[];
  style?: any;
}

export const AccountSelector: React.FC<AccountSelectorProps> = ({
  selectedAccountId,
  onAccountSelect,
  showAllAccounts = true,
  accounts,
  style,
}) => {
  const { colors } = useTheme();
  const { bankAccounts: globalBankAccounts } = useData();

  const displayAccounts = accounts || globalBankAccounts;

  if (displayAccounts.length === 0) {
    return null;
  }

  return (
    <View style={[{ marginBottom: 16 }, style]}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 12,
        }}
      >
        Select Account
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {showAllAccounts && (
          <TouchableOpacity
            onPress={() => onAccountSelect(null)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor:
                selectedAccountId === null
                  ? colors.primary
                  : colors.surfaceSecondary,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color:
                  selectedAccountId === null ? colors.buttonText : colors.text,
              }}
            >
              All Accounts
            </Text>
          </TouchableOpacity>
        )}
        {displayAccounts.map((account) => (
          <TouchableOpacity
            key={account.id}
            onPress={() => onAccountSelect(account.id)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor:
                selectedAccountId === account.id
                  ? colors.primary
                  : colors.surfaceSecondary,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color:
                  selectedAccountId === account.id
                    ? colors.buttonText
                    : colors.text,
              }}
              numberOfLines={1}
            >
              {account.name} ({account.mask})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
