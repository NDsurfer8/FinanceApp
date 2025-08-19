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

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// Plaid API Functions
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");

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
