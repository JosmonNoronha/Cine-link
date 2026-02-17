import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth/react-native";

// Debug: Log what's available
console.log(
  "🔍 Debug - Constants.expoConfig available:",
  !!Constants?.expoConfig,
);
console.log(
  "🔍 Debug - Constants.expoConfig.extra available:",
  !!Constants?.expoConfig?.extra,
);

// Read from Constants.expoConfig.extra (populated by app.config.js during build)
const extra = Constants?.expoConfig?.extra || {};
const FIREBASE_API_KEY = extra.FIREBASE_API_KEY;
const FIREBASE_AUTH_DOMAIN = extra.FIREBASE_AUTH_DOMAIN;
const FIREBASE_PROJECT_ID = extra.FIREBASE_PROJECT_ID;
const FIREBASE_STORAGE_BUCKET = extra.FIREBASE_STORAGE_BUCKET;
const FIREBASE_MESSAGING_SENDER_ID = extra.FIREBASE_MESSAGING_SENDER_ID;
const FIREBASE_APP_ID = extra.FIREBASE_APP_ID;
const FIREBASE_MEASUREMENT_ID = extra.FIREBASE_MEASUREMENT_ID;

// Validate required Firebase configuration
if (!FIREBASE_API_KEY || !FIREBASE_PROJECT_ID || !FIREBASE_APP_ID) {
  console.error(
    "⚠️  Firebase configuration is missing. Auth features will be disabled.",
  );
  console.error("Missing keys:", {
    hasApiKey: !!FIREBASE_API_KEY,
    hasProjectId: !!FIREBASE_PROJECT_ID,
    hasAppId: !!FIREBASE_APP_ID,
  });
  console.error("Available extra keys:", Object.keys(extra));
}

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID,
};

let firebaseApp;
let authInstance;
let db;

// Only initialize if we have valid config
if (FIREBASE_API_KEY && FIREBASE_PROJECT_ID && FIREBASE_APP_ID) {
  try {
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(firebaseConfig);
      console.log("✅ Firebase initialized successfully");

      authInstance = initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } else {
      firebaseApp = firebase.app();
      authInstance = firebase.auth();
      console.log("Using existing Firebase app");
    }

    db = firebase.firestore();
  } catch (error) {
    console.error("❌ Firebase init error:", error);
    authInstance = null;
    db = null;
    firebaseApp = null;
  }
} else {
  console.warn("⚠️  Firebase not initialized - missing configuration");
  // Provide mock auth instance to prevent crashes
  authInstance = {
    currentUser: null,
    onAuthStateChanged: (callback) => {
      setTimeout(() => callback(null), 0);
      return () => {}; // Return unsubscribe function
    },
    signOut: async () => {
      console.warn("Firebase auth not available");
    },
    signInWithEmailAndPassword: async () => {
      throw new Error("Firebase auth not configured");
    },
    createUserWithEmailAndPassword: async () => {
      throw new Error("Firebase auth not configured");
    },
  };
}

export const auth = authInstance;
export { db };
export default firebaseApp;
