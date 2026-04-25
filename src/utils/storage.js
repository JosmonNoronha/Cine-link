import { auth } from "../../firebaseConfig";

import {
  getFavorites as apiGetFavorites,
  addToFavorites as apiAddToFavorites,
  removeFromFavorites as apiRemoveFromFavorites,
  getWatchlists as apiGetWatchlists,
  createWatchlist as apiCreateWatchlist,
  deleteWatchlist as apiDeleteWatchlist,
  addToWatchlist as apiAddToWatchlist,
  removeFromWatchlist as apiRemoveFromWatchlist,
  toggleWatchedStatus as apiToggleWatchedStatus,
  getWatchedEpisodes as apiGetWatchedEpisodes,
  setEpisodeWatched as apiSetEpisodeWatched,
} from "../services/api";
import logger from "../services/logger";

logger.info("Storage.js loaded - auth:", auth); // Debug log

const toOmdbLikeMovie = (item) => {
  if (!item || typeof item !== "object") return null;

  // Backend stores legacy payload in `metadata`
  if (item.metadata && typeof item.metadata === "object") {
    const inferredId =
      item.imdbID ||
      item.metadata.imdbID ||
      (item.tmdb_id ? `tmdb:${item.tmdb_id}` : undefined);
    return {
      ...item.metadata,
      imdbID: inferredId,
      watched:
        item.watched !== undefined
          ? item.watched
          : item.metadata.watched !== undefined
            ? item.metadata.watched
            : false,
    };
  }

  // If item already has capitalized OMDB fields, return as-is
  if (item.Title && item.Poster && item.imdbID) {
    return {
      ...item,
      watched: item.watched !== undefined ? item.watched : false,
    };
  }

  // Backend stores TMDB items directly (or a simplified legacy shape)
  const imdbID =
    item.imdbID || (item.tmdb_id ? `tmdb:${item.tmdb_id}` : undefined);
  return {
    imdbID,
    Title: item.Title || item.title || item.name || null,
    Poster: item.Poster || item.poster || null,
    Year: item.Year || item.year || null,
    Type: item.Type || (item.media_type === "tv" ? "series" : "movie"),
    watched: item.watched !== undefined ? item.watched : false,
  };
};

const normalizeMovieArray = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map(toOmdbLikeMovie)
    .filter(Boolean)
    .map((m) => ({
      ...m,
      watched: m.watched !== undefined ? m.watched : false,
    }));

const getFavoritesBackend = async () => {
  const data = await apiGetFavorites();
  return normalizeMovieArray(data);
};

const getWatchlistsBackend = async () => {
  const lists = await apiGetWatchlists();
  const result = {};
  for (const wl of Array.isArray(lists) ? lists : []) {
    const name = wl?.name || wl?.id;
    if (!name) continue;
    // Backend returns 'movies' field, not 'items'
    const items = normalizeMovieArray(wl.movies || wl.items);
    result[name] = items;
  }
  return result;
};

export const getFavorites = async () => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return [];

  return await getFavoritesBackend();
};

export const saveFavorite = async (movie) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;

  await apiAddToFavorites(movie);
};

export const removeFavorite = async (imdbID) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;

  await apiRemoveFromFavorites(imdbID);
};

export const isFavorite = async (imdbID) => {
  const favorites = await getFavorites();
  return favorites.some((m) => m.imdbID === imdbID);
};

export const getWatchlists = async () => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return {};

  return await getWatchlistsBackend();
};

export const addWatchlist = async (name) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;

  await apiCreateWatchlist(name);
};

export const removeWatchlist = async (name) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;

  await apiDeleteWatchlist(name);
};

export const addToWatchlist = async (name, movie) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return false;

  const resp = await apiAddToWatchlist(name, movie);
  if (resp && typeof resp.added === "boolean") return resp.added;
  return true;
};

export const removeFromWatchlist = async (name, imdbID) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return;

  await apiRemoveFromWatchlist(name, imdbID);
};

// NEW FUNCTION: Toggle watched status
export const toggleWatchedStatus = async (watchlistName, imdbID) => {
  try {
    if (!auth) throw new Error("Authentication not initialized");
    const user = auth.currentUser;
    if (!user) return false;

    await apiToggleWatchedStatus(watchlistName, imdbID);
    return true;
  } catch (error) {
    logger.error("Error toggling watched status", error);
    throw error;
  }
};

export const isInWatchlist = async (name, imdbID) => {
  if (!auth) throw new Error("Authentication not initialized");
  const user = auth.currentUser;
  if (!user) return false;

  const watchlists = await getWatchlistsBackend();
  const movies = watchlists[name] || [];
  return movies.some((m) => m.imdbID === imdbID);
};

// ---------- Watched Episodes Tracking ----------
// Track which episodes a user has watched for TV series
export const markEpisodeWatched = async (
  imdbID,
  season,
  episode,
  watched = true,
) => {
  try {
    if (!auth) {
      logger.warn("Authentication not initialized, skipping episode tracking");
      return;
    }
    const user = auth.currentUser;
    if (!user) {
      logger.warn("No user logged in, skipping episode tracking");
      return;
    }
    await apiSetEpisodeWatched(imdbID, season, episode, watched);
  } catch (error) {
    logger.warn(
      "Could not track episode watch status (non-critical):",
      error.message,
    );
  }
};

export const getWatchedEpisodes = async (imdbID) => {
  try {
    if (!auth) return {};
    const user = auth.currentUser;
    if (!user) return {};

    const response = await apiGetWatchedEpisodes(imdbID);
    return response || {};
  } catch (error) {
    logger.warn("Could not retrieve watched episodes:", error.message);
    return {};
  }
};

export const isEpisodeWatched = async (imdbID, season, episode) => {
  try {
    const watched = await getWatchedEpisodes(imdbID);
    const episodeKey = `s${season}e${episode}`;
    return !!watched[episodeKey];
  } catch {
    return false;
  }
};

export const getSeriesProgress = async (imdbID, totalEpisodes) => {
  try {
    const watched = await getWatchedEpisodes(imdbID);
    const watchedCount = Object.keys(watched).filter((key) =>
      key.startsWith("s"),
    ).length;
    const percentage =
      totalEpisodes > 0 ? Math.round((watchedCount / totalEpisodes) * 100) : 0;

    return {
      watchedCount,
      totalEpisodes,
      percentage,
      lastWatched: Object.values(watched).sort(
        (a, b) => new Date(b.watchedAt) - new Date(a.watchedAt),
      )[0],
    };
  } catch {
    return { watchedCount: 0, totalEpisodes, percentage: 0, lastWatched: null };
  }
};
