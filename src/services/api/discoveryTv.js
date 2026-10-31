import logger from "../logger";
import { apiClient } from "./core";

// TV list endpoints return raw TMDB rows (no media_type), so tag them as series here.
const listTv = async (path, label) => {
  try {
    const data = await apiClient.get(path);
    const rows = Array.isArray(data) ? data : data?.results || [];
    return rows.map((r) => ({ ...r, media_type: "tv" }));
  } catch (error) {
    logger.warn(`⚠️ ${label} API failed:`, error.message);
    return [];
  }
};

export const getPopularTV = () => listTv("/tv/popular", "Popular series");
export const getTopRatedTV = () => listTv("/tv/top-rated", "Top rated series");
export const getAiringTodayTV = () => listTv("/tv/airing-today", "Airing today");
