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
