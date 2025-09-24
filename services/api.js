import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { auth } from "../firebaseConfig";

// Production and development URL configuration
const PRODUCTION_BASE_URL = process.env.EXPO_PUBLIC_PRODUCTION_API_URL || "https://cinelink-backend-production.up.railway.app/api";
const EXPLICIT_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || Constants?.expoConfig?.extra?.API_BASE_URL;

// Prioritize explicit URL in development, fallback to production URL
const API_BASE_URL = __DEV__ ? (EXPLICIT_BASE_URL || PRODUCTION_BASE_URL) : (PRODUCTION_BASE_URL || EXPLICIT_BASE_URL);

console.log("🔧 API Configuration:");
console.log("  - Base URL:", API_BASE_URL);
console.log("  - Platform:", Platform.OS);
console.log("  - Dev Mode:", __DEV__);
console.log("  - Production URL:", PRODUCTION_BASE_URL);
console.log("  - Explicit URL:", EXPLICIT_BASE_URL);

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Test backend connectivity with retry logic
let backendAvailable = false;
let connectionTested = false;
let actualWorkingURL = API_BASE_URL;

// Enhanced backend connection testing
const testBackendConnection = async (retryCount = 0) => {
  const urlsToTest = [PRODUCTION_BASE_URL];
  for (const baseUrl of urlsToTest) {
    try {
      console.log(`🔍 Testing backend connection (attempt ${retryCount + 1}) to ${baseUrl}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(`${baseUrl}/health`, {
        signal: controller.signal,
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        apiClient.defaults.baseURL = baseUrl;
        actualWorkingURL = baseUrl;
        backendAvailable = true;
        connectionTested = true;
        console.log("✅ Backend is available and responding");
        return true;
      }
    } catch (error) {
      console.log(`⚠️ Backend connection failed for ${baseUrl}: ${error.message}`);
    }
  }

  // Retry logic with exponential backoff
  if (retryCount < 2) {
    const delay = 2000 * (retryCount + 1);
    console.log(`🔄 Retrying in ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return testBackendConnection(retryCount + 1);
  }

  backendAvailable = false;
  connectionTested = true;
  actualWorkingURL = API_BASE_URL;
  console.log("❌ Backend unavailable after retries, using fallback mode");
  return false;
};

// Test connection on app start with a slight delay
setTimeout(() => {
  if (!connectionTested) {
    testBackendConnection();
  }
}, 1000);

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  console.log("🌐 API Request:", config.url, config);
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn("Failed to get auth token:", error);
  }
  return config;
});

// Enhanced response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", response.config.url, response.data);
    return response.data;
  },
  (error) => {
    console.log("🚨 API Error:", error.message, error.config?.url);
    console.log("🚨 API Error Code:", error.code);
    console.log("🚨 API Error Config:", error.config?.url);

    if (
      error.code === "ECONNREFUSED" ||
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNABORTED" ||
      error.message.includes("Network Error") ||
      error.message.includes("timeout") ||
      error.response?.status >= 500
    ) {
      backendAvailable = false;
      console.log("🔄 Backend marked as unavailable, switching to fallback");
    }
    return Promise.reject(error);
  }
);

// Fallback to OMDb API if backend is unavailable
const OMDB_API_KEY = Constants.expoConfig.extra.OMDB_API_KEY;

export const searchMovies = async (query) => {
  if (backendAvailable) {
    try {
      console.log("🎬 Using backend for search:", query);
      const data = await apiClient.get("/movies/search", {
        params: { q: query },
      });
      console.log("✅ Backend search successful");
      return data.Search || [];
    } catch (error) {
      console.warn("⚠️ Backend search failed, using fallback");
      backendAvailable = false;
    }
  }

  console.log("🔄 Using OMDb fallback for search:", query);
  const trimmedQuery = query.trim();
  const searchType = trimmedQuery.length < 3 ? "t" : "s";
  const url = `https://www.omdbapi.com/?${searchType}=${encodeURIComponent(trimmedQuery)}&apikey=${OMDB_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.Response === "False") return [];
  return trimmedQuery.length < 3 ? [data] : data.Search || [];
};

export const getMovieDetails = async (imdbID) => {
  if (backendAvailable) {
    try {
      console.log("🎬 Using backend for movie details:", imdbID);
      const result = await apiClient.get(`/movies/details/${imdbID}`);
      console.log("✅ Backend details successful");
      return result;
    } catch (error) {
      console.warn("⚠️ Backend details failed, using fallback");
      backendAvailable = false;
    }
  }

  console.log("🔄 Using OMDb fallback for details:", imdbID);
  const response = await fetch(
    `https://www.omdbapi.com/?i=${imdbID}&apikey=${OMDB_API_KEY}&plot=full`
  );
  const data = await response.json();
  if (data.Response === "False") throw new Error(data.Error);
  return data;
};

export const getSeasonDetails = async (imdbID, season) => {
  if (backendAvailable) {
    try {
      console.log("🎬 Using backend for season details:", imdbID, season);
      const result = await apiClient.get(`/movies/season/${imdbID}/${season}`);
      console.log("✅ Backend season details successful");
      return result;
    } catch (error) {
      console.warn("⚠️ Backend season details failed, using fallback");
      backendAvailable = false;
    }
  }

  console.log("🔄 Using OMDb fallback for season details:", imdbID, season);
  const response = await fetch(
    `https://www.omdbapi.com/?i=${imdbID}&Season=${season}&apikey=${OMDB_API_KEY}`
  );
  const data = await response.json();
  if (data.Response === "False") throw new Error(data.Error);
  return data;
};

export const getEpisodeDetails = async (imdbID, season, episode) => {
  if (backendAvailable) {
    try {
      console.log("🎬 Using backend for episode details:", imdbID, season, episode);
      const result = await apiClient.get(`/movies/episode/${imdbID}/${season}/${episode}`);
      console.log("✅ Backend episode details successful");
      return result;
    } catch (error) {
      console.warn("⚠️ Backend episode details failed, using fallback");
      backendAvailable = false;
    }
  }

  console.log("🔄 Using OMDb fallback for episode details:", imdbID, season, episode);
  const response = await fetch(
    `https://www.omdbapi.com/?i=${imdbID}&Season=${season}&Episode=${episode}&apikey=${OMDB_API_KEY}`
  );
  const data = await response.json();
  if (data.Response === "False") throw new Error(data.Error);
  return data;
};

export const getRecommendations = async (title) => {
  if (backendAvailable) {
    try {
      console.log("🎬 Using backend for recommendations:", title);
      const data = await apiClient.post("/recommendations", {
        title,
        top_n: 10,
      });
      console.log("✅ Backend recommendations successful");
      return data.recommendations || [];
    } catch (error) {
      console.warn("⚠️ Backend recommendations failed, using fallback");
    }
  }

  console.log("🔄 Using direct API fallback for recommendations:", title);
  const response = await fetch("https://movie-reco-api.onrender.com/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titles: [title], top_n: 10 }),
  });

  const data = await response.json();
  const recommendations = data.recommendations || [];

  const detailedRecommendations = (
    await Promise.all(
      recommendations.map(async (rec) => {
        try {
          const omdbResponse = await fetch(
            `https://www.omdbapi.com/?t=${encodeURIComponent(rec.title)}&y=${rec.release_year}&apikey=${OMDB_API_KEY}`
          );
          const omdbData = await omdbResponse.json();

          if (omdbData.Response === "True") {
            return {
              ...rec,
              imdbID: omdbData.imdbID,
              Poster: omdbData.Poster,
              imdbRating: omdbData.imdbRating,
              Runtime: omdbData.Runtime,
            };
          }
          return null;
        } catch (error) {
          console.error("Error fetching OMDb details:", error);
          return null;
        }
      })
    )
  ).filter((rec) => rec !== null);

  return detailedRecommendations;
};

export const getBatchMovieDetails = async (imdbIDs) => {
  if (backendAvailable) {
    try {
      console.log("🎬 Using backend for batch movie details:", imdbIDs);
      const data = await apiClient.post("/movies/batch-details", { imdbIDs });
      console.log("✅ Backend batch details successful");
      return data.results || [];
    } catch (error) {
      console.warn("⚠️ Backend batch details failed, using fallback");
      backendAvailable = false;
    }
  }

  console.log("🔄 Using OMDb fallback for batch details:", imdbIDs);
  const results = await Promise.allSettled(
    imdbIDs.map((id) => getMovieDetails(id))
  );
  return results.map((result, index) => ({
    imdbID: imdbIDs[index],
    data: result.status === "fulfilled" ? result.value : null,
    error: result.status === "rejected" ? result.reason.message : null,
  }));
};

export const getUserProfile = async () => {
  try {
    console.log("🎬 Fetching user profile");
    const result = await apiClient.get("/user/profile");
    console.log("✅ User profile fetched successfully");
    return result;
  } catch (error) {
    console.warn("⚠️ Failed to fetch user profile:", error.message);
    throw error;
  }
};

export const addToFavorites = async (movie) => {
  try {
    console.log("🎬 Adding to favorites:", movie);
    const result = await apiClient.post("/user/favorites", { movie });
    console.log("✅ Added to favorites successfully");
    return result;
  } catch (error) {
    console.warn("⚠️ Failed to add to favorites:", error.message);
    throw error;
  }
};

export const removeFromFavorites = async (imdbID) => {
  try {
    console.log("🎬 Removing from favorites:", imdbID);
    const result = await apiClient.delete(`/user/favorites/${imdbID}`);
    console.log("✅ Removed from favorites successfully");
    return result;
  } catch (error) {
    console.warn("⚠️ Failed to remove from favorites:", error.message);
    throw error;
  }
};

export const createWatchlist = async (name) => {
  try {
    console.log("🎬 Creating watchlist:", name);
    const result = await apiClient.post("/user/watchlists", { name });
    console.log("✅ Watchlist created successfully");
    return result;
  } catch (error) {
    console.warn("⚠️ Failed to create watchlist:", error.message);
    throw error;
  }
};

export const addToWatchlist = async (watchlistName, movie) => {
  try {
    console.log("🎬 Adding to watchlist:", watchlistName, movie);
    const result = await apiClient.post(`/user/watchlists/${watchlistName}/movies`, { movie });
    console.log("✅ Added to watchlist successfully");
    return result;
  } catch (error) {
    console.warn("⚠️ Failed to add to watchlist:", error.message);
    throw error;
  }
};

export const toggleWatchedStatus = async (watchlistName, imdbID) => {
  try {
    console.log("🎬 Toggling watched status:", watchlistName, imdbID);
    const result = await apiClient.patch(`/user/watchlists/${watchlistName}/movies/${imdbID}/watched`);
    console.log("✅ Watched status toggled successfully");
    return result;
  } catch (error) {
    console.warn("⚠️ Failed to toggle watched status:", error.message);
    throw error;
  }
};

export const getBackendStatus = () => ({
  available: backendAvailable,
  tested: connectionTested,
  baseUrl: actualWorkingURL,
});

export const retestBackendConnection = async () => {
  connectionTested = false;
  backendAvailable = false;
  actualWorkingURL = API_BASE_URL;
  return await testBackendConnection();
};