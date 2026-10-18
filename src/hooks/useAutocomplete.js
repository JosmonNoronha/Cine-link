// hooks/useAutocomplete.js
//
// Two-tier autocomplete:
//   Tier 1 (instant):   history + trending keyword matches
//   Tier 2 (debounced): rich title suggestions from GET /search/typeahead
//                       (cached server-side, never tracked as a search)
import { useState, useCallback, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { apiClient } from "../services/api/core";
import { getPopularSearches, getTrendingKeywords } from "../services/api/discovery";
import logger from "../services/logger";

const TRENDING_CACHE_KEY    = "autocomplete_trending_v1";
const TRENDING_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const DEBOUNCE_MS           = 250;
const MAX_HISTORY_ITEMS     = 3;
const MAX_TRENDING_ITEMS    = 4;
const MAX_TITLE_RESULTS     = 6;
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

// Shape returned by GET /search/typeahead:
//   { imdbID, title, year, type: "movie" | "series", poster }
function mapSuggestion(s) {
  return {
    kind: "title",
    id: `s:${s.imdbID}`,
    text: s.title || "",
    year: s.year || "",
    type: s.type || "",
    poster: s.poster || null,
    imdbID: s.imdbID || null,
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
  const cancelRef    = useRef(null);   // axios CancelToken source
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
        if (raw && timeStr && Date.now() - parseInt(timeStr, 10) < TRENDING_CACHE_TTL_MS) {
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

    // Cancel pending debounce + any in-flight request
    if (timerRef.current) clearTimeout(timerRef.current);
    if (cancelRef.current) {
      cancelRef.current.cancel("superseded");
      cancelRef.current = null;
    }
    setTitleLoading(false);

    // Tier 1: instant
    setItems(buildInstantItems(q, historyRef.current, trendingRef.current));

    if (q.length < MIN_QUERY_FOR_TITLES) return;

    setTitleLoading(true);

    timerRef.current = setTimeout(async () => {
      const source = axios.CancelToken.source();
      cancelRef.current = source;

      try {
        // apiClient's interceptor unwraps { success, data } → { suggestions }
        const response = await apiClient.get("/search/typeahead", {
          params: { q, limit: MAX_TITLE_RESULTS },
          cancelToken: source.token,
        });

        if (lastQueryRef.current !== q) return; // stale response

        const titleItems = (response?.suggestions ?? [])
          .map(mapSuggestion)
          .filter((item) => item.text);

        setItems((prev) => {
          // Keep instant items; add titles, deduped by id only. A history
          // entry "Heat" and the rich "Heat (1995)" row can both appear.
          const have = new Set(prev.map((i) => i.id));
          return [...prev, ...titleItems.filter((i) => !have.has(i.id))];
        });
      } catch (err) {
        if (axios.isCancel(err)) return;
        logger.warn("useAutocomplete: typeahead failed", err);
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