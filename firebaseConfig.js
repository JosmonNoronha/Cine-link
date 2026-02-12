import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth/react-native";

// Read from environment variables instead of hardcoded extra config
const {
  FIREBASE_API_KEY = process.env.FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN = process.env.FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID = process.env.FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID = process.env.FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID = process.env.FIREBASE_MEASUREMENT_ID,
} = Constants?.expoConfig?.extra || {};

// Validate required Firebase configuration
if (!FIREBASE_API_KEY || !FIREBASE_PROJECT_ID || !FIREBASE_APP_ID) {
  throw new Error(
    "Firebase configuration is missing. Please ensure FIREBASE_API_KEY, FIREBASE_PROJECT_ID, and FIREBASE_APP_ID are set in your .env file."
  );
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

try {
  if (!firebase.apps.length) {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");

    authInstance = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    firebaseApp = firebase.app();
    authInstance = firebase.auth();
    console.log("Using existing Firebase app");
  }
} catch (error) {
  console.error("Firebase init error:", error);
  throw error;
}

export const auth = authInstance;
export const db = firebaseApp.firestore();
