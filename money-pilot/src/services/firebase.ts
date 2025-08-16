// src/services/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import Constants from "expo-constants";

const cfg = (Constants.expoConfig?.extra as any)?.firebase;
const app = getApps().length ? getApps()[0]! : initializeApp(cfg);

export const db = getDatabase(app);
export const auth = getAuth(app);
