import logger from "../logger";
import { apiClient } from "./core";

export const getTrending = async (type = "movie", timeWindow = "week") => {
  try {
    const data = await apiClient.get(`/trending/${type}/${timeWindow}`);
    return Array.isArray(data) ? data : data.results || [];
  } catch (error) {
    logger.warn("⚠️ Trending API failed:", error.message);
    return [];
  }
};

export const getTrendingKeywords = async () => {
  try {
    const data = await apiClient.get("/trending/search/keywords");
    return data.keywords || [];
  } catch (error) {
    logger.warn("⚠️ Trending keywords API failed:", error.message);
    return [];
  }
};

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

export const getPopular = async (page = 1) => {
  try {
    const data = await apiClient.get("/movies/popular", { params: { page } });
    return Array.isArray(data) ? data : data.results || [];
  } catch (error) {
    logger.warn("⚠️ Popular API failed:", error.message);
    return [];
  }
};

export const getNewReleases = async (type = "movie") => {
  try {
    const data = await apiClient.get(`/trending/${type}/week`);
    return Array.isArray(data) ? data : data.results || [];
  } catch (error) {
    logger.warn("⚠️ New releases API failed:", error.message);
    return [];
  }
};

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
