import { auth } from "../firebaseConfig";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

console.log("Storage.js loaded - auth:", auth, "db:", db); // Debug log

const FAVORITES_FIELD = "userFavorites"; // Field name inside the user document
const WATCHLIST_FIELD = "userWatchlist"; // Field name inside the user document

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
  await setDoc(
    docRef,
    { [FAVORITES_FIELD]: arrayUnion(movie) },
    { merge: true }
  );
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

export const getWatchlists = async () => {
  console.log(
    "getWatchlists called - auth:",
    !!auth,
    "user:",
    !!auth?.currentUser,
    "db:",
    !!db
  );

  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) {
    console.log("No current user found");
    return {};
  }
  if (!db) throw new Error("Firestore not initialized");

  const watchlistsRef = collection(db, `users/${user.uid}/watchlists`);
  console.log(
    "Querying watchlists collection:",
    `users/${user.uid}/watchlists`
  );

  try {
    const snapshot = await getDocs(watchlistsRef);
    console.log("Snapshot size:", snapshot.size);
    const result = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      console.log("Document:", docSnap.id, "Data:", data);
      
      // Ensure backward compatibility - add watched: false to existing movies without this property
      const movies = (data.movies || []).map(movie => ({
        ...movie,
        watched: movie.watched !== undefined ? movie.watched : false
      }));
      
      result[docSnap.id] = movies;
    });
    console.log("Retrieved watchlists:", Object.keys(result));
    return result;
  } catch (error) {
    console.error("Error getting watchlists:", error);
    return {};
  }
};

export const addWatchlist = async (name) => {
  console.log("addWatchlist called with name:", name);

  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) {
    console.log("No current user found in addWatchlist");
    return;
  }
  if (!db) throw new Error("Firestore not initialized");

  const watchlistRef = doc(db, `users/${user.uid}/watchlists/${name}`);
  console.log(
    "Creating watchlist at path:",
    `users/${user.uid}/watchlists/${name}`
  );

  try {
    await setDoc(watchlistRef, { movies: [] }, { merge: true });
    console.log("Watchlist created successfully:", name);
  } catch (error) {
    console.error("Error creating watchlist:", error);
    throw error;
  }
};

export const removeWatchlist = async (name) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;
  if (!db) throw new Error("Firestore not initialized");

  const watchlistRef = doc(db, `users/${user.uid}/watchlists/${name}`);
  await deleteDoc(watchlistRef);
};

export const addToWatchlist = async (name, movie) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;
  if (!db) throw new Error("Firestore not initialized");

  // Add movie with watched: false by default
  const movieWithWatchedStatus = {
    ...movie,
    watched: false
  };

  const watchlistRef = doc(db, `users/${user.uid}/watchlists/${name}`);
  
  // Check if movie already exists to avoid duplicates
  const docSnap = await getDoc(watchlistRef);
  if (docSnap.exists()) {
    const movies = docSnap.data().movies || [];
    const existingMovie = movies.find(m => m.imdbID === movie.imdbID);
    if (existingMovie) {
      return false; // Movie already in watchlist
    }
  }
  
  await setDoc(watchlistRef, { movies: arrayUnion(movieWithWatchedStatus) }, { merge: true });
  return true;
};

export const removeFromWatchlist = async (name, imdbID) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;
  if (!db) throw new Error("Firestore not initialized");

  const watchlistRef = doc(db, `users/${user.uid}/watchlists/${name}`);
  const docSnap = await getDoc(watchlistRef);
  if (docSnap.exists()) {
    const movies = docSnap.data().movies || [];
    const movieToRemove = movies.find((m) => m.imdbID === imdbID);
    if (movieToRemove) {
      await updateDoc(watchlistRef, { movies: arrayRemove(movieToRemove) });
    }
  }
};

// NEW FUNCTION: Toggle watched status
export const toggleWatchedStatus = async (watchlistName, imdbID) => {
  try {
    if (!auth) throw new Error("Authentication not initialized");
    const user = auth.currentUser;
    if (!user) return false;
    if (!db) throw new Error("Firestore not initialized");

    const watchlistRef = doc(db, `users/${user.uid}/watchlists/${watchlistName}`);
    const docSnap = await getDoc(watchlistRef);
    
    if (docSnap.exists()) {
      const movies = docSnap.data().movies || [];
      const movieIndex = movies.findIndex(movie => movie.imdbID === imdbID);
      
      if (movieIndex !== -1) {
        const oldMovie = movies[movieIndex];
        const updatedMovie = {
          ...oldMovie,
          watched: !oldMovie.watched
        };
        
        // Remove the old movie and add the updated one
        await updateDoc(watchlistRef, { 
          movies: arrayRemove(oldMovie) 
        });
        
        await updateDoc(watchlistRef, { 
          movies: arrayUnion(updatedMovie) 
        });
        
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error toggling watched status:', error);
    throw error;
  }
};

export const isInWatchlist = async (name, imdbID) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return false;
  if (!db) throw new Error("Firestore not initialized");

  const watchlistRef = doc(db, `users/${user.uid}/watchlists/${name}`);
  const docSnap = await getDoc(watchlistRef);
  if (!docSnap.exists()) return false;
  const movies = docSnap.data().movies || [];
  return movies.some((m) => m.imdbID === imdbID);
};