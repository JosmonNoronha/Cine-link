import logger from "../logger";
import { apiClient } from "./core";

export const getUserProfile = async () => {
  try {
    logger.info("🎬 Fetching user profile");
    const result = await apiClient.get("/user/profile");
    logger.info("✅ User profile fetched successfully");
    return result;
  } catch (error) {
    logger.warn("⚠️ Failed to fetch user profile:", error.message);
    throw error;
  }
};

export const addToFavorites = async (movie) => {
  try {
    logger.info("🎬 Adding to favorites:", movie);
    const result = await apiClient.post("/user/favorites", { movie });
    logger.info("✅ Added to favorites successfully");
    return result;
  } catch (error) {
    logger.warn("⚠️ Failed to add to favorites:", error.message);
    throw error;
  }
};

export const getFavorites = async () => {
  try {
    logger.info("🎬 Fetching favorites");
    const result = await apiClient.get("/user/favorites");
    logger.info("✅ Favorites fetched successfully");
    return result;
  } catch (error) {
    logger.warn("⚠️ Failed to fetch favorites:", error.message);
    throw error;
  }
};

export const removeFromFavorites = async (imdbID) => {
  try {
    logger.info("🎬 Removing from favorites:", imdbID);
    const result = await apiClient.delete(
      `/user/favorites/${encodeURIComponent(imdbID)}`,
    );
    logger.info("✅ Removed from favorites successfully");
    return result;
  } catch (error) {
    logger.warn("⚠️ Failed to remove from favorites:", error.message);
    throw error;
  }
};

export const getWatchlists = async () => {
  try {
    logger.info("🎬 Fetching watchlists");
    const result = await apiClient.get("/user/watchlists");
    logger.info("✅ Watchlists fetched successfully");
    return result;
  } catch (error) {
    logger.warn("⚠️ Failed to fetch watchlists:", error.message);
    throw error;
  }
};

export const deleteWatchlist = async (name) => {
  try {
    logger.info("🎬 Deleting watchlist:", name);
    const result = await apiClient.delete(
      `/user/watchlists/${encodeURIComponent(name)}`,
    );
    logger.info("✅ Watchlist deleted successfully");
    return result;
  } catch (error) {
    logger.warn("⚠️ Failed to delete watchlist:", error.message);
    throw error;
  }
};

export const createWatchlist = async (name) => {
  try {
    logger.info("🎬 Creating watchlist:", name);
    const result = await apiClient.post("/user/watchlists", { name });
    logger.info("✅ Watchlist created successfully");
    return result;
  } catch (error) {
    logger.warn("⚠️ Failed to create watchlist:", error.message);
    throw error;
  }
};

export const addToWatchlist = async (watchlistName, movie) => {
  try {
    logger.info("🎬 Adding to watchlist:", watchlistName, movie);
    const safeName = encodeURIComponent(watchlistName);
    const result = await apiClient.post(`/user/watchlists/${safeName}/movies`, {
      movie,
    });
    logger.info("✅ Added to watchlist successfully");
    return result;
  } catch (error) {
    logger.warn("⚠️ Failed to add to watchlist:", error.message);
    throw error;
  }
};

export const removeFromWatchlist = async (watchlistName, imdbID) => {
  try {
    logger.info("🎬 Removing from watchlist:", watchlistName, imdbID);
    const safeName = encodeURIComponent(watchlistName);
    const safeId = encodeURIComponent(imdbID);
    const result = await apiClient.delete(
      `/user/watchlists/${safeName}/movies/${safeId}`,
    );
    logger.info("✅ Removed from watchlist successfully");
    return result;
  } catch (error) {
    logger.warn("⚠️ Failed to remove from watchlist:", error.message);
    throw error;
  }
};

export const toggleWatchedStatus = async (watchlistName, imdbID) => {
  try {
    logger.info("🎬 Toggling watched status:", watchlistName, imdbID);
    const safeName = encodeURIComponent(watchlistName);
    const safeId = encodeURIComponent(imdbID);
    const result = await apiClient.patch(
      `/user/watchlists/${safeName}/movies/${safeId}/watched`,
    );
    logger.info("✅ Watched status toggled successfully");
    return result;
  } catch (error) {
    logger.warn("⚠️ Failed to toggle watched status:", error.message);
    throw error;
  }
};
