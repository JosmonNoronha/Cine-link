// Import the Firebase namespace with compat layer
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore"; // Ensure Firestore is included
import Constants from "expo-constants";

const {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID,
  FIREBASE_MEASUREMENT_ID,
} = Constants.expoConfig.extra;

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
  measurementId: FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase app
let firebaseApp;
try {
  if (!firebase.apps.length) {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    console.log(
      "Firebase initialized successfully with config:",
      firebaseConfig
    );
  } else {
    firebaseApp = firebase.app();
    console.log("Reusing existing Firebase app");
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
  throw error; // Re-throw to prevent silent failure
}

// Export services
export const auth = firebaseApp ? firebaseApp.auth() : null;
export const db = firebaseApp ? firebaseApp.firestore() : null;
