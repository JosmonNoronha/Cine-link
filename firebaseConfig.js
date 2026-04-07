import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Platform } from "react-native";

// Debug: Log what's available
console.log(
  "🔍 Debug - Constants.expoConfig available:",
  !!Constants?.expoConfig,
);
console.log(
  "🔍 Debug - Constants.expoConfig.extra available:",
  !!Constants?.expoConfig?.extra,
);

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

// Normalize values (EAS variables may exist but still be empty strings).
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

// Validate required Firebase configuration
if (!normalizedApiKey || !normalizedProjectId) {
  console.error(
    "⚠️  Firebase configuration is missing. Auth features will be disabled.",
  );
  console.error("Missing keys:", {
    hasApiKey: !!normalizedApiKey,
    hasProjectId: !!normalizedProjectId,
    hasAuthDomain: !!normalizedAuthDomain,
    hasAppId: !!normalizedAppId,
    hasMessagingSenderId: !!normalizedMessagingSenderId,
  });
  console.error("Available extra keys:", Object.keys(extra));
}

const firebaseConfig = {
  apiKey: normalizedApiKey,
  authDomain: normalizedAuthDomain,
  projectId: normalizedProjectId,
  storageBucket: normalizedStorageBucket,
  messagingSenderId: normalizedMessagingSenderId,
  appId: normalizedAppId,
  measurementId: normalizedMeasurementId,
};

// Helper to create a mock auth instance that won't crash callers
const createMockAuth = (reason = "Firebase auth is not configured") => ({
  currentUser: null,
  onAuthStateChanged: (callback) => {
    setTimeout(() => callback(null), 0);
    return () => {}; // Return unsubscribe function
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
let fallbackReason =
  "Firebase auth is not configured in this app build (runtime config missing).";

// Only initialize if we have valid config
if (normalizedApiKey && normalizedProjectId) {
  try {
    // Initialize Firebase App
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
      console.log("✅ Firebase app initialized successfully");
    } else {
      firebaseApp = getApp();
      console.log("✅ Using existing Firebase app");
    }

    // Initialize Auth - THIS IS THE CRITICAL PART
    if (Platform.OS !== "web") {
      // React Native path
      try {
        // Try to initialize auth with persistence
        firebaseAuth = initializeAuth(firebaseApp, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
        console.log("✅ Auth initialized with React Native persistence");
      } catch (authError) {
        // If initializeAuth fails (already initialized), get existing instance
        if (authError.code === 'auth/already-initialized') {
          console.log("ℹ️  Auth already initialized, retrieving instance");
          firebaseAuth = getAuth(firebaseApp);
        } else {
          console.error("❌ Auth initialization error:", authError);
          throw authError;
        }
      }
    } else {
      // Web path
      firebaseAuth = getAuth(firebaseApp);
      console.log("✅ Auth initialized for web");
    }

    // Initialize Firestore
    db = getFirestore(firebaseApp);
    console.log("✅ Firestore initialized");

  } catch (error) {
    console.error("❌ Firebase initialization error:", error);
    console.error("Error code:", error?.code);
    console.error("Error message:", error?.message);
    firebaseAuth = null;
    db = null;
    firebaseApp = null;
    fallbackReason = `Firebase initialization failed: ${error?.message || "unknown error"}`;
  }
} else {
  console.warn("⚠️  Firebase not initialized - missing configuration");
  console.warn("Runtime config diagnostics:", {
    hasExpoExtra: Object.keys(expoExtra).length > 0,
    hasUpdatesExtra: Object.keys(updatesExtra).length > 0,
    hasApiKey: !!normalizedApiKey,
    hasProjectId: !!normalizedProjectId,
    hasAppId: !!normalizedAppId,
    updateId: Updates?.updateId || null,
    channel: Updates?.channel || null,
  });
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