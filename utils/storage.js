import { auth } from "../firebaseConfig";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

console.log("Storage.js loaded - auth:", auth, "db:", db); // Debug log

const FAVORITES_FIELD = "userFavorites"; // Field name inside the user document

export const getFavorites = async () => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return [];
  if (!db) throw new Error("Firestore not initialized");

  const docRef = doc(db, "users", user.uid); // Valid document path
  try {
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data()[FAVORITES_FIELD] || [] : [];
  } catch (error) {
    console.error(`Error fetching favorites: ${error.message}`, error.stack);
    return [];
  }
};

export const saveFavorite = async (movie) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;
  if (!db) throw new Error("Firestore not initialized");

  const docRef = doc(db, "users", user.uid);
  await setDoc(docRef, { [FAVORITES_FIELD]: arrayUnion(movie) }, { merge: true });
};

export const removeFavorite = async (imdbID) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;
  if (!db) throw new Error("Firestore not initialized");

  const docRef = doc(db, "users", user.uid);
  const favorites = await getFavorites();
  const movieToRemove = favorites.find((m) => m.imdbID === imdbID);
  if (movieToRemove) {
    await updateDoc(docRef, { [FAVORITES_FIELD]: arrayRemove(movieToRemove) });
  }
};

export const isFavorite = async (imdbID) => {
  const favorites = await getFavorites();
  return favorites.some((m) => m.imdbID === imdbID);
};

// ---------- Series Storage (Remains the Same) ----------
export const saveSeriesDetails = async (imdbID, seriesDetails) => {
  try {
    if (!auth) throw new Error("Authentication not initialized");
    const user = auth.currentUser;
    if (!user) return;
    if (!db) throw new Error("Firestore not initialized");

    const docRef = doc(db, `users/${user.uid}/series`, imdbID);
    await setDoc(docRef, seriesDetails, { merge: true });
  } catch (error) {
    console.error("Error saving series details:", error);
  }
};

export const getSeriesDetails = async (imdbID) => {
  try {
    if (!auth) throw new Error("Authentication not initialized");
    const user = auth.currentUser;
    if (!user) return null;
    if (!db) throw new Error("Firestore not initialized");

    const docRef = doc(db, `users/${user.uid}/series`, imdbID);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error getting series details:", error);
    return null;
  }
};
