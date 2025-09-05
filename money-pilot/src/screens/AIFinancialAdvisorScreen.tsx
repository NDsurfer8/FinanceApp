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
  Animated,
  Keyboard,
  Clipboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useFocusEffect,
  useRoute,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../hooks/useAuth";
import { useData } from "../contexts/DataContext";
import { useTheme } from "../contexts/ThemeContext";
import { useChatbot } from "../contexts/ChatbotContext";
import { StandardHeader } from "../components/StandardHeader";
import { useSubscription } from "../contexts/SubscriptionContext";
import { aiUsageTracker } from "../services/aiUsageTracker";
import {
  aiFinancialAdvisorService,
  FinancialSnapshot,
} from "../services/aiFinancialAdvisor";
import { financialPlanGenerator } from "../services/financialPlanGenerator";
import {
  saveFinancialPlan,
  updateBudgetSettings,
  saveBudgetSettings,
  getUserBudgetCategories,
  saveBudgetCategories,
  BudgetCategory,
} from "../services/userData";
import { VectraAvatar } from "../components/VectraAvatar";
import { sendBackendAIFeedback } from "../services/backendAI";

// Local responses for common app questions (no API call needed)
const APP_NAVIGATION_RESPONSES = {
  // Dashboard questions
  "dashboard add transaction": {
    response:
      "You're on the Dashboard! Use the Quick Actions section - tap 'Add Transaction' to log income or expenses. It's right there in the quick actions! ⚡",
    isLocal: true,
  },
  "dashboard add asset": {
    response:
      "You're on the Dashboard! Use the Quick Actions section - tap 'Add Asset' to track savings, investments, or property. Quick and easy! 💎",
    isLocal: true,
  },
  "dashboard add debt": {
    response:
      "You're on the Dashboard! Use the Quick Actions section - tap 'Add Debt' to monitor credit cards, loans, or mortgages. Right there in quick actions! 📋",
    isLocal: true,
  },
  "dashboard add goal": {
    response:
      "You're on the Dashboard! Use the Quick Actions section - tap 'Add Goal' to set financial targets. It's in the quick actions area! 🎯",
    isLocal: true,
  },

  // Goals screen questions
  "goals add goal": {
    response:
      "Perfect! You're already on the Goals screen, so just tap the 'Add Goal' button right there. Set your target amount and timeline - super simple! 🎯",
    isLocal: true,
  },
  "goals how to": {
    response:
      "You're on the Goals screen! Here's what you can do:\n\n• Tap 'Add Goal' to create new financial goals\n• View your goal progress with visual bars\n• Check target amounts and timelines\n\nEverything for goal tracking is right here! 🎯",
    isLocal: true,
  },

  // Assets/Debts screen questions
  "assets add asset": {
    response:
      "You're on the Assets/Debts screen! Tap the 'Add Asset' button to add savings, investments, or property. Track your net worth easily! 💰",
    isLocal: true,
  },
  "debts add debt": {
    response:
      "You're on the Assets/Debts screen! Tap the 'Add Debt' button to add credit cards, loans, or mortgages. Keep track of what you owe! 📊",
    isLocal: true,
  },

  // Settings questions
  "settings ai chatbot": {
    response:
      "You're in Settings! Go to 'App Settings' and you'll see the 'AI Chatbot' toggle to show/hide the floating AI button. Easy control! ⚙️",
    isLocal: true,
  },
  "settings dark mode": {
    response:
      "You're in Settings! Go to 'App Settings' and you'll find the 'Dark Mode' toggle. Switch between light and dark themes! 🌙",
    isLocal: true,
  },

  // General app questions
  "how to use app": {
    response:
      "Here's how to use VectorFi:\n\n📊 Dashboard: Overview and quick actions\n💰 Budget: Add income/expenses, set percentages\n🎯 Goals: Create and track financial goals\n📈 Assets/Debts: Manage your net worth\n⚙️ Settings: App preferences and profile\n\nPlus the floating AI button (bottom-right) for questions from any screen! 🚀",
    isLocal: true,
  },
  "app features": {
    response:
      "VectorFi features:\n\n• Income & expense tracking with categories\n• Asset and debt management\n• Goal setting with progress tracking\n• Budget percentage settings\n• Bank account integration (Plaid)\n• AI financial advisor (floating button)\n• Dark/light mode\n• Shared finance groups\n\nEverything you need for smart money management! 💡",
    isLocal: true,
  },

  // Shared goals questions
  "shared goals": {
    response:
      "To view shared goals, go to the Dashboard and tap the people icon in the top right corner! 👥 That's where you can see and manage your shared financial goals with family or friends.",
    isLocal: true,
  },
  "shared finance": {
    response:
      "To access shared finance features, go to the Dashboard and tap the people icon in the top right corner! 👥 There you can view shared goals and manage group finances.",
    isLocal: true,
  },
  "people icon": {
    response:
      "The people icon is in the top right corner of the Dashboard! 👥 Tap it to view shared goals and manage group finances.",
    isLocal: true,
  },
  groups: {
    response:
      "To access Groups, go to the Dashboard and tap the people icon in the top right corner! 👥 There you can view and manage your shared financial groups.",
    isLocal: true,
  },
};

// Function to check if question can be answered locally
function getLocalResponse(
  userQuestion: string
): { response: string; isLocal: boolean } | null {
  const lowerQuestion = userQuestion.toLowerCase();

  // Check for exact matches first
  for (const [key, value] of Object.entries(APP_NAVIGATION_RESPONSES)) {
    if (lowerQuestion.includes(key)) {
      return value;
    }
  }

  // Check for common patterns (budget questions now go to AI for analysis)

  if (lowerQuestion.includes("dashboard") && lowerQuestion.includes("add")) {
    if (lowerQuestion.includes("transaction")) {
      return APP_NAVIGATION_RESPONSES["dashboard add transaction"];
    }
    if (lowerQuestion.includes("asset")) {
      return APP_NAVIGATION_RESPONSES["dashboard add asset"];
    }
    if (lowerQuestion.includes("debt")) {
      return APP_NAVIGATION_RESPONSES["dashboard add debt"];
    }
    if (lowerQuestion.includes("goal")) {
      return APP_NAVIGATION_RESPONSES["dashboard add goal"];
    }
  }

  if (
    lowerQuestion.includes("goal") &&
    (lowerQuestion.includes("add") || lowerQuestion.includes("how"))
  ) {
    return APP_NAVIGATION_RESPONSES["goals add goal"];
  }

  if (lowerQuestion.includes("asset") && lowerQuestion.includes("add")) {
    return APP_NAVIGATION_RESPONSES["assets add asset"];
  }

  if (lowerQuestion.includes("debt") && lowerQuestion.includes("add")) {
    return APP_NAVIGATION_RESPONSES["debts add debt"];
  }

  if (
    lowerQuestion.includes("setting") &&
    (lowerQuestion.includes("ai") || lowerQuestion.includes("chatbot"))
  ) {
    return APP_NAVIGATION_RESPONSES["settings ai chatbot"];
  }

  if (lowerQuestion.includes("setting") && lowerQuestion.includes("dark")) {
    return APP_NAVIGATION_RESPONSES["settings dark mode"];
  }

  if (
    lowerQuestion.includes("how to use") ||
    lowerQuestion.includes("app help")
  ) {
    return APP_NAVIGATION_RESPONSES["how to use app"];
  }

  if (lowerQuestion.includes("feature") || lowerQuestion.includes("what can")) {
    return APP_NAVIGATION_RESPONSES["app features"];
  }

  // Shared goals and finance questions
  if (
    lowerQuestion.includes("shared") &&
    (lowerQuestion.includes("goal") || lowerQuestion.includes("finance"))
  ) {
    if (lowerQuestion.includes("goal")) {
      return APP_NAVIGATION_RESPONSES["shared goals"];
    }
    return APP_NAVIGATION_RESPONSES["shared finance"];
  }

  if (
    lowerQuestion.includes("people") ||
    lowerQuestion.includes("group") ||
    lowerQuestion.includes("family")
  ) {
    if (lowerQuestion.includes("group") && !lowerQuestion.includes("shared")) {
      return APP_NAVIGATION_RESPONSES["groups"];
    }
    return APP_NAVIGATION_RESPONSES["people icon"];
  }

  return null;
}

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isLoading?: boolean;
  budgetSuggestions?: {
    savingsPercentage?: number;
    debtPayoffPercentage?: number;
  };
}

// Chat history configuration
const MAX_MESSAGES = 30; // Keep last 50 messages
const CHAT_HISTORY_KEY = "ai_financial_advisor_chat_history";

export const AIFinancialAdvisorScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();

  // Get selected month from route params, default to current month
  const selectedMonth = (route.params as any)?.selectedMonth || new Date();

  // Ensure selectedMonth is a Date object and normalize it to the first day of the month
  const targetMonth =
    selectedMonth instanceof Date
      ? new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
      : new Date(
          new Date(selectedMonth).getFullYear(),
          new Date(selectedMonth).getMonth(),
          1
        );

  const { hideChatbot, showChatbot } = useChatbot();
  const { hasPremiumAccess } = useSubscription();
  const {
    transactions,
    assets,
    debts,
    goals,
    budgetSettings,
    recurringTransactions,
    refreshBudgetSettings,
  } = useData();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [lastRequestTime, setLastRequestTime] = useState(0);

  const [isPlanRequest, setIsPlanRequest] = useState(false);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(
    []
  );
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

  // Cache for common questions to reduce API calls - user-specific
  const [responseCache, setResponseCache] = useState<{
    [key: string]: { response: string; timestamp: number };
  }>({});

  // Clear cache when user changes
  useEffect(() => {
    if (user?.uid) {
      // Clear cache for previous user when new user logs in
      setResponseCache({});
    }
  }, [user?.uid]);

  // Hide floating AI button when on this screen, show when leaving
  useFocusEffect(
    React.useCallback(() => {
      // Hide when entering this screen
      hideChatbot();

      // Show when leaving this screen
      return () => {
        showChatbot();
      };
    }, [hideChatbot, showChatbot])
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const { colors } = useTheme();
  const headerOpacity = useRef(new Animated.Value(1)).current;

  // Get welcome message
  const getWelcomeMessage = (): Message => ({
    id: "1",
    text: "Aloha! I’m Vectra, your personal AI Financial Advisor. I can help with budgeting, goals, debt, investing, and side hustles — what’s on your mind today? 🤙",
    isUser: false,
    timestamp: new Date(),
  });

  // Load budget categories
  const loadBudgetCategories = async () => {
    if (user?.uid) {
      try {
        const categories = await getUserBudgetCategories(user.uid);
        setBudgetCategories(categories);
      } catch (error) {
        console.error("Error loading budget categories:", error);
      }
    }
  };

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
        setMessages([getWelcomeMessage()]);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      // Fallback to welcome message
      setMessages([getWelcomeMessage()]);
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

      setMessages([getWelcomeMessage()]);
    } catch (error) {
      console.error("Error clearing chat history:", error);
    }
  };

  // Check if user is asking about budget-related topics
  const isBudgetRelatedQuestion = (question: string): boolean => {
    const budgetKeywords = [
      "budget",
      "budgeting",
      "category",
      "categories",
      "limit",
      "limits",
      "spending",
      "overspend",
      "over budget",
      "under budget",
      "budget breakdown",
      "budget analysis",
      "budget review",
      "budget categories",
      "monthly limit",
      "spending limit",
      "budget allocation",
      "budget management",
      "budget planning",
    ];

    const lowerQuestion = question.toLowerCase();
    return budgetKeywords.some((keyword) => lowerQuestion.includes(keyword));
  };

  // Generate financial snapshot for AI analysis
  const generateFinancialSnapshot = (
    userQuestion?: string
  ): FinancialSnapshot => {
    const targetMonthNum = targetMonth.getMonth();
    const targetYear = targetMonth.getFullYear();

    // Calculate monthly income and expenses from actual transactions for the selected month
    const monthlyTransactions = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date);
      return (
        transactionDate.getMonth() === targetMonthNum &&
        transactionDate.getFullYear() === targetYear
      );
    });

    const actualMonthlyIncome = monthlyTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const actualMonthlyExpenses = monthlyTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    // Calculate recurring monthly income and expenses - only those active during the selected month
    const activeRecurringIncome = recurringTransactions.filter((t) => {
      if (t.type !== "income" || !t.isActive) return false;

      // Check if the recurring transaction was active during the selected month
      const startDate = t.startDate ? new Date(t.startDate) : null;
      const endDate = t.endDate ? new Date(t.endDate) : null;

      // If no start date, assume it was always active (backward compatibility)
      if (!startDate) return true;

      // Check if the selected month is after or on the start date
      const selectedMonthStart = new Date(targetYear, targetMonthNum, 1);
      const selectedMonthEnd = new Date(targetYear, targetMonthNum + 1, 0); // Last day of month

      // Transaction must have started by the end of the selected month
      if (startDate > selectedMonthEnd) return false;

      // If there's an end date, transaction must not have ended before the start of the selected month
      if (endDate && endDate < selectedMonthStart) return false;

      return true;
    });

    const activeRecurringExpenses = recurringTransactions.filter((t) => {
      if (t.type !== "expense" || !t.isActive) return false;

      // Check if the recurring transaction was active during the selected month
      const startDate = t.startDate ? new Date(t.startDate) : null;
      const endDate = t.endDate ? new Date(t.endDate) : null;

      // If no start date, assume it was always active (backward compatibility)
      if (!startDate) return true;

      // Check if the selected month is after or on the start date
      const selectedMonthStart = new Date(targetYear, targetMonthNum, 1);
      const selectedMonthEnd = new Date(targetYear, targetMonthNum + 1, 0); // Last day of month

      // Transaction must have started by the end of the selected month
      if (startDate > selectedMonthEnd) return false;

      // If there's an end date, transaction must not have ended before the start of the selected month
      if (endDate && endDate < selectedMonthStart) return false;

      return true;
    });

    // Debug: Log recurring transactions
    console.log(
      "🔍 AI Debug - Active recurring income:",
      activeRecurringIncome.length
    );
    console.log(
      "🔍 AI Debug - Active recurring expenses:",
      activeRecurringExpenses.length
    );
    console.log(
      "🔍 AI Debug - Recurring expenses details:",
      activeRecurringExpenses.map((rt) => ({
        id: rt.id,
        description: rt.description,
        amount: rt.amount,
        frequency: rt.frequency,
        isActive: rt.isActive,
        startDate: rt.startDate
          ? new Date(rt.startDate).toLocaleDateString()
          : "No start date",
        endDate: rt.endDate
          ? new Date(rt.endDate).toLocaleDateString()
          : "No end date",
      }))
    );

    const recurringMonthlyIncome = activeRecurringIncome.reduce((sum, rt) => {
      let monthlyAmount = rt.amount;
      if (rt.frequency === "weekly") {
        monthlyAmount = rt.amount * 4; // 4 weeks in a month
      } else if (rt.frequency === "biweekly") {
        monthlyAmount = rt.amount * 2; // 2 bi-weekly periods in a month
      }
      return sum + monthlyAmount;
    }, 0);

    const recurringMonthlyExpenses = activeRecurringExpenses.reduce(
      (sum, rt) => {
        let monthlyAmount = rt.amount;
        if (rt.frequency === "weekly") {
          monthlyAmount = rt.amount * 4; // 4 weeks in a month
        } else if (rt.frequency === "biweekly") {
          monthlyAmount = rt.amount * 2; // 2 bi-weekly periods in a month
        }
        return sum + monthlyAmount;
      },
      0
    );

    // Total monthly amounts including recurring
    const monthlyIncome = actualMonthlyIncome + recurringMonthlyIncome;
    const monthlyExpenses = actualMonthlyExpenses + recurringMonthlyExpenses;
    const netIncome = monthlyIncome - monthlyExpenses;

    // Debug logging to verify calculations

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

    // Calculate monthly savings and debt payoff amounts
    const monthlySavingsAmount = (monthlyIncome * savingsRate) / 100;
    const monthlyDebtPayoffAmount = (monthlyIncome * debtPayoffRate) / 100;

    // Calculate total monthly goal contributions
    const totalMonthlyGoalContributions = goals.reduce(
      (sum, goal) => sum + goal.monthlyContribution,
      0
    );

    // Get recurring expenses - only those active during the selected month
    const recurringExpenses = recurringTransactions.filter((t) => {
      if (t.type !== "expense" || !t.isActive) return false;

      // Check if the recurring transaction was active during the selected month
      const startDate = t.startDate ? new Date(t.startDate) : null;
      const endDate = t.endDate ? new Date(t.endDate) : null;

      // If no start date, assume it was always active (backward compatibility)
      if (!startDate) return true;

      // Check if the selected month is after or on the start date
      const selectedMonthStart = new Date(targetYear, targetMonthNum, 1);
      const selectedMonthEnd = new Date(targetYear, targetMonthNum + 1, 0); // Last day of month

      // Transaction must have started by the end of the selected month
      if (startDate > selectedMonthEnd) return false;

      // If there's an end date, transaction must not have ended before the start of the selected month
      if (endDate && endDate < selectedMonthStart) return false;

      return true;
    });

    // Get all recurring transactions for comprehensive analysis - only those active during the selected month
    const allRecurringTransactions = recurringTransactions.filter((t) => {
      if (!t.isActive) return false;

      // Check if the recurring transaction was active during the selected month
      const startDate = t.startDate ? new Date(t.startDate) : null;
      const endDate = t.endDate ? new Date(t.endDate) : null;

      // If no start date, assume it was always active (backward compatibility)
      if (!startDate) return true;

      // Check if the selected month is after or on the start date
      const selectedMonthStart = new Date(targetYear, targetMonthNum, 1);
      const selectedMonthEnd = new Date(targetYear, targetMonthNum + 1, 0); // Last day of month

      // Transaction must have started by the end of the selected month
      if (startDate > selectedMonthEnd) return false;

      // If there's an end date, transaction must not have ended before the start of the selected month
      if (endDate && endDate < selectedMonthStart) return false;

      return true;
    });

    // Calculate budget categories with spending analysis - only if budget-related question
    const shouldIncludeBudgetCategories = userQuestion
      ? isBudgetRelatedQuestion(userQuestion)
      : false;
    const budgetCategoriesWithSpending = shouldIncludeBudgetCategories
      ? budgetCategories.map((category) => {
          // Calculate actual spending for this category in the selected month
          const categoryTransactions = monthlyTransactions.filter((t) => {
            return t.category === category.name && t.type === "expense";
          });

          const actualSpending = categoryTransactions.reduce(
            (sum, t) => sum + t.amount,
            0
          );
          const remaining = Math.max(0, category.monthlyLimit - actualSpending);
          const isOverBudget = actualSpending > category.monthlyLimit;
          const percentageUsed =
            category.monthlyLimit > 0
              ? (actualSpending / category.monthlyLimit) * 100
              : 0;

          return {
            ...category,
            actualSpending,
            remaining,
            isOverBudget,
            percentageUsed: Math.round(percentageUsed),
            transactionCount: categoryTransactions.length,
          };
        })
      : [];

    return {
      monthlyIncome,
      monthlyExpenses,
      netIncome,
      savingsRate,
      debtPayoffRate,
      monthlySavingsAmount,
      monthlyDebtPayoffAmount,
      totalMonthlyGoalContributions,
      totalDebt,
      totalAssets,
      totalSavings,
      netWorth,
      goals,
      recurringExpenses,
      assets,
      debts,
      transactions: monthlyTransactions, // Only selected month transactions
      allTransactions: transactions, // Keep all transactions for reference
      recurringTransactions: allRecurringTransactions,
      budgetCategories: budgetCategoriesWithSpending,
    };
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Rate limiting: prevent requests faster than 2 seconds apart
    const now = Date.now();
    if (now - lastRequestTime < 2000) {
      Alert.alert(
        "Please wait",
        "You're sending messages too quickly. Please wait a moment."
      );
      return;
    }
    setLastRequestTime(now);

    // Check AI usage limits
    if (user?.uid) {
      const isPremium = hasPremiumAccess();
      const usageCheck = await aiUsageTracker.checkAIUsage(user.uid, isPremium);

      if (!usageCheck.canUse) {
        Alert.alert(
          "AI Usage Limit Reached",
          `You've used all ${usageCheck.limit} AI questions for this period. Go to Settings to upgrade to premium for unlimited AI access!`
        );
        return;
      }
    }

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
      const snapshot = generateFinancialSnapshot(userMessage.text);

      // Check if user is requesting a financial plan
      const isPlanRequest = aiFinancialAdvisorService.isPlanRequest(
        userMessage.text
      );

      // Update the plan request state
      setIsPlanRequest(isPlanRequest);

      // Check cache for common questions (cache for 1 hour) - user-specific
      const cacheKey = `${user?.uid || "anonymous"}_${userMessage.text
        .toLowerCase()
        .trim()}_${snapshot.netIncome}_${snapshot.monthlySavingsAmount}_${
        snapshot.totalMonthlyGoalContributions
      }`;
      const cachedResponse = responseCache[cacheKey];
      const cacheAge = Date.now() - (cachedResponse?.timestamp || 0);
      const isCacheValid = cachedResponse && cacheAge < 3600000; // 1 hour

      let aiResponse;

      // Convert messages to conversation history format for AI context
      const conversationHistory = messages
        .filter((msg) => !msg.isLoading) // Exclude loading messages
        .map((msg) => ({
          role: msg.isUser ? "user" : "assistant",
          content: msg.text,
        }))
        .slice(-5); // Keep last 5 messages for context

      // Check for local responses first (no API call needed)
      const localResponse = getLocalResponse(userMessage.text);
      if (localResponse) {
        // Using local response (no API call)
        aiResponse = localResponse.response;
      } else if (isCacheValid && !isPlanRequest) {
        // Using cached response
        aiResponse = cachedResponse.response;
      } else if (isPlanRequest && user) {
        // Generate a comprehensive financial plan
        try {
          // Create a simple plan name
          const planName = `Financial Plan - ${new Date().toLocaleDateString()}`;

          // Generate the base plan data (for CSV generation)
          const plan = financialPlanGenerator.generateFinancialPlan(
            snapshot,
            planName,
            user.uid
          );

          // Let the AI generate a comprehensive plan response
          const planPrompt = `Create a comprehensive financial plan for: "${userMessage.text}"

You can structure this as a natural conversation or use a clear format - whatever feels most appropriate for their request. If using a format, make it feel conversational and engaging rather than rigid.

Key elements to include (but present them naturally):
• Current financial snapshot using their actual data
• Clear goal definition based on their request
• Actionable steps with specific amounts and timelines
• Different options or approaches they could take
• Specific recommendations tailored to their situation
• Encouraging, supportive tone throughout

Requirements:
• Use their actual financial data from the snapshot
• Provide specific dollar amounts and percentages when relevant
• Include realistic timelines
• Give multiple options when applicable
• Use friendly, encouraging tone with emojis
• Make it actionable and specific to their situation
• Feel free to be conversational and natural - don't force a rigid format unless it helps clarity`;

          // Use optimized prompt for plan generation
          const optimizedPlanPrompt = generateOptimizedPrompt(planPrompt);
          aiResponse = await aiFinancialAdvisorService.generateAIResponse(
            optimizedPlanPrompt,
            snapshot,
            userPreferences,
            conversationHistory,
            targetMonth
          );
          aiResponse += `\n\n💾 Would you like to save this plan to your account?`;
        } catch (planError) {
          console.error("Error creating financial plan:", planError);
          aiResponse = await aiFinancialAdvisorService.generateAIResponse(
            userMessage.text,
            snapshot,
            userPreferences,
            conversationHistory,
            targetMonth
          );
        }
      } else {
        // Generate optimized prompt based on user preferences
        const optimizedPrompt = generateOptimizedPrompt(userMessage.text);

        // Regular AI response with optimized prompt
        aiResponse = await aiFinancialAdvisorService.generateAIResponse(
          optimizedPrompt,
          snapshot,
          userPreferences,
          conversationHistory,
          targetMonth
        );

        // Clean up markdown formatting from AI responses
        aiResponse = aiResponse
          .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold formatting
          .replace(/### (.*?)\n/g, "$1\n\n") // Convert headers to plain text
          .replace(/## (.*?)\n/g, "$1\n\n") // Convert sub-headers to plain text
          .replace(/# (.*?)\n/g, "$1\n\n") // Convert main headers to plain text
          .replace(/\*\*(.*?)\*\*/g, "$1"); // Remove any remaining bold formatting
      }

      // Cache the response for future use (only for non-plan requests)
      if (!isPlanRequest && aiResponse) {
        setResponseCache((prev) => ({
          ...prev,
          [cacheKey]: { response: aiResponse, timestamp: Date.now() },
        }));
      }

      // Detect percentage suggestions in the AI response
      const suggestions = detectPercentageSuggestions(aiResponse);

      const updatedMessages = newMessages.map((msg) =>
        msg.isLoading
          ? {
              ...msg,
              text: aiResponse,
              isLoading: false,
              budgetSuggestions:
                suggestions.savingsPercentage ||
                suggestions.debtPayoffPercentage
                  ? suggestions
                  : undefined,
            }
          : msg
      );
      setMessages(updatedMessages);
      saveChatHistory(updatedMessages);

      // Record AI usage if not a local response
      if (user?.uid && !localResponse) {
        await aiUsageTracker.recordAIUsage(user.uid);
      }
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

  // Load chat history and feedback states on component mount
  useEffect(() => {
    loadChatHistory();
    loadFeedbackStates();
    loadBudgetCategories();
  }, []);

  // Load feedback states from AsyncStorage
  const loadFeedbackStates = async () => {
    try {
      const userId = user?.uid || "anonymous";
      const feedbackKey = `vectra_feedback_data_${userId}`;
      const savedFeedback = await AsyncStorage.getItem(feedbackKey);

      if (savedFeedback) {
        const feedbackArray = JSON.parse(savedFeedback);
        const feedbackStatesMap: {
          [messageId: string]: { liked?: boolean; disliked?: boolean };
        } = {};

        feedbackArray.forEach((feedback: any) => {
          if (feedback.feedback === "like") {
            feedbackStatesMap[feedback.messageId] = {
              liked: true,
              disliked: false,
            };
          } else if (feedback.feedback === "dislike") {
            feedbackStatesMap[feedback.messageId] = {
              liked: false,
              disliked: true,
            };
          }
        });

        setFeedbackStates(feedbackStatesMap);
      }
    } catch (error) {
      console.error("Error loading feedback states:", error);
    }
  };

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

  // Detect percentage suggestions in AI responses
  const detectPercentageSuggestions = (
    text: string
  ): {
    savingsPercentage?: number;
    debtPayoffPercentage?: number;
  } => {
    const suggestions: {
      savingsPercentage?: number;
      debtPayoffPercentage?: number;
    } = {};

    // Get current financial snapshot for calculations
    const snapshot = generateFinancialSnapshot();
    const netIncome = snapshot.netIncome;

    // Look for savings percentage suggestions (more comprehensive patterns)
    // Prioritize actionable recommendations over general mentions
    const savingsPatterns = [
      // High priority - direct recommendations
      /(?:aim\s+for|target|goal\s+of|consider\s+aiming\s+for)\s+(\d+)%/gi,
      /(?:recommend|suggest|try)\s+(?:a\s+)?(\d+)%\s+(?:savings|of\s+your\s+income)/gi,
      /(?:set\s+a\s+target\s+savings\s+rate|target\s+savings\s+rate)\s*(?:of\s+)?(\d+)%/gi,
      /(?:increase\s+savings\s+to|savings\s+rate\s+of|save\s+)(\d+)%/gi,
      // Medium priority - allocation suggestions
      /(?:allocate|put|set)\s+(\d+)%\s+(?:to\s+)?savings/gi,
      /(\d+)%\s+(?:of\s+)?(?:your\s+)?income\s+(?:to\s+)?savings/gi,
      // Lower priority - general mentions
      /savings\s+(?:rate\s+)?(?:of\s+)?(\d+)%/gi,
      /(\d+)%\s+savings\s+rate/gi,
      /save\s+(\d+)%\s+(?:of\s+)?(?:your\s+)?income/gi,
    ];

    // Track all matches to find the highest priority recommendation
    let bestSavingsMatch = null;
    let bestSavingsPriority = -1;

    for (let i = 0; i < savingsPatterns.length; i++) {
      const pattern = savingsPatterns[i];
      const matches = text.match(pattern);
      if (matches) {
        const percentage = parseInt(matches[0].match(/\d+/)?.[0] || "20");
        if (percentage > 0 && percentage <= 100) {
          // Higher priority for earlier patterns (lower index)
          const priority = savingsPatterns.length - i;
          if (priority > bestSavingsPriority) {
            bestSavingsMatch = percentage;
            bestSavingsPriority = priority;
            // New best savings match
          }
        }
      }
    }

    if (bestSavingsMatch) {
      suggestions.savingsPercentage = bestSavingsMatch;
    }

    // Look for debt payoff percentage suggestions (more comprehensive patterns)
    // Prioritize actionable recommendations over general mentions
    const debtPatterns = [
      // High priority - direct recommendations
      /(?:aim\s+for|target|goal\s+of|consider\s+aiming\s+for)\s+(\d+)%\s+(?:debt|debt\s+payoff)/gi,
      /(?:recommend|suggest|try)\s+(?:a\s+)?(\d+)%\s+(?:debt\s+payoff|to\s+debt)/gi,
      /(?:set\s+a\s+target|target)\s+(?:debt\s+payoff\s+rate|debt\s+rate)\s*(?:of\s+)?(\d+)%/gi,
      // Medium priority - allocation suggestions
      /(?:debt\s+payoff\s+of|pay\s+(\d+)%\s+of|allocate\s+(\d+)%\s+to\s+debt)/gi,
      /(?:allocate|put|set)\s+(\d+)%\s+(?:to\s+)?debt/gi,
      /(?:pay\s+off|allocate)\s+(\d+)%\s+of\s+(?:your\s+)?discretionary\s+income/gi,
      /(\d+)%\s+(?:of\s+)?(?:your\s+)?discretionary\s+income\s+(?:to\s+)?debt/gi,
      // Lower priority - general mentions
      /debt\s+payoff\s+(?:of\s+)?(\d+)%/gi,
      /(\d+)%\s+debt\s+payoff/gi,
      /pay\s+(\d+)%\s+(?:of\s+)?(?:your\s+)?income\s+(?:to\s+)?debt/gi,
    ];

    // Track all matches to find the highest priority recommendation
    let bestDebtMatch = null;
    let bestDebtPriority = -1;

    for (let i = 0; i < debtPatterns.length; i++) {
      const pattern = debtPatterns[i];
      const matches = text.match(pattern);
      if (matches) {
        const percentage = parseInt(matches[0].match(/\d+/)?.[0] || "5");
        if (percentage > 0 && percentage <= 100) {
          // Higher priority for earlier patterns (lower index)
          const priority = debtPatterns.length - i;
          if (priority > bestDebtPriority) {
            bestDebtMatch = percentage;
            bestDebtPriority = priority;
            // New best debt match
          }
        }
      }
    }

    if (bestDebtMatch) {
      suggestions.debtPayoffPercentage = bestDebtMatch;
    }

    // Look for dollar amount suggestions for debt payoff and calculate percentage
    const debtDollarPatterns = [
      /(?:pay|allocate|put|use|spend)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:toward|to|on|for)\s+(?:debt|credit\s+card|loan)/gi,
      /(?:recommend|suggest|try)\s+(?:paying|allocating)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:toward|to|on|for)\s+(?:debt|credit\s+card|loan)/gi,
      /(?:aim\s+for|target|goal\s+of)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:toward|to|on|for)\s+(?:debt|credit\s+card|loan)/gi,
      /(?:debt\s+payoff\s+of|pay\s+off)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      /(?:monthly\s+payment\s+of|monthly\s+contribution\s+of)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:toward|to|on|for)\s+(?:debt|credit\s+card|loan)/gi,
    ];

    for (const pattern of debtDollarPatterns) {
      const matches = text.match(pattern);
      if (matches && netIncome > 0) {
        const dollarAmount = parseFloat(matches[0].replace(/[$,]/g, ""));
        if (dollarAmount > 0 && dollarAmount <= netIncome) {
          const calculatedPercentage = Math.round(
            (dollarAmount / netIncome) * 100
          );
          if (calculatedPercentage >= 1 && calculatedPercentage <= 50) {
            suggestions.debtPayoffPercentage = calculatedPercentage;
            // Debt dollar amount detected
            break;
          }
        }
      }
    }

    // Look for dollar amount suggestions for savings and calculate percentage
    const savingsDollarPatterns = [
      /(?:save|allocate|put|set\s+aside)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:to|for|toward)\s+(?:savings|emergency\s+fund|investment)/gi,
      /(?:recommend|suggest|try)\s+(?:saving|allocating)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:to|for|toward)\s+(?:savings|emergency\s+fund|investment)/gi,
      /(?:aim\s+for|target|goal\s+of)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:to|for|toward)\s+(?:savings|emergency\s+fund|investment)/gi,
      /(?:monthly\s+savings\s+of|monthly\s+contribution\s+of)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:to|for|toward)\s+(?:savings|emergency\s+fund|investment)/gi,
      /(?:emergency\s+fund\s+contribution\s+of|investment\s+contribution\s+of)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    ];

    for (const pattern of savingsDollarPatterns) {
      const matches = text.match(pattern);
      if (matches && netIncome > 0) {
        const dollarAmount = parseFloat(matches[0].replace(/[$,]/g, ""));
        if (dollarAmount > 0 && dollarAmount <= netIncome) {
          const calculatedPercentage = Math.round(
            (dollarAmount / netIncome) * 100
          );
          if (calculatedPercentage >= 1 && calculatedPercentage <= 50) {
            suggestions.savingsPercentage = calculatedPercentage;
            break;
          }
        }
      }
    }

    // First, try to extract any percentage mentioned in the context of savings/financial advice
    const allPercentages = text.match(/(\d+)%/g);

    if (allPercentages) {
      const percentages = allPercentages.map((p) => parseInt(p));

      // If there's only one percentage and it's in a financial context, determine if it's savings or debt
      if (
        percentages.length === 1 &&
        percentages[0] >= 5 &&
        percentages[0] <= 50
      ) {
        const context = text.toLowerCase();
        if (
          context.includes("save") ||
          context.includes("savings") ||
          context.includes("income") ||
          context.includes("budget") ||
          context.includes("financial") ||
          context.includes("money")
        ) {
          // Check if it's specifically about debt payoff (not just general debt or interest rates)
          if (
            context.includes("debt payoff percentage") ||
            context.includes("payoff percentage") ||
            context.includes("pay off debt") ||
            context.includes("payoff debt") ||
            context.includes("monthly payment") ||
            context.includes("pay toward") ||
            (context.includes("allocate") && context.includes("debt")) ||
            (context.includes("put") && context.includes("debt")) ||
            (context.includes("set") && context.includes("debt")) ||
            (context.includes("use") && context.includes("debt")) ||
            (context.includes("discretionary") && context.includes("debt")) ||
            (context.includes("debt") &&
              context.includes("percentage") &&
              !context.includes("interest") &&
              !context.includes("rate"))
          ) {
            return { debtPayoffPercentage: percentages[0] };
          } else {
            return { savingsPercentage: percentages[0] };
          }
        }
      }

      // If there are multiple percentages, try to assign them based on context
      if (percentages && percentages.length === 2) {
        const context = text.toLowerCase();

        // Check if this is specifically about debt payoff recommendations
        const isDebtPayoffRecommendation =
          context.includes("debt payoff percentage") ||
          context.includes("payoff percentage") ||
          context.includes("monthly payment") ||
          context.includes("pay toward") ||
          context.includes("allocate to debt") ||
          (context.includes("debt") &&
            context.includes("percentage") &&
            !context.includes("interest") &&
            !context.includes("rate"));

        // Check if this is specifically about savings recommendations
        const isSavingsRecommendation =
          context.includes("savings percentage") ||
          context.includes("save percentage") ||
          context.includes("allocate to savings") ||
          context.includes("emergency fund") ||
          (context.includes("save") && context.includes("percentage"));

        // If both savings and debt are mentioned, be more careful about assignment
        if (isSavingsRecommendation && isDebtPayoffRecommendation) {
          // Sort percentages: higher one is likely savings, lower one is debt
          const sorted = [...percentages].sort((a, b) => b - a);
          return {
            savingsPercentage: sorted[0],
            debtPayoffPercentage: sorted[1],
          };
        }
        // If only debt payoff is mentioned, don't assign the higher percentage to savings
        if (isDebtPayoffRecommendation && !isSavingsRecommendation) {
          // Only debt payoff context detected - not assigning percentages automatically
          return suggestions; // Return existing suggestions without auto-assignment
        }
      }
    }

    // AI Response percentage suggestions detected
    return suggestions;
  };

  // Detect budget category update suggestions in AI responses
  // Helper function to find category from context
  const findCategoryFromContext = (text: string, match: string): string => {
    const matchIndex = text.indexOf(match);
    const lines = text.substring(0, matchIndex).split("\n");
    const lastFewLines = lines.slice(-3).join(" ").toLowerCase();

    console.log("🔍 Budget Detection - Context lines:", lastFewLines);

    // Look for category names in the context
    const categoryKeywords = [
      "food",
      "groceries",
      "dining",
      "meals",
      "transportation",
      "transport",
      "gas",
      "fuel",
      "car",
      "entertainment",
      "fun",
      "leisure",
      "rent",
      "housing",
      "mortgage",
      "utilities",
      "electric",
      "water",
      "internet",
      "phone",
      "health",
      "healthcare",
      "medical",
      "shopping",
      "clothes",
      "clothing",
      "insurance",
      "subscriptions",
      "business",
      "work",
      "savings",
      "emergency",
    ];

    for (const keyword of categoryKeywords) {
      if (lastFewLines.includes(keyword)) {
        console.log("🔍 Budget Detection - Found keyword in context:", keyword);
        return keyword;
      }
    }

    console.log("🔍 Budget Detection - No keyword found in context");
    return "unknown";
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

    return `
You are Vectra, a friendly and knowledgeable AI financial advisor. Respond naturally and conversationally to the user's question.

${styleInstructions[userPreferences.preferredStyle]}
${toneInstructions[userPreferences.preferredTone]}
${focusInstructions[userPreferences.preferredFocus]}

IMPORTANT: 
- Respond naturally as if having a real conversation
- Don't use rigid templates or formats unless specifically requested
- Be encouraging and supportive
- Use the user's actual financial data when relevant
- Keep responses conversational and engaging

User Preferences: ${userPreferences.preferredStyle} style, ${
      userPreferences.preferredTone
    } tone, ${userPreferences.preferredFocus} focus.

Original Request: ${basePrompt}
`;
  };

  // Handle feedback button interactions
  const handleFeedback = async (
    messageId: string,
    type: "like" | "dislike"
  ) => {
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

      // Send feedback to backend AI
      try {
        await sendBackendAIFeedback(messageId, type, userPreferences);
        // Feedback sent to backend AI
      } catch (error) {
        console.error("❌ Failed to send feedback to backend:", error);
      }

      // Debug logging
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

  // Handle saving plan from AI message
  const handleSavePlanFromMessage = async (messageText: string) => {
    try {
      // Create a plan name based on the message content
      let planName = `AI Generated Plan - ${new Date().toLocaleDateString()}`;

      // Try to extract a more specific name from the message
      if (messageText.includes("Budget")) {
        planName = `Budget Plan - ${new Date().toLocaleDateString()}`;
      } else if (messageText.includes("Debt")) {
        planName = `Debt Payoff Plan - ${new Date().toLocaleDateString()}`;
      } else if (
        messageText.includes("Savings") ||
        messageText.includes("Emergency")
      ) {
        planName = `Savings Plan - ${new Date().toLocaleDateString()}`;
      } else if (
        messageText.includes("Investment") ||
        messageText.includes("Retirement")
      ) {
        planName = `Investment Plan - ${new Date().toLocaleDateString()}`;
      } else if (messageText.includes("Goal")) {
        planName = `Goal Achievement Plan - ${new Date().toLocaleDateString()}`;
      }

      // Generate CSV data from the AI response
      const csvData = generateCSVFromAIMessage(messageText, planName);

      // Generate the actual financial plan data using the current snapshot
      const snapshot = generateFinancialSnapshot();
      const actualPlan = financialPlanGenerator.generateFinancialPlan(
        snapshot,
        planName,
        user?.uid || "anonymous"
      );

      // Create a plan object with real data
      const plan = {
        userId: user?.uid || "anonymous",
        name: planName,
        description: `Plan generated from AI response on ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        planData: actualPlan.planData, // Use the real plan data
        csvData: csvData,
      };

      // Save the plan
      await saveFinancialPlan(plan);

      // Reset plan request state
      setIsPlanRequest(false);

      Alert.alert("Success", "Plan saved to your account!");
    } catch (error) {
      console.error("Error saving plan from message:", error);
      Alert.alert("Error", "Failed to save plan. Please try again.");
    }
  };

  // Generate CSV from AI message with improved parsing
  const generateCSVFromAIMessage = (
    messageText: string,
    planName: string
  ): string => {
    const csvRows = [];

    // Header
    csvRows.push(`"${planName} - Generated by VectorFi AI"`);
    csvRows.push(`"Generated on: ${new Date().toLocaleDateString()}"`);
    csvRows.push("");

    // Extract structured plan data from the AI message
    const lines = messageText.split("\n");
    let currentSection = "";
    let currentData: { [key: string]: string } = {};

    csvRows.push('"Financial Plan Summary"');
    csvRows.push('"Section","Item","Value","Details"');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Detect main sections (numbered sections)
      if (trimmedLine.match(/^\d+\.\s+/)) {
        currentSection = trimmedLine.replace(/^\d+\.\s+/, "").trim();
        continue;
      }

      // Detect subsection headers (with emojis or bold text)
      if (
        (trimmedLine.match(/^[🎯📊📅💰🛡️🚗🚀💳]/) &&
          trimmedLine.includes(":")) ||
        (trimmedLine.includes(":") &&
          (trimmedLine.includes("Plan") ||
            trimmedLine.includes("Steps") ||
            trimmedLine.includes("Options") ||
            trimmedLine.includes("Recommendations")))
      ) {
        const subsection = trimmedLine
          .replace(/^[🎯📊📅💰🛡️🚗🚀💳]\s*/, "")
          .replace(":", "")
          .trim();
        currentSection = subsection;
        continue;
      }

      // Extract financial data (lines with dollar amounts or percentages)
      if (trimmedLine.includes("$") || trimmedLine.includes("%")) {
        // Improved regex to handle various formats
        const match = trimmedLine.match(
          /^[•\-\s]*([^:]+):\s*([^$%]+[$%][^$%]*)/i
        );
        if (match) {
          const item = match[1].trim();
          const value = match[2].trim();
          csvRows.push(`"${currentSection}","${item}","${value}",""`);
        }
      }

      // Extract action steps (bullet points in Step-by-Step Action Plan)
      if (
        trimmedLine.startsWith("•") &&
        (currentSection.includes("Action") || currentSection.includes("Steps"))
      ) {
        const stepText = trimmedLine.replace(/^•\s*/, "").trim();

        // Extract timeline if present
        let timeline = "";
        const timelineMatch = stepText.match(/\(([^)]+)\)/);
        if (timelineMatch) {
          timeline = timelineMatch[1];
        }

        // Clean up the step text
        const cleanStep = stepText.replace(/\s*\([^)]*\)\s*/, "").trim();

        csvRows.push(
          `"${currentSection}","Action Step","${cleanStep}","${timeline}"`
        );
      }

      // Extract options (in Options / Trade-Offs section)
      if (trimmedLine.startsWith("•") && currentSection.includes("Options")) {
        const optionText = trimmedLine.replace(/^•\s*/, "").trim();
        csvRows.push(`"${currentSection}","Option","${optionText}",""`);
      }

      // Extract recommendations (in Recommendations section)
      if (
        trimmedLine.startsWith("•") &&
        currentSection.includes("Recommendations")
      ) {
        const recText = trimmedLine.replace(/^•\s*/, "").trim();
        csvRows.push(`"${currentSection}","Recommendation","${recText}",""`);
      }

      // Extract pros/cons from options
      if (trimmedLine.includes("Pros:") || trimmedLine.includes("Cons:")) {
        const type = trimmedLine.includes("Pros:") ? "Pros" : "Cons";
        const content = trimmedLine.replace(/^(Pros|Cons):\s*/, "").trim();
        csvRows.push(`"${currentSection}","${type}","${content}",""`);
      }
    }

    return csvRows.join("\n");
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
              marginRight: 20,
              padding: 4,
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
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
                              {/* Save Plan Button - only show if this is a plan response */}
                              {isPlanRequest && (
                                <TouchableOpacity
                                  onPress={() =>
                                    handleSavePlanFromMessage(message.text)
                                  }
                                  style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    backgroundColor: colors.surface,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    marginLeft: "auto",
                                    shadowColor: colors.text,
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 2,
                                    elevation: 2,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      color: colors.text,
                                      fontWeight: "600",
                                    }}
                                  >
                                    💾 Save Plan
                                  </Text>
                                </TouchableOpacity>
                              )}
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
