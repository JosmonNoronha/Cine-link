import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { initializeAuth } from "firebase/auth";
import { getReactNativePersistence } from "@firebase/auth/dist/rn/index.js";
import logger from "./src/services/logger";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

logger.info("Firebase config check:");
logger.info("  API Key:", firebaseConfig.apiKey ? "✅" : "❌");
logger.info("  Project ID:", firebaseConfig.projectId ? "✅" : "❌");

let firebaseApp;
let firebaseAuth;
let db;

try {
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

  firebaseAuth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });

  db = getFirestore(firebaseApp);
  logger.info("✅ Firebase initialized successfully");
} catch (error) {
  logger.error("❌ Firebase init error:", error.message);
}

const createMockAuth = (reason) => ({
  currentUser: null,
  onAuthStateChanged: (cb) => { setTimeout(() => cb(null), 0); return () => {}; },
  signOut: async () => {},
  signInWithEmailAndPassword: async () => { throw new Error(reason); },
  createUserWithEmailAndPassword: async () => { throw new Error(reason); },
});

export const auth = firebaseAuth ? {
  get currentUser() { return firebaseAuth.currentUser; },
  onAuthStateChanged: (cb) => onAuthStateChanged(firebaseAuth, cb),
  signOut: () => signOut(firebaseAuth),
  signInWithEmailAndPassword: (email, password) =>
    signInWithEmailAndPassword(firebaseAuth, email, password),
  createUserWithEmailAndPassword: (email, password) =>
    createUserWithEmailAndPassword(firebaseAuth, email, password),
} : createMockAuth("Firebase not initialized");

export { db, firebaseAuth };
export default firebaseApp;