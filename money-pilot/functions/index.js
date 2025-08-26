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
const { defineSecret } = require("firebase-functions/params");

// Load environment variables
require("dotenv").config();

// Define secrets for Plaid
const plaidClientId = defineSecret("PLAID_CLIENT_ID");
const plaidSecret = defineSecret("PLAID_SECRET");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// Plaid API Functions
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");

// OpenAI API Functions
const OpenAI = require("openai");

// Initialize Plaid client - will be configured per function
let globalPlaidClient = null;

function getPlaidClient(clientId, secret) {
  if (!globalPlaidClient) {
    const configuration = new Configuration({
      basePath: PlaidEnvironments.production, // Use production environment
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": clientId,
          "PLAID-SECRET": secret,
          "Plaid-Version": "2020-09-14",
        },
      },
    });
    globalPlaidClient = new PlaidApi(configuration);
  }
  return globalPlaidClient;
}

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
exports.createLinkToken = onCall(
  {
    secrets: [plaidClientId, plaidSecret],
  },
  async (data, context) => {
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

      // Get Plaid client with secrets
      const client = getPlaidClient(plaidClientId.value(), plaidSecret.value());

      console.log("Plaid configuration:", {
        clientId: plaidClientId.value() ? "SET" : "NOT SET",
        secret: plaidSecret.value() ? "***" : "NOT SET",
        environment: "production",
      });

      // Validate Plaid client is available
      if (!client) {
        throw new Error("Plaid client is not initialized");
      }

      const request = {
        user: { client_user_id: userId },
        client_name: "VectorFi Finance App",
        products: ["transactions"],
        country_codes: ["US"],
        language: "en",
      };

      console.log("Plaid request:", request);
      const createTokenResponse = await client.linkTokenCreate(request);

      return {
        link_token: createTokenResponse.data.link_token,
        expiration: createTokenResponse.data.expiration,
      };
    } catch (error) {
      console.error("Error creating link token:", error);
      console.error("Error details:", error.response?.data || error.message);
      console.error("Full error object:", JSON.stringify(error, null, 2));

      // Handle Plaid API rate limit errors specifically
      if (error.response?.data?.error_code === "RATE_LIMIT") {
        console.error("Plaid API rate limit exceeded");
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "Plaid API rate limit exceeded. Please wait a moment and try again."
        );
      }

      throw new functions.https.HttpsError(
        "internal",
        `Failed to create link token: ${error.message}`
      );
    }
  }
);

// Exchange public token for access token
exports.exchangePublicToken = onCall(
  {
    secrets: [plaidClientId, plaidSecret],
  },
  async (data, context) => {
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
          const client = getPlaidClient(
            plaidClientId.value(),
            plaidSecret.value()
          );
          const exchangeResponse = await client.itemPublicTokenExchange({
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
  }
);

// Get accounts
exports.getAccounts = onCall(
  {
    secrets: [plaidClientId, plaidSecret],
  },
  async (data, context) => {
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
      const client = getPlaidClient(plaidClientId.value(), plaidSecret.value());
      const accountsResponse = await client.accountsGet({
        access_token: accessToken,
      });

      return {
        accounts: accountsResponse.data.accounts,
      };
    } catch (error) {
      console.error("Error getting accounts:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get accounts"
      );
    }
  }
);

// Get transactions
exports.getTransactions = onCall(
  {
    secrets: [plaidClientId, plaidSecret],
  },
  async (data, context) => {
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
      console.log("Getting Plaid client...");
      const client = getPlaidClient(plaidClientId.value(), plaidSecret.value());
      console.log("Plaid client obtained successfully");

      console.log("Calling Plaid transactionsGet API...");
      const transactionsResponse = await client.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
      });

      console.log("Plaid API response received:", {
        transactionsCount: transactionsResponse.data.transactions?.length || 0,
        totalTransactions: transactionsResponse.data.total_transactions,
        hasData: !!transactionsResponse.data,
      });

      return {
        transactions: transactionsResponse.data.transactions,
        total_transactions: transactionsResponse.data.total_transactions,
      };
    } catch (error) {
      console.error("Error getting transactions:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      if (error.response) {
        console.error("Error response status:", error.response.status);
        console.error("Error response data:", error.response.data);
      }

      // Preserve original error information for retry logic
      const originalError = error.response?.data?.error_code || error.message;
      throw new functions.https.HttpsError(
        "internal",
        `Failed to get transactions: ${error.message} (${originalError})`
      );
    }
  }
);

// AI Financial Advisor Functions

// Core system prompt components
const SYSTEM_PROMPT_CORE = `You are Vectra, a friendly and laidback professional AI Financial Advisor for the VectorFi app. You help users with budgeting, goal setting, debt management, investing advice, and financial planning.

Your style:
- Use bullet points and emojis like ChatGPT
- Be friendly and laidback professional
- Provide actionable, practical advice
- Keep responses concise but helpful
- Use plain text (no markdown headers like ### or **bold**)

IMPORTANT CONVERSATION RULES:
- Maintain conversation continuity - don't start responses with "Hey there!" or "Hello!" if you're continuing a conversation
- If the user asks follow-up questions or wants you to "dive deeper", continue naturally from where you left off
- Don't repeat introductions or greetings in follow-up responses
- Keep the conversation flowing naturally as if you're having a real conversation
- If you offered to "dive deeper" on a topic and they accept, go straight into the detailed explanation

Always be encouraging and supportive while giving practical financial guidance.
You also know that the user is currently on the VectorFi app and you are helping them with their financial questions and anything else they may need help with.`;

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

6. Overview
- Provide a brief overview of the financial plan and the steps they need to take to achieve their goals.


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

// Helper function to detect follow-up questions
function detectFollowUpQuestion(currentMessage, conversationHistory) {
  if (!conversationHistory || conversationHistory.length === 0) {
    return false;
  }

  const lowerMessage = currentMessage.toLowerCase();

  // Keywords that indicate follow-up questions
  const followUpKeywords = [
    "yes",
    "no",
    "sure",
    "okay",
    "ok",
    "yeah",
    "yep",
    "nope",
    "dive deeper",
    "tell me more",
    "explain",
    "how",
    "what about",
    "what else",
    "and",
    "also",
    "too",
    "as well",
    "additionally",
    "furthermore",
    "moreover",
    "besides",
    "in addition",
    "can you",
    "could you",
    "would you",
    "will you",
    "please",
    "thanks",
    "thank you",
    "thx",
  ];

  // Check if current message contains follow-up keywords
  const hasFollowUpKeywords = followUpKeywords.some((keyword) =>
    lowerMessage.includes(keyword)
  );

  // Check if message is short (likely a follow-up)
  const isShortMessage = currentMessage.length < 50;

  // Check if it's a direct response to a question (yes/no)
  const isDirectResponse = /^(yes|no|sure|okay|ok|yeah|yep|nope)$/i.test(
    currentMessage.trim()
  );

  return hasFollowUpKeywords || isShortMessage || isDirectResponse;
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

  const {
    message,
    financialData,
    userPreferences = {},
    conversationHistory = [],
  } = actualData;

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

    // Build messages array with conversation history
    const messages = [{ role: "system", content: systemPrompt }];

    // Only add conversation history for follow-up questions
    const isFollowUpQuestion = detectFollowUpQuestion(
      message,
      conversationHistory
    );

    if (
      isFollowUpQuestion &&
      conversationHistory &&
      conversationHistory.length > 0
    ) {
      const recentHistory = conversationHistory.slice(-3); // Keep last 3 messages for follow-ups
      messages.push(...recentHistory);
      console.log("Using conversation history for follow-up question");
    } else {
      console.log("No conversation history needed - new question");
    }

    // Add current user message
    messages.push({ role: "user", content: userMessage });

    const response = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
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

// Rate limiting for webhook processing
const webhookProcessingTimes = new Map();
const WEBHOOK_COOLDOWN = 10000; // 10 seconds per item_id

// Simple Plaid Webhook Handler for Production
exports.plaidWebhook = onCall(
  {
    secrets: [plaidClientId, plaidSecret],
  },
  async (data) => {
    try {
      console.log("Plaid webhook received:", data);

      // Extract webhook data from the nested structure
      const webhookData = data.data || data;
      const { webhook_type, webhook_code, item_id, error, new_accounts } =
        webhookData;

      // Rate limiting: prevent processing same item_id too frequently
      const now = Date.now();
      const lastProcessed = webhookProcessingTimes.get(item_id) || 0;

      if (now - lastProcessed < WEBHOOK_COOLDOWN) {
        console.log(
          `Rate limited: Skipping webhook for item_id ${item_id} (processed ${Math.round(
            (now - lastProcessed) / 1000
          )}s ago)`
        );
        return { success: true, rateLimited: true };
      }

      webhookProcessingTimes.set(item_id, now);

      // Log the webhook event
      console.log(
        `Processing ${webhook_type} webhook: ${webhook_code} for item: ${item_id}`
      );

      // Import Firebase Admin SDK for database operations
      const { initializeApp } = require("firebase-admin/app");
      const { getDatabase } = require("firebase-admin/database");

      // Initialize Firebase Admin if not already initialized
      if (!global.firebaseAdminInitialized) {
        initializeApp();
        global.firebaseAdminInitialized = true;
      }

      const db = getDatabase();

      // Find user by item_id (we'll need to store this mapping)
      // For now, we'll update all users with this item_id
      const usersRef = db.ref("users");
      const snapshot = await usersRef.once("value");
      const users = snapshot.val();

      let userId = null;
      if (users) {
        for (const [uid, userData] of Object.entries(users)) {
          if (userData.plaid && userData.plaid.itemId === item_id) {
            userId = uid;
            break;
          }
        }
      }

      if (!userId) {
        console.log(`No user found for item_id: ${item_id}`);
        return { success: true };
      }

      console.log(`Updating user ${userId} for webhook: ${webhook_code}`);

      // Update Firebase based on webhook type
      switch (webhook_type) {
        case "ITEM":
          await handleItemWebhook(db, userId, webhook_code, item_id, error);
          break;
        case "ACCOUNTS":
          await handleAccountsWebhook(
            db,
            userId,
            webhook_code,
            item_id,
            new_accounts
          );
          break;
        case "INCOME":
          await handleIncomeWebhook(db, userId, webhook_code);
          break;
        default:
          console.log(`Unhandled webhook type: ${webhook_type}`);
      }

      return { success: true };
    } catch (error) {
      console.error("Error processing Plaid webhook:", error);
      throw new Error("Failed to process webhook");
    }
  }
);

// Handle ITEM webhooks
async function handleItemWebhook(db, userId, webhook_code, item_id, error) {
  console.log(`Processing ITEM webhook: ${webhook_code} for user: ${userId}`);

  const userPlaidRef = db.ref(`users/${userId}/plaid`);
  const updates = {
    lastUpdated: Date.now(),
    lastWebhook: {
      type: "ITEM",
      code: webhook_code,
      timestamp: Date.now(),
    },
  };

  switch (webhook_code) {
    case "ITEM_LOGIN_REQUIRED":
      updates.status = "ITEM_LOGIN_REQUIRED";
      updates.error = error || "Bank credentials expired";
      break;
    case "ITEM_PENDING_EXPIRATION":
      updates.status = "PENDING_EXPIRATION";
      updates.expirationWarning = true;
      break;
    case "ITEM_PENDING_DISCONNECT":
      updates.status = "PENDING_DISCONNECT";
      updates.disconnectWarning = true;
      break;
    case "ITEM_LOGIN_REPAIRED":
      updates.status = "connected";
      updates.error = null;
      updates.expirationWarning = false;
      updates.disconnectWarning = false;
      break;
    default:
      console.log(`Unhandled ITEM webhook code: ${webhook_code}`);
      return;
  }

  await userPlaidRef.update(updates);
  console.log(`Updated user ${userId} plaid data for ${webhook_code}`);
}

// Handle ACCOUNTS webhooks
async function handleAccountsWebhook(
  db,
  userId,
  webhook_code,
  item_id,
  new_accounts
) {
  console.log(
    `Processing ACCOUNTS webhook: ${webhook_code} for user: ${userId}`
  );

  const userPlaidRef = db.ref(`users/${userId}/plaid`);
  const updates = {
    lastUpdated: Date.now(),
    lastWebhook: {
      type: "ACCOUNTS",
      code: webhook_code,
      timestamp: Date.now(),
    },
  };

  switch (webhook_code) {
    case "NEW_ACCOUNTS_AVAILABLE":
      updates.hasNewAccounts = true;
      updates.newAccounts = new_accounts;
      updates.newAccountsAvailableAt = Date.now();
      break;
    default:
      console.log(`Unhandled ACCOUNTS webhook code: ${webhook_code}`);
      return;
  }

  await userPlaidRef.update(updates);
  console.log(`Updated user ${userId} plaid data for ${webhook_code}`);
}

// Handle INCOME webhooks
async function handleIncomeWebhook(db, userId, webhook_code) {
  console.log(`Processing INCOME webhook: ${webhook_code} for user: ${userId}`);

  const userPlaidRef = db.ref(`users/${userId}/plaid`);
  const updates = {
    lastUpdated: Date.now(),
    lastWebhook: {
      type: "INCOME",
      code: webhook_code,
      timestamp: Date.now(),
    },
  };

  switch (webhook_code) {
    case "VERIFICATION_STATUS_PROCESSING_COMPLETE":
      updates.incomeVerificationComplete = true;
      updates.incomeVerificationCompletedAt = Date.now();
      break;
    default:
      console.log(`Unhandled INCOME webhook code: ${webhook_code}`);
      return;
  }

  await userPlaidRef.update(updates);
  console.log(`Updated user ${userId} plaid data for ${webhook_code}`);
}
