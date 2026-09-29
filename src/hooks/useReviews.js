import { useCallback, useEffect, useRef, useState } from "react";
import { getMovieReviews, getTVReviews } from "../services/api";
import logger from "../services/logger";

const INITIAL_STATE = {
  reviews: [],
  total: 0,
  page: 0,
  totalPages: 0,
  status: "idle", // idle | loading | success | error
  loadingMore: false,
  loadMoreError: false,
};

const fetchPage = (type, id, page) =>
  type === "tv" ? getTVReviews(id, page) : getMovieReviews(id, page);

/**
 * Owns all review fetching + pagination for a title.
 * - Starts as soon as a TMDB id is known (no dependency on movie details)
 * - Ignores stale responses when the title changes
 * - Dedupes reviews by id and guards against concurrent requests
 */
export default function useReviews(tmdbInfo) {
  const type = tmdbInfo?.type;
  const id = tmdbInfo?.id;
  const key = type && id ? `${type}:${id}` : null;

  const [state, setState] = useState(INITIAL_STATE);
  const keyRef = useRef(null);
  const pageRef = useRef(0);
  const inFlightRef = useRef(false);

  const fetchNext = useCallback(async () => {
    if (!key || inFlightRef.current) return;

    inFlightRef.current = true;
    const page = pageRef.current + 1;
    const isFirst = page === 1;

    if (!isFirst) {
      setState((s) => ({ ...s, loadingMore: true, loadMoreError: false }));
    }

    try {
      const data = await fetchPage(type, id, page);
      if (keyRef.current !== key) return; // title changed while fetching

      pageRef.current = page;
      const incoming = Array.isArray(data?.results) ? data.results : [];

      setState((s) => {
        const seen = new Set(s.reviews.map((r) => r.id));
        const fresh = incoming.filter((r) => r?.id && !seen.has(r.id));
        return {
          ...s,
          reviews: isFirst ? fresh : [...s.reviews, ...fresh],
          total: data?.total_results ?? s.total,
          page,
          totalPages: data?.total_pages ?? s.totalPages,
          status: "success",
          loadingMore: false,
          loadMoreError: false,
        };
      });
    } catch (error) {
      if (keyRef.current !== key) return;
      logger.error(`Failed to load reviews (page ${page})`, error);
      setState((s) =>
        isFirst
          ? { ...s, status: "error" }
          : { ...s, loadingMore: false, loadMoreError: true },
      );
    } finally {
      if (keyRef.current === key) inFlightRef.current = false;
    }
  }, [key, type, id]);

  // Reset + load first page whenever the title changes
  useEffect(() => {
    keyRef.current = key;
    pageRef.current = 0;
    inFlightRef.current = false;

    if (!key) {
      setState(INITIAL_STATE);
      return undefined;
    }

    setState({ ...INITIAL_STATE, status: "loading" });
    fetchNext();

    return () => {
      keyRef.current = null;
    };
  }, [key, fetchNext]);

  const retry = useCallback(() => {
    setState((s) => (s.reviews.length ? s : { ...s, status: "loading" }));
    fetchNext();
  }, [fetchNext]);

  const hasMore = state.page > 0 && state.page < state.totalPages;

  return {
    reviews: state.reviews,
    total: state.total,
    status: state.status,
    loadingMore: state.loadingMore,
    loadMoreError: state.loadMoreError,
    hasMore,
    loadMore: fetchNext,
    retry,
  };
}