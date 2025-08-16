// src/services/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { firebaseConfig } from "../config/firebase";

// Initialize Firebase
const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);

console.log("Firebase initialized with config:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey,
});

export const db = getDatabase(app);
export const auth = getAuth(app);
