import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { plaidService } from "../services/plaid";
import { useTheme } from "../contexts/ThemeContext";
import { fontFamily } from "../config/fonts";

interface PlaidUpdateModeProps {
  visible: boolean;
  onClose: () => void;
  updateType: "reauth" | "new_accounts" | "expiring" | "disconnect";
  itemId?: string;
  newAccounts?: any[];
}

export const PlaidUpdateMode: React.FC<PlaidUpdateModeProps> = ({
  visible,
  onClose,
  updateType,
  itemId,
  newAccounts,
}) => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const getUpdateModeContent = () => {
    switch (updateType) {
      case "reauth":
        return {
          title: "Bank Login Required",
          message:
            "Your bank credentials have expired. Please reconnect your account to continue syncing transactions.",
          icon: "key-outline",
          actionText: "Reconnect Bank",
        };
      case "new_accounts":
        return {
          title: "New Accounts Available",
          message:
            "Your bank has new accounts available. Would you like to add them to your financial dashboard?",
          icon: "add-circle-outline",
          actionText: "Add New Accounts",
        };
      case "expiring":
        return {
          title: "Credentials Expiring Soon",
          message:
            "Your bank credentials will expire soon. Please update them to avoid interruption in service.",
          icon: "warning-outline",
          actionText: "Update Credentials",
        };
      case "disconnect":
        return {
          title: "Account Disconnection",
          message:
            "Your bank account will be disconnected due to security requirements. Please reconnect to continue.",
          icon: "close-circle-outline",
          actionText: "Reconnect Account",
        };
      default:
        return {
          title: "Update Required",
          message: "An update is required for your bank connection.",
          icon: "refresh-outline",
          actionText: "Update",
        };
    }
  };

  const handleUpdateAction = async () => {
    setIsLoading(true);
    try {
      switch (updateType) {
        case "reauth":
        case "disconnect":
        case "expiring":
          await plaidService.reconnectBank();
          break;
        case "new_accounts":
          await plaidService.addNewAccounts(newAccounts || []);
          break;
      }

      // Clear the update mode flags after successful action
      await plaidService.clearUpdateModeFlags();

      onClose();
    } catch (error) {
      console.error("Error in update mode:", error);
      Alert.alert("Error", "Failed to complete the update. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    try {
      // Clear flags even if user chooses "Later"
      if (updateType === "new_accounts") {
        await plaidService.clearUpdateModeFlags();
      }
      onClose();
    } catch (error) {
      console.error("Error clearing flags:", error);
      onClose();
    }
  };

  const content = getUpdateModeContent();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Ionicons
              name={content.icon as any}
              size={32}
              color={colors.primary}
            />
            <Text style={[styles.title, { color: colors.text }]}>
              {content.title}
            </Text>
          </View>

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {content.message}
          </Text>

          {updateType === "new_accounts" && newAccounts && (
            <View style={styles.accountsList}>
              <Text style={[styles.accountsTitle, { color: colors.text }]}>
                Available Accounts:
              </Text>
              {newAccounts.map((account, index) => (
                <Text
                  key={index}
                  style={[styles.accountItem, { color: colors.textSecondary }]}
                >
                  • {account.name} ({account.subtype})
                </Text>
              ))}
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text
                style={[styles.cancelText, { color: colors.textSecondary }]}
              >
                Later
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.primary },
                isLoading && styles.disabledButton,
              ]}
              onPress={handleUpdateAction}
              disabled={isLoading}
            >
              <Text style={styles.actionText}>
                {isLoading ? "Updating..." : content.actionText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: fontFamily.semiBold,
    marginTop: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    fontFamily: fontFamily.regular,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 20,
  },
  accountsList: {
    marginBottom: 20,
  },
  accountsTitle: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    marginBottom: 8,
  },
  accountItem: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    marginBottom: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionText: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: "white",
  },
  disabledButton: {
    opacity: 0.6,
  },
});
