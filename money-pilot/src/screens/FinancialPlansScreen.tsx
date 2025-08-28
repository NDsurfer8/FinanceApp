import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import {
  getFinancialPlans,
  deleteFinancialPlan,
  FinancialPlan,
} from "../services/userData";
import { Ionicons } from "@expo/vector-icons";

export const FinancialPlansScreen: React.FC<{ navigation: any }> = ({
  navigation,
}) => {
  // Set navigation options to ensure proper layout
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  const { user } = useAuth();
  const { colors } = useTheme();
  const [plans, setPlans] = useState<FinancialPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userPlans = await getFinancialPlans(user.uid);
      // Ensure plans is always an array
      setPlans(Array.isArray(userPlans) ? userPlans : []);
    } catch (error) {
      console.error("Error loading financial plans:", error);
      Alert.alert("Error", "Failed to load financial plans");
      setPlans([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const exportPlanAsCSV = async (plan: FinancialPlan) => {
    try {
      // Validate plan data
      if (!plan || !plan.csvData || !plan.name) {
        Alert.alert("Error", "Invalid plan data");
        return;
      }

      const csvContent = plan.csvData;
      const fileName = `${plan.name.replace(/\s+/g, "_")}_${
        new Date(plan.createdAt || Date.now()).toISOString().split("T")[0]
      }.csv`;

      // Check if Share API is available
      if (!Share || typeof Share.share !== "function") {
        Alert.alert("Error", "Share functionality not available");
        return;
      }

      await Share.share({
        message: csvContent,
        title: fileName,
      });
    } catch (error) {
      console.error("Error exporting plan:", error);
      Alert.alert("Error", "Failed to export plan");
    }
  };

  const deletePlan = async (planId: string) => {
    if (!user || !planId) return;

    Alert.alert(
      "Delete Plan",
      "Are you sure you want to delete this financial plan? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            // No loading state to reset in this screen
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFinancialPlan(user.uid, planId);
              await loadPlans(); // Reload plans after deletion
              Alert.alert("Success", "Plan deleted successfully");
            } catch (error) {
              console.error("Error deleting plan:", error);
              Alert.alert("Error", "Failed to delete plan");
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    try {
      if (!timestamp || isNaN(timestamp)) {
        return "Unknown Date";
      }
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown Date";
    }
  };

  const formatTime = (timestamp: number) => {
    try {
      if (!timestamp || isNaN(timestamp)) {
        return "Unknown Time";
      }
      return new Date(timestamp).toLocaleTimeString();
    } catch (error) {
      console.error("Error formatting time:", error);
      return "Unknown Time";
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading your financial plans...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Financial Plans
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {plans.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Ionicons
              name="document-text-outline"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No Financial Plans Yet
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textSecondary }]}
            >
              Create your first financial plan by asking Vectra, your AI
              financial advisor, to "create a financial plan"
            </Text>
            <TouchableOpacity
              style={[
                styles.createPlanButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigation.navigate("AIFinancialAdvisor")}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="white" />
              <Text style={styles.createPlanButtonText}>
                Create Plan with AI
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.plansHeader}>
              <Text style={[styles.plansTitle, { color: colors.text }]}>
                Your Financial Plans ({plans.length})
              </Text>
              <Text
                style={[styles.plansSubtitle, { color: colors.textSecondary }]}
              >
                Tap any plan to export as CSV
              </Text>
            </View>

            {plans.map((plan) => {
              // Skip invalid plans
              if (!plan || !plan.id) {
                return null;
              }

              return (
                <View
                  key={plan.id}
                  style={[styles.planCard, { backgroundColor: colors.card }]}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planInfo}>
                      <Text style={[styles.planName, { color: colors.text }]}>
                        {plan.name}
                      </Text>
                      <Text
                        style={[
                          styles.planDescription,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {plan.description}
                      </Text>
                      <Text
                        style={[
                          styles.planDate,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Created: {formatDate(plan.createdAt)} at{" "}
                        {formatTime(plan.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.planActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: colors.primary },
                        ]}
                        onPress={() => exportPlanAsCSV(plan)}
                      >
                        <Ionicons
                          name="download-outline"
                          size={20}
                          color="white"
                        />
                        <Text style={styles.actionButtonText}>Export</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.deleteButton,
                          { backgroundColor: colors.error },
                        ]}
                        onPress={() => deletePlan(plan.id!)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color="white"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.planSummary}>
                    <View style={styles.summaryItem}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Monthly Budget
                      </Text>
                      <Text
                        style={[styles.summaryValue, { color: colors.text }]}
                      >
                        $
                        {plan.planData?.monthlyBudget?.income?.toFixed(2) ||
                          "0.00"}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Total Debt
                      </Text>
                      <Text
                        style={[styles.summaryValue, { color: colors.text }]}
                      >
                        $
                        {plan.planData?.debtPayoffPlan?.totalDebt?.toFixed(2) ||
                          "0.00"}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Goals
                      </Text>
                      <Text
                        style={[styles.summaryValue, { color: colors.text }]}
                      >
                        {plan.planData?.goalTimeline?.goals?.length || 0}
                      </Text>
                    </View>
                    <View style={styles.summaryItem}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Recommendations
                      </Text>
                      <Text
                        style={[styles.summaryValue, { color: colors.text }]}
                      >
                        {plan.planData?.recommendations?.length || 0}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderRadius: 12,
    marginTop: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  createPlanButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createPlanButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  plansHeader: {
    marginBottom: 16,
  },
  plansTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  plansSubtitle: {
    fontSize: 14,
  },
  planCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  planInfo: {
    flex: 1,
    marginRight: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  planDate: {
    fontSize: 12,
  },
  planActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
  },
  planSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
  },
});
