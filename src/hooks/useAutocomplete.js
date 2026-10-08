// hooks/useAutocomplete.js
import { useState, useCallback, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { apiClient } from "../services/api/core";
import { getPopularSearches, getTrendingKeywords } from "../services/api/discovery";
import logger from "../services/logger";

const TRENDING_CACHE_KEY    = "autocomplete_trending_v1";
const TRENDING_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const DEBOUNCE_MS           = 350;
const MAX_HISTORY_ITEMS     = 3;
const MAX_TRENDING_ITEMS    = 4;
const MAX_TITLE_RESULTS     = 5;
const MIN_QUERY_FOR_TITLES  = 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInstantItems(query, history, trending) {
  const q = (query || "").trim().toLowerCase();
  const items = [];

  if (!q) {
    history.slice(0, MAX_HISTORY_ITEMS).forEach((text) =>
      items.push({ kind: "history", id: `h:${text}`, text }),
    );
    trending.slice(0, MAX_TRENDING_ITEMS).forEach((text) =>
      items.push({ kind: "trending", id: `t:${text}`, text }),
    );
    return items;
  }

  history
    .filter((h) => h.toLowerCase().includes(q))
    .slice(0, MAX_HISTORY_ITEMS)
    .forEach((text) => items.push({ kind: "history", id: `h:${text}`, text }));

  trending
    .filter((t) => t.toLowerCase().includes(q))
    .slice(0, MAX_TRENDING_ITEMS)
    .forEach((text) => {
      if (!items.find((i) => i.text === text))
        items.push({ kind: "trending", id: `t:${text}`, text });
    });

  return items;
}

function mapResultToItem(result) {
  const kind = result.Type === "person" ? "person" : "title";
  return {
    kind,
    id: `s:${result.imdbID || result.id || result.Title}`,
    text: result.Title || result.Name || "",
    year: result.Year || "",
    type: result.Type || "",
    poster: result.Poster && result.Poster !== "N/A" ? result.Poster : null,
    imdbID: result.imdbID || null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useAutocomplete = ({ history = [], enabled = true } = {}) => {
  const [trending, setTrending]         = useState([]);
  const [items, setItems]               = useState([]);
  const [titleLoading, setTitleLoading] = useState(false);

  const historyRef   = useRef(history);
  const trendingRef  = useRef(trending);
  const timerRef     = useRef(null);
  // axios CancelToken source — cancel previous request before firing a new one
  const cancelRef    = useRef(null);
  const lastQueryRef = useRef("");

  useEffect(() => { historyRef.current  = history;  }, [history]);
  useEffect(() => { trendingRef.current = trending; }, [trending]);

  // ── Load trending on mount ────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [raw, timeStr] = await Promise.all([
          AsyncStorage.getItem(TRENDING_CACHE_KEY),
          AsyncStorage.getItem(`${TRENDING_CACHE_KEY}:time`),
        ]);
        if (raw && timeStr && Date.now() - parseInt(timeStr) < TRENDING_CACHE_TTL_MS) {
          if (!cancelled) setTrending(JSON.parse(raw));
          return;
        }

        const [popular, keywords] = await Promise.all([
          getPopularSearches(12).catch(() => []),
          getTrendingKeywords().catch(() => []),
        ]);
        const merged = [...popular, ...keywords].filter(
          (v, i, a) => v && a.indexOf(v) === i,
        );
        const list = merged.length > 0 ? merged : [
          "action movies", "comedy series", "drama films",
          "thriller movies", "horror films", "sci-fi movies",
        ];

        if (!cancelled) {
          setTrending(list);
          await AsyncStorage.setItem(TRENDING_CACHE_KEY, JSON.stringify(list));
          await AsyncStorage.setItem(`${TRENDING_CACHE_KEY}:time`, String(Date.now()));
        }
      } catch (err) {
        logger.warn("useAutocomplete: failed to load trending", err);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Core update ───────────────────────────────────────────────────────────

  const update = useCallback((query) => {
    if (!enabled) return;

    const q = (query || "").trim();
    lastQueryRef.current = q;

    // Cancel pending debounce + any in-flight axios request
    if (timerRef.current) clearTimeout(timerRef.current);
    if (cancelRef.current) {
      cancelRef.current.cancel("superseded");
      cancelRef.current = null;
    }
    setTitleLoading(false);

    // Tier 1: instant
    const instantItems = buildInstantItems(q, historyRef.current, trendingRef.current);
    setItems(instantItems);

    if (q.length < MIN_QUERY_FOR_TITLES) return;

    setTitleLoading(true);

    timerRef.current = setTimeout(async () => {
      // Create a fresh CancelToken for this request
      const source = axios.CancelToken.source();
      cancelRef.current = source;

      try {
        // apiClient interceptor unwraps { success:true, data:... }
        // so response here is already { Search, totalResults, meta, ... }
        const response = await apiClient.post(
          "/search",
          { query: q, type: "all", page: 1 },
          { cancelToken: source.token },
        );

        if (lastQueryRef.current !== q) return; // stale

        const results = response?.Search ?? [];
        const titleItems = results
          .slice(0, MAX_TITLE_RESULTS)
          .map(mapResultToItem)
          .filter((item) => item.text);

        setItems((prev) => {
          const existingTexts = new Set(prev.map((i) => i.text.toLowerCase()));
          const fresh = titleItems.filter(
            (i) => !existingTexts.has(i.text.toLowerCase()),
          );
          return [...prev, ...fresh];
        });
      } catch (err) {
        // axios.isCancel covers both CancelToken and AbortController cancels
        if (axios.isCancel(err)) return;
        logger.warn("useAutocomplete: title fetch failed", err);
      } finally {
        if (lastQueryRef.current === q) setTitleLoading(false);
      }
    }, DEBOUNCE_MS);
  }, [enabled]);

  // ── Clear ─────────────────────────────────────────────────────────────────

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (cancelRef.current) {
      cancelRef.current.cancel("cleared");
      cancelRef.current = null;
    }
    setItems([]);
    setTitleLoading(false);
    lastQueryRef.current = "";
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (cancelRef.current) cancelRef.current.cancel("unmount");
    };
  }, []);

  return { items, titleLoading, trending, update, clear };
};

export default useAutocomplete;