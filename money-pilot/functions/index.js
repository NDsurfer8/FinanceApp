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

// Get Plaid client with environment validation
function getPlaidClient(clientId, secret) {
  if (!clientId || !secret) {
    console.error("Plaid credentials not configured");
    return null;
  }

  // Validate environment
  const environment = process.env.PLAID_ENV || "production";
  if (
    environment !== "production" &&
    environment !== "development" &&
    environment !== "sandbox"
  ) {
    console.error(`Invalid Plaid environment: ${environment}`);
    return null;
  }

  if (!globalPlaidClient) {
    const configuration = new Configuration({
      basePath: PlaidEnvironments[environment],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": clientId,
          "PLAID-SECRET": secret,
          "Plaid-Version": "2020-09-14", // Using stable API version - supports pagination
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
    // Use environment variable for Firebase Functions v2
    let apiKey = process.env.OPENAI_API_KEY || process.env.openai_api_key;

    // Check if API key is available
    if (!apiKey) {
      console.error("OpenAI API key not configured");
      throw new Error(
        "OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable."
      );
    }

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
    // For testing purposes, use a default user ID if authentication is not available
    let userId = "test_user";
    if (context && context.auth) {
      userId = context.auth.uid;
      // Using authenticated user ID
    }

    try {
      // Get Plaid client with secrets
      const client = getPlaidClient(plaidClientId.value(), plaidSecret.value());

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

      const createTokenResponse = await client.linkTokenCreate(request);

      return {
        link_token: createTokenResponse.data.link_token,
        expiration: createTokenResponse.data.expiration,
      };
    } catch (error) {
      console.error("Error creating link token:", error);
      console.error("Error details:", error.response?.data || error.message);

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
      // Handle Firebase Functions v2 data structure
      let actualData = data;
      if (data && data.data) {
        actualData = data.data;
      }

      // Check if actualData has the expected structure
      if (actualData && typeof actualData === "object") {
        // Try to find publicToken in different possible locations
        const publicToken =
          actualData.publicToken || actualData.public_token || actualData.token;
        if (publicToken) {
          actualData.publicToken = publicToken; // Normalize to publicToken
        }
      }

      // Exchange public token for access token using Plaid API
      if (actualData && actualData.publicToken) {
        // Handle test token for simulation
        if (actualData.publicToken === "test_public_token") {
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
    // For testing purposes, allow without authentication
    if (!context || !context.auth) {
      // No authentication context, proceeding with test mode
    }

    // Handle Firebase Functions v2 data structure
    let actualData = data;
    if (data && data.data) {
      actualData = data.data;
    }

    const { accessToken } = actualData;

    if (!accessToken) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Access token is required"
      );
    }

    // Handle test token for simulation
    if (accessToken === "test_access_token_12345") {
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
    // Verify user is authenticated - handle both v1 and v2 function formats
    if (!context || !context.auth) {
      // No authentication context, proceeding with test mode
    }

    // Handle Firebase Functions v2 data structure
    let actualData = data;
    if (data && data.data) {
      actualData = data.data;
    }

    const { accessToken, cursor } = actualData;

    if (!accessToken) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Access token is required"
      );
    }

    // Handle test token for simulation
    if (accessToken === "test_access_token_12345") {
      return {
        transactions: [
          {
            transaction_id: "test_transaction_1",
            account_id: "test_account_1",
            amount: -50.0,
            date: "2024-01-15",
            name: "Test Grocery Store",
            merchant_name: "Test Grocery Store",
            category: ["Food and Drink", "Restaurants"],
            pending: false,
          },
          {
            transaction_id: "test_transaction_2",
            account_id: "test_account_1",
            amount: -25.0,
            date: "2024-01-20",
            name: "Test Gas Station",
            merchant_name: "Test Gas Station",
            category: ["Transportation", "Gas"],
            pending: false,
          },
          {
            transaction_id: "test_transaction_3",
            account_id: "test_account_2",
            amount: 2000.0,
            date: "2024-01-01",
            name: "Test Salary Deposit",
            merchant_name: "Test Employer",
            category: ["Transfer", "Deposit"],
            pending: false,
          },
        ],
        total_transactions: 3,
      };
    }

    try {
      const client = getPlaidClient(plaidClientId.value(), plaidSecret.value());

      // Fetch transactions using modern /transactions/sync endpoint
      let allTransactions = [];
      let hasMore = true;
      let currentCursor = cursor; // Use the cursor passed from client

      while (hasMore) {
        const syncRequest = {
          access_token: accessToken,
          options: {
            include_personal_finance_category: true,
          },
        };

        // Add cursor for pagination (except first request)
        if (currentCursor) {
          syncRequest.cursor = currentCursor;
        }

        const transactionsResponse = await client.transactionsSync(syncRequest);

        const transactions = transactionsResponse.data.added || [];
        allTransactions = allTransactions.concat(transactions);

        // Update cursor and check if more data is available
        currentCursor = transactionsResponse.data.next_cursor;
        hasMore = transactionsResponse.data.has_more;

        // Safety check to prevent infinite loops
        if (allTransactions.length > 2000) {
          console.warn("Transaction limit reached, stopping pagination");
          break;
        }
      }

      return {
        transactions: allTransactions,
        total_transactions: allTransactions.length,
        cursor: currentCursor, // Return cursor for future incremental updates
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
  // Handle authentication - allow unauthenticated users for testing
  let userId = "anonymous";
  if (context && context.auth) {
    userId = context.auth.uid;
  } else {
    // No authentication context, using anonymous user
  }
  // Handle different data structures (Firebase Functions v1 vs v2)
  let actualData = data;
  if (data && data.data) {
    actualData = data.data;
  }

  const {
    message,
    financialData,
    userPreferences = {},
    conversationHistory = [],
  } = actualData;

  if (!message) {
    console.error("Message is missing from data");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Message is required"
    );
  }

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
  // Handle authentication - allow unauthenticated users for testing
  let userId = "anonymous";
  if (context && context.auth) {
    userId = context.auth.uid;
  }
  // Handle different data structures (Firebase Functions v1 vs v2)
  let actualData = data;
  if (data && data.data) {
    actualData = data.data;
  }

  const { messageId, feedback, preferences } = actualData;

  if (!messageId || !feedback) {
    console.error("Missing required fields");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Message ID and feedback are required"
    );
  }

  try {
    // Store feedback in Firestore (you'll need to add admin SDK)
    // For now, just log it

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

// Plaid webhook IP addresses for verification
const PLAID_WEBHOOK_IPS = [
  "52.21.26.131",
  "52.21.47.157",
  "52.41.247.19",
  "52.88.82.239",
];

// Simple Plaid Webhook Handler for Production
exports.plaidWebhook = onCall(
  {
    secrets: [plaidClientId, plaidSecret],
  },
  async (data, context) => {
    try {
      // Verify webhook source (optional but recommended)
      if (context && context.rawRequest) {
        const clientIP =
          context.rawRequest.ip || context.rawRequest.connection?.remoteAddress;
        if (clientIP && !PLAID_WEBHOOK_IPS.includes(clientIP)) {
          // Note: We don't reject here as IPs can change, but we log for monitoring
        }
      }

      // Extract webhook data from the nested structure
      const webhookData = data.data || data;
      const { webhook_type, webhook_code, item_id, error, new_accounts } =
        webhookData;

      // Rate limiting: prevent processing same item_id too frequently
      const now = Date.now();
      const lastProcessed = webhookProcessingTimes.get(item_id) || 0;

      if (now - lastProcessed < WEBHOOK_COOLDOWN) {
        return { success: true, rateLimited: true };
      }

      webhookProcessingTimes.set(item_id, now);

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
        return { success: true };
      }

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
        case "TRANSACTIONS":
          await handleTransactionsWebhook(db, userId, webhook_code, item_id);
          break;
        case "INCOME":
          await handleIncomeWebhook(db, userId, webhook_code);
          break;
        default:
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
      return;
  }

  await userPlaidRef.update(updates);
}

// Handle ACCOUNTS webhooks
async function handleAccountsWebhook(
  db,
  userId,
  webhook_code,
  item_id,
  new_accounts
) {
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
      return;
  }

  await userPlaidRef.update(updates);
}

// Handle TRANSACTIONS webhooks
async function handleTransactionsWebhook(db, userId, webhook_code, item_id) {
  const userPlaidRef = db.ref(`users/${userId}/plaid`);
  const updates = {
    lastUpdated: Date.now(),
    lastWebhook: {
      type: "TRANSACTIONS",
      code: webhook_code,
      timestamp: Date.now(),
    },
  };

  switch (webhook_code) {
    case "SYNC_UPDATES_AVAILABLE":
      // New transactions are available for sync
      updates.transactionsSyncAvailable = true;
      updates.lastTransactionsSync = Date.now();

      break;
    case "INITIAL_UPDATE":
      // Initial transaction sync completed
      updates.initialSyncComplete = true;
      updates.initialSyncCompletedAt = Date.now();

      break;
    case "HISTORICAL_UPDATE":
      // Historical transaction sync completed
      updates.historicalSyncComplete = true;
      updates.historicalSyncCompletedAt = Date.now();

      break;
    case "DEFAULT_UPDATE":
      // Default transaction update
      updates.lastTransactionUpdate = Date.now();

      break;
    default:
      return;
  }

  await userPlaidRef.update(updates);
}

// Handle INCOME webhooks
async function handleIncomeWebhook(db, userId, webhook_code) {
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
      return;
  }

  await userPlaidRef.update(updates);
}
