import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSubscription } from "../hooks/useSubscription";
import { usePaywall } from "../hooks/usePaywall";
import { fontFamily } from "../config/fonts";

interface PremiumFeatureProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export const PremiumFeature: React.FC<PremiumFeatureProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}) => {
  const navigation = useNavigation();
  const { isFeatureAvailable, hasPremiumAccess } = useSubscription();
  const { presentPaywall } = usePaywall();

  const hasAccess = isFeatureAvailable(feature) || hasPremiumAccess();

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="star" size={24} color="#f59e0b" />
        </View>
        <Text style={styles.title}>Premium Feature</Text>
        <Text style={styles.description}>
          This feature is available exclusively to Premium subscribers.
        </Text>
        <TouchableOpacity style={styles.upgradeButton} onPress={presentPaywall}>
          <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    margin: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  content: {
    alignItems: "center",
  },
  iconContainer: {
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: fontFamily.regular,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  upgradeButton: {
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: fontFamily.semiBold,
    color: "#fff",
  },
});
