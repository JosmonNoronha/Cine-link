import { useCallback, useEffect, useRef, useState } from "react";
import { getDiscoverFeed } from "../services/api/discover";
import logger from "../services/logger";

const EMPTY = { status: "loading", items: [], page: 0, totalPages: 1, loadingMore: false };

const merge = (a, b) => {
  const seen = new Set(a.map((i) => i.imdbID));
  return [...a, ...b.filter((i) => !seen.has(i.imdbID))];
};

// One Discover list with paging. Changing feed / type / region starts over; stale responses are ignored.
export default function useDiscoverFeed(feed, { type = "movie", region, enabled = true } = {}) {
  const [state, setState] = useState(EMPTY);
  const [refreshing, setRefreshing] = useState(false);
  const reqId = useRef(0);

  const fetchPage = useCallback(
    async (page, replace) => {
      const id = ++reqId.current;
      try {
        const d = await getDiscoverFeed(feed, { type, region, page });
        if (id !== reqId.current) return;
        setState((s) => ({
          status: "ready",
          items: replace ? d.items || [] : merge(s.items, d.items || []),
          page: d.page || page,
          totalPages: d.totalPages || 1,
          loadingMore: false,
        }));
      } catch (e) {
        if (id !== reqId.current) return;
        logger.warn("Discover feed failed", feed, e?.message);
        setState((s) => ({
          ...s,
          status: s.items.length && !replace ? "ready" : "error",
          loadingMore: false,
        }));
      }
    },
    [feed, type, region],
  );

  useEffect(() => {
    if (!enabled) return;
    setState(EMPTY);
    fetchPage(1, true);
  }, [enabled, fetchPage]);

  const loadMore = useCallback(() => {
    if (state.status !== "ready" || state.loadingMore || state.page >= state.totalPages) return;
    setState((s) => ({ ...s, loadingMore: true }));
    fetchPage(state.page + 1, false);
  }, [state, fetchPage]);

  const reload = useCallback(async () => {
    setRefreshing(true);
    await fetchPage(1, true);
    setRefreshing(false);
  }, [fetchPage]);

  const retry = useCallback(() => {
    setState(EMPTY);
    fetchPage(1, true);
  }, [fetchPage]);

  return { ...state, refreshing, loadMore, reload, retry };
}
