import { apiClient } from "./core";

const TTL_MS = 5 * 60 * 1000;
const cache = new Map(); // key -> { at, data }

async function cached(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const data = await load();
  cache.set(key, { at: Date.now(), data });
  return data;
}

/** Shows with free full episodes for this viewer: [{ tmdbId, title, season, count, latest }] */
export const getFreeShows = (region) =>
  cached(`shows:${region || ""}`, async () => {
    const data = await apiClient.get("/streaming/shows", { params: region ? { region } : undefined });
    return Array.isArray(data?.shows) ? data.shows : [];
  });

/** One show's playable episodes: { count, latest, episodes: [[n, videoId, fallbackId|0], ...] } */
export const getShowAvailability = (tmdbId, region) =>
  cached(`show:${tmdbId}:${region || ""}`, () =>
    apiClient.get(`/streaming/shows/${tmdbId}`, { params: region ? { region } : undefined }),
  );

export const clearStreamingCache = () => cache.clear();
