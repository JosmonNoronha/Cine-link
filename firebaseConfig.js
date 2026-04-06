import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getReactNativePersistence } from "firebase/auth/react-native";
import { getFirestore } from "firebase/firestore";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

// Read config from all known Expo runtime sources.
// OTA updates can expose values via Updates.manifest rather than Constants.expoConfig.
const expoExtra = Constants?.expoConfig?.extra || {};
const updatesExtra =
  Updates?.manifest?.extra?.expoClient?.extra ||
  Updates?.manifest?.extra ||
  Updates?.manifest2?.extra ||
  {};
const extra = { ...updatesExtra, ...expoExtra };
const FIREBASE_API_KEY =
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
  extra.FIREBASE_API_KEY ||
  extra.EXPO_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_AUTH_DOMAIN =
  process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
  extra.FIREBASE_AUTH_DOMAIN ||
  extra.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
const FIREBASE_PROJECT_ID =
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
  extra.FIREBASE_PROJECT_ID ||
  extra.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_STORAGE_BUCKET =
  process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  extra.FIREBASE_STORAGE_BUCKET ||
  extra.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
const FIREBASE_MESSAGING_SENDER_ID =
  process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
  extra.FIREBASE_MESSAGING_SENDER_ID ||
  extra.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const FIREBASE_APP_ID =
  process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
  extra.FIREBASE_APP_ID ||
  extra.EXPO_PUBLIC_FIREBASE_APP_ID;
const FIREBASE_MEASUREMENT_ID =
  process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ||
  extra.FIREBASE_MEASUREMENT_ID ||
  extra.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID;

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
  console.error("Config source availability:", {
    hasExpoExtra: Object.keys(expoExtra).length > 0,
    hasUpdatesExtra: Object.keys(updatesExtra).length > 0,
    updateId: Updates?.updateId || null,
    channel: Updates?.channel || null,
  });
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

// Only initialize if we have valid config
if (FIREBASE_API_KEY && FIREBASE_PROJECT_ID && FIREBASE_APP_ID) {
  try {
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
      console.log("✅ Firebase initialized successfully");

      // Initialize auth with React Native persistence BEFORE calling firebase.auth()
      if (Platform.OS !== "web") {
        try {
          firebaseAuth = initializeAuth(firebaseApp, {
            persistence: getReactNativePersistence(AsyncStorage),
          });
          console.log("✅ Auth persistence set with AsyncStorage");
        } catch (e) {
          console.warn("Failed to set auth persistence:", e.message);
          firebaseAuth = getAuth(firebaseApp);
        }
      } else {
        firebaseAuth = getAuth(firebaseApp);
      }
    } else {
      firebaseApp = getApp();
      firebaseAuth = getAuth(firebaseApp);
      console.log("Using existing Firebase app");
    }

    db = getFirestore(firebaseApp);
  } catch (error) {
    console.error("❌ Firebase init error:", error);
    firebaseAuth = null;
    db = null;
    firebaseApp = null;
  }
} else {
  console.warn("⚠️  Firebase not initialized - missing configuration");
  console.warn("⚠️  Firebase config sources:", {
    hasExpoConfig: !!Constants?.expoConfig?.extra,
    hasUpdatesManifest: !!Updates?.manifest || !!Updates?.manifest2,
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
  : createMockAuth(
      "Firebase auth is not configured in this app build. Check the installed update channel and runtime env injection.",
    );

export const auth = authFacade;
export { db, firebaseAuth };
export default firebaseApp;
