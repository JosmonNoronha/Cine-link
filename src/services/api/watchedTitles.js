import logger from "../logger";
import { apiClient, createIdempotencyKey } from "./core";

// Everything the user has watched: { items: [...], counts: { movies, series, inProgress } }
export const getWatchedTitles = async () => {
  const data = await apiClient.get("/user/watched");
  return data || { items: [], counts: { movies: 0, series: 0, inProgress: 0 } };
};

// { watched: boolean, summary }
export const getTitleWatchState = async (contentId) => {
  try {
    const data = await apiClient.get(
      `/user/watched/${encodeURIComponent(contentId)}/title`,
    );
    return data || { watched: false, summary: null };
  } catch (error) {
    logger.warn("⚠️ Could not fetch watched state:", error.message);
    return { watched: false, summary: null };
  }
};

// Mark a whole movie/series watched or unwatched. Works with or without a watchlist.
// payload: { type: "movie" | "series", watched, meta?, episodes? }
export const setTitleWatched = async (contentId, payload) => {
  return apiClient.put(
    `/user/watched/${encodeURIComponent(contentId)}/title`,
    payload,
    { headers: { "X-Idempotency-Key": createIdempotencyKey("watch-title") } },
  );
};

// Same as the old episode call, but also sends title info and returns
// { episodes, title, completed, xp } so the screen can react when a series finishes.
export const trackEpisode = async (
  contentId,
  season,
  episode,
  watched,
  meta,
) => {
  return apiClient.patch(
    `/user/watched/${encodeURIComponent(contentId)}/episodes`,
    { season, episode, watched, ...(meta ? { meta } : {}) },
    { headers: { "X-Idempotency-Key": createIdempotencyKey("watch-title") } },
  );
};
