import logger from "../logger";
import { apiClient } from "./core";

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

export const getRecommendations = async (titleOrParams, options = {}) => {
  // titleOrParams may be a legacy title string or an object { media_type, tmdb_id, page }
  const personalize = Boolean(options.personalize);
  const isTitleMode = typeof titleOrParams === "string";
  const requestBody = isTitleMode
    ? { title: titleOrParams, top_n: 10 }
    : { ...(titleOrParams || {}) };
  if (personalize) requestBody.personalize = true;

  try {
    logger.info("🎬 Getting recommendations from backend:", requestBody);
    const data = await apiClient.post("/recommendations", requestBody);
    logger.info("✅ Backend recommendations successful");
    return data.recommendations || [];
  } catch (error) {
    // If personalization was requested but the user is not authenticated,
    // the backend returns 401 — fall back to a public recommendation call.
    const status = error?.response?.status;
    if (personalize && status === 401) {
      logger.warn(
        "🔒 Personalized recommendations unauthorized — falling back to public",
      );
      try {
        delete requestBody.personalize;
        const fallback = await apiClient.post("/recommendations", requestBody);
        return fallback.recommendations || [];
      } catch (e) {
        logger.error("❌ Fallback recommendations failed:", e.message);
        return [];
      }
    }

    logger.error("❌ Failed to get recommendations:", error.message);
    return [];
  }
};

// Simple in-memory cache and inflight dedupe for batch details to avoid
// client-side bursts hitting the new rate limiter.
const _batchCache = new Map(); // key -> { ts, results }
const _batchInflight = new Map(); // key -> Promise
const BATCH_CACHE_TTL_MS = 60 * 1000; // 60s

export const getBatchMovieDetails = async (imdbIDs) => {
  const key = JSON.stringify(imdbIDs || []);
  const now = Date.now();

  // Return cached result if fresh
  const cached = _batchCache.get(key);
  if (cached && now - cached.ts < BATCH_CACHE_TTL_MS) {
    logger.info("🔁 Returning cached batch details");
    return cached.results;
  }

  // Return in-flight promise if request already running
  if (_batchInflight.has(key)) {
    logger.info("⏳ Reusing in-flight batch request");
    return _batchInflight.get(key);
  }

  logger.info("🎬 Using backend for batch movie details:", imdbIDs);
  const p = apiClient
    .post("/movies/batch-details", { imdbIDs })
    .then((data) => {
      const results = data.results || [];
      _batchCache.set(key, { ts: Date.now(), results });
      return results;
    })
    .catch((err) => {
      logger.error("❌ Backend batch details failed:", err.message);
      return [];
    })
    .finally(() => {
      _batchInflight.delete(key);
    });

  _batchInflight.set(key, p);
  return p;
};
