// Import the Firebase namespace with compat layer
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore"; // Ensure Firestore is included

// Your web app's Firebase configuration (verify these match Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyBTnoH-aM_6bkprUWaqPDfJlW3BszYNAtQ",
  authDomain: "cinelink-7343e.firebaseapp.com",
  projectId: "cinelink-7343e",
  storageBucket: "cinelink-7343e.firebasestorage.app",
  messagingSenderId: "1024760551349",
  appId: "1:1024760551349:web:ae5f35ccfce9a9e257ebfc",
  measurementId: "G-1HG3P6E0QX",
};

// Initialize Firebase app
let firebaseApp;
try {
  if (!firebase.apps.length) {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully with config:", firebaseConfig);
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