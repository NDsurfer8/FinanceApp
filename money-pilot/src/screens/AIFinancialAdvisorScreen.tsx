import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../hooks/useAuth";
import { useData } from "../contexts/DataContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  aiFinancialAdvisorService,
  FinancialSnapshot,
} from "../services/aiFinancialAdvisor";
import { financialPlanGenerator } from "../services/financialPlanGenerator";
import { saveFinancialPlan } from "../services/userData";
import { VectraAvatar } from "../components/VectraAvatar";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
}

// Chat history configuration
const MAX_MESSAGES = 50; // Keep last 50 messages
const CHAT_HISTORY_KEY = "ai_financial_advisor_chat_history";

export const AIFinancialAdvisorScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const {
    transactions,
    assets,
    debts,
    goals,
    budgetSettings,
    recurringTransactions,
  } = useData();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [pendingPlan, setPendingPlan] = useState<{
    plan: any;
    planName: string;
  } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { colors } = useTheme();

  // AI Financial Advisor is now free for testing
  const hasAIAccess = true;

  // Load chat history from AsyncStorage
  const loadChatHistory = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem(CHAT_HISTORY_KEY);
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(parsedMessages);
      } else {
        // Initialize with welcome message if no history exists
        setMessages([
          {
            id: "1",
            text: "Hi! I'm Vectra, your AI Financial Advisor. I can help you with budgeting, goal planning, debt management, and financial decisions. What would you like to know about your finances?",
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      // Fallback to welcome message
      setMessages([
        {
          id: "1",
          text: "Hi! I'm Vectra, your AI Financial Advisor. I can help you with budgeting, goal planning, debt management, and financial decisions. What would you like to know about your finances?",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Save chat history to AsyncStorage
  const saveChatHistory = async (messagesToSave: Message[]) => {
    try {
      // Keep only the last MAX_MESSAGES messages
      const messagesToKeep = messagesToSave.slice(-MAX_MESSAGES);
      await AsyncStorage.setItem(
        CHAT_HISTORY_KEY,
        JSON.stringify(messagesToKeep)
      );
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
  };

  // Clear chat history
  const clearChatHistory = async () => {
    try {
      await AsyncStorage.removeItem(CHAT_HISTORY_KEY);
      setMessages([
        {
          id: "1",
          text: "Hi! I'm Vectra, your AI Financial Advisor. I can help you with budgeting, goal planning, debt management, and financial decisions. What would you like to know about your finances?",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Error clearing chat history:", error);
    }
  };

  // Generate financial snapshot for AI analysis
  const generateFinancialSnapshot = (): FinancialSnapshot => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Calculate monthly income and expenses
    const monthlyTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return (
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear
      );
    });

    const monthlyIncome = monthlyTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = monthlyTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const netIncome = monthlyIncome - monthlyExpenses;

    // Calculate totals
    const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
    const totalAssets = assets.reduce((sum, asset) => sum + asset.balance, 0);
    const totalSavings = assets
      .filter((asset) => asset.type === "savings")
      .reduce((sum, asset) => sum + asset.balance, 0);
    const netWorth = totalAssets - totalDebt;

    // Get budget settings
    const savingsRate = budgetSettings?.savingsPercentage || 20;
    const debtPayoffRate = budgetSettings?.debtPayoffPercentage || 5;

    // Get recurring expenses
    const recurringExpenses = recurringTransactions.filter(
      (t) => t.type === "expense" && t.isActive
    );

    return {
      monthlyIncome,
      monthlyExpenses,
      netIncome,
      savingsRate,
      debtPayoffRate,
      totalDebt,
      totalAssets,
      totalSavings,
      netWorth,
      goals,
      recurringExpenses,
      assets,
      debts,
      transactions,
    };
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: "",
      isUser: false,
      timestamp: new Date(),
      isLoading: true,
    };

    const newMessages = [...messages, userMessage, loadingMessage];
    setMessages(newMessages);
    setInputText("");
    setIsLoading(true);

    try {
      const snapshot = generateFinancialSnapshot();

      // Check if user is requesting a financial plan (enhanced triggers)
      const lowerQuestion = userMessage.text.toLowerCase();
      const isPlanRequest =
        lowerQuestion.includes("create plan") ||
        lowerQuestion.includes("generate plan") ||
        lowerQuestion.includes("financial plan") ||
        lowerQuestion.includes("export plan") ||
        lowerQuestion.includes("spreadsheet") ||
        lowerQuestion.includes("csv") ||
        lowerQuestion.includes("make a plan") ||
        lowerQuestion.includes("build a plan") ||
        lowerQuestion.includes("plan for") ||
        lowerQuestion.includes("help me plan") ||
        lowerQuestion.includes("i need a plan") ||
        lowerQuestion.includes("create a plan") ||
        lowerQuestion.includes("generate a plan") ||
        lowerQuestion.includes("financial planning") ||
        lowerQuestion.includes("budget plan") ||
        lowerQuestion.includes("savings plan") ||
        lowerQuestion.includes("debt plan") ||
        lowerQuestion.includes("investment plan") ||
        lowerQuestion.includes("retirement plan") ||
        lowerQuestion.includes("emergency fund plan") ||
        lowerQuestion.includes("goal plan") ||
        lowerQuestion.includes("money plan") ||
        lowerQuestion.includes("finance plan");

      let aiResponse;

      if (isPlanRequest && user) {
        // Generate financial plan (but don't save automatically)
        try {
          // Create a personalized plan name based on user's request
          let planName = `Financial Plan - ${new Date().toLocaleDateString()}`;

          // Customize plan name based on user's specific request
          if (lowerQuestion.includes("budget")) {
            planName = `Budget Plan - ${new Date().toLocaleDateString()}`;
          } else if (
            lowerQuestion.includes("debt") ||
            lowerQuestion.includes("payoff")
          ) {
            planName = `Debt Payoff Plan - ${new Date().toLocaleDateString()}`;
          } else if (
            lowerQuestion.includes("savings") ||
            lowerQuestion.includes("emergency")
          ) {
            planName = `Savings Plan - ${new Date().toLocaleDateString()}`;
          } else if (
            lowerQuestion.includes("investment") ||
            lowerQuestion.includes("retirement")
          ) {
            planName = `Investment Plan - ${new Date().toLocaleDateString()}`;
          } else if (lowerQuestion.includes("goal")) {
            planName = `Goal Achievement Plan - ${new Date().toLocaleDateString()}`;
          }

          const plan = financialPlanGenerator.generateFinancialPlan(
            snapshot,
            planName,
            user.uid
          );

          // Store the plan for potential saving
          setPendingPlan({ plan, planName });

          // Create personalized response with save button
          let personalizedResponse = `📋 **${planName} Generated Successfully!**\n\n`;

          // Add context about what the user asked for
          if (lowerQuestion.includes("budget")) {
            personalizedResponse += `**Based on your request for budget planning:**\n`;
          } else if (
            lowerQuestion.includes("debt") ||
            lowerQuestion.includes("payoff")
          ) {
            personalizedResponse += `**Based on your request for debt management:**\n`;
          } else if (
            lowerQuestion.includes("savings") ||
            lowerQuestion.includes("emergency")
          ) {
            personalizedResponse += `**Based on your request for savings planning:**\n`;
          } else if (
            lowerQuestion.includes("investment") ||
            lowerQuestion.includes("retirement")
          ) {
            personalizedResponse += `**Based on your request for investment planning:**\n`;
          } else if (lowerQuestion.includes("goal")) {
            personalizedResponse += `**Based on your request for goal planning:**\n`;
          } else {
            personalizedResponse += `**Based on your financial situation:**\n`;
          }

          personalizedResponse += `**Generated**: ${new Date().toLocaleDateString()}\n\n**Plan Summary:**\n• **Monthly Budget**: $${plan.planData.monthlyBudget.income.toFixed(
            2
          )} income, $${plan.planData.monthlyBudget.expenses.toFixed(
            2
          )} expenses\n• **Debt Payoff**: $${plan.planData.debtPayoffPlan.totalDebt.toFixed(
            2
          )} total debt, estimated payoff: ${
            plan.planData.debtPayoffPlan.estimatedPayoffDate
          }\n• **Savings Plan**: Emergency fund target $${plan.planData.savingsPlan.emergencyFund.target.toFixed(
            2
          )}\n• **Goals**: ${
            plan.planData.goalTimeline.goals.length
          } active goals\n• **Recommendations**: ${
            plan.planData.recommendations.length
          } actionable items\n\n**Plan includes:**\n✅ Monthly budget breakdown\n✅ Debt payoff strategy (avalanche method)\n✅ Savings allocation plan\n✅ Goal timeline analysis\n✅ Personalized recommendations\n✅ Exportable CSV data\n\n**💾 Would you like to save this plan to your account?**`;

          aiResponse = personalizedResponse;
        } catch (planError) {
          console.error("Error creating financial plan:", planError);
          aiResponse = await aiFinancialAdvisorService.generateAIResponse(
            userMessage.text,
            snapshot
          );
        }
      } else {
        // Regular AI response
        aiResponse = await aiFinancialAdvisorService.generateAIResponse(
          userMessage.text,
          snapshot
        );
      }

      const updatedMessages = newMessages.map((msg) =>
        msg.isLoading ? { ...msg, text: aiResponse, isLoading: false } : msg
      );
      setMessages(updatedMessages);
      saveChatHistory(updatedMessages);
    } catch (error) {
      console.error("Error generating AI response:", error);
      const errorMessages = newMessages.map((msg) =>
        msg.isLoading
          ? {
              ...msg,
              text: "Sorry, I'm having trouble processing your request. Please try again.",
              isLoading: false,
            }
          : msg
      );
      setMessages(errorMessages);
      saveChatHistory(errorMessages);
    } finally {
      setIsLoading(false);
    }
  };

  // Load chat history on component mount
  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const savePlan = async () => {
    if (!pendingPlan || !user) return;

    try {
      await saveFinancialPlan(pendingPlan.plan);
      setPendingPlan(null);
      Alert.alert("Success", "Plan saved to your account!");
    } catch (error) {
      console.error("Error saving plan:", error);
      Alert.alert("Error", "Failed to save plan. Please try again.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <VectraAvatar size={24} />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.text,
                marginLeft: 8,
              }}
            >
              Vectra
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            Get personalized financial advice
          </Text>
          {messages.length > 1 && (
            <Text
              style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}
            >
              {messages.length - 1} messages stored
            </Text>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {messages.length > 1 && (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Clear Chat History",
                  "Are you sure you want to clear all chat history? This action cannot be undone.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Clear",
                      style: "destructive",
                      onPress: clearChatHistory,
                    },
                  ]
                );
              }}
              style={{
                marginRight: 12,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: colors.surfaceSecondary,
              }}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Messages */}
      {isLoadingHistory ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 16, color: colors.textSecondary }}>
            Loading chat history...
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={{
                marginBottom: 16,
                alignItems: message.isUser ? "flex-end" : "flex-start",
              }}
            >
              {message.isUser ? (
                // User message
                <View
                  style={{
                    maxWidth: "80%",
                    padding: 12,
                    borderRadius: 16,
                    backgroundColor: "#6366f1",
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                  }}
                >
                  {message.isLoading ? (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <ActivityIndicator size="small" color="#fff" />
                      <Text
                        style={{ marginLeft: 8, color: "#fff", fontSize: 14 }}
                      >
                        Analyzing your finances...
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: 14,
                        lineHeight: 20,
                      }}
                    >
                      {message.text}
                    </Text>
                  )}
                </View>
              ) : (
                // Vectra message with avatar
                <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                  <VectraAvatar size={24} />
                  <View style={{ marginLeft: 8, maxWidth: "80%" }}>
                    <View
                      style={{
                        padding: 12,
                        borderRadius: 16,
                        backgroundColor: "#fff",
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        shadowColor: "#000",
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                      }}
                    >
                      {message.isLoading ? (
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <ActivityIndicator size="small" color="#6366f1" />
                          <Text
                            style={{
                              marginLeft: 8,
                              color: "#6b7280",
                              fontSize: 14,
                            }}
                          >
                            Analyzing your finances...
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={{
                            color: "#374151",
                            fontSize: 14,
                            lineHeight: 20,
                          }}
                        >
                          {message.text}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
              <Text
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  marginTop: 4,
                  marginHorizontal: 4,
                }}
              >
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Save Plan Button */}
      {pendingPlan && (
        <View
          style={{
            backgroundColor: colors.card,
            margin: 16,
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 8,
            }}
          >
            💾 Save Plan: {pendingPlan.planName}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textSecondary,
              marginBottom: 12,
            }}
          >
            This plan includes budget breakdown, debt payoff strategy, savings
            plan, goal timeline, and personalized recommendations.
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={savePlan}
              style={{
                backgroundColor: colors.primary,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                flex: 1,
              }}
            >
              <Text
                style={{
                  color: colors.buttonText,
                  fontSize: 16,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                Save Plan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPendingPlan(null)}
              style={{
                backgroundColor: colors.surfaceSecondary,
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                flex: 1,
              }}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: "600",
                  textAlign: "center",
                }}
              >
                Dismiss
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          padding: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: inputText.trim() ? colors.primary : colors.border,
              borderRadius: 20,
              backgroundColor: colors.surfaceSecondary,
              marginRight: 8,
              minHeight: 40,
              maxHeight: 100,
            }}
          >
            <TextInput
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 16,
                color: colors.text,
                textAlignVertical: "center",
                minHeight: 40,
                maxHeight: 100,
              }}
              placeholder="Ask me about your finances..."
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isLoading}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
              blurOnSubmit={false}
            />
          </View>
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
            style={{
              backgroundColor:
                inputText.trim() && !isLoading
                  ? colors.primary
                  : colors.surfaceSecondary,
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: colors.shadow,
              shadowOpacity: 0.1,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              elevation: 2,
            }}
          >
            <Ionicons
              name="arrow-forward"
              size={18}
              color={
                inputText.trim() && !isLoading
                  ? colors.buttonText
                  : colors.textSecondary
              }
            />
          </TouchableOpacity>
        </View>
        {inputText.length > 0 && (
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              textAlign: "right",
              marginTop: 4,
              marginRight: 8,
            }}
          >
            {inputText.length}/500
          </Text>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
