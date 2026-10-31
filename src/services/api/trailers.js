import logger from "../logger";
import { apiClient } from "./core";

/**
 * Newest trailers among trending and upcoming titles:
 * [{ id, mediaType: "movie"|"tv", title, overview, posterPath, backdropPath,
 *    releaseDate, voteAverage, upcoming, trailer: { key, name, publishedAt } }]
 */
export const getLatestTrailers = async (limit = 12) => {
  try {
    const data = await apiClient.get("/trending/trailers", { params: { limit } });
    return Array.isArray(data?.trailers) ? data.trailers : [];
  } catch (error) {
    logger.warn("⚠️ Latest trailers API failed:", error.message);
    return [];
  }
};
