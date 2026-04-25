import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { auth } from "../../firebaseConfig";
import logger from "./logger";

const normalizeDevBaseUrl = (url) => {
  if (!url) return url;
  // Android emulators can't reach host machine via localhost.
  // Use 10.0.2.2 for the default Android emulator (AVD).
  if (!__DEV__ || Platform.OS !== "android") return url;
  try {
    const u = new URL(url);
    if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
      u.hostname = "10.0.2.2";
      return u.toString().replace(/\/+$/, "");
    }
  } catch {
    // Ignore parse errors and return original.
  }
  return url;
};

// Production and development URL configuration
const PRODUCTION_BASE_URL =
  process.env.EXPO_PUBLIC_PRODUCTION_API_URL ||
  Constants?.expoConfig?.extra?.PRODUCTION_API_URL ||
  "https://cinelink-backend-n.onrender.com";
const EXPLICIT_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants?.expoConfig?.extra?.API_BASE_URL;

const NORMALIZED_EXPLICIT_BASE_URL = normalizeDevBaseUrl(EXPLICIT_BASE_URL);

// Prioritize production URL unless explicitly set to localhost
const isLocalhost =
  EXPLICIT_BASE_URL &&
  (EXPLICIT_BASE_URL.includes("localhost") ||
    EXPLICIT_BASE_URL.includes("127.0.0.1") ||
    EXPLICIT_BASE_URL.includes("10.0.2.2"));

const API_BASE_URL =
  isLocalhost && __DEV__ ? NORMALIZED_EXPLICIT_BASE_URL : PRODUCTION_BASE_URL;

logger.info("🔧 API Configuration:");
logger.info("  - Base URL:", API_BASE_URL);
logger.info("  - Platform:", Platform.OS);
logger.info("  - Dev Mode:", __DEV__);
logger.info("  - Production URL:", PRODUCTION_BASE_URL);
logger.info("  - Explicit URL:", NORMALIZED_EXPLICIT_BASE_URL);

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30s to handle slow backend responses
  headers: {
    "Content-Type": "application/json",
  },
});

let backendAvailable = true;
let connectionTested = true;
let actualWorkingURL = API_BASE_URL;
let lastBackendError = null;
const MAX_REQUEST_RETRIES = 2;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createIdempotencyKey = (prefix = "evt") => {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `${prefix}-${Date.now()}-${randomPart}`;
};

const isRetryableError = (error) => {
  const status = error?.response?.status;
  const code = error?.code;
  const message = String(error?.message || "").toLowerCase();

  if (status >= 500) return true;
  if (code === "ECONNABORTED" || code === "ERR_NETWORK") return true;
  if (message.includes("timeout") || message.includes("network error"))
    return true;
  return false;
};

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  logger.info(
    "🌐 API Request:",
    config.method?.toUpperCase(),
    config.baseURL,
    config.url,
  );
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.__retryCount = config.__retryCount || 0;
  } catch (error) {
    logger.warn("Failed to get auth token:", error);
  }
  return config;
});

// Enhanced response interceptor
apiClient.interceptors.response.use(
  (response) => {
    logger.info("✅ API Response:", response.config.url, response.data);
    backendAvailable = true;
    lastBackendError = null;
    // Backend returns a standard envelope: { success: true, data: ... }
    // The app expects OMDb-like objects/arrays directly.
    if (
      response?.data &&
      typeof response.data === "object" &&
      response.data.success === true &&
      Object.prototype.hasOwnProperty.call(response.data, "data")
    ) {
      return response.data.data;
    }
    return response.data;
  },
  async (error) => {
    logger.info("🚨 API Error:", error.message, error.config?.url);
    logger.info("🚨 API Error Code:", error.code);
    logger.info("🚨 API Error Config:", error.config?.url);

    // If auth token is stale/expired, refresh once and retry.
    if (
      error.response?.status === 401 &&
      error.config &&
      !error.config.__isAuthRetry
    ) {
      try {
        const user = auth.currentUser;
        if (user) {
          const freshToken = await user.getIdToken(true);
          const nextConfig = {
            ...error.config,
            __isAuthRetry: true,
            headers: {
              ...(error.config.headers || {}),
              Authorization: `Bearer ${freshToken}`,
            },
          };
          return apiClient.request(nextConfig);
        }
      } catch {
        // Fall through to normal rejection.
      }
    }

    if (
      error.config &&
      isRetryableError(error) &&
      (error.config.__retryCount || 0) < MAX_REQUEST_RETRIES
    ) {
      const nextRetry = (error.config.__retryCount || 0) + 1;
      const backoffMs = 400 * 2 ** (nextRetry - 1);
      error.config.__retryCount = nextRetry;
      await wait(backoffMs);
      return apiClient.request(error.config);
    }

    backendAvailable = false;
    lastBackendError = error.message || "Request failed";
    return Promise.reject(error);
  },
);
// Named search function used by hooks expecting OMDb-like shape
export const searchMovies = async (
  query,
  filter = "all",
  page = 1,
  signal = null,
  cursor = null,
) => {
  const trimmedQuery = (query || "").trim();
  if (!trimmedQuery) {
    return { Search: [], totalResults: "0", Response: "False" };
  }

  const normType = filter && filter !== "all" ? filter : "all";

  try {
    logger.info("🎬 Using unified backend search:", trimmedQuery, filter, page);

    const requestBody = {
      query: trimmedQuery,
      type: normType,
      page,
      filters: {},
    };

    if (typeof cursor === "string" && cursor.trim().length > 0) {
      requestBody.cursor = cursor;
    }

    const data = await apiClient.post("/search", requestBody, { signal });

    if (data && data.Search) {
      return {
        ...data,
        totalResults: String(data.totalResults || data.Search.length || 0),
        Response: data.Response || (data.Search.length ? "True" : "False"),
      };
    }

    return { Search: [], totalResults: "0", Response: "False" };
  } catch (error) {
    if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
      throw error;
    }
    logger.warn(
      "⚠️ Unified search failed, falling back to legacy search:",
      error.message,
    );

    try {
      const fallback = await apiClient.get("/movies/search", {
        params: { q: trimmedQuery, type: normType, page },
        signal,
      });

      if (fallback && fallback.Search) {
        return {
          ...fallback,
          totalResults: String(
            fallback.totalResults || fallback.Search.length || 0,
          ),
          Response:
            fallback.Response || (fallback.Search.length ? "True" : "False"),
        };
      }
    } catch (fallbackError) {
      logger.warn("⚠️ Legacy search fallback failed:", fallbackError.message);
    }

    throw new Error("Backend search unavailable. Please try again.");
  }
};

export const getMovieDetails = async (imdbID) => {
  logger.info("🎬 Using backend for movie details:", imdbID);
  const result = await apiClient.get(`/movies/details/${imdbID}`);
  logger.info("✅ Backend details successful");
  return result;
};

export const getSeasonDetails = async (imdbID, season) => {
  logger.info("🎬 Using backend for season details:", imdbID, season);
  const result = await apiClient.get(`/movies/season/${imdbID}/${season}`);
  logger.info("✅ Backend season details successful");
  return result;
};

export const getEpisodeDetails = async (imdbID, season, episode) => {
  logger.info("🎬 Using backend for episode details:", imdbID, season, episode);
  const result = await apiClient.get(
    `/movies/episode/${imdbID}/${season}/${episode}`,
  );
  logger.info("✅ Backend episode details successful");
  return result;
};

export const getRecommendations = async (title) => {
  try {
    logger.info("🎬 Getting recommendations from backend:", title);
    const data = await apiClient.post("/recommendations", {
      title,
      top_n: 10,
    });
    logger.info("✅ Backend recommendations successful");
    return data.recommendations || [];
  } catch (error) {
    logger.error("❌ Failed to get recommendations:", error.message);
    return [];
  }
};

export const getBatchMovieDetails = async (imdbIDs) => {
  logger.info("🎬 Using backend for batch movie details:", imdbIDs);
  const data = await apiClient.post("/movies/batch-details", { imdbIDs });
  logger.info("✅ Backend batch details successful");
  return data.results || [];
};

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

export const getBackendStatus = () => ({
  available: backendAvailable,
  tested: connectionTested,
  baseUrl: actualWorkingURL,
  lastError: lastBackendError,
});

export const retestBackendConnection = async () => {
  connectionTested = true;
  backendAvailable = true;
  lastBackendError = null;
  actualWorkingURL = API_BASE_URL;
  return true;
};

// Convenience API for components expecting a default service object
const normalizeResults = (payload) => {
  if (!payload) return { results: [] };
  if (Array.isArray(payload)) return { results: payload };
  if (payload.Search)
    return {
      results: payload.Search,
      totalResults:
        parseInt(payload.totalResults || "0") || payload.Search.length,
      meta: payload.meta || null,
    };
  if (payload.results)
    return {
      results: payload.results,
      totalResults: payload.totalResults,
      meta: payload.meta || null,
    };
  return { results: [] };
};

// Get real trending content from backend
export const getTrending = async (type = "movie", timeWindow = "week") => {
  try {
    const data = await apiClient.get(`/trending/${type}/${timeWindow}`);
    return Array.isArray(data) ? data : data.results || [];
  } catch (error) {
    logger.warn("⚠️ Trending API failed:", error.message);
    return [];
  }
};

// Get trending search keywords
export const getTrendingKeywords = async () => {
  try {
    const data = await apiClient.get("/trending/search/keywords");
    return data.keywords || [];
  } catch (error) {
    logger.warn("⚠️ Trending keywords API failed:", error.message);
    return [];
  }
};

// Get popular search queries from analytics
export const getPopularSearches = async (limit = 10) => {
  try {
    const data = await apiClient.get("/analytics/popular-searches", {
      params: { limit },
    });
    return (data.searches || []).map((item) => item.query).filter(Boolean);
  } catch (error) {
    logger.warn("⚠️ Popular searches API failed:", error.message);
    return [];
  }
};

export const getSearchSuggestions = async (query = "", limit = 8) => {
  try {
    const data = await apiClient.get("/search/suggestions", {
      params: {
        query,
        limit,
      },
    });
    return data?.suggestions || [];
  } catch (error) {
    logger.warn("⚠️ Search suggestions API failed:", error.message);
    return [];
  }
};

// Get popular movies
export const getPopular = async (page = 1) => {
  try {
    const data = await apiClient.get("/movies/popular", { params: { page } });
    return Array.isArray(data) ? data : data.results || [];
  } catch (error) {
    logger.warn("⚠️ Popular API failed:", error.message);
    return [];
  }
};

// Get new releases (current year)
export const getNewReleases = async (type = "movie") => {
  try {
    const data = await apiClient.get(`/trending/${type}/week`);
    return Array.isArray(data) ? data : data.results || [];
  } catch (error) {
    logger.warn("⚠️ New releases API failed:", error.message);
    return [];
  }
};

// Search by genre/keyword
export const searchByGenre = async (genre, type = "all") => {
  try {
    const data = await apiClient.get("/search/by-genre", {
      params: {
        genre,
        type: type === "all" ? undefined : type,
        page: 1,
      },
    });
    return data.Search || data.results || [];
  } catch (error) {
    logger.warn("⚠️ Genre search failed:", error.message);
    return [];
  }
};

// Get top rated (high quality) content
export const getTopRated = async () => {
  try {
    const data = await apiClient.get("/movies/top-rated");
    return Array.isArray(data) ? data : data.results || [];
  } catch (error) {
    logger.warn("⚠️ Top Rated API failed:", error.message);
    return [];
  }
};

export const getTrendingMovies = async () => {
  return await getTrending("movie", "week");
};

// Get trailers/videos for a movie
export const getMovieVideos = async (tmdbId) => {
  try {
    logger.info(`🎬 Fetching movie videos for TMDB ID: ${tmdbId}`);
    const response = await apiClient.get(`/movies/${tmdbId}/videos`);
    logger.info("🎬 Movie videos response:", response);
    // Response is already unwrapped by interceptor
    return response;
  } catch (error) {
    logger.error("❌ Error fetching movie videos:", error);
    throw error;
  }
};

// Get trailers/videos for a TV series
export const getTVVideos = async (tmdbId) => {
  try {
    logger.info(`🎬 Fetching TV videos for TMDB ID: ${tmdbId}`);
    const response = await apiClient.get(`/tv/${tmdbId}/videos`);
    logger.info("🎬 TV videos response:", response);
    return response;
  } catch (error) {
    logger.error("❌ Error fetching TV videos:", error);
    throw error;
  }
};

// Get trailers/videos for a specific season
export const getSeasonVideos = async (tmdbId, seasonNumber) => {
  try {
    logger.info(
      `🎬 Fetching season ${seasonNumber} videos for TMDB ID: ${tmdbId}`,
    );
    const response = await apiClient.get(
      `/tv/${tmdbId}/season/${seasonNumber}/videos`,
    );
    logger.info("🎬 Season videos response:", response);
    return response;
  } catch (error) {
    logger.error("❌ Error fetching season videos:", error);
    throw error;
  }
};

// Helper function to extract YouTube trailer from TMDB results
export const extractYouTubeTrailer = (videosData) => {
  logger.info("🎬 Extracting trailer from:", videosData);

  if (!videosData?.results || !Array.isArray(videosData.results)) {
    logger.warn("⚠️ No results array in videos data");
    return null;
  }

  logger.info(`🎬 Found ${videosData.results.length} videos`);

  // Priority order: Official Trailer > Trailer > Teaser > Clip
  const priorities = ["Trailer", "Teaser", "Clip", "Featurette"];

  // First, try to find official trailers
  for (const type of priorities) {
    const video = videosData.results.find(
      (v) => v.site === "YouTube" && v.type === type && v.official === true,
    );
    if (video) {
      logger.info(`✅ Found official ${type}: ${video.key}`);
      return video.key;
    }
  }

  // Second, try non-official but matching types
  for (const type of priorities) {
    const video = videosData.results.find(
      (v) => v.site === "YouTube" && v.type === type,
    );
    if (video) {
      logger.info(`✅ Found ${type}: ${video.key}`);
      return video.key;
    }
  }

  // Fallback: any YouTube video
  const anyYoutubeVideo = videosData.results.find((v) => v.site === "YouTube");

  if (anyYoutubeVideo) {
    logger.info(`✅ Found YouTube video: ${anyYoutubeVideo.key}`);
    return anyYoutubeVideo.key;
  }

  logger.warn("❌ No YouTube trailers found");
  return null;
};

// ========== WATCH PROVIDERS ==========

/**
 * Get watch providers (streaming availability) for a movie
 */
export const getMovieWatchProviders = async (tmdbId) => {
  try {
    logger.info("🎬 Fetching watch providers for movie:", tmdbId);
    const data = await apiClient.get(`/movies/${tmdbId}/watch-providers`);
    logger.info("✅ Watch providers fetched:", data);
    return data || {};
  } catch (error) {
    logger.error("❌ Error fetching movie watch providers:", error);
    // Return empty structure instead of throwing
    return { results: {} };
  }
};

/**
 * Get watch providers for a TV show
 */
export const getTVWatchProviders = async (tmdbId) => {
  try {
    logger.info("📺 Fetching watch providers for TV:", tmdbId);
    const data = await apiClient.get(`/tv/${tmdbId}/watch-providers`);
    logger.info("✅ Watch providers fetched:", data);
    return data || {};
  } catch (error) {
    logger.error("❌ Error fetching TV watch providers:", error);
    return { results: {} };
  }
};

/**
 * Get watch providers for any content (movie or TV)
 */
export const getWatchProviders = async (imdbID) => {
  try {
    logger.info("🔍 getWatchProviders called with:", imdbID);

    // Parse the imdbID to determine type and TMDB ID
    if (imdbID.startsWith("tmdb:")) {
      const parts = imdbID.split(":");
      const mediaType = parts[1]; // 'movie' or 'tv'
      const tmdbId = parseInt(parts[2], 10);

      logger.info("📊 Parsed TMDB format:", { mediaType, tmdbId });

      if (mediaType === "tv") {
        return await getTVWatchProviders(tmdbId);
      } else {
        return await getMovieWatchProviders(tmdbId);
      }
    }

    // For legacy IMDb IDs, get details first to determine type
    logger.info("🔄 Legacy IMDb ID, fetching details first...");
    const details = await getMovieDetails(imdbID);
    logger.info("📄 Movie details:", {
      Type: details.Type,
      imdbID: details.imdbID,
    });

    if (details.Type === "series") {
      // Extract TMDB ID from imdbID in the response
      const tmdbId = extractTmdbId(details.imdbID);
      logger.info("📺 Series TMDB ID:", tmdbId);
      if (tmdbId) {
        return await getTVWatchProviders(tmdbId);
      }
    } else {
      const tmdbId = extractTmdbId(details.imdbID);
      logger.info("🎬 Movie TMDB ID:", tmdbId);
      if (tmdbId) {
        return await getMovieWatchProviders(tmdbId);
      }
    }

    logger.warn("⚠️ Could not extract TMDB ID, returning empty results");
    return { results: {} };
  } catch (error) {
    logger.error("❌ Error in getWatchProviders:", error);
    return { results: {} };
  }
};

// Helper to extract TMDB ID from various formats
const extractTmdbId = (id) => {
  if (!id) return null;
  if (id.startsWith("tmdb:")) {
    const parts = id.split(":");
    return parseInt(parts[2], 10);
  }
  return null;
};

// ========== REVIEWS ==========

/**
 * Get reviews for a movie
 * @param {number} tmdbId - TMDB movie ID
 * @param {number} page - Page number (default: 1)
 * @returns {Promise<Object>} Reviews data with pagination
 */
export const getMovieReviews = async (tmdbId, page = 1) => {
  try {
    logger.info(`🎬 Fetching reviews for movie ${tmdbId}, page ${page}`);
    const data = await apiClient.get(`/movies/${tmdbId}/reviews`, {
      params: { page },
    });
    logger.info(
      "✅ Movie reviews fetched:",
      data?.results?.length || 0,
      "reviews",
    );
    return data || { results: [], total_results: 0 };
  } catch (error) {
    logger.error("❌ Error fetching movie reviews:", error);
    return { results: [], total_results: 0 };
  }
};

/**
 * Get reviews for a TV show
 * @param {number} tmdbId - TMDB TV show ID
 * @param {number} page - Page number (default: 1)
 * @returns {Promise<Object>} Reviews data with pagination
 */
export const getTVReviews = async (tmdbId, page = 1) => {
  try {
    logger.info(`📺 Fetching reviews for TV ${tmdbId}, page ${page}`);
    const data = await apiClient.get(`/tv/${tmdbId}/reviews`, {
      params: { page },
    });
    logger.info(
      "✅ TV reviews fetched:",
      data?.results?.length || 0,
      "reviews",
    );
    return data || { results: [], total_results: 0 };
  } catch (error) {
    logger.error("❌ Error fetching TV reviews:", error);
    return { results: [], total_results: 0 };
  }
};

// ========== USER SUBSCRIPTIONS ==========

/**
 * Get user's streaming subscriptions
 */
export const getUserSubscriptions = async () => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      logger.warn("⚠️ No auth token available for subscriptions");
      return [];
    }

    const data = await apiClient.get("/user/subscriptions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    logger.info("✅ User subscriptions fetched:", data);
    return data?.subscriptions || [];
  } catch (error) {
    logger.error("❌ Error fetching user subscriptions:", error);
    return [];
  }
};

/**
 * Update user's streaming subscriptions
 */
export const updateUserSubscriptions = async (subscriptions) => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const data = await apiClient.put(
      "/user/subscriptions",
      { subscriptions },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    logger.info("✅ User subscriptions updated:", data);
    return data;
  } catch (error) {
    logger.error("❌ Error updating user subscriptions:", error);
    throw error;
  }
};

// ========== GAMIFICATION ==========

/**
 * Fetch the user's gamification state from the cloud.
 * Returns null if unauthenticated or on any error.
 */
export const getGamificationData = async () => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return null;
    const data = await apiClient.get("/user/gamification", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data?.gamification || null;
  } catch (error) {
    logger.warn("⚠️ Could not fetch gamification from cloud:", error.message);
    return null;
  }
};

/**
 * Push the user's gamification state to the cloud.
 * Fire-and-forget — local AsyncStorage is source of truth.
 */
export const syncGamificationData = async (state) => {
  try {
    // Legacy endpoint is intentionally disabled server-side.
    // Keep this function as a no-op for backwards compatibility.
    void state;
  } catch (error) {
    logger.warn("⚠️ Legacy gamification sync ignored:", error.message);
  }
};

export const recordGamificationWatch = async (movieId, listName) => {
  const idempotencyKey = createIdempotencyKey("watch");
  const data = await apiClient.post("/user/gamification/actions/watch", {
    movieId,
    listName,
  }, {
    headers: {
      "X-Idempotency-Key": idempotencyKey,
    },
  });
  return data || null;
};

export const recordGamificationListCreated = async (listName) => {
  const idempotencyKey = createIdempotencyKey("list-created");
  const data = await apiClient.post("/user/gamification/actions/list-created", {
    listName,
  }, {
    headers: {
      "X-Idempotency-Key": idempotencyKey,
    },
  });
  return data || null;
};

export const recordGamificationListCompleted = async (listName) => {
  const idempotencyKey = createIdempotencyKey("list-completed");
  const data = await apiClient.post("/user/gamification/actions/list-completed", {
    listName,
  }, {
    headers: {
      "X-Idempotency-Key": idempotencyKey,
    },
  });
  return data || null;
};

export const getWatchedEpisodes = async (contentId) => {
  try {
    const safeContentId = encodeURIComponent(contentId);
    const data = await apiClient.get(`/user/watched/${safeContentId}`);
    return data?.episodes || {};
  } catch (error) {
    logger.warn("⚠️ Could not fetch watched episodes:", error.message);
    return {};
  }
};

export const setEpisodeWatched = async (
  contentId,
  season,
  episode,
  watched,
) => {
  const safeContentId = encodeURIComponent(contentId);
  const data = await apiClient.patch(
    `/user/watched/${safeContentId}/episodes`,
    {
      season,
      episode,
      watched,
    },
  );
  return data?.episodes || {};
};

const ApiService = {
  async searchMovies(query, filter = "all", page = 1) {
    const resp = await searchMovies(query, filter, page);
    return normalizeResults(resp);
  },
  async getTrendingMovies() {
    const trending = await getTrending("movie", "week");
    return { results: trending };
  },
  getMovieDetails,
};

export { API_BASE_URL };
export default ApiService;

