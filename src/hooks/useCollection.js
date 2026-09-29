import { useEffect, useMemo, useState } from "react";
import { getCollection } from "../services/api/collections";

// The backend's OMDb-like /movies/details/:id response carries this as
// `_collection` (see movieDetailsOmdbLike in services/tmdb/compat.js).
// The other checks are harmless fallbacks in case that ever changes.
const findCollectionId = (movie) => {
  if (movie?._collection?.id) return movie._collection.id;
  const btc = movie?.belongs_to_collection || movie?.collection;
  if (btc?.id) return btc.id;
  if (movie?.collection_id) return movie.collection_id;
  return null;
};

/**
 * Loads the franchise/collection a movie belongs to, if any.
 * Only applies to movies (TMDB collections don't cover TV series).
 */
export default function useCollection(movie, tmdbInfo) {
  const collectionId = useMemo(() => {
    if (!movie || tmdbInfo?.type === "tv" || movie?.Type === "series") return null;
    return findCollectionId(movie);
  }, [movie, tmdbInfo?.type]);

  const [state, setState] = useState({ status: "idle", data: null });

  useEffect(() => {
    if (!collectionId) {
      setState({ status: "idle", data: null });
      return undefined;
    }
    let cancelled = false;
    setState({ status: "loading", data: null });

    getCollection(collectionId).then((data) => {
      if (cancelled) return;
      const parts = Array.isArray(data?.parts) ? data.parts : [];
      if (!parts.length) {
        setState({ status: "empty", data: null });
        return;
      }
      setState({ status: "success", data: { ...data, parts } });
    });

    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  return state; // { status: 'idle' | 'loading' | 'empty' | 'success', data }
}