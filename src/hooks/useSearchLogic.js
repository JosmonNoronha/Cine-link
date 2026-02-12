// hooks/useSearchLogic.js
import { useState, useRef, useCallback } from "react";
import { searchMovies } from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Fuse from "fuse.js";
import {
  API_RATE_LIMIT,
  CACHE_CONFIG,
  SEARCH_CONFIG,
  FUSE_SEARCH_OPTIONS,
  ERROR_MESSAGES,
} from "../config/searchConstants";

const useSearchLogic = () => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiCallCount, setApiCallCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(false);

  // Refs
  const cacheRef = useRef([]);
  const fuseRef = useRef(null);
  const apiLimitRef = useRef({
    calls: 0,
    resetTime: Date.now() + API_RATE_LIMIT.RESET_INTERVAL_MS,
  });
  const currentSearchRef = useRef({ query: "", filter: "", page: 1 });
  const abortControllerRef = useRef(null);
  const fuseNeedsRebuildRef = useRef(false);

  // Rebuild Fuse index if needed
  const rebuildFuseIndex = useCallback(() => {
    if (cacheRef.current.length === 0) {
      fuseRef.current = null;
      return;
    }

    fuseRef.current = new Fuse(cacheRef.current, FUSE_SEARCH_OPTIONS);
    fuseNeedsRebuildRef.current = false;
  }, []);

  // Initialize cache and Fuse
  const initializeCache = useCallback(async () => {
    try {
      const storedCache = await AsyncStorage.getItem(CACHE_CONFIG.STORAGE_KEY);
      const storedApiLimit = await AsyncStorage.getItem(
        CACHE_CONFIG.API_LIMIT_KEY,
      );

      if (storedCache) {
        const cache = JSON.parse(storedCache);
        cacheRef.current = cache;
        rebuildFuseIndex();
      }

      if (storedApiLimit) {
        const limit = JSON.parse(storedApiLimit);
        if (Date.now() > limit.resetTime) {
          apiLimitRef.current = {
            calls: 0,
            resetTime: Date.now() + API_RATE_LIMIT.RESET_INTERVAL_MS,
          };
          setApiCallCount(0);
          await AsyncStorage.setItem(
            CACHE_CONFIG.API_LIMIT_KEY,
            JSON.stringify(apiLimitRef.current),
          );
        } else {
          apiLimitRef.current = limit;
          setApiCallCount(limit.calls);
        }
      }
    } catch (error) {
      console.warn("Failed to initialize cache:", error);
    }
  }, [rebuildFuseIndex]);

  // Process query
  const processQuery = useCallback((input) => {
    const cleaned = input.trim();
    if (cleaned.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) return null;
    return cleaned.replace(/\s+/g, " ");
  }, []);

  // Check API limits
  const canMakeApiCall = useCallback(() => {
    const now = Date.now();
    if (now > apiLimitRef.current.resetTime) {
      apiLimitRef.current = {
        calls: 0,
        resetTime: now + API_RATE_LIMIT.RESET_INTERVAL_MS,
      };
      setApiCallCount(0);
      AsyncStorage.setItem(
        CACHE_CONFIG.API_LIMIT_KEY,
        JSON.stringify(apiLimitRef.current),
      );
    }
    return apiLimitRef.current.calls < API_RATE_LIMIT.MAX_CALLS_PER_DAY;
  }, []);

  // Increment API call
  const incrementApiCall = useCallback(async () => {
    apiLimitRef.current.calls += 1;
    setApiCallCount(apiLimitRef.current.calls);
    await AsyncStorage.setItem(
      CACHE_CONFIG.API_LIMIT_KEY,
      JSON.stringify(apiLimitRef.current),
    );
  }, []);

  // Perform local search
  const performLocalSearch = useCallback(
    (searchQuery, filterType, page = 1) => {
      if (!fuseRef.current || !searchQuery) {
        return { results: [], hasMore: false, total: 0 };
      }

      // Skip local cache for genre searches (they need fresh data from API)
      const genreKeywords = [
        "action",
        "adventure",
        "animation",
        "comedy",
        "crime",
        "documentary",
        "drama",
        "family",
        "fantasy",
        "history",
        "horror",
        "music",
        "mystery",
        "romance",
        "science fiction",
        "sci-fi",
        "sci fi",
        "scifi",
        "thriller",
        "war",
        "western",
        "anime",
        "bollywood",
        "hollywood",
        "korean",
        "japanese",
        "kids",
        "reality",
        "soap",
        "talk",
      ];
      const queryLower = searchQuery.toLowerCase().trim();
      const isGenreSearch = genreKeywords.some(
        (keyword) => queryLower === keyword || queryLower === keyword + "s",
      );

      if (isGenreSearch) {
        console.log("🎭 Skipping local cache for genre search:", searchQuery);
        return { results: [], hasMore: false, total: 0 };
      }

      try {
        // Rebuild Fuse index if needed before searching
        if (fuseNeedsRebuildRef.current) {
          rebuildFuseIndex();
        }

        const fuseResults = fuseRef.current.search(searchQuery, {
          limit: SEARCH_CONFIG.MAX_LOCAL_RESULTS,
        });
        let localResults = fuseResults.map(({ item }) => item);

        if (filterType !== "all") {
          localResults = localResults.filter(
            (item) => item.Type === filterType,
          );
        }

        const startIndex = (page - 1) * SEARCH_CONFIG.PAGE_SIZE;
        const endIndex = startIndex + SEARCH_CONFIG.PAGE_SIZE;
        const paginatedResults = localResults.slice(startIndex, endIndex);
        const hasMore = endIndex < localResults.length;

        return {
          results: paginatedResults,
          hasMore,
          total: localResults.length,
        };
      } catch (error) {
        console.warn("Local search error:", error);
        return { results: [], hasMore: false, total: 0 };
      }
    },
    [rebuildFuseIndex],
  );

  // Update cache
  const updateCache = useCallback(async (newItems) => {
    if (!newItems || newItems.length === 0) return;

    const currentCache = cacheRef.current;
    const newCache = [...currentCache];
    let hasNewItems = false;

    newItems.forEach((item) => {
      if (!newCache.some((cached) => cached.imdbID === item.imdbID)) {
        newCache.push(item);
        hasNewItems = true;
      }
    });

    if (hasNewItems) {
      if (newCache.length > CACHE_CONFIG.MAX_CACHE_SIZE) {
        newCache.splice(0, newCache.length - CACHE_CONFIG.MAX_CACHE_SIZE);
      }

      cacheRef.current = newCache;
      fuseNeedsRebuildRef.current = true; // Mark for rebuild instead of rebuilding immediately

      await AsyncStorage.setItem(
        CACHE_CONFIG.STORAGE_KEY,
        JSON.stringify(newCache),
      );
    }
  }, []);

  // Cancel ongoing search
  const cancelSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Main search function
  const performSearch = useCallback(
    async (searchTerm, filterType, page = 1, append = false) => {
      const cleanQuery = processQuery(searchTerm);
      if (!cleanQuery) {
        setError(ERROR_MESSAGES.EMPTY_QUERY);
        return;
      }

      // Cancel any ongoing search
      cancelSearch();

      // Create new AbortController for this search
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      currentSearchRef.current = {
        query: cleanQuery,
        filter: filterType,
        page,
      };

      if (page === 1) {
        setIsLoading(true);
        setError(null);
        setResults([]);
      } else {
        setIsLoadingMore(true);
      }

      try {
        let allResults = [];
        let hasMoreResults = false;
        let totalCount = 0;

        // Try local search first
        const localSearchResult = performLocalSearch(
          cleanQuery,
          filterType,
          page,
        );

        if (localSearchResult.results.length > 0) {
          allResults = localSearchResult.results;
          hasMoreResults = localSearchResult.hasMore;
          totalCount = localSearchResult.total;

          if (append && page > 1) {
            setResults((prev) => [...prev, ...allResults]);
          } else {
            setResults(allResults);
          }

          if (
            page === 1 &&
            (localSearchResult.total >= 20 || !canMakeApiCall())
          ) {
            setHasMorePages(hasMoreResults);
            setTotalResults(totalCount);
            setCurrentPage(page);
            setTotalPages(Math.ceil(totalCount / SEARCH_CONFIG.PAGE_SIZE));

            if (page === 1) setIsLoading(false);
            if (page > 1) setIsLoadingMore(false);
            return;
          }
        }

        // Check if search was aborted
        if (signal.aborted) return;

        // Make API call if needed
        if (canMakeApiCall() && (page === 1 || localSearchResult.total < 20)) {
          await incrementApiCall();

          const apiData = await searchMovies(
            cleanQuery,
            filterType,
            page,
            signal,
          );

          if (apiData && apiData.Search && apiData.Search.length > 0) {
            // Check if search was aborted
            if (signal.aborted) return;

            const processedResults = apiData.Search.map((item) => ({
              ...item,
              Poster:
                item.Poster && item.Poster !== "N/A"
                  ? item.Poster
                  : "https://via.placeholder.com/300x450?text=No+Image",
            }));

            const apiTotalResults = parseInt(apiData.totalResults) || 0;
            const apiTotalPages = Math.ceil(
              apiTotalResults / SEARCH_CONFIG.PAGE_SIZE,
            );
            const apiHasMore = page < apiTotalPages;

            if (page === 1) {
              // Merge with local results
              const mergedResults = [];
              const seenIds = new Set();

              processedResults.forEach((item) => {
                if (!seenIds.has(item.imdbID)) {
                  mergedResults.push(item);
                  seenIds.add(item.imdbID);
                }
              });

              allResults.forEach((item) => {
                if (!seenIds.has(item.imdbID)) {
                  mergedResults.push(item);
                  seenIds.add(item.imdbID);
                }
              });

              setResults(mergedResults);
              setHasMorePages(apiHasMore || hasMoreResults);
              setTotalResults(Math.max(apiTotalResults, totalCount));
              setTotalPages(
                Math.max(
                  apiTotalPages,
                  Math.ceil(totalCount / SEARCH_CONFIG.PAGE_SIZE),
                ),
              );
            } else {
              if (append) {
                setResults((prev) => [...prev, ...processedResults]);
              } else {
                setResults(processedResults);
              }
              setHasMorePages(apiHasMore);
              setTotalResults(apiTotalResults);
              setTotalPages(apiTotalPages);
            }

            setCurrentPage(page);
            await updateCache(processedResults);
          } else if (page === 1 && allResults.length === 0) {
            // No results found - not an error, just empty results
            setResults([]);
            setHasMorePages(false);
            setTotalResults(0);
            setTotalPages(0);
            setCurrentPage(1);
            // Don't set error - no results is not an error
          } else {
            setHasMorePages(hasMoreResults);
            setTotalResults(totalCount);
            setTotalPages(Math.ceil(totalCount / SEARCH_CONFIG.PAGE_SIZE));
            setCurrentPage(page);
          }
        } else if (page === 1 && allResults.length === 0) {
          setResults([]);
          setHasMorePages(false);
          setTotalResults(0);
          setTotalPages(0);
          setCurrentPage(1);
          setError(ERROR_MESSAGES.RATE_LIMIT);
        } else {
          setHasMorePages(hasMoreResults);
          setTotalResults(totalCount);
          setTotalPages(Math.ceil(totalCount / SEARCH_CONFIG.PAGE_SIZE));
          setCurrentPage(page);
        }
      } catch (error) {
        // Ignore abort errors
        if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
          console.log("Search aborted");
          return;
        }

        // Categorize error types
        let errorMessage = ERROR_MESSAGES.GENERIC;

        if (error.message && error.message.includes("timeout")) {
          errorMessage = ERROR_MESSAGES.TIMEOUT;
          console.warn("Search timeout:", error);
        } else if (
          error.message &&
          (error.message.includes("Network") || error.message.includes("fetch"))
        ) {
          errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
          console.warn("Network error during search:", error);
        } else if (error.response) {
          // API returned an error response
          errorMessage = ERROR_MESSAGES.API_ERROR;
          console.warn(
            "API error during search:",
            error.response?.status,
            error.response?.data,
          );
        } else {
          console.warn("Unknown search error:", error);
        }

        // Try local fallback
        const localSearchResult = performLocalSearch(
          cleanQuery,
          filterType,
          page,
        );
        if (localSearchResult.results.length > 0) {
          if (append && page > 1) {
            setResults((prev) => [...prev, ...localSearchResult.results]);
          } else {
            setResults(localSearchResult.results);
          }
          setHasMorePages(localSearchResult.hasMore);
          setTotalResults(localSearchResult.total);
          setTotalPages(
            Math.ceil(localSearchResult.total / SEARCH_CONFIG.PAGE_SIZE),
          );
          setCurrentPage(page);
          setError(null); // Clear error if we have local results
        } else if (page === 1) {
          setResults([]);
          setHasMorePages(false);
          setTotalResults(0);
          setTotalPages(0);
          setCurrentPage(1);
          setError(errorMessage);
        }
      } finally {
        // Clean up abort controller
        if (
          abortControllerRef.current &&
          !abortControllerRef.current.signal.aborted
        ) {
          abortControllerRef.current = null;
        }

        // Reset loading states
        if (page === 1) {
          setIsLoading(false);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [
      processQuery,
      performLocalSearch,
      canMakeApiCall,
      incrementApiCall,
      updateCache,
      cancelSearch,
    ],
  );

  // Load more results
  const loadMoreResults = useCallback(() => {
    if (isLoadingMore || !hasMorePages) return;

    const nextPage = currentPage + 1;
    const { query, filter } = currentSearchRef.current;

    if (query && filter !== undefined) {
      performSearch(query, filter, nextPage, true);
    }
  }, [isLoadingMore, hasMorePages, currentPage, performSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    cancelSearch();
    setResults([]);
    setError(null);
    setIsLoading(false);
    setCurrentPage(1);
    setHasMorePages(false);
    setTotalResults(0);
    setTotalPages(0);
    setIsLoadingMore(false);
    currentSearchRef.current = { query: "", filter: "", page: 1 };
  }, [cancelSearch]);

  return {
    results,
    isLoading,
    error,
    apiCallCount,
    currentPage,
    totalResults,
    totalPages,
    isLoadingMore,
    hasMorePages,
    performSearch,
    loadMoreResults,
    clearSearch,
    initializeCache,
    cancelSearch,
  };
};

export default useSearchLogic;
