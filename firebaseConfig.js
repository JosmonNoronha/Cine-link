import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Platform } from "react-native";

console.log("═══════════════════════════════════════════════════");
console.log("🔍 FIREBASE CONFIG - SIMPLE APPROACH");
console.log("═══════════════════════════════════════════════════");

const expoExtra = Constants?.expoConfig?.extra || {};
const updatesExtra =
  Updates?.manifest?.extra?.expoClient?.extra ||
  Updates?.manifest?.extra ||
  Updates?.manifest2?.extra ||
  {};
const extra = { ...updatesExtra, ...expoExtra };

const FIREBASE_API_KEY =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
  extra.EXPO_PUBLIC_FIREBASE_API_KEY ||
  extra.FIREBASE_API_KEY;
const FIREBASE_AUTH_DOMAIN =
  process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
  extra.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
  extra.FIREBASE_AUTH_DOMAIN;
const FIREBASE_PROJECT_ID =
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
  extra.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
  extra.FIREBASE_PROJECT_ID;
const FIREBASE_STORAGE_BUCKET =
  process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  extra.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  extra.FIREBASE_STORAGE_BUCKET;
const FIREBASE_MESSAGING_SENDER_ID =
  process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
  extra.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
  extra.FIREBASE_MESSAGING_SENDER_ID;
const FIREBASE_APP_ID =
  process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
  extra.EXPO_PUBLIC_FIREBASE_APP_ID ||
  extra.FIREBASE_APP_ID;
const FIREBASE_MEASUREMENT_ID =
  process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ||
  extra.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ||
  extra.FIREBASE_MEASUREMENT_ID;

// Normalize values
const normalizedApiKey = FIREBASE_API_KEY?.trim();
const normalizedProjectId = FIREBASE_PROJECT_ID?.trim();
const normalizedAuthDomain =
  FIREBASE_AUTH_DOMAIN?.trim() ||
  (normalizedProjectId ? `${normalizedProjectId}.firebaseapp.com` : undefined);
const normalizedStorageBucket =
  FIREBASE_STORAGE_BUCKET?.trim() ||
  (normalizedProjectId
    ? `${normalizedProjectId}.firebasestorage.app`
    : undefined);
const normalizedMessagingSenderId = FIREBASE_MESSAGING_SENDER_ID?.trim();
const normalizedAppId = FIREBASE_APP_ID?.trim();
const normalizedMeasurementId = FIREBASE_MEASUREMENT_ID?.trim();

console.log("Config check:");
console.log("  API Key:", normalizedApiKey ? "✅" : "❌");
console.log("  Project ID:", normalizedProjectId ? "✅" : "❌");

const firebaseConfig = {
  apiKey: normalizedApiKey,
  authDomain: normalizedAuthDomain,
  projectId: normalizedProjectId,
  storageBucket: normalizedStorageBucket,
  messagingSenderId: normalizedMessagingSenderId,
  appId: normalizedAppId,
  measurementId: normalizedMeasurementId,
};

// Helper to create a mock auth instance
const createMockAuth = (reason = "Firebase auth is not configured") => ({
  currentUser: null,
  onAuthStateChanged: (callback) => {
    setTimeout(() => callback(null), 0);
    return () => {};
  },
  signOut: async () => {
    console.warn("Firebase auth not available");
  },
  signInWithEmailAndPassword: async () => {
    throw new Error(reason);
  },
  createUserWithEmailAndPassword: async () => {
    throw new Error(reason);
  },
});

let firebaseApp;
let firebaseAuth;
let db;
let fallbackReason = "Firebase auth is not configured.";

// Initialize Firebase
if (normalizedApiKey && normalizedProjectId) {
  try {
    // Initialize app
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
      console.log("✅ Firebase app initialized");
    } else {
      firebaseApp = getApp();
      console.log("✅ Using existing Firebase app");
    }

    // SIMPLIFIED: Just use getAuth() - no initializeAuth()
    // This works because Firebase JS SDK v9+ handles persistence automatically
    firebaseAuth = getAuth(firebaseApp);
    console.log("✅ Auth initialized");

    // Initialize Firestore
    db = getFirestore(firebaseApp);
    console.log("✅ Firestore initialized");
    console.log("═══════════════════════════════════════════════════");
    console.log("✅ ALL SERVICES READY");
    console.log("═══════════════════════════════════════════════════");

  } catch (error) {
    console.error("❌ Firebase init error:", error);
    console.error("   Code:", error?.code);
    console.error("   Message:", error?.message);
    firebaseAuth = null;
    db = null;
    firebaseApp = null;
    fallbackReason = `Firebase initialization failed: ${error?.message || "unknown error"}`;
  }
} else {
  console.error("❌ Missing Firebase configuration");
}

const authFacade = firebaseAuth
  ? {
      get currentUser() {
        return firebaseAuth.currentUser;
      },
      onAuthStateChanged: (callback) =>
        onAuthStateChanged(firebaseAuth, callback),
      signOut: () => signOut(firebaseAuth),
      signInWithEmailAndPassword: (email, password) =>
        signInWithEmailAndPassword(firebaseAuth, email, password),
      createUserWithEmailAndPassword: (email, password) =>
        createUserWithEmailAndPassword(firebaseAuth, email, password),
    }
  : createMockAuth(fallbackReason);

export const auth = authFacade;
export { db, firebaseAuth };
export default firebaseApp;