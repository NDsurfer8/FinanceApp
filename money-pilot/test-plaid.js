const { getFunctions, httpsCallable } = require("firebase/functions");
const { initializeApp } = require("firebase/app");

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAgz2sbb7EU6Gcd0OLgpLy8haipBmtUAVA",
  authDomain: "money-pilot-ee3e3.firebaseapp.com",
  databaseURL: "https://money-pilot-ee3e3-default-rtdb.firebaseio.com",
  projectId: "money-pilot-ee3e3",
  storageBucket: "money-pilot-ee3e3.firebasestorage.app",
  messagingSenderId: "957142982959",
  appId: "1:957142982959:web:1580b8f5ad295255f2c1da",
  measurementId: "G-NHS58TCPKT",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

async function testPlaidIntegration() {
  try {
    console.log("Testing Plaid integration...");

    // Test creating a link token
    const createLinkToken = httpsCallable(functions, "createLinkToken");
    const result = await createLinkToken();

    console.log("Link token created successfully:", result.data);
  } catch (error) {
    console.error("Error testing Plaid integration:", error);
    console.error("Error details:", error.message);
    if (error.details) {
      console.error("Error details:", error.details);
    }
  }
}

testPlaidIntegration();
