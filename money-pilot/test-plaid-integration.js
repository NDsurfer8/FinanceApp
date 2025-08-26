// Simple test script to verify Plaid integration
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, get } = require("firebase/database");

// Firebase config (you'll need to replace with your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "money-pilot-ee3e3.firebaseapp.com",
  databaseURL: "https://money-pilot-ee3e3-default-rtdb.firebaseio.com",
  projectId: "money-pilot-ee3e3",
  storageBucket: "money-pilot-ee3e3.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Test user ID
const testUserId = "test_user_123";

// Test data for different scenarios
const testScenarios = [
  {
    name: "ITEM_LOGIN_REQUIRED",
    data: {
      status: "ITEM_LOGIN_REQUIRED",
      itemId: "test_item_123",
      lastUpdated: Date.now(),
      lastWebhook: {
        type: "ITEM",
        code: "ITEM_LOGIN_REQUIRED",
        timestamp: Date.now(),
      },
    },
  },
  {
    name: "NEW_ACCOUNTS_AVAILABLE",
    data: {
      status: "connected",
      itemId: "test_item_456",
      hasNewAccounts: true,
      newAccounts: [
        { id: "new_1", name: "New Savings Account", subtype: "savings" },
        { id: "new_2", name: "New Checking Account", subtype: "checking" },
      ],
      newAccountsAvailableAt: Date.now(),
      lastUpdated: Date.now(),
      lastWebhook: {
        type: "ACCOUNTS",
        code: "NEW_ACCOUNTS_AVAILABLE",
        timestamp: Date.now(),
      },
    },
  },
  {
    name: "PENDING_EXPIRATION",
    data: {
      status: "PENDING_EXPIRATION",
      itemId: "test_item_789",
      expirationWarning: true,
      lastUpdated: Date.now(),
      lastWebhook: {
        type: "ITEM",
        code: "ITEM_PENDING_EXPIRATION",
        timestamp: Date.now(),
      },
    },
  },
];

async function testPlaidIntegration() {
  console.log("🧪 Testing Plaid Integration...\n");

  for (const scenario of testScenarios) {
    console.log(`📋 Testing scenario: ${scenario.name}`);

    try {
      // Set test data in Firebase
      const userPlaidRef = ref(db, `users/${testUserId}/plaid`);
      await set(userPlaidRef, scenario.data);

      console.log(`✅ Test data set for ${scenario.name}`);
      console.log(`   Status: ${scenario.data.status}`);
      console.log(`   Item ID: ${scenario.data.itemId}`);

      if (scenario.data.hasNewAccounts) {
        console.log(`   New Accounts: ${scenario.data.newAccounts.length}`);
      }

      console.log("");
    } catch (error) {
      console.error(`❌ Error testing ${scenario.name}:`, error);
    }
  }

  console.log("🎉 Test scenarios completed!");
  console.log("\n📱 Next steps:");
  console.log("1. Open your app in development mode");
  console.log("2. Login with a test user");
  console.log("3. Check if PlaidUpdateMode modal appears");
  console.log("4. Test different scenarios by updating Firebase data");
}

// Run the test
testPlaidIntegration().catch(console.error);
