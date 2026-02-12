import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { auth } from "../../firebaseConfig";
import {
  getFavorites as apiGetFavorites,
  saveFavorite as apiSaveFavorite,
  removeFavorite as apiRemoveFavorite,
} from "../utils/storage";

const FavoritesContext = createContext();

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Load favorites on mount and when user changes
  const loadFavorites = useCallback(async () => {
    try {
      const user = auth?.currentUser;
      if (!user) {
        setFavorites([]);
        setLoading(false);
        setInitialized(true);
        return;
      }

      setLoading(true);
      const data = await apiGetFavorites();
      setFavorites(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load favorites:", error);
      setFavorites([]);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  // Listen for auth state changes (handles both mount and auth changes)
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // Only load if not already initialized (prevents duplicate call)
        if (!initialized) {
          loadFavorites();
        }
      } else {
        setFavorites([]);
        setLoading(false);
        setInitialized(true);
      }
    });

    return () => unsubscribe();
  }, [loadFavorites, initialized]);

  // Check if a movie is in favorites (instant lookup from cache)
  const isFavorite = useCallback(
    (imdbID) => {
      return favorites.some((m) => m.imdbID === imdbID);
    },
    [favorites],
  );

  // Add to favorites with optimistic update
  const addToFavorites = useCallback(async (movie) => {
    if (!movie || !movie.imdbID) {
      throw new Error("Invalid movie data");
    }

    // Optimistic update - add immediately to cache
    setFavorites((prev) => {
      // Avoid duplicates
      if (prev.some((m) => m.imdbID === movie.imdbID)) {
        return prev;
      }
      return [...prev, movie];
    });

    try {
      // Sync with backend/Firestore
      await apiSaveFavorite(movie);
    } catch (error) {
      console.error("Failed to add to favorites:", error);
      // Revert on failure
      setFavorites((prev) => prev.filter((m) => m.imdbID !== movie.imdbID));
      throw error;
    }
  }, []);

  // Remove from favorites with optimistic update
  const removeFromFavorites = useCallback(
    async (imdbID) => {
      if (!imdbID) {
        throw new Error("Invalid imdbID");
      }

      // Store the removed movie for potential rollback
      const removedMovie = favorites.find((m) => m.imdbID === imdbID);

      // Optimistic update - remove immediately from cache
      setFavorites((prev) => prev.filter((m) => m.imdbID !== imdbID));

      try {
        // Sync with backend/Firestore
        await apiRemoveFavorite(imdbID);
      } catch (error) {
        console.error("Failed to remove from favorites:", error);
        // Revert on failure
        if (removedMovie) {
          setFavorites((prev) => [...prev, removedMovie]);
        }
        throw error;
      }
    },
    [favorites],
  );

  // Toggle favorite status
  const toggleFavorite = useCallback(
    async (movie, currentStatus) => {
      if (currentStatus) {
        await removeFromFavorites(movie.imdbID);
        return false;
      } else {
        await addToFavorites(movie);
        return true;
      }
    },
    [addToFavorites, removeFromFavorites],
  );

  // Refresh favorites (useful after backend sync issues)
  const refreshFavorites = useCallback(async () => {
    await loadFavorites();
  }, [loadFavorites]);

  const value = {
    favorites,
    loading,
    initialized,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    refreshFavorites,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};
