import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { auth } from "../../firebaseConfig";

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
  } catch (_e) {
    // Ignore parse errors and return original.
  }
  return url;
};

// Production and development URL configuration
const PRODUCTION_BASE_URL =
  process.env.EXPO_PUBLIC_PRODUCTION_API_URL ||
  "https://cinelink-backend-n.onrender.com";
const EXPLICIT_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  Constants?.expoConfig?.extra?.API_BASE_URL;

const NORMALIZED_EXPLICIT_BASE_URL = normalizeDevBaseUrl(EXPLICIT_BASE_URL);

// Prioritize production URL unless explicitly set to localhost
const isLocalhost = EXPLICIT_BASE_URL && (
  EXPLICIT_BASE_URL.includes('localhost') || 
  EXPLICIT_BASE_URL.includes('127.0.0.1') ||
  EXPLICIT_BASE_URL.includes('10.0.2.2')
);

const API_BASE_URL = (isLocalhost && __DEV__)
  ? NORMALIZED_EXPLICIT_BASE_URL
  : PRODUCTION_BASE_URL;

console.log("🔧 API Configuration:");
console.log("  - Base URL:", API_BASE_URL);
console.log("  - Platform:", Platform.OS);
console.log("  - Dev Mode:", __DEV__);
console.log("  - Production URL:", PRODUCTION_BASE_URL);
console.log("  - Explicit URL:", NORMALIZED_EXPLICIT_BASE_URL);

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30s to handle slow backend responses
  headers: {
    "Content-Type": "application/json",
  },
});

// Test backend connectivity with retry logic
let backendAvailable = false;
let connectionTested = false;
let actualWorkingURL = API_BASE_URL;
let consecutiveFailures = 0;
const MAX_FAILURES_BEFORE_UNAVAILABLE = 3; // Require 3 consecutive failures before marking unavailable
let periodicHealthCheckInterval = null;

// Enhanced backend connection testing
const testBackendConnection = async (retryCount = 0) => {
  // Test only the configured base URL (skip localhost if not explicitly set in dev)
  const urlsToTest = isLocalhost && __DEV__
    ? [NORMALIZED_EXPLICIT_BASE_URL, PRODUCTION_BASE_URL].filter(Boolean)
    : [PRODUCTION_BASE_URL].filter(Boolean);
  
  for (const baseUrl of urlsToTest) {
    try {
      console.log(
        `🔍 Testing backend connection (attempt ${retryCount + 1}) to ${baseUrl}`,
      );
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased to 15s
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
        consecutiveFailures = 0; // Reset failure counter on success
        console.log("✅ Backend is available and responding");

        // Start periodic health checks if not already running
        if (!periodicHealthCheckInterval) {
          startPeriodicHealthCheck();
        }

        return true;
      }
    } catch (error) {
      console.log(
        `⚠️ Backend connection failed for ${baseUrl}: ${error.message}`,
      );
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

  // Start periodic health checks to auto-recover when backend comes back
  if (!periodicHealthCheckInterval) {
    startPeriodicHealthCheck();
  }

  return false;
};

// Periodic health check to auto-recover when backend becomes available
const startPeriodicHealthCheck = () => {
  if (periodicHealthCheckInterval) {
    clearInterval(periodicHealthCheckInterval);
  }

  periodicHealthCheckInterval = setInterval(async () => {
    // Only check if backend is marked unavailable
    if (!backendAvailable) {
      console.log("🔄 Automatic health check: Testing backend availability...");
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`${actualWorkingURL}/health`, {
          signal: controller.signal,
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          backendAvailable = true;
          consecutiveFailures = 0;
          console.log("✅ Backend auto-recovered! Now available again.");
        }
      } catch (error) {
        console.log(`⚠️ Periodic health check failed: ${error.message}`);
      }
    }
  }, 30000); // Check every 30 seconds
};

// Clean up interval on app unload (if applicable)
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (periodicHealthCheckInterval) {
      clearInterval(periodicHealthCheckInterval);
    }
  });
}

// Test connection on app start with a slight delay
// setTimeout(() => {
//   if (!connectionTested) {
//     testBackendConnection();
//   }
// }, 1000);

testBackendConnection();

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  console.log(
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
  } catch (error) {
    console.warn("Failed to get auth token:", error);
  }
  return config;
});

// Enhanced response interceptor
apiClient.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", response.config.url, response.data);
    // Reset consecutive failures on successful response
    consecutiveFailures = 0;
    if (!backendAvailable) {
      backendAvailable = true;
      console.log("✅ Backend recovered and responding again");
    }
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
    console.log("🚨 API Error:", error.message, error.config?.url);
    console.log("🚨 API Error Code:", error.code);
    console.log("🚨 API Error Config:", error.config?.url);

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
      } catch (_e) {
        // Fall through to normal rejection.
      }
    }

    // Only mark backend as unavailable after consecutive failures
    if (
      error.code === "ECONNREFUSED" ||
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNABORTED" ||
      error.message.includes("Network Error") ||
      error.message.includes("timeout") ||
      error.response?.status >= 500
    ) {
      consecutiveFailures++;
      console.log(
        `⚠️ Backend request failed (${consecutiveFailures}/${MAX_FAILURES_BEFORE_UNAVAILABLE}):`,
        error.message,
      );

      // Only mark as unavailable after multiple consecutive failures
      if (consecutiveFailures >= MAX_FAILURES_BEFORE_UNAVAILABLE) {
        backendAvailable = false;
        console.log(
          "🔄 Backend marked as unavailable after multiple failures, switching to fallback",
        );
      } else {
        console.log(
          `ℹ️ Backend still considered available, will retry on next request`,
        );
      }
    }
    return Promise.reject(error);
  },
);

// Fallback to OMDb API if backend is unavailable
const OMDB_API_KEY =
  process.env.EXPO_PUBLIC_OMDB_API_KEY ||
  Constants?.expoConfig?.extra?.OMDB_API_KEY;
// Named search function used by hooks expecting OMDb-like shape
export const searchMovies = async (
  query,
  filter = "all",
  page = 1,
  signal = null,
) => {
  const trimmedQuery = (query || "").trim();
  if (!trimmedQuery) {
    return { Search: [], totalResults: "0", Response: "False" };
  }

  const normType = filter && filter !== "all" ? filter : undefined; // movie|series|episode

  if (backendAvailable) {
    try {
      console.log("🎬 Using backend for search:", trimmedQuery, filter, page);

      // Genre keywords detection
      const genreKeywords = [
        "action",
        "adventure",
        "animation",
        "comedy",
        "crime",
        "documentary",
        "drama",
        "family",
        "fantasy",
        "history",
        "horror",
        "music",
        "mystery",
        "romance",
        "science fiction",
        "sci-fi",
        "sci fi",
        "scifi",
        "thriller",
        "war",
        "western",
        "anime",
        "bollywood",
        "hollywood",
        "korean",
        "japanese",
        "kids",
        "reality",
        "soap",
        "talk",
      ];

      const queryLower = trimmedQuery.toLowerCase().trim();
      const isGenreSearch = genreKeywords.some(
        (keyword) => queryLower === keyword || queryLower === keyword + "s",
      );

      console.log(`🔍 Genre check: "${queryLower}" | Match: ${isGenreSearch}`);

      // If genre search, use genre endpoint
      if (isGenreSearch) {
        console.log("🎭 Detected genre search:", trimmedQuery);
        const genreResult = await apiClient.get("/search/by-genre", {
          params: { genre: trimmedQuery, type: normType, page },
          signal: signal,
        });

        console.log("📦 Genre result structure:", genreResult);

        if (genreResult && genreResult.Search) {
          console.log(
            `✅ Genre search returned ${genreResult.Search.length} results`,
          );
          return genreResult;
        } else {
          console.warn(
            "⚠️ Genre search returned invalid structure:",
            genreResult,
          );
        }
      }

      // Regular title search
      const titleSearch = apiClient.get("/movies/search", {
        params: { q: trimmedQuery, type: normType, page },
        signal: signal,
      });

      // Person search (if query looks like a name - 2+ words, 2+ chars each)
      const words = trimmedQuery.split(/\s+/);
      const looksLikeName =
        words.length >= 2 &&
        words.every((w) => w.length >= 2 && /^[a-zA-Z]+$/.test(w));

      console.log(
        `🔍 Query analysis: "${trimmedQuery}" | Words: ${words.length} | Looks like name: ${looksLikeName}`,
      );

      const personSearch =
        looksLikeName && page === 1
          ? (async () => {
              try {
                console.log("👤 Running person search for:", trimmedQuery);
                const result = await apiClient.get("/search/by-person", {
                  params: { query: trimmedQuery, page: 1 },
                  signal: signal,
                });

                // Limit initial results to 10, store rest for pagination
                if (result?.results && result.results.length > 10) {
                  console.log(
                    `✅ Person search found ${result.results.length} results, showing first 10`,
                  );
                  return {
                    results: result.results.slice(0, 10),
                    hasMore: true,
                    allResults: result.results, // Store for potential "load more"
                  };
                }

                console.log(
                  `✅ Person search found ${result?.results?.length || 0} results`,
                );

                // If no results and query has double letters, try correcting common typos
                if (
                  (!result?.results || result.results.length === 0) &&
                  /(.)\1/.test(trimmedQuery)
                ) {
                  console.log("🔄 Trying spelling correction...");
                  // Remove duplicate consecutive letters (bradd -> brad, chrisstopher -> christopher)
                  const correctedQuery = trimmedQuery.replace(/(.)\1+/g, "$1");
                  if (correctedQuery !== trimmedQuery) {
                    console.log(
                      `📝 Trying corrected name: "${correctedQuery}"`,
                    );
                    const correctedResult = await apiClient.get(
                      "/search/by-person",
                      {
                        params: { query: correctedQuery, page: 1 },
                        signal: signal,
                      },
                    );
                    if (correctedResult?.results?.length > 0) {
                      console.log(
                        `✅ Spelling correction worked! Found ${correctedResult.results.length} results`,
                      );
                      return correctedResult;
                    }
                  }
                }

                return result;
              } catch (err) {
                console.warn("⚠️ Person search failed:", err.message);
                return { results: [] };
              }
            })()
          : Promise.resolve({ results: [] });

      // Wait for both searches
      const [titleData, personData] = await Promise.all([
        titleSearch,
        personSearch,
      ]);

      console.log("✅ Backend search successful");

      // Combine results (person results FIRST for relevance, then title search)
      let combinedResults = [];

      // Add person search results first (more relevant when searching actor/director names)
      if (
        personData &&
        personData.results &&
        Array.isArray(personData.results)
      ) {
        const totalPersonResults =
          personData.allResults?.length || personData.results.length;
        console.log(
          `📺 Adding ${personData.results.length} results from person search (${totalPersonResults} total available)`,
        );

        // Filter person results by type if filter is active
        let filteredPersonResults = personData.results;
        if (normType) {
          filteredPersonResults = personData.results.filter(
            (r) => r.Type === normType,
          );
          console.log(
            `🎯 Filtered to ${filteredPersonResults.length} ${normType} results`,
          );
        }

        combinedResults = [...filteredPersonResults];
      }

      // Then add title search results (avoid duplicates by imdbID)
      const existingIds = new Set(combinedResults.map((r) => r.imdbID));

      if (titleData && Array.isArray(titleData)) {
        const newResults = titleData.filter((r) => !existingIds.has(r.imdbID));
        combinedResults = [...combinedResults, ...newResults];
      } else if (titleData && titleData.Search) {
        const newResults = titleData.Search.filter(
          (r) => !existingIds.has(r.imdbID),
        );
        combinedResults = [...combinedResults, ...newResults];
      } else if (titleData && titleData.results) {
        const newResults = (titleData.results || []).filter(
          (r) => !existingIds.has(r.imdbID),
        );
        combinedResults = [...combinedResults, ...newResults];
      }

      return {
        Search: combinedResults,
        totalResults: String(combinedResults.length),
        Response: combinedResults.length ? "True" : "False",
      };
    } catch (error) {
      // Re-throw abort errors
      if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
        throw error;
      }
      console.warn("⚠️ Backend search failed, using fallback");
      backendAvailable = false;
    }
  }

  console.log("🔄 Using OMDb fallback for search:", trimmedQuery, filter, page);
  // OMDb paged search uses 's', supports 'type' and 'page'
  const params = new URLSearchParams({ s: trimmedQuery, apikey: OMDB_API_KEY });
  if (normType) params.set("type", normType);
  if (page) params.set("page", String(page));

  const response = await fetch(
    `https://www.omdbapi.com/?${params.toString()}`,
    {
      signal: signal, // Pass AbortSignal to fetch
    },
  );
  const data = await response.json();
  if (data.Response === "False") {
    return { Search: [], totalResults: "0", Response: "False" };
  }
  return data;
};

export const getMovieDetails = async (imdbID) => {
  if (backendAvailable) {
    try {
      console.log("🎬 Using backend for movie details:", imdbID);
      const result = await apiClient.get(`/movies/details/${imdbID}`);
      console.log("✅ Backend details successful");
      return result;
    } catch {
      console.warn("⚠️ Backend details failed, using fallback");
      backendAvailable = false;
    }
  }

  console.log("🔄 Using OMDb fallback for details:", imdbID);
  const response = await fetch(
    `https://www.omdbapi.com/?i=${imdbID}&apikey=${OMDB_API_KEY}&plot=full`,
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
    } catch {
      console.warn("⚠️ Backend season details failed, using fallback");
      backendAvailable = false;
    }
  }

  console.log("🔄 Using OMDb fallback for season details:", imdbID, season);
  const response = await fetch(
    `https://www.omdbapi.com/?i=${imdbID}&Season=${season}&apikey=${OMDB_API_KEY}`,
  );
  const data = await response.json();
  if (data.Response === "False") throw new Error(data.Error);
  return data;
};

export const getEpisodeDetails = async (imdbID, season, episode) => {
  if (backendAvailable) {
    try {
      console.log(
        "🎬 Using backend for episode details:",
        imdbID,
        season,
        episode,
      );
      const result = await apiClient.get(
        `/movies/episode/${imdbID}/${season}/${episode}`,
      );
      console.log("✅ Backend episode details successful");
      return result;
    } catch {
      console.warn("⚠️ Backend episode details failed, using fallback");
      backendAvailable = false;
    }
  }

  console.log(
    "🔄 Using OMDb fallback for episode details:",
    imdbID,
    season,
    episode,
  );
  const response = await fetch(
    `https://www.omdbapi.com/?i=${imdbID}&Season=${season}&Episode=${episode}&apikey=${OMDB_API_KEY}`,
  );
  const data = await response.json();
  if (data.Response === "False") throw new Error(data.Error);
  return data;
};

export const getRecommendations = async (title) => {
  if (!backendAvailable) {
    console.warn("⚠️ Backend not available for recommendations");
    return [];
  }

  try {
    console.log("🎬 Getting recommendations from backend:", title);
    const data = await apiClient.post("/recommendations", {
      title,
      top_n: 10,
    });
    console.log("✅ Backend recommendations successful");
    return data.recommendations || [];
  } catch (error) {
    console.error("❌ Failed to get recommendations:", error.message);
    return [];
  }
};

export const getBatchMovieDetails = async (imdbIDs) => {
  if (backendAvailable) {
    try {
      console.log("🎬 Using backend for batch movie details:", imdbIDs);
      const data = await apiClient.post("/movies/batch-details", { imdbIDs });
      console.log("✅ Backend batch details successful");
      return data.results || [];
    } catch {
      console.warn("⚠️ Backend batch details failed, using fallback");
      backendAvailable = false;
    }
  }

  console.log("🔄 Using OMDb fallback for batch details:", imdbIDs);
  const results = await Promise.allSettled(
    imdbIDs.map((id) => getMovieDetails(id)),
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

export const getFavorites = async () => {
  try {
    console.log("🎬 Fetching favorites");
    const result = await apiClient.get("/user/favorites");
    console.log("✅ Favorites fetched successfully");
    return result;
  } catch (error) {
    console.warn("⚠️ Failed to fetch favorites:", error.message);
    throw error;
  }
};

export const removeFromFavorites = async (imdbID) => {
  try {
    console.log("🎬 Removing from favorites:", imdbID);
    const result = await apiClient.delete(
      `/user/favorites/${encodeURIComponent(imdbID)}`,
    );
    console.log("✅ Removed from favorites successfully");
    return result;
  } catch (error) {
    console.warn("⚠️ Failed to remove from favorites:", error.message);
    throw error;
  }
};

export const getWatchlists = async () => {
  try {
    console.log("🎬 Fetching watchlists");
    const result = await apiClient.get("/user/watchlists");
    console.log("✅ Watchlists fetched successfully");
    return result;
  } catch (error) {
    console.warn("⚠️ Failed to fetch watchlists:", error.message);
    throw error;
  }
};

export const deleteWatchlist = async (name) => {
  try {
    console.log("🎬 Deleting watchlist:", name);
    const result = await apiClient.delete(
      `/user/watchlists/${encodeURIComponent(name)}`,
    );
    console.log("✅ Watchlist deleted successfully");
    return result;
  } catch (error) {
    console.warn("⚠️ Failed to delete watchlist:", error.message);
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
    const safeName = encodeURIComponent(watchlistName);
    const result = await apiClient.post(`/user/watchlists/${safeName}/movies`, {
      movie,
    });
    console.log("✅ Added to watchlist successfully");
    return result;
  } catch (error) {
    console.warn("⚠️ Failed to add to watchlist:", error.message);
    throw error;
  }
};

export const removeFromWatchlist = async (watchlistName, imdbID) => {
  try {
    console.log("🎬 Removing from watchlist:", watchlistName, imdbID);
    const safeName = encodeURIComponent(watchlistName);
    const safeId = encodeURIComponent(imdbID);
    const result = await apiClient.delete(
      `/user/watchlists/${safeName}/movies/${safeId}`,
    );
    console.log("✅ Removed from watchlist successfully");
    return result;
  } catch (error) {
    console.warn("⚠️ Failed to remove from watchlist:", error.message);
    throw error;
  }
};

export const toggleWatchedStatus = async (watchlistName, imdbID) => {
  try {
    console.log("🎬 Toggling watched status:", watchlistName, imdbID);
    const result = await apiClient.patch(
      `/user/watchlists/${watchlistName}/movies/${imdbID}/watched`,
    );
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
  consecutiveFailures = 0; // Reset failure counter on manual retest
  actualWorkingURL = API_BASE_URL;
  return await testBackendConnection();
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
    };
  if (payload.results)
    return { results: payload.results, totalResults: payload.totalResults };
  return { results: [] };
};

// Get real trending content from backend
export const getTrending = async (type = "movie", timeWindow = "week") => {
  if (backendAvailable) {
    try {
      const data = await apiClient.get(`/trending/${type}/${timeWindow}`);
      return Array.isArray(data) ? data : data.results || [];
    } catch (error) {
      console.warn("⚠️ Trending API failed:", error.message);
    }
  }

  // Fallback to search by current year
  const currentYear = new Date().getFullYear();
  const resp = await searchMovies(
    String(currentYear),
    type === "tv" ? "series" : "movie",
    1,
  );
  return resp.Search || resp.results || [];
};

// Get trending search keywords
export const getTrendingKeywords = async () => {
  if (backendAvailable) {
    try {
      const data = await apiClient.get("/trending/search/keywords");
      return data.keywords || [];
    } catch (error) {
      console.warn("⚠️ Trending keywords API failed:", error.message);
    }
  }

  // Fallback to basic keywords
  return [
    "action movies",
    "comedy series",
    "drama films",
    "thriller movies",
    "horror films",
    "sci-fi movies",
    "adventure movies",
    "fantasy films",
  ];
};

// Get popular movies
export const getPopular = async (page = 1) => {
  if (backendAvailable) {
    try {
      const data = await apiClient.get("/movies/popular", { params: { page } });
      return Array.isArray(data) ? data : data.results || [];
    } catch (error) {
      console.warn("⚠️ Popular API failed:", error.message);
    }
  }

  // Fallback to search by previous year
  const lastYear = new Date().getFullYear() - 1;
  const resp = await searchMovies(String(lastYear), "movie", 1);
  return resp.Search || resp.results || [];
};

// Get new releases (current year)
export const getNewReleases = async (type = "movie") => {
  const currentYear = new Date().getFullYear();
  const resp = await searchMovies(
    String(currentYear),
    type === "tv" ? "series" : "movie",
    1,
  );
  return resp.Search || resp.results || [];
};

// Search by genre/keyword
export const searchByGenre = async (genre, type = "all") => {
  const resp = await searchMovies(genre, type, 1);
  return resp.Search || resp.results || [];
};

// Get top rated (high quality) content
export const getTopRated = async () => {
  if (backendAvailable) {
    try {
      const data = await apiClient.get("/movies/top-rated");
      return Array.isArray(data) ? data : data.results || [];
    } catch (error) {
      console.warn("⚠️ Top Rated API failed:", error.message);
    }
  }

  // Fallback to search for critically acclaimed
  const resp = await searchMovies("award", "movie", 1);
  return resp.Search || resp.results || [];
};

export const getTrendingMovies = async () => {
  return await getTrending("movie", "week");
};

// Get trailers/videos for a movie
export const getMovieVideos = async (tmdbId) => {
  if (!backendAvailable) {
    console.warn("⚠️ Backend unavailable, cannot fetch movie videos");
    return null;
  }

  try {
    console.log(`🎬 Fetching movie videos for TMDB ID: ${tmdbId}`);
    const response = await apiClient.get(`/movies/${tmdbId}/videos`);
    console.log("🎬 Movie videos response:", response);
    // Response is already unwrapped by interceptor
    return response;
  } catch (error) {
    console.error("❌ Error fetching movie videos:", error);
    throw error;
  }
};

// Get trailers/videos for a TV series
export const getTVVideos = async (tmdbId) => {
  if (!backendAvailable) {
    console.warn("⚠️ Backend unavailable, cannot fetch TV videos");
    return null;
  }

  try {
    console.log(`🎬 Fetching TV videos for TMDB ID: ${tmdbId}`);
    const response = await apiClient.get(`/tv/${tmdbId}/videos`);
    console.log("🎬 TV videos response:", response);
    return response;
  } catch (error) {
    console.error("❌ Error fetching TV videos:", error);
    throw error;
  }
};

// Get trailers/videos for a specific season
export const getSeasonVideos = async (tmdbId, seasonNumber) => {
  if (!backendAvailable) {
    console.warn("⚠️ Backend unavailable, cannot fetch season videos");
    return null;
  }

  try {
    console.log(
      `🎬 Fetching season ${seasonNumber} videos for TMDB ID: ${tmdbId}`,
    );
    const response = await apiClient.get(
      `/tv/${tmdbId}/season/${seasonNumber}/videos`,
    );
    console.log("🎬 Season videos response:", response);
    return response;
  } catch (error) {
    console.error("❌ Error fetching season videos:", error);
    throw error;
  }
};

// Helper function to extract YouTube trailer from TMDB results
export const extractYouTubeTrailer = (videosData) => {
  console.log("🎬 Extracting trailer from:", videosData);

  if (!videosData?.results || !Array.isArray(videosData.results)) {
    console.warn("⚠️ No results array in videos data");
    return null;
  }

  console.log(`🎬 Found ${videosData.results.length} videos`);

  // Priority order: Official Trailer > Trailer > Teaser > Clip
  const priorities = ["Trailer", "Teaser", "Clip", "Featurette"];

  // First, try to find official trailers
  for (const type of priorities) {
    const video = videosData.results.find(
      (v) => v.site === "YouTube" && v.type === type && v.official === true,
    );
    if (video) {
      console.log(`✅ Found official ${type}: ${video.key}`);
      return video.key;
    }
  }

  // Second, try non-official but matching types
  for (const type of priorities) {
    const video = videosData.results.find(
      (v) => v.site === "YouTube" && v.type === type,
    );
    if (video) {
      console.log(`✅ Found ${type}: ${video.key}`);
      return video.key;
    }
  }

  // Fallback: any YouTube video
  const anyYoutubeVideo = videosData.results.find((v) => v.site === "YouTube");

  if (anyYoutubeVideo) {
    console.log(`✅ Found YouTube video: ${anyYoutubeVideo.key}`);
    return anyYoutubeVideo.key;
  }

  console.warn("❌ No YouTube trailers found");
  return null;
};

// ========== WATCH PROVIDERS ==========

/**
 * Get watch providers (streaming availability) for a movie
 */
export const getMovieWatchProviders = async (tmdbId) => {
  try {
    console.log("🎬 Fetching watch providers for movie:", tmdbId);
    const data = await apiClient.get(`/movies/${tmdbId}/watch-providers`);
    console.log("✅ Watch providers fetched:", data);
    return data || {};
  } catch (error) {
    console.error("❌ Error fetching movie watch providers:", error);
    // Return empty structure instead of throwing
    return { results: {} };
  }
};

/**
 * Get watch providers for a TV show
 */
export const getTVWatchProviders = async (tmdbId) => {
  try {
    console.log("📺 Fetching watch providers for TV:", tmdbId);
    const data = await apiClient.get(`/tv/${tmdbId}/watch-providers`);
    console.log("✅ Watch providers fetched:", data);
    return data || {};
  } catch (error) {
    console.error("❌ Error fetching TV watch providers:", error);
    return { results: {} };
  }
};

/**
 * Get watch providers for any content (movie or TV)
 */
export const getWatchProviders = async (imdbID) => {
  try {
    console.log("🔍 getWatchProviders called with:", imdbID);

    // Parse the imdbID to determine type and TMDB ID
    if (imdbID.startsWith("tmdb:")) {
      const parts = imdbID.split(":");
      const mediaType = parts[1]; // 'movie' or 'tv'
      const tmdbId = parseInt(parts[2], 10);

      console.log("📊 Parsed TMDB format:", { mediaType, tmdbId });

      if (mediaType === "tv") {
        return await getTVWatchProviders(tmdbId);
      } else {
        return await getMovieWatchProviders(tmdbId);
      }
    }

    // For legacy IMDb IDs, get details first to determine type
    console.log("🔄 Legacy IMDb ID, fetching details first...");
    const details = await getMovieDetails(imdbID);
    console.log("📄 Movie details:", {
      Type: details.Type,
      imdbID: details.imdbID,
    });

    if (details.Type === "series") {
      // Extract TMDB ID from imdbID in the response
      const tmdbId = extractTmdbId(details.imdbID);
      console.log("📺 Series TMDB ID:", tmdbId);
      if (tmdbId) {
        return await getTVWatchProviders(tmdbId);
      }
    } else {
      const tmdbId = extractTmdbId(details.imdbID);
      console.log("🎬 Movie TMDB ID:", tmdbId);
      if (tmdbId) {
        return await getMovieWatchProviders(tmdbId);
      }
    }

    console.warn("⚠️ Could not extract TMDB ID, returning empty results");
    return { results: {} };
  } catch (error) {
    console.error("❌ Error in getWatchProviders:", error);
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
    console.log(`🎬 Fetching reviews for movie ${tmdbId}, page ${page}`);
    const data = await apiClient.get(`/movies/${tmdbId}/reviews`, {
      params: { page },
    });
    console.log(
      "✅ Movie reviews fetched:",
      data?.results?.length || 0,
      "reviews",
    );
    return data || { results: [], total_results: 0 };
  } catch (error) {
    console.error("❌ Error fetching movie reviews:", error);
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
    console.log(`📺 Fetching reviews for TV ${tmdbId}, page ${page}`);
    const data = await apiClient.get(`/tv/${tmdbId}/reviews`, {
      params: { page },
    });
    console.log(
      "✅ TV reviews fetched:",
      data?.results?.length || 0,
      "reviews",
    );
    return data || { results: [], total_results: 0 };
  } catch (error) {
    console.error("❌ Error fetching TV reviews:", error);
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
      console.warn("⚠️ No auth token available for subscriptions");
      return [];
    }

    const data = await apiClient.get("/user/subscriptions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("✅ User subscriptions fetched:", data);
    return data?.subscriptions || [];
  } catch (error) {
    console.error("❌ Error fetching user subscriptions:", error);
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
    console.log("✅ User subscriptions updated:", data);
    return data;
  } catch (error) {
    console.error("❌ Error updating user subscriptions:", error);
    throw error;
  }
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

export default ApiService;
