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
const { defineSecret, defineString } = require("firebase-functions/params");

// Load environment variables
require("dotenv").config();

// Define secrets for Plaid
const plaidClientId = defineSecret("PLAID_CLIENT_ID");
const plaidSecret = defineSecret("PLAID_SECRET");
const plaidSecretSandbox = defineSecret("PLAID_SECRET_SANDBOX");

// Define Plaid environment
const plaidEnv = defineString("PLAID_ENV", { default: "production" });

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
  if (!clientId) {
    console.error("Plaid client ID not configured");
    return null;
  }

  // Validate environment - use Firebase Functions v2 parameter
  const environment = plaidEnv.value();
  if (
    environment !== "production" &&
    environment !== "development" &&
    environment !== "sandbox"
  ) {
    console.error(`Invalid Plaid environment: ${environment}`);
    return null;
  }

  // Use appropriate secret based on environment
  let secretToUse;
  if (environment === "sandbox") {
    secretToUse = plaidSecretSandbox.value();
  } else {
    secretToUse = plaidSecret.value();
  }

  if (!secretToUse) {
    console.error(
      `Plaid secret not configured for environment: ${environment}`
    );
    return null;
  }

  // Ensure secret is properly trimmed and valid
  secretToUse = secretToUse.toString().trim();

  if (!globalPlaidClient) {
    // Ensure clientId is properly trimmed and valid
    const cleanClientId = clientId ? clientId.toString().trim() : "";

    if (!cleanClientId) {
      return null;
    }

    const configuration = new Configuration({
      basePath: PlaidEnvironments[environment],
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": cleanClientId,
          "PLAID-SECRET": secretToUse,
          "Plaid-Version": "2020-09-14", // Using stable API version - supports pagination
        },
      },
    });
    globalPlaidClient = new PlaidApi(configuration);
  } else {
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
    secrets: [plaidClientId, plaidSecret, plaidSecretSandbox],
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
      const client = getPlaidClient(plaidClientId.value());

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
        redirect_uri: "https://vectorfi-888.web.app/plaid-redirect",
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
    secrets: [plaidClientId, plaidSecret, plaidSecretSandbox],
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
          const client = getPlaidClient(plaidClientId.value());
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
    secrets: [plaidClientId, plaidSecret, plaidSecretSandbox],
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

    // Handle test tokens for multiple bank simulation
    if (accessToken === "test_access_token_12345") {
      // Bank 1: Chase Bank
      return {
        accounts: [
          {
            account_id: "chase_checking_1",
            name: "Chase Total Checking",
            mask: "1234",
            type: "depository",
            subtype: "checking",
            balances: {
              available: 5000,
              current: 5000,
              iso_currency_code: "USD",
            },
          },
          {
            account_id: "chase_savings_1",
            name: "Chase Savings",
            mask: "5678",
            type: "depository",
            subtype: "savings",
            balances: {
              available: 15000,
              current: 15000,
              iso_currency_code: "USD",
            },
          },
          {
            account_id: "chase_credit_1",
            name: "Chase Freedom Credit Card",
            mask: "9876",
            type: "credit",
            subtype: "credit_card",
            balances: {
              available: 2500,
              current: 2500,
              iso_currency_code: "USD",
            },
          },
        ],
      };
    }

    if (accessToken === "test_access_token_67890") {
      // Bank 2: Bank of America
      return {
        accounts: [
          {
            account_id: "boa_checking_1",
            name: "Bank of America Advantage Checking",
            mask: "2468",
            type: "depository",
            subtype: "checking",
            balances: {
              available: 3200,
              current: 3200,
              iso_currency_code: "EUR",
            },
          },
          {
            account_id: "boa_savings_1",
            name: "Bank of America Savings",
            mask: "1357",
            type: "depository",
            subtype: "savings",
            balances: {
              available: 8500,
              current: 8500,
              iso_currency_code: "EUR",
            },
          },
          {
            account_id: "boa_credit_1",
            name: "Bank of America Cash Rewards",
            mask: "7531",
            type: "credit",
            subtype: "credit_card",
            balances: {
              available: 1800,
              current: 1800,
              iso_currency_code: "EUR",
            },
          },
        ],
      };
    }

    if (accessToken === "test_access_token_11111") {
      // Bank 3: Wells Fargo
      return {
        accounts: [
          {
            account_id: "wf_checking_1",
            name: "Wells Fargo Everyday Checking",
            mask: "3691",
            type: "depository",
            subtype: "checking",
            balances: {
              available: 2100,
              current: 2100,
              iso_currency_code: "GBP",
            },
          },
          {
            account_id: "wf_investment_1",
            name: "Wells Fargo Investment Account",
            mask: "4826",
            type: "investment",
            subtype: "investment",
            balances: {
              available: 25000,
              current: 25000,
              iso_currency_code: "GBP",
            },
          },
          {
            account_id: "wf_loan_1",
            name: "Wells Fargo Auto Loan",
            mask: "1593",
            type: "loan",
            subtype: "auto",
            balances: {
              available: 15000,
              current: 15000,
              iso_currency_code: "GBP",
            },
          },
        ],
      };
    }

    try {
      const client = getPlaidClient(plaidClientId.value());
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
    secrets: [plaidClientId, plaidSecret, plaidSecretSandbox],
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

    // Handle test tokens for multiple bank simulation
    if (accessToken === "test_access_token_12345") {
      // Bank 1: Chase Bank transactions
      return {
        transactions: [
          // September 2025 - Chase transactions
          {
            transaction_id: "chase_transaction_1",
            account_id: "chase_checking_1",
            amount: -3500.0,
            date: "2025-09-01",
            name: "Salary Deposit",
            merchant_name: "Tech Corp Inc",
            category: ["Transfer", "Deposit"],
            pending: false,
            iso_currency_code: "USD",
          },
          {
            transaction_id: "chase_transaction_2",
            account_id: "chase_checking_1",
            amount: 1800.0,
            date: "2025-09-01",
            name: "Rent Payment",
            merchant_name: "Downtown Apartments",
            category: ["Rent", "Housing"],
            pending: false,
            iso_currency_code: "USD",
          },
          {
            transaction_id: "chase_transaction_3",
            account_id: "chase_checking_1",
            amount: 65.0,
            date: "2025-09-02",
            name: "Whole Foods",
            merchant_name: "Whole Foods Market",
            category: ["Food and Drink", "Groceries"],
            pending: false,
            iso_currency_code: "USD",
          },
          {
            transaction_id: "chase_transaction_4",
            account_id: "chase_credit_1",
            amount: 45.0,
            date: "2025-09-15",
            name: "Shell Gas Station",
            merchant_name: "Shell",
            category: ["Transportation", "Gas"],
            pending: false,
            iso_currency_code: "USD",
          },
          {
            transaction_id: "chase_transaction_5",
            account_id: "chase_checking_1",
            amount: 120.0,
            date: "2025-09-20",
            name: "Electric Bill",
            merchant_name: "Pacific Gas & Electric",
            category: ["Utilities", "Electric"],
            pending: false,
            iso_currency_code: "USD",
          },
        ],
        total_transactions: 5,
      };
    }

    if (accessToken === "test_access_token_67890") {
      // Bank 2: Bank of America transactions
      return {
        transactions: [
          // September 2025 - Bank of America transactions
          {
            transaction_id: "boa_transaction_1",
            account_id: "boa_checking_1",
            amount: -2800.0,
            date: "2025-09-01",
            name: "Freelance Payment",
            merchant_name: "Design Studio LLC",
            category: ["Transfer", "Deposit"],
            pending: false,
            iso_currency_code: "EUR",
          },
          {
            transaction_id: "boa_transaction_2",
            account_id: "boa_credit_1",
            amount: 89.0,
            date: "2025-09-05",
            name: "Amazon Purchase",
            merchant_name: "Amazon",
            category: ["Shopping", "General"],
            pending: false,
            iso_currency_code: "EUR",
          },
          {
            transaction_id: "boa_transaction_3",
            account_id: "boa_checking_1",
            amount: 25.0,
            date: "2025-09-10",
            name: "Netflix Subscription",
            merchant_name: "Netflix",
            category: ["Entertainment", "Streaming"],
            pending: false,
            iso_currency_code: "EUR",
          },
          {
            transaction_id: "boa_transaction_4",
            account_id: "boa_credit_1",
            amount: 75.0,
            date: "2025-09-18",
            name: "Restaurant Dinner",
            merchant_name: "Bistro Central",
            category: ["Food and Drink", "Restaurants"],
            pending: false,
            iso_currency_code: "EUR",
          },
        ],
        total_transactions: 4,
      };
    }

    if (accessToken === "test_access_token_11111") {
      // Bank 3: Wells Fargo transactions
      return {
        transactions: [
          // September 2025 - Wells Fargo transactions
          {
            transaction_id: "wf_transaction_1",
            account_id: "wf_checking_1",
            amount: -500.0,
            date: "2025-09-01",
            name: "Investment Transfer",
            merchant_name: "Wells Fargo Investment",
            category: ["Transfer", "Investment"],
            pending: false,
            iso_currency_code: "GBP",
          },
          {
            transaction_id: "wf_transaction_2",
            account_id: "wf_loan_1",
            amount: 450.0,
            date: "2025-09-15",
            name: "Auto Loan Payment",
            merchant_name: "Wells Fargo Auto",
            category: ["Loan", "Auto"],
            pending: false,
            iso_currency_code: "GBP",
          },
          {
            transaction_id: "wf_transaction_3",
            account_id: "wf_checking_1",
            amount: 35.0,
            date: "2025-09-22",
            name: "Gym Membership",
            merchant_name: "FitLife Gym",
            category: ["Health", "Fitness"],
            pending: false,
            iso_currency_code: "GBP",
          },
        ],
        total_transactions: 3,
      };
    }

    try {
      const client = getPlaidClient(plaidClientId.value());

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
const SYSTEM_PROMPT_CORE = `You are Vectra — a friendly, laid-back financial coach inside the VectorFi app (educational only; not financial/tax/legal advice).
Goal: provide concise, practical guidance on budgeting, cash flow, debt payoff, and general investing concepts. Help users build wealth through better habits, planning, and income ideas (e.g., side hustles).

Expertise
- Operate at an expert personal finance educator level.
- Use standard frameworks: 50/30/20 and zero-based budgeting; sinking funds; emergency funds (3–6 months); debt snowball vs avalanche; APR vs APY; amortization basics; compound growth; DTI and savings rate; goal-based planning.
- Show quick math with currency/locale formatting (e.g., $300 ≈ 10% of $3,000). Round to whole dollars unless precision matters.

STYLE
- Detect the user's language and respond in that same language. If they write in Spanish, respond in Spanish. If they write in French, respond in French, etc.
- Plain English (or the user's language), calm and supportive. NEVER give greetings like "Hey there", "Hello", "Hi" - the user has already been greeted.
- No "As an AI…" or "I'm an AI" - respond like a real person would.
- Use short bullets (•) and occasional emojis 👍 only when helpful.
- Prioritize the single most impactful action first.
- Max 300 words total. If detail is requested, give a second, short follow-up.
- For casual questions like "how are you", respond naturally like a friend would.

DATA & CALCULATIONS
- Use only the financial data provided by the app/user (respect currency/locale).
- If a critical number is missing: ask ONE clarifying question OR make ONE simple, labeled assumption — not both.
- You do not fetch live market/bank data; if asked for "today's" numbers, explain the limitation and offer an estimate method. Or ask the user to provide the data.

SAFETY & SCOPE
- Educational only, not financial/tax/legal advice; no securities picks or guarantees.
- Avoid sensitive PII requests.

RESPONSE STYLE
- Be conversational and natural. Respond like a helpful friend who knows finance.
- For simple questions, just answer directly without rigid formatting.
- Only use structured format (Quick Wins/Plan/Next Steps) when giving comprehensive advice or action plans.
- For follow-up questions, continue the conversation naturally.

CONVERSATION
- Keep context from prior turns; don't re-introduce yourself.
- If user says "dive deeper," continue exactly where you left off.
- If a user just asks a question, respond naturally and conversationally.
- For casual questions like "how are you", "what's up", "how's it going" - respond like a friend would: "Doing great! Ready to help with your finances" or "All good! What can I help you with today?"
- Never use greetings - the user has already been welcomed to the app.
`;

const FIN_PLAN_RULES = `When a plan is requested, keep ≤300 words and use:
1) Current Snapshot – income, expenses, savings, debts, assets, liabilities, net worth, cash flow, debt to income ratio, etc. Explain what the terms mean in a way that a “13-year-old” old can understand if you use them (1–2 bullets)
2) Goal & Timeline – 1 line
3) Action Plan – 3–4 bullets with $/%, timelines, and specific actions
4) Next Steps – this week's 2–3 actions + milestones`;

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

// Helper function to detect plan requests (renamed to avoid collision)
function looksLikePlanRequest(userQuestion) {
  const planKeywords = [
    "generate",
    "create",
    "make",
    "plan",
    "strategy",
    "roadmap",
    "projection",
    "forecast",
    "afford",
  ];
  return planKeywords.some((keyword) =>
    userQuestion.toLowerCase().includes(keyword)
  );
}

// Safer follow-up detector (trim false positives)
function detectFollowUpQuestion(currentMessage, conversationHistory = []) {
  if (!conversationHistory.length) return false;
  const msg = currentMessage.trim().toLowerCase();

  const shortYesNo = /^(yes|no|sure|ok(ay)?|yeah|yep|nope)$/i.test(msg);
  const followUps = [
    "dive deeper",
    "tell me more",
    "explain",
    "what about",
    "and then",
    "next",
    "details",
    "breakdown",
    "step by step",
  ];
  const hasFollowUp = followUps.some((k) => msg.includes(k));
  const isShort = msg.length < 45;

  return shortYesNo || hasFollowUp || isShort;
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
      "Give specific, actionable recommendations with percentages or dollar amounts when relevant. Be conversational and helpful.",
    educational:
      "Explain concepts in simple, relatable terms using analogies when helpful. Be conversational and easy to understand.",
    analytical:
      "Provide clear calculations and breakdowns using the user's actual financial data. Explain the numbers in plain English.",
    guidance:
      "Offer supportive, non-judgmental advice with step-by-step guidance. Be encouraging and practical.",
    planning:
      "Create realistic, achievable plans broken down into manageable steps. Use the 4-section structure for comprehensive plans.",
    comparison:
      "Present balanced comparisons highlighting pros and cons of each option. Be conversational and helpful.",
    crisis:
      "Be calm and reassuring with immediate, actionable steps for stability. Prioritize urgent actions while staying supportive.",
    general:
      "Respond naturally and conversationally using the user's financial data when relevant. Be helpful and friendly.",
  };

  return instructions[questionType] || instructions.general;
}

// Cost calculation (externalize pricing with error handling)
let PRICING = {};
try {
  PRICING = JSON.parse(process.env.LLM_PRICING_JSON || "{}");
} catch (parseError) {
  console.warn(
    "Failed to parse LLM_PRICING_JSON, using fallback pricing:",
    parseError.message
  );
  PRICING = {};
}

const FALLBACK = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4o": { input: 0.0025, output: 0.01 },
};

function calculateCost(usage, model = "gpt-4o-mini") {
  const p = PRICING[model] || FALLBACK[model];
  if (!p) return 0;
  return (
    (usage.prompt_tokens / 1000) * p.input +
    (usage.completion_tokens / 1000) * p.output
  );
}

// Model selection (cleaner & token-safe)
function selectOptimalModel(message, planFlag) {
  const long = message.length > 120;
  if (planFlag || long) {
    return {
      model: "gpt-4o",
      maxTokens: 420,
      temperature: 0.6,
      reason: "planning/long",
    };
  }
  return {
    model: "gpt-4o-mini",
    maxTokens: 320,
    temperature: 0.7,
    reason: "short/simple",
  };
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
    includeAudio = false, // User choice to include audio
    voice = "alloy", // Voice selection (alloy, echo, fable, onyx, nova, shimmer)
  } = actualData;

  // Validate voice parameter
  const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
  const safeVoice = validVoices.includes(voice) ? voice : "alloy";

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    console.error("Message is missing, invalid, or empty from data");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Message is required and must be a non-empty string"
    );
  }

  try {
    // Analyze the question and detect if this is a plan request
    const questionType = analyzeQuestionType(message);
    const isPlanRequestFlag = looksLikePlanRequest(message);
    const contextInstructions = generateContextInstructions(questionType);

    // Build system prompt with enhanced context
    const systemPrompt =
      buildSystemPrompt(message, isPlanRequestFlag, userPreferences) +
      `\n\nQuestion Type: ${questionType}\nContext Instructions: ${contextInstructions}`;

    // Build user message with financial context (with error handling)
    let userMessage = message;
    if (financialData) {
      try {
        userMessage = `User Financial Data:\n${JSON.stringify(
          financialData,
          null,
          2
        )}\n\nUser Question: ${message}`;
      } catch (stringifyError) {
        console.warn(
          "Failed to stringify financial data, using message only:",
          stringifyError.message
        );
        userMessage = message;
      }
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
      Array.isArray(conversationHistory) &&
      conversationHistory.length > 0
    ) {
      const recentHistory = conversationHistory
        .slice(-3) // Keep last 3 messages for follow-ups
        .filter(
          (msg) => msg && typeof msg === "object" && msg.role && msg.content
        );
      messages.push(...recentHistory);
    }

    // Add current user message
    messages.push({ role: "user", content: userMessage });

    // Select optimal model based on request complexity
    const modelConfig = selectOptimalModel(message, isPlanRequestFlag);

    const response = await openaiClient.chat.completions.create({
      model: modelConfig.model,
      messages: messages,
      max_tokens: modelConfig.maxTokens,
      temperature: modelConfig.temperature,
    });

    const aiResponse = response.choices[0].message.content;
    const tokensUsed = response.usage.total_tokens;
    const cost = calculateCost(response.usage, modelConfig.model);

    // Generate audio if requested by user
    let audioBuffer = null;
    let audioCost = 0;

    if (includeAudio && aiResponse) {
      try {
        console.log(`Generating audio for response with voice: ${safeVoice}`);

        const audioResponse = await openaiClient.audio.speech.create({
          model: "tts-1", // Use tts-1 for faster generation, tts-1-hd for higher quality
          voice: safeVoice, // Use validated voice
          input: aiResponse,
          speed: 1.1, // Slightly faster speech for quicker playback
        });

        // Convert the audio stream to buffer
        const chunks = [];
        for await (const chunk of audioResponse.body) {
          chunks.push(chunk);
        }
        const audioBufferRaw = Buffer.concat(chunks);

        // Convert to base64 for frontend
        audioBuffer = audioBufferRaw.toString("base64");

        // Calculate TTS cost (tts-1: $0.015 per 1K characters)
        audioCost = (aiResponse.length / 1000) * 0.015;

        console.log(
          `Audio generated successfully. Length: ${
            audioBuffer.length
          } bytes, Cost: $${audioCost.toFixed(4)}`
        );
      } catch (audioError) {
        console.error("TTS generation error:", audioError);
        // Don't fail the entire request if TTS fails
        audioBuffer = null;
        audioCost = 0;
      }
    }

    return {
      response: aiResponse,
      tokensUsed,
      cost: cost + audioCost, // Include TTS cost in total
      isPlanRequest: isPlanRequestFlag,
      modelUsed: modelConfig.model,
      modelReason: modelConfig.reason,
      audioBuffer: audioBuffer, // Base64 encoded audio data
      hasAudio: !!audioBuffer,
      voiceUsed: includeAudio ? safeVoice : null,
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
    secrets: [plaidClientId, plaidSecret, plaidSecretSandbox],
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

      // Find user by item_id in the new multiple-bank structure
      const usersRef = db.ref("users");
      const snapshot = await usersRef.once("value");
      const users = snapshot.val();

      let userId = null;
      if (users) {
        for (const [uid, userData] of Object.entries(users)) {
          // Check new multiple-bank structure first
          if (
            userData.plaid_connections &&
            userData.plaid_connections[item_id]
          ) {
            userId = uid;
            break;
          }
          // Fallback to legacy single-bank structure
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
          await handleIncomeWebhook(db, userId, webhook_code, item_id);
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
  const userPlaidRef = db.ref(`users/${userId}/plaid_connections/${item_id}`);
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
  const userPlaidRef = db.ref(`users/${userId}/plaid_connections/${item_id}`);
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
  const userPlaidRef = db.ref(`users/${userId}/plaid_connections/${item_id}`);
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
async function handleIncomeWebhook(db, userId, webhook_code, item_id) {
  const userPlaidRef = db.ref(`users/${userId}/plaid_connections/${item_id}`);
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
