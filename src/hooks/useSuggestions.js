// hooks/useSuggestions.js
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import debounce from "lodash.debounce";
import Fuse from "fuse.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  CACHE_CONFIG,
  FUSE_SUGGESTION_OPTIONS,
  SUGGESTION_CONFIG,
} from "../config/searchConstants";
import { getTrendingKeywords } from "../services/api";

const useSuggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [trendingKeywords, setTrendingKeywords] = useState([]);
  const suggestionFuseRef = useRef(null);
  const cacheRef = useRef([]);
  const debouncedFnRef = useRef(null);

  // Load trending keywords on mount
  useEffect(() => {
    const loadTrendingKeywords = async () => {
      try {
        // Try to get from cache first
        const cached = await AsyncStorage.getItem("trendingKeywords");
        const cacheTime = await AsyncStorage.getItem("trendingKeywordsTime");

        // Use cached data if less than 6 hours old
        if (cached && cacheTime) {
          const age = Date.now() - parseInt(cacheTime);
          if (age < 6 * 60 * 60 * 1000) {
            setTrendingKeywords(JSON.parse(cached));
            return;
          }
        }

        // Fetch fresh data
        const keywords = await getTrendingKeywords();
        setTrendingKeywords(keywords);

        // Cache the results
        await AsyncStorage.setItem(
          "trendingKeywords",
          JSON.stringify(keywords),
        );
        await AsyncStorage.setItem("trendingKeywordsTime", String(Date.now()));
      } catch (error) {
        console.warn("Failed to load trending keywords:", error);
        // Fallback keywords
        setTrendingKeywords([
          "action movies",
          "comedy series",
          "drama films",
          "thriller movies",
          "horror films",
          "sci-fi movies",
          "adventure movies",
          "fantasy films",
        ]);
      }
    };

    loadTrendingKeywords();
  }, []);

  // Initialize suggestion cache
  const initializeSuggestions = useCallback(async () => {
    try {
      const storedCache = await AsyncStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
      if (storedCache) {
        const cache = JSON.parse(storedCache);
        cacheRef.current = cache;

        suggestionFuseRef.current = new Fuse(cache, FUSE_SUGGESTION_OPTIONS);
      }
    } catch (error) {
      console.warn("Failed to initialize suggestions:", error);
    }
  }, []);

  // Create debounced function with proper cleanup
  const createDebouncedFn = useCallback(() => {
    const fn = debounce((input, searchHistory = []) => {
      if (!input || input.length < 1) {
        const recentSearches = searchHistory.slice(
          0,
          SUGGESTION_CONFIG.MAX_RECENT_SEARCHES,
        );
        const trendingSuggestions = trendingKeywords.slice(
          0,
          SUGGESTION_CONFIG.MAX_POPULAR_KEYWORDS,
        );
        const combined = [...recentSearches, ...trendingSuggestions];
        const uniqueSuggestions = combined.filter(
          (item, index, self) => self.indexOf(item) === index,
        );
        setSuggestions(
          uniqueSuggestions.slice(0, SUGGESTION_CONFIG.MAX_SUGGESTIONS),
        );
        return;
      }

      const inputLower = input.toLowerCase();
      const newSuggestions = [];

      // History matches
      const exactHistoryMatches = searchHistory
        .filter((item) => item.toLowerCase().startsWith(inputLower))
        .slice(0, SUGGESTION_CONFIG.MAX_EXACT_MATCHES);
      newSuggestions.push(...exactHistoryMatches);

      const partialHistoryMatches = searchHistory
        .filter(
          (item) =>
            item.toLowerCase().includes(inputLower) &&
            !item.toLowerCase().startsWith(inputLower),
        )
        .slice(0, SUGGESTION_CONFIG.MAX_PARTIAL_MATCHES);
      newSuggestions.push(...partialHistoryMatches);

      // Cache suggestions
      if (suggestionFuseRef.current) {
        const titleSuggestions = suggestionFuseRef.current
          .search(input, { limit: SUGGESTION_CONFIG.MAX_MOVIE_MATCHES })
          .map(({ item }) => item.Title)
          .filter((title) => !newSuggestions.includes(title));
        newSuggestions.push(...titleSuggestions);
      }

      // Trending keyword matches
      const keywordMatches = trendingKeywords
        .filter((keyword) => keyword.toLowerCase().includes(inputLower))
        .slice(0, SUGGESTION_CONFIG.MAX_POPULAR_MATCHES)
        .filter((keyword) => !newSuggestions.includes(keyword));
      newSuggestions.push(...keywordMatches);

      const uniqueSuggestions = newSuggestions.filter(
        (suggestion, index, self) => self.indexOf(suggestion) === index,
      );
      setSuggestions(
        uniqueSuggestions.slice(0, SUGGESTION_CONFIG.MAX_SUGGESTIONS),
      );
    }, SUGGESTION_CONFIG.DEBOUNCE_MS);

    debouncedFnRef.current = fn;
    return fn;
  }, [trendingKeywords]);

  // Create the debounced function once
  const generateSuggestions = useMemo(
    () => createDebouncedFn(),
    [createDebouncedFn],
  );

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      if (debouncedFnRef.current) {
        debouncedFnRef.current.cancel();
        debouncedFnRef.current = null;
      }
    };
  }, []);

  return {
    suggestions,
    trendingKeywords,
    generateSuggestions,
    initializeSuggestions,
  };
};

export default useSuggestions;
