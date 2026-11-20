import { useCallback, useEffect, useRef, useState } from "react";
import { getNews } from "../services/api/news";

const TTL = 10 * 60 * 1000;
let homeCache = { data: null, at: 0 };

/** Biggest stories for the Home row. Fails quietly: an empty list hides the row. */
export function useLatestNews(limit = 10) {
  const [items, setItems] = useState(homeCache.data || []);
  useEffect(() => {
    if (homeCache.data && Date.now() - homeCache.at < TTL) {
      setItems(homeCache.data);
      return undefined;
    }
    let cancelled = false;
    getNews({ sort: "trending", limit })
      .then(({ items: list }) => {
        if (list.length) homeCache = { data: list, at: Date.now() };
        if (!cancelled) setItems(list.length ? list : homeCache.data || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [limit]);
  return items;
}

/** Paged news for the News screen. Changing sort/region starts a fresh list. */
export default function useNews({ sort, region }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const cursor = useRef(null);
  const run = useRef(0); // ignores answers from an older filter

  const load = useCallback(
    async (mode) => {
      const id = ++run.current;
      if (mode === "refresh") setRefreshing(true);
      else setStatus("loading");
      try {
        const page = await getNews({ sort, region, limit: 20 });
        if (id !== run.current) return;
        cursor.current = page.nextCursor;
        setItems(page.items);
        setStatus("ready");
      } catch (e) {
        if (id !== run.current) return;
        if (mode !== "refresh") setStatus("error");
      } finally {
        if (id === run.current) setRefreshing(false);
      }
    },
    [sort, region],
  );

  useEffect(() => {
    setItems([]);
    cursor.current = null;
    load("initial");
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!cursor.current || loadingMore || status !== "ready") return;
    const id = run.current;
    setLoadingMore(true);
    try {
      const page = await getNews({ sort, region, limit: 20, before: cursor.current });
      if (id !== run.current) return;
      cursor.current = page.nextCursor;
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...page.items.filter((i) => !seen.has(i.id))];
      });
    } catch (e) {
      /* the next scroll to the end tries again */
    } finally {
      setLoadingMore(false);
    }
  }, [sort, region, loadingMore, status]);

  return {
    items,
    status,
    loadingMore,
    refreshing,
    loadMore,
    refresh: () => load("refresh"),
    retry: () => load("initial"),
  };
}
