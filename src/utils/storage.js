import { auth,db } from "../../firebaseConfig";
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

import {
  getFavorites as apiGetFavorites,
  addToFavorites as apiAddToFavorites,
  removeFromFavorites as apiRemoveFromFavorites,
  getWatchlists as apiGetWatchlists,
  createWatchlist as apiCreateWatchlist,
  deleteWatchlist as apiDeleteWatchlist,
  addToWatchlist as apiAddToWatchlist,
  removeFromWatchlist as apiRemoveFromWatchlist,
  toggleWatchedStatus as apiToggleWatchedStatus,
} from "../services/api";

console.log("Storage.js loaded - auth:", auth, "db:", db); // Debug log

const FAVORITES_FIELD = "userFavorites"; // Field name inside the user document
const WATCHLIST_FIELD = "userWatchlist"; // Field name inside the user document

const toOmdbLikeMovie = (item) => {
  if (!item || typeof item !== "object") return null;

  // Backend stores legacy payload in `metadata`
  if (item.metadata && typeof item.metadata === "object") {
    const inferredId =
      item.imdbID || item.metadata.imdbID || (item.tmdb_id ? `tmdb:${item.tmdb_id}` : undefined);
    return {
      ...item.metadata,
      imdbID: inferredId,
      watched:
        item.watched !== undefined
          ? item.watched
          : item.metadata.watched !== undefined
            ? item.metadata.watched
            : false,
    };
  }

  // If item already has capitalized OMDB fields, return as-is
  if (item.Title && item.Poster && item.imdbID) {
    return {
      ...item,
      watched: item.watched !== undefined ? item.watched : false,
    };
  }

  // Backend stores TMDB items directly (or a simplified legacy shape)
  const imdbID = item.imdbID || (item.tmdb_id ? `tmdb:${item.tmdb_id}` : undefined);
  return {
    imdbID,
    Title: item.Title || item.title || item.name || null,
    Poster: item.Poster || item.poster || null,
    Year: item.Year || item.year || null,
    Type: item.Type || (item.media_type === "tv" ? "series" : "movie"),
    watched: item.watched !== undefined ? item.watched : false,
  };
};

const normalizeMovieArray = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map(toOmdbLikeMovie)
    .filter(Boolean)
    .map((m) => ({ ...m, watched: m.watched !== undefined ? m.watched : false }));

const backendEnabled = () => {
  // Backend calls will fail quickly if the server isn't reachable; we still keep
  // Firestore as a fallback during this migration.
  return true;
};

const getFavoritesBackend = async () => {
  const data = await apiGetFavorites();
  return normalizeMovieArray(data);
};

const getWatchlistsBackend = async () => {
  const lists = await apiGetWatchlists();
  const result = {};
  for (const wl of Array.isArray(lists) ? lists : []) {
    const name = wl?.name || wl?.id;
    if (!name) continue;
    // Backend returns 'movies' field, not 'items'
    const items = normalizeMovieArray(wl.movies || wl.items);
    result[name] = items;
  }
  return result;
};

// --- Firestore fallback implementations (previous behavior) ---
const getFavoritesFirestore = async () => {
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

const saveFavoriteFirestore = async (movie) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;
  if (!db) throw new Error("Firestore not initialized");

  const docRef = doc(db, "users", user.uid);
  await setDoc(docRef, { [FAVORITES_FIELD]: arrayUnion(movie) }, { merge: true });
};

const removeFavoriteFirestore = async (imdbID) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;
  if (!db) throw new Error("Firestore not initialized");

  const docRef = doc(db, "users", user.uid);
  const favorites = await getFavoritesFirestore();
  const movieToRemove = (Array.isArray(favorites) ? favorites : []).find(
    (m) => m.imdbID === imdbID,
  );
  if (movieToRemove) {
    await updateDoc(docRef, { [FAVORITES_FIELD]: arrayRemove(movieToRemove) });
  }
};

const getWatchlistsFirestore = async () => {
  console.log(
    "getWatchlists called - auth:",
    !!auth,
    "user:",
    !!auth?.currentUser,
    "db:",
    !!db,
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
    `users/${user.uid}/watchlists`,
  );

  try {
    const snapshot = await getDocs(watchlistsRef);
    console.log("Snapshot size:", snapshot.size);
    const result = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      console.log("Document:", docSnap.id, "Data:", data);

      // Ensure backward compatibility - add watched: false to existing movies without this property
      const movies = (data.movies || []).map((movie) => ({
        ...movie,
        watched: movie.watched !== undefined ? movie.watched : false,
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

const addWatchlistFirestore = async (name) => {
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
    `users/${user.uid}/watchlists/${name}`,
  );

  await setDoc(watchlistRef, { movies: [] }, { merge: true });
  console.log("Watchlist created successfully:", name);
};

const removeWatchlistFirestore = async (name) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;
  if (!db) throw new Error("Firestore not initialized");

  const watchlistRef = doc(db, `users/${user.uid}/watchlists/${name}`);
  await deleteDoc(watchlistRef);
};

const addToWatchlistFirestore = async (name, movie) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;
  if (!db) throw new Error("Firestore not initialized");

  // Add movie with watched: false by default
  const movieWithWatchedStatus = {
    ...movie,
    watched: false,
  };

  const watchlistRef = doc(db, `users/${user.uid}/watchlists/${name}`);

  // Check if movie already exists to avoid duplicates
  const docSnap = await getDoc(watchlistRef);
  if (docSnap.exists()) {
    const movies = docSnap.data().movies || [];
    const existingMovie = movies.find((m) => m.imdbID === movie.imdbID);
    if (existingMovie) {
      return false; // Movie already in watchlist
    }
  }

  await setDoc(
    watchlistRef,
    { movies: arrayUnion(movieWithWatchedStatus) },
    { merge: true },
  );
  return true;
};

const removeFromWatchlistFirestore = async (name, imdbID) => {
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

const toggleWatchedStatusFirestore = async (watchlistName, imdbID) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return false;
  if (!db) throw new Error("Firestore not initialized");

  const watchlistRef = doc(db, `users/${user.uid}/watchlists/${watchlistName}`);
  const docSnap = await getDoc(watchlistRef);

  if (docSnap.exists()) {
    const movies = docSnap.data().movies || [];
    const movieIndex = movies.findIndex((movie) => movie.imdbID === imdbID);

    if (movieIndex !== -1) {
      const oldMovie = movies[movieIndex];
      const updatedMovie = {
        ...oldMovie,
        watched: !oldMovie.watched,
      };

      await updateDoc(watchlistRef, {
        movies: arrayRemove(oldMovie),
      });
      await updateDoc(watchlistRef, {
        movies: arrayUnion(updatedMovie),
      });

      return true;
    }
  }

  return false;
};

export const getFavorites = async () => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return [];

  if (backendEnabled()) {
    try {
      return await getFavoritesBackend();
    } catch (error) {
      console.warn("⚠️ Backend favorites failed, using Firestore fallback:", error.message);
    }
  }

  return await getFavoritesFirestore();
};

export const saveFavorite = async (movie) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;

  if (backendEnabled()) {
    try {
      await apiAddToFavorites(movie);
      return;
    } catch (error) {
      console.warn("⚠️ Backend saveFavorite failed, using Firestore fallback:", error.message);
    }
  }

  await saveFavoriteFirestore(movie);
};

export const removeFavorite = async (imdbID) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;

  if (backendEnabled()) {
    try {
      await apiRemoveFromFavorites(imdbID);
      return;
    } catch (error) {
      console.warn("⚠️ Backend removeFavorite failed, using Firestore fallback:", error.message);
    }
  }

  await removeFavoriteFirestore(imdbID);
};

export const isFavorite = async (imdbID) => {
  const favorites = await getFavorites();
  return favorites.some((m) => m.imdbID === imdbID);
};

export const getWatchlists = async () => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return {};

  if (backendEnabled()) {
    try {
      return await getWatchlistsBackend();
    } catch (error) {
      console.warn("⚠️ Backend watchlists failed, using Firestore fallback:", error.message);
    }
  }

  return await getWatchlistsFirestore();
};

export const addWatchlist = async (name) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;

  if (backendEnabled()) {
    try {
      await apiCreateWatchlist(name);
      return;
    } catch (error) {
      console.warn("⚠️ Backend addWatchlist failed, using Firestore fallback:", error.message);
    }
  }

  await addWatchlistFirestore(name);
};

export const removeWatchlist = async (name) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;

  if (backendEnabled()) {
    try {
      await apiDeleteWatchlist(name);
      return;
    } catch (error) {
      console.warn("⚠️ Backend removeWatchlist failed, using Firestore fallback:", error.message);
    }
  }

  await removeWatchlistFirestore(name);
};

export const addToWatchlist = async (name, movie) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return false;

  if (backendEnabled()) {
    try {
      const resp = await apiAddToWatchlist(name, movie);
      // backend returns { added: boolean }
      if (resp && typeof resp.added === "boolean") return resp.added;
      return true;
    } catch (error) {
      console.warn("⚠️ Backend addToWatchlist failed, using Firestore fallback:", error.message);
    }
  }

  return await addToWatchlistFirestore(name, movie);
};

export const removeFromWatchlist = async (name, imdbID) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;

  if (backendEnabled()) {
    try {
      await apiRemoveFromWatchlist(name, imdbID);
      return;
    } catch (error) {
      console.warn(
        "⚠️ Backend removeFromWatchlist failed, using Firestore fallback:",
        error.message,
      );
    }
  }

  await removeFromWatchlistFirestore(name, imdbID);
};

// NEW FUNCTION: Toggle watched status
export const toggleWatchedStatus = async (watchlistName, imdbID) => {
  try {
    if (!auth) throw new Error("Authentication not initialized");
    const user = auth.currentUser;
    if (!user) return false;

    if (backendEnabled()) {
      try {
        await apiToggleWatchedStatus(watchlistName, imdbID);
        return true;
      } catch (error) {
        console.warn(
          "⚠️ Backend toggleWatchedStatus failed, using Firestore fallback:",
          error.message,
        );
      }
    }

    return await toggleWatchedStatusFirestore(watchlistName, imdbID);
  } catch (error) {
    console.error("Error toggling watched status:", error);
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

// ---------- Watched Episodes Tracking ----------
// Track which episodes a user has watched for TV series
export const markEpisodeWatched = async (imdbID, season, episode, watched = true) => {
  try {
    if (!auth) {
      console.warn("Authentication not initialized, skipping episode tracking");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      console.warn("No user logged in, skipping episode tracking");
      return;
    }
    if (!db) {
      console.warn("Firestore not initialized, skipping episode tracking");
      return;
    }

    const docRef = doc(db, `users/${user.uid}/watched`, imdbID);
    const episodeKey = `s${season}e${episode}`;
    
    if (watched) {
      await setDoc(docRef, {
        [episodeKey]: {
          watchedAt: new Date().toISOString(),
          season: Number(season),
          episode: Number(episode)
        }
      }, { merge: true });
    } else {
      // Remove episode from watched list
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        delete data[episodeKey];
        await setDoc(docRef, data);
      }
    }
  } catch (error) {
    console.warn("Could not track episode watch status (non-critical):", error.message);
  }
};

export const getWatchedEpisodes = async (imdbID) => {
  try {
    if (!auth) return {};
    const user = auth.currentUser;
    if (!user) return {};
    if (!db) return {};

    const docRef = doc(db, `users/${user.uid}/watched`, imdbID);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : {};
  } catch (error) {
    console.warn("Could not retrieve watched episodes:", error.message);
    return {};
  }
};

export const isEpisodeWatched = async (imdbID, season, episode) => {
  try {
    const watched = await getWatchedEpisodes(imdbID);
    const episodeKey = `s${season}e${episode}`;
    return !!watched[episodeKey];
  } catch (_error) {
    return false;
  }
};

export const getSeriesProgress = async (imdbID, totalEpisodes) => {
  try {
    const watched = await getWatchedEpisodes(imdbID);
    const watchedCount = Object.keys(watched).filter(key => key.startsWith('s')).length;
    const percentage = totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;
    
    return {
      watchedCount,
      totalEpisodes,
      percentage,
      lastWatched: Object.values(watched)
        .sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt))[0]
    };
  } catch (_error) {
    return { watchedCount: 0, totalEpisodes, percentage: 0, lastWatched: null };
  }
};
