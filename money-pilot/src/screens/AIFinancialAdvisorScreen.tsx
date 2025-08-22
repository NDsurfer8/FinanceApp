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
  Animated,
  Keyboard,
  Clipboard,
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
  const [feedbackStates, setFeedbackStates] = useState<{
    [messageId: string]: { liked?: boolean; disliked?: boolean };
  }>({});
  const [userPreferences, setUserPreferences] = useState<{
    preferredStyle: "detailed" | "concise" | "balanced";
    preferredTone: "professional" | "casual" | "friendly";
    preferredFocus: "actionable" | "educational" | "analytical";
  }>({
    preferredStyle: "balanced",
    preferredTone: "friendly",
    preferredFocus: "actionable",
  });
  const scrollViewRef = useRef<ScrollView>(null);
  const { colors } = useTheme();
  const headerOpacity = useRef(new Animated.Value(1)).current;

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
            text: "Hi! I'm Vectra, your AI Financial Advisor. I can help you with budgeting, goal planning, debt management, and financial decisions and more. What would you like to know about your finances?",
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

  // Save feedback data to AsyncStorage (user-specific)
  const saveFeedbackData = async (feedbackData: any) => {
    try {
      const userId = user?.uid || "anonymous";
      const feedbackKey = `vectra_feedback_data_${userId}`;

      const existingFeedback = await AsyncStorage.getItem(feedbackKey);
      const feedbackArray = existingFeedback
        ? JSON.parse(existingFeedback)
        : [];
      feedbackArray.push(feedbackData);

      // Keep only the last 100 feedback entries
      const trimmedFeedback = feedbackArray.slice(-100);
      await AsyncStorage.setItem(feedbackKey, JSON.stringify(trimmedFeedback));
    } catch (error) {
      console.error("Error saving feedback data:", error);
    }
  };

  // Clear chat history (user-specific)
  const clearChatHistory = async () => {
    try {
      // Only clear chat messages, keep feedback data and preferences
      await AsyncStorage.removeItem(CHAT_HISTORY_KEY);

      // Reset feedback states for current session only
      setFeedbackStates({});

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

    // Clear input immediately
    const currentInputText = inputText.trim();
    setInputText("");
    setIsLoading(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentInputText,
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
          let personalizedResponse = `📋 ${planName} Generated Successfully!\n\n`;

          // Add context about what the user asked for
          if (lowerQuestion.includes("budget")) {
            personalizedResponse += `📋 Based on your request for budget planning:\n`;
          } else if (
            lowerQuestion.includes("debt") ||
            lowerQuestion.includes("payoff")
          ) {
            personalizedResponse += `📋 Based on your request for debt management:\n`;
          } else if (
            lowerQuestion.includes("savings") ||
            lowerQuestion.includes("emergency")
          ) {
            personalizedResponse += `📋 Based on your request for savings planning:\n`;
          } else if (
            lowerQuestion.includes("investment") ||
            lowerQuestion.includes("retirement")
          ) {
            personalizedResponse += `📋 Based on your request for investment planning:\n`;
          } else if (lowerQuestion.includes("goal")) {
            personalizedResponse += `📋 Based on your request for goal planning:\n`;
          } else {
            personalizedResponse += `📋 Based on your financial situation:\n`;
          }

          personalizedResponse += `📅 Generated: ${new Date().toLocaleDateString()}\n\n📊 Plan Summary:\n• Monthly Budget: $${plan.planData.monthlyBudget.income.toFixed(
            2
          )} income, $${plan.planData.monthlyBudget.expenses.toFixed(
            2
          )} expenses\n• Debt Payoff: $${plan.planData.debtPayoffPlan.totalDebt.toFixed(
            2
          )} total debt, estimated payoff: ${
            plan.planData.debtPayoffPlan.estimatedPayoffDate
          }\n• Savings Plan: Emergency fund target $${plan.planData.savingsPlan.emergencyFund.target.toFixed(
            2
          )}\n• Goals: ${
            plan.planData.goalTimeline.goals.length
          } active goals\n• Recommendations: ${
            plan.planData.recommendations.length
          } actionable items\n\n📋 Plan includes:\n✅ Monthly budget breakdown\n✅ Debt payoff strategy (avalanche method)\n✅ Savings allocation plan\n✅ Goal timeline analysis\n✅ Personalized recommendations\n✅ Exportable CSV data\n\n💾 Would you like to save this plan to your account?`;

          aiResponse = personalizedResponse;
        } catch (planError) {
          console.error("Error creating financial plan:", planError);
          aiResponse = await aiFinancialAdvisorService.generateAIResponse(
            userMessage.text,
            snapshot
          );
        }
      } else {
        // Generate optimized prompt based on user preferences
        const optimizedPrompt = generateOptimizedPrompt(userMessage.text);

        // Regular AI response with optimized prompt
        aiResponse = await aiFinancialAdvisorService.generateAIResponse(
          optimizedPrompt,
          snapshot
        );

        // Clean up markdown formatting from AI responses
        aiResponse = aiResponse
          .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold formatting
          .replace(/### (.*?)\n/g, "$1\n\n") // Convert headers to plain text
          .replace(/## (.*?)\n/g, "$1\n\n") // Convert sub-headers to plain text
          .replace(/# (.*?)\n/g, "$1\n\n"); // Convert main headers to plain text
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

  // Scroll to bottom when keyboard appears
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
    };
  }, []);

  // Handle scroll for header fade
  const handleScroll = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const fadeThreshold = 50;

    if (scrollY > fadeThreshold) {
      Animated.timing(headerOpacity, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

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

  // Analyze message characteristics for feedback learning
  const analyzeMessageCharacteristics = (messageText: string) => {
    const characteristics = {
      length: messageText.length,
      hasNumbers: /\d/.test(messageText),
      hasEmojis:
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(
          messageText
        ),
      hasBulletPoints: messageText.includes("•") || messageText.includes("-"),
      hasHeaders: /^[A-Z][A-Za-z\s]+:$/m.test(messageText),
      hasIcons:
        /[📊💰🏦🎯📝🤖👨‍👩‍👧‍👦🔄⚙️⭐🔒📱💡📋🔧📅🏆💎💳📈🛡️🎉❌✅⚠️❓📍]/g.test(
          messageText
        ),
      isDetailed: messageText.length > 500,
      isConcise: messageText.length < 200,
      isActionable:
        /(recommend|action|step|tip|suggest|plan|do|try|start|focus)/i.test(
          messageText
        ),
      isEducational: /(explain|understand|learn|know|about|how|what|why)/i.test(
        messageText
      ),
      isAnalytical:
        /(analysis|breakdown|calculation|ratio|percentage|total|average)/i.test(
          messageText
        ),
    };

    return characteristics;
  };

  // Update user preferences based on feedback
  const updateUserPreferences = (messageText: string, isPositive: boolean) => {
    const characteristics = analyzeMessageCharacteristics(messageText);

    setUserPreferences((prev) => {
      const newPrefs = { ...prev };

      if (isPositive) {
        // Learn from positive feedback
        if (characteristics.isDetailed) newPrefs.preferredStyle = "detailed";
        else if (characteristics.isConcise) newPrefs.preferredStyle = "concise";

        if (characteristics.isActionable)
          newPrefs.preferredFocus = "actionable";
        else if (characteristics.isEducational)
          newPrefs.preferredFocus = "educational";
        else if (characteristics.isAnalytical)
          newPrefs.preferredFocus = "analytical";

        if (characteristics.hasEmojis) newPrefs.preferredTone = "casual";
        else if (characteristics.isAnalytical)
          newPrefs.preferredTone = "professional";
      } else {
        // Learn from negative feedback - avoid what user doesn't like
        if (characteristics.isDetailed && prev.preferredStyle === "detailed") {
          newPrefs.preferredStyle = "concise";
        }
        if (characteristics.isConcise && prev.preferredStyle === "concise") {
          newPrefs.preferredStyle = "detailed";
        }
        if (
          characteristics.isActionable &&
          prev.preferredFocus === "actionable"
        ) {
          newPrefs.preferredFocus = "educational";
        }
      }

      return newPrefs;
    });
  };

  // Generate optimized prompt based on user preferences
  const generateOptimizedPrompt = (basePrompt: string) => {
    const styleInstructions = {
      detailed:
        "Provide comprehensive, detailed responses with step-by-step explanations and thorough analysis.",
      concise:
        "Keep responses brief and to the point. Focus on key insights and actionable takeaways.",
      balanced:
        "Provide balanced responses with enough detail to be helpful but not overwhelming.",
    };

    const toneInstructions = {
      professional:
        "Maintain a professional, formal tone suitable for business and financial advice.",
      casual:
        "Use a relaxed, conversational tone with emojis and casual language.",
      friendly: "Be warm and approachable while maintaining professionalism.",
    };

    const focusInstructions = {
      actionable:
        "Focus on providing specific, actionable steps and recommendations the user can implement immediately.",
      educational:
        "Focus on explaining concepts and helping the user understand the financial principles involved.",
      analytical:
        "Focus on providing detailed analysis, calculations, and data-driven insights.",
    };

    const optimization = `
${styleInstructions[userPreferences.preferredStyle]}
${toneInstructions[userPreferences.preferredTone]}
${focusInstructions[userPreferences.preferredFocus]}

User Preferences: ${userPreferences.preferredStyle} style, ${
      userPreferences.preferredTone
    } tone, ${userPreferences.preferredFocus} focus.

Original Request: ${basePrompt}
`;

    return optimization;
  };

  // Handle feedback button interactions
  const handleFeedback = (messageId: string, type: "like" | "dislike") => {
    const message = messages.find((m) => m.id === messageId);
    const isPositive = type === "like";

    if (message && !message.isUser) {
      // Analyze the message and update preferences
      updateUserPreferences(message.text, isPositive);

      // Store feedback for future analysis
      const feedbackData = {
        messageId,
        messageText: message.text,
        feedback: type,
        timestamp: new Date().toISOString(),
        userPreferences: userPreferences,
        characteristics: analyzeMessageCharacteristics(message.text),
      };

      // Save feedback to AsyncStorage for analysis
      saveFeedbackData(feedbackData);
    }

    setFeedbackStates((prev) => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        liked: type === "like" ? !prev[messageId]?.liked : false,
        disliked: type === "dislike" ? !prev[messageId]?.disliked : false,
      },
    }));

    // Show feedback confirmation
    const action = type === "like" ? "liked" : "disliked";
    const isRemoving =
      feedbackStates[messageId]?.[type === "like" ? "liked" : "disliked"];

    if (!isRemoving) {
      Alert.alert(
        "Feedback Submitted",
        `Thank you for your feedback! Vectra is learning your preferences to provide better responses.`,
        [{ text: "OK" }]
      );
    }
  };

  // Handle copy button
  const handleCopy = async (text: string) => {
    try {
      await Clipboard.setString(text);
      Alert.alert("Copied!", "Response copied to clipboard.");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      Alert.alert("Error", "Failed to copy to clipboard.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ChatGPT-style Header */}
      <Animated.View
        style={{
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingVertical: 12,
          paddingHorizontal: 16,
          opacity: headerOpacity,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              padding: 8,
              borderRadius: 6,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <VectraAvatar size={20} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.text,
              }}
            >
              Vectra
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              // Show current preferences and optimization status
              const feedbackCount = Object.keys(feedbackStates).length;
              const preferenceInfo = `
🎯 Vectra Learning Status

Current Preferences:
• Style: ${userPreferences.preferredStyle}
• Tone: ${userPreferences.preferredTone}
• Focus: ${userPreferences.preferredFocus}

Learning Data:
• Feedback given: ${feedbackCount} responses
• System: ${feedbackCount > 0 ? "Active" : "Learning from your feedback"}

How it works:
• 👍 Like responses you prefer
• 👎 Dislike responses you don't like
• Vectra learns your style and adapts
• Responses get better over time

Try giving feedback on a few responses to see the system in action!
              `;

              Alert.alert("Vectra Learning Status", preferenceInfo, [
                { text: "OK" },
              ]);
            }}
            style={{
              padding: 8,
              borderRadius: 6,
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

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
              padding: 8,
              borderRadius: 6,
            }}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

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
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {messages.map((message, index) => (
            <View
              key={message.id}
              style={{
                backgroundColor: message.isUser
                  ? colors.background
                  : colors.surfaceSecondary,
                paddingVertical: 24,
                paddingHorizontal: 16,
                borderBottomWidth: message.isUser ? 0 : 1,
                borderBottomColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", maxWidth: "100%", gap: 16 }}>
                {message.isUser ? (
                  // User message - ChatGPT style
                  <>
                    <View style={{ width: 32, alignItems: "center" }}>
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 6,
                          backgroundColor: colors.primary,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: "#fff",
                            fontSize: 14,
                            fontWeight: "600",
                          }}
                        >
                          U
                        </Text>
                      </View>
                    </View>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      {message.isLoading ? (
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <ActivityIndicator size="small" color={colors.text} />
                          <Text
                            style={{
                              marginLeft: 8,
                              color: colors.text,
                              fontSize: 16,
                            }}
                          >
                            Analyzing your finances...
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 16,
                            lineHeight: 24,
                            fontWeight: "500",
                          }}
                        >
                          {message.text}
                        </Text>
                      )}
                    </View>
                  </>
                ) : (
                  // AI message - ChatGPT style
                  <>
                    <View style={{ width: 32, alignItems: "center" }}>
                      <VectraAvatar size={32} />
                    </View>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      {message.isLoading ? (
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <ActivityIndicator size="small" color={colors.text} />
                          <Text
                            style={{
                              marginLeft: 8,
                              color: colors.text,
                              fontSize: 16,
                            }}
                          >
                            Analyzing your finances...
                          </Text>
                        </View>
                      ) : (
                        <View>
                          <Text
                            style={{
                              color: colors.text,
                              fontSize: 16,
                              lineHeight: 24,
                              fontWeight: "400",
                            }}
                          >
                            {message.text}
                          </Text>
                          {index === messages.length - 1 && !message.isUser && (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginTop: 16,
                                gap: 8,
                              }}
                            >
                              <TouchableOpacity
                                onPress={() =>
                                  handleFeedback(message.id, "like")
                                }
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  borderRadius: 6,
                                  backgroundColor: feedbackStates[message.id]
                                    ?.liked
                                    ? colors.primary
                                    : colors.surface,
                                  borderWidth: 1,
                                  borderColor: feedbackStates[message.id]?.liked
                                    ? colors.primary
                                    : colors.border,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: feedbackStates[message.id]?.liked
                                      ? "#fff"
                                      : colors.textSecondary,
                                    fontWeight: "500",
                                  }}
                                >
                                  👍
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() =>
                                  handleFeedback(message.id, "dislike")
                                }
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  borderRadius: 6,
                                  backgroundColor: feedbackStates[message.id]
                                    ?.disliked
                                    ? colors.error
                                    : colors.surface,
                                  borderWidth: 1,
                                  borderColor: feedbackStates[message.id]
                                    ?.disliked
                                    ? colors.error
                                    : colors.border,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: feedbackStates[message.id]?.disliked
                                      ? "#fff"
                                      : colors.textSecondary,
                                    fontWeight: "500",
                                  }}
                                >
                                  👎
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleCopy(message.text)}
                                style={{
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                  borderRadius: 6,
                                  backgroundColor: colors.surface,
                                  borderWidth: 1,
                                  borderColor: colors.border,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: colors.textSecondary,
                                    fontWeight: "500",
                                  }}
                                >
                                  Copy
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </>
                )}
              </View>
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

      {/* ChatGPT-style Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={{
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 16,
            paddingBottom: Platform.OS === "ios" ? 34 : 16, // Account for home indicator
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 8,
              backgroundColor: colors.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                color: colors.text,
                textAlignVertical: "center",
                minHeight: 40,
                maxHeight: 120,
                paddingHorizontal: 8,
                paddingVertical: 8,
              }}
              placeholder="✨ Ask me about your finances..."
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={4000}
              editable={!isLoading}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
              style={{
                backgroundColor:
                  inputText.trim() && !isLoading
                    ? colors.primary
                    : colors.border,
                width: 36,
                height: 36,
                borderRadius: 8,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={
                  inputText.trim() && !isLoading ? "#fff" : colors.textSecondary
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
