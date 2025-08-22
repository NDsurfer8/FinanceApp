/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onCall } = require("firebase-functions/v2/https");
const functions = require("firebase-functions");

// Load environment variables
require("dotenv").config();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// Plaid API Functions
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");

// OpenAI API Functions
const OpenAI = require("openai");

// Initialize Plaid client
const configuration = new Configuration({
  basePath:
    PlaidEnvironments[process.env.PLAID_ENV] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID":
        process.env.PLAID_CLIENT_ID || "68a1a7b7c483650023cffde6",
      "PLAID-SECRET":
        process.env.PLAID_SECRET || "7a951d0a678269f8605176340bf071",
      "Plaid-Version": "2020-09-14",
    },
  },
});

const plaidClient = new PlaidApi(configuration);

// Initialize OpenAI client (lazy initialization)
let openai = null;
function getOpenAIClient() {
  if (!openai) {
    // Debug: Log all environment variables
    console.log(
      "Available environment variables:",
      Object.keys(process.env).filter((key) =>
        key.toLowerCase().includes("openai")
      )
    );
    console.log("OPENAI_API_KEY:", !!process.env.OPENAI_API_KEY);
    console.log("openai_api_key:", !!process.env.openai_api_key);

    // Use environment variable for Firebase Functions v2
    let apiKey = process.env.OPENAI_API_KEY || process.env.openai_api_key;

    // Check if API key is available
    if (!apiKey) {
      console.error("OpenAI API key not configured");
      throw new Error(
        "OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable."
      );
    }

    console.log("OpenAI API Key available:", !!apiKey);

    openai = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openai;
}

// Create link token
exports.createLinkToken = onCall(async (data, context) => {
  console.log("Function called with data:", data);
  console.log("Function called with context:", context);

  // For testing purposes, use a default user ID if authentication is not available
  let userId = "test_user";
  if (context && context.auth) {
    userId = context.auth.uid;
    console.log("Using authenticated user ID:", userId);
  } else {
    console.log("No authentication context, using test user ID:", userId);
  }

  try {
    console.log("Creating link token for user:", userId);
    console.log("Plaid configuration:", {
      clientId: configuration.baseOptions.headers["PLAID-CLIENT-ID"],
      secret: configuration.baseOptions.headers["PLAID-SECRET"]
        ? "***"
        : "NOT SET",
    });

    const request = {
      user: { client_user_id: userId },
      client_name: "VectorFi Finance App",
      products: ["transactions", "auth", "identity"],
      country_codes: ["US"],
      language: "en",
    };

    console.log("Plaid request:", request);
    const createTokenResponse = await plaidClient.linkTokenCreate(request);

    return {
      linkToken: createTokenResponse.data.link_token,
      expiration: createTokenResponse.data.expiration,
    };
  } catch (error) {
    console.error("Error creating link token:", error);
    console.error("Error details:", error.response?.data || error.message);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    throw new functions.https.HttpsError(
      "internal",
      `Failed to create link token: ${error.message}`
    );
  }
});

// Exchange public token for access token
exports.exchangePublicToken = onCall(async (data, context) => {
  try {
    console.log("=== EXCHANGE PUBLIC TOKEN FUNCTION CALLED ===");
    console.log("Data type:", typeof data);
    console.log("Data is null:", data === null);
    console.log("Data is undefined:", data === undefined);

    // Handle Firebase Functions v2 data structure
    let actualData = data;
    if (data && data.data) {
      console.log("Found nested data structure, extracting from data.data");
      actualData = data.data;
    }

    console.log("Actual data keys:", Object.keys(actualData || {}));
    console.log("Public token in actual data:", actualData?.publicToken);

    // Check if actualData has the expected structure
    if (actualData && typeof actualData === "object") {
      console.log(
        "Actual data has publicToken property:",
        "publicToken" in actualData
      );
      console.log("Public token value:", actualData.publicToken);
      console.log("All actual data properties:", Object.keys(actualData));

      // Try to find publicToken in different possible locations
      const publicToken =
        actualData.publicToken || actualData.public_token || actualData.token;
      if (publicToken) {
        console.log("Found public token:", publicToken);
        actualData.publicToken = publicToken; // Normalize to publicToken
      }
    }

    console.log("Context auth:", context?.auth?.uid);

    // Exchange public token for access token using Plaid API
    if (actualData && actualData.publicToken) {
      console.log("Public token received:", actualData.publicToken);

      // Handle test token for simulation
      if (actualData.publicToken === "test_public_token") {
        console.log("Detected test token, returning mock data");
        return {
          accessToken: "test_access_token_12345",
          itemId: "test_item_id_67890",
        };
      }

      try {
        const exchangeResponse = await plaidClient.itemPublicTokenExchange({
          public_token: actualData.publicToken,
        });

        console.log("Plaid exchange response:", {
          accessToken: exchangeResponse.data.access_token ? "***" : "NOT SET",
          itemId: exchangeResponse.data.item_id,
        });

        return {
          accessToken: exchangeResponse.data.access_token,
          itemId: exchangeResponse.data.item_id,
        };
      } catch (plaidError) {
        console.error("Plaid API error:", plaidError);
        throw new functions.https.HttpsError(
          "internal",
          `Failed to exchange public token: ${plaidError.message}`
        );
      }
    } else {
      console.log("No public token in data");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Public token is required"
      );
    }
  } catch (error) {
    console.error("=== EXCHANGE PUBLIC TOKEN ERROR ===");
    console.error("Error:", error.message);
    throw error;
  }
});

// Get accounts
exports.getAccounts = onCall(async (data, context) => {
  console.log("getAccounts called with data:", data);
  console.log("getAccounts called with context:", context);

  // For testing purposes, allow without authentication
  if (!context || !context.auth) {
    console.log("No authentication context, proceeding with test mode");
  }

  // Handle Firebase Functions v2 data structure
  let actualData = data;
  if (data && data.data) {
    console.log("Found nested data structure, extracting from data.data");
    actualData = data.data;
  }

  console.log("Actual data keys:", Object.keys(actualData || {}));
  const { accessToken } = actualData;

  if (!accessToken) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Access token is required"
    );
  }

  // Handle test token for simulation
  if (accessToken === "test_access_token_12345") {
    console.log("Detected test access token, returning mock accounts");
    return {
      accounts: [
        {
          id: "test_account_1",
          name: "Test Checking Account",
          mask: "1234",
          type: "depository",
          subtype: "checking",
          balances: {
            available: 5000,
            current: 5000,
          },
        },
        {
          id: "test_account_2",
          name: "Test Savings Account",
          mask: "5678",
          type: "depository",
          subtype: "savings",
          balances: {
            available: 15000,
            current: 15000,
          },
        },
      ],
    };
  }

  try {
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    return {
      accounts: accountsResponse.data.accounts,
    };
  } catch (error) {
    console.error("Error getting accounts:", error);
    throw new functions.https.HttpsError("internal", "Failed to get accounts");
  }
});

// Get transactions
exports.getTransactions = onCall(async (data, context) => {
  console.log("=== GET TRANSACTIONS FUNCTION CALLED ===");
  console.log("Data:", data);
  console.log("Context:", context);
  console.log("Context auth:", context?.auth?.uid);

  // Verify user is authenticated - handle both v1 and v2 function formats
  if (!context || !context.auth) {
    console.log("No authentication context, proceeding with test mode");
    // For now, allow the function to proceed without auth for debugging
  }

  // Handle Firebase Functions v2 data structure
  let actualData = data;
  if (data && data.data) {
    console.log("Found nested data structure, extracting from data.data");
    actualData = data.data;
  }

  console.log("Actual data keys:", Object.keys(actualData || {}));
  const { accessToken, startDate, endDate } = actualData;

  if (!accessToken || !startDate || !endDate) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Access token, start date, and end date are required"
    );
  }

  console.log("Calling Plaid API with:", {
    accessToken: accessToken.substring(0, 20) + "...",
    startDate,
    endDate,
  });

  try {
    const transactionsResponse = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    });

    console.log("Plaid API response:", {
      transactionsCount: transactionsResponse.data.transactions?.length || 0,
      totalTransactions: transactionsResponse.data.total_transactions,
    });

    return {
      transactions: transactionsResponse.data.transactions,
      total_transactions: transactionsResponse.data.total_transactions,
    };
  } catch (error) {
    console.error("Error getting transactions:", error);
    console.error("Error details:", error.response?.data || error.message);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to get transactions"
    );
  }
});

// AI Financial Advisor Functions

// Core system prompt components
const SYSTEM_PROMPT_CORE = `You are Vectra, a friendly and laidback professional AI Financial Advisor for the VectorFi app. You help users with budgeting, goal setting, debt management, investing advice, and financial planning.

Your style:
- Use bullet points and emojis like ChatGPT
- Be friendly and laidback professional
- Provide actionable, practical advice
- Keep responses concise but helpful
- Use plain text (no markdown headers like ### or **bold**)

Always be encouraging and supportive while giving practical financial guidance.`;

const APP_FEATURES_DOC = `VectorFi App Features & Navigation:

📱 Main Screens:
- Dashboard: Overview of finances, quick actions
- Transactions: Add/edit transactions, view history
- Assets & Debts: Track assets, debts, net worth
- Goals: Set and track financial goals
- AI Advisor: Chat with me for financial advice
- Settings: App settings, profile, subscription

💡 Key Features:
- Transaction tracking with categories
- Asset and debt management
- Goal setting and progress tracking
- Shared finance groups
- AI financial advisor (me!)
- Dark/light mode
- Bank account integration (Plaid)

🔧 How to Navigate:
- Bottom tabs for main sections
- Settings → App Settings for preferences
- AI Advisor → Ask me anything about finances
- Goals → Create new financial goals
- Assets & Debts → Add assets or debts

I can help you find any feature or explain how to use the app!`;

const FIN_PLAN_RULES = `When generating financial plans, follow this exact 6-section structure:

1. Snapshot of Current Finances
- Monthly income, expenses, net savings
- Current savings, debts, assets

2. Goal Definition
- Clear goal statement with timeline

3. Step-by-Step Action Plan
- Specific monthly actions
- Prioritized steps (debt first, then savings)
- Include side hustle opportunities

4. Options / Trade-Offs
- 3 realistic options with pros/cons
- Different timelines or approaches

5. Recommendations
- 3-4 specific actionable recommendations
- Focus on high-impact actions

6. Encouragement
- Motivational closing message
- Positive reinforcement

Use bullet points and emojis, no markdown headers.`;

// Helper function to build system prompt
function buildSystemPrompt(
  userQuestion,
  isPlanRequest = false,
  userPreferences = {}
) {
  let systemPrompt = SYSTEM_PROMPT_CORE;

  // Add user preferences
  if (userPreferences.preferredStyle === "concise") {
    systemPrompt += " Keep responses brief and to the point.";
  } else if (userPreferences.preferredStyle === "detailed") {
    systemPrompt += " Provide detailed explanations and examples.";
  }

  if (userPreferences.preferredTone === "professional") {
    systemPrompt += " Maintain a professional tone.";
  } else if (userPreferences.preferredTone === "casual") {
    systemPrompt += " Use a casual, friendly tone.";
  }

  // Add app features doc if user asks about app
  const appKeywords = [
    "app",
    "feature",
    "screen",
    "navigate",
    "find",
    "where",
    "how to",
  ];
  const isAppQuestion = appKeywords.some((keyword) =>
    userQuestion.toLowerCase().includes(keyword)
  );

  if (isAppQuestion) {
    systemPrompt += "\n\n" + APP_FEATURES_DOC;
  }

  // Add financial plan rules if it's a plan request
  if (isPlanRequest) {
    systemPrompt += "\n\n" + FIN_PLAN_RULES;
  }

  return systemPrompt;
}

// Helper function to detect plan requests
function isPlanRequest(userQuestion) {
  const planKeywords = ["generate", "create", "make", "plan", "strategy"];
  return planKeywords.some((keyword) =>
    userQuestion.toLowerCase().includes(keyword)
  );
}

// Helper function to analyze question type
function analyzeQuestionType(question) {
  const lowerQuestion = question.toLowerCase();

  if (
    lowerQuestion.includes("how much") ||
    lowerQuestion.includes("what percentage") ||
    lowerQuestion.includes("what should")
  ) {
    return "recommendation";
  }
  if (
    lowerQuestion.includes("explain") ||
    lowerQuestion.includes("what is") ||
    lowerQuestion.includes("how does")
  ) {
    return "educational";
  }
  if (
    lowerQuestion.includes("calculate") ||
    lowerQuestion.includes("how long") ||
    lowerQuestion.includes("when will")
  ) {
    return "analytical";
  }
  if (
    lowerQuestion.includes("help") ||
    lowerQuestion.includes("advice") ||
    lowerQuestion.includes("suggest")
  ) {
    return "guidance";
  }
  if (
    lowerQuestion.includes("plan") ||
    lowerQuestion.includes("strategy") ||
    lowerQuestion.includes("approach")
  ) {
    return "planning";
  }
  if (
    lowerQuestion.includes("compare") ||
    lowerQuestion.includes("vs") ||
    lowerQuestion.includes("difference")
  ) {
    return "comparison";
  }
  if (
    lowerQuestion.includes("emergency") ||
    lowerQuestion.includes("crisis") ||
    lowerQuestion.includes("problem")
  ) {
    return "crisis";
  }

  return "general";
}

// Helper function to generate context instructions
function generateContextInstructions(questionType) {
  const instructions = {
    recommendation:
      "Provide specific, actionable recommendations with percentages or dollar amounts when relevant.",
    educational:
      "Explain concepts in simple, relatable terms using analogies when helpful.",
    analytical:
      "Provide clear calculations and breakdowns using the user's actual financial data.",
    guidance:
      "Offer supportive, non-judgmental advice with step-by-step guidance.",
    planning:
      "Create realistic, achievable plans broken down into manageable steps.",
    comparison:
      "Present balanced comparisons highlighting pros and cons of each option.",
    crisis:
      "Be calm and reassuring with immediate, actionable steps for stability.",
    general:
      "Respond naturally and conversationally using the user's financial data when relevant.",
  };

  return instructions[questionType] || instructions.general;
}

// Helper function to calculate cost
function calculateCost(usage) {
  const costPer1kTokens = 0.00015; // gpt-4o-mini pricing
  return (usage.total_tokens / 1000) * costPer1kTokens;
}

// AI Chat endpoint
exports.aiChat = onCall(async (data, context) => {
  console.log("=== AI CHAT FUNCTION CALLED ===");

  // Handle authentication - allow unauthenticated users for testing
  let userId = "anonymous";
  if (context && context.auth) {
    userId = context.auth.uid;
    console.log("Authenticated user:", userId);
  } else {
    console.log("No authentication context, using anonymous user");
  }
  // Handle different data structures (Firebase Functions v1 vs v2)
  let actualData = data;
  if (data && data.data) {
    console.log("Found nested data structure, extracting from data.data");
    actualData = data.data;
  }

  // Log only the fields we need, not the entire data object
  console.log("Data fields received:", {
    hasMessage: !!actualData?.message,
    messageLength: actualData?.message?.length || 0,
    hasFinancialData: !!actualData?.financialData,
    hasUserPreferences: !!actualData?.userPreferences,
    userPreferencesKeys: actualData?.userPreferences
      ? Object.keys(actualData.userPreferences)
      : [],
  });

  const { message, financialData, userPreferences = {} } = actualData;

  if (!message) {
    console.error("Message is missing from data:", actualData);
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Message is required"
    );
  }

  console.log("AI Chat request:", {
    userId,
    messageLength: message.length,
    hasFinancialData: !!financialData,
    userPreferences,
  });

  try {
    // Analyze the question and detect if this is a plan request
    const questionType = analyzeQuestionType(message);
    const isPlanRequestFlag = isPlanRequest(message);
    const contextInstructions = generateContextInstructions(questionType);

    // Build system prompt with enhanced context
    const systemPrompt =
      buildSystemPrompt(message, isPlanRequestFlag, userPreferences) +
      `\n\nQuestion Type: ${questionType}\nContext Instructions: ${contextInstructions}`;

    // Build user message with financial context
    let userMessage = message;
    if (financialData) {
      userMessage = `User Financial Data:\n${JSON.stringify(
        financialData,
        null,
        2
      )}\n\nUser Question: ${message}`;
    }

    console.log("Calling OpenAI API...");
    const openaiClient = getOpenAIClient();
    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0].message.content;
    const tokensUsed = response.usage.total_tokens;
    const cost = calculateCost(response.usage);

    console.log("OpenAI response:", {
      responseLength: aiResponse.length,
      tokensUsed,
      cost: `$${cost.toFixed(4)}`,
    });

    return {
      response: aiResponse,
      tokensUsed,
      cost,
      isPlanRequest: isPlanRequestFlag,
    };
  } catch (error) {
    console.error("AI Chat error:", error);
    console.error("Error details:", error.response?.data || error.message);
    console.error("Error stack:", error.stack);

    // Check if it's an API key issue
    if (error.message && error.message.includes("API key")) {
      throw new functions.https.HttpsError(
        "internal",
        "OpenAI API key not configured properly"
      );
    }

    // Check if it's an OpenAI API issue
    if (error.response?.status) {
      throw new functions.https.HttpsError(
        "internal",
        `OpenAI API error: ${error.response.status} - ${error.message}`
      );
    }

    throw new functions.https.HttpsError(
      "internal",
      `AI request failed: ${error.message}`
    );
  }
});

// AI Feedback endpoint
exports.aiFeedback = onCall(async (data, context) => {
  console.log("=== AI FEEDBACK FUNCTION CALLED ===");

  // Handle authentication - allow unauthenticated users for testing
  let userId = "anonymous";
  if (context && context.auth) {
    userId = context.auth.uid;
    console.log("Authenticated user:", userId);
  } else {
    console.log("No authentication context, using anonymous user");
  }
  // Handle different data structures (Firebase Functions v1 vs v2)
  let actualData = data;
  if (data && data.data) {
    console.log("Found nested data structure, extracting from data.data");
    actualData = data.data;
  }

  // Log only the fields we need, not the entire data object
  console.log("Feedback data fields received:", {
    hasMessageId: !!actualData?.messageId,
    hasFeedback: !!actualData?.feedback,
    hasPreferences: !!actualData?.preferences,
    preferencesKeys: actualData?.preferences
      ? Object.keys(actualData.preferences)
      : [],
  });

  const { messageId, feedback, preferences } = actualData;

  if (!messageId || !feedback) {
    console.error("Missing required fields:", actualData);
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Message ID and feedback are required"
    );
  }

  console.log("AI Feedback:", {
    userId,
    messageId,
    feedback,
    preferences,
  });

  try {
    // Store feedback in Firestore (you'll need to add admin SDK)
    // For now, just log it
    console.log("Storing feedback in database:", {
      userId,
      messageId,
      feedback,
      preferences,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Feedback stored successfully",
    };
  } catch (error) {
    console.error("AI Feedback error:", error);
    throw new functions.https.HttpsError(
      "internal",
      `Failed to store feedback: ${error.message}`
    );
  }
});
