import logger from "../logger";
import { apiClient } from "./core";

// Simple in-memory cache: collections change essentially never.
const _cache = new Map(); // collectionId -> data
const _inflight = new Map();

/**
 * Fetch a TMDB "collection" (a franchise/sequence of movies), e.g.
 * the Marvel Cinematic Universe grouping, Avengers saga, etc.
 * Returns TMDB's raw shape: { id, name, overview, poster_path, backdrop_path, parts: [...] }
 */
export const getCollection = async (collectionId) => {
  if (!collectionId) return null;
  const key = String(collectionId);

  if (_cache.has(key)) return _cache.get(key);
  if (_inflight.has(key)) return _inflight.get(key);

  const p = apiClient
    .get(`/movies/collection/${collectionId}`)
    .then((data) => {
      _cache.set(key, data);
      return data;
    })
    .catch((error) => {
      logger.warn(`⚠️ Collection ${collectionId} failed:`, error.message);
      return null;
    })
    .finally(() => {
      _inflight.delete(key);
    });

  _inflight.set(key, p);
  return p;
};