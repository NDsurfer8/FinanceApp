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
import { useSubscription } from "../contexts/SubscriptionContext";
import { usePaywall } from "../hooks/usePaywall";
import {
  aiFinancialAdvisorService,
  FinancialSnapshot,
} from "../services/aiFinancialAdvisor";
import { PREMIUM_FEATURES } from "../services/revenueCat";

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
  const { presentPaywall } = usePaywall();
  const { subscriptionStatus } = useSubscription();
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
  const scrollViewRef = useRef<ScrollView>(null);

  // Check if user has access to AI Financial Advisor feature specifically
  const hasAIAccess =
    subscriptionStatus?.features?.includes(
      PREMIUM_FEATURES.AI_FINANCIAL_ADVISOR
    ) || false;

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
    const totalDebt = debts.reduce((sum, debt) => sum + debt.amount, 0);
    const totalSavings = assets
      .filter((asset) => asset.type === "savings")
      .reduce((sum, asset) => sum + asset.amount, 0);

    // Get budget settings
    const savingsRate = budgetSettings?.savingsPercentage || 20;
    const debtPayoffRate = budgetSettings?.debtPayoffPercentage || 75;

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
      totalSavings,
      goals,
      recurringExpenses,
      assets,
      debts,
      transactions,
    };
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    if (!hasAIAccess) {
      Alert.alert(
        "Premium Feature",
        "Vectra is a premium feature. Upgrade to get personalized financial advice and insights.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: presentPaywall },
        ]
      );
      return;
    }

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
      const aiResponse = await aiFinancialAdvisorService.generateAIResponse(
        userMessage.text,
        snapshot
      );

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 16,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#1f2937" }}>
            Vectra
          </Text>
          <Text style={{ fontSize: 14, color: "#6b7280" }}>
            Get personalized financial advice
          </Text>
          {messages.length > 1 && (
            <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
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
                backgroundColor: "#f3f4f6",
              }}
            >
              <Ionicons name="trash-outline" size={16} color="#6b7280" />
            </TouchableOpacity>
          )}
          {!hasAIAccess && (
            <TouchableOpacity
              onPress={presentPaywall}
              style={{
                backgroundColor: "#6366f1",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>
                Upgrade
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Messages */}
      {isLoadingHistory ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={{ marginTop: 16, color: "#6b7280" }}>
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
              <View
                style={{
                  maxWidth: "80%",
                  padding: 12,
                  borderRadius: 16,
                  backgroundColor: message.isUser ? "#6366f1" : "#fff",
                  borderWidth: message.isUser ? 0 : 1,
                  borderColor: "#e5e7eb",
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }}
              >
                {message.isLoading ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <ActivityIndicator size="small" color="#6366f1" />
                    <Text
                      style={{ marginLeft: 8, color: "#6b7280", fontSize: 14 }}
                    >
                      Analyzing your finances...
                    </Text>
                  </View>
                ) : (
                  <Text
                    style={{
                      color: message.isUser ? "#fff" : "#374151",
                      fontSize: 14,
                      lineHeight: 20,
                    }}
                  >
                    {message.text}
                  </Text>
                )}
              </View>
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

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          padding: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: inputText.trim() ? "#6366f1" : "#d1d5db",
              borderRadius: 20,
              backgroundColor: "#fff",
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
                color: "#374151",
                textAlignVertical: "center",
                minHeight: 40,
                maxHeight: 100,
              }}
              placeholder="Ask me about your finances..."
              placeholderTextColor="#9ca3af"
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
                inputText.trim() && !isLoading ? "#6366f1" : "#f3f4f6",
              width: 40,
              height: 40,
              borderRadius: 20,
              justifyContent: "center",
              alignItems: "center",
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              elevation: 2,
            }}
          >
            <Ionicons
              name="arrow-forward"
              size={18}
              color={inputText.trim() && !isLoading ? "#fff" : "#9ca3af"}
            />
          </TouchableOpacity>
        </View>
        {inputText.length > 0 && (
          <Text
            style={{
              fontSize: 12,
              color: "#9ca3af",
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
