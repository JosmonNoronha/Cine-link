// hooks/useSearchLogic.js
import { useState, useRef, useCallback } from 'react';
import { searchMovies } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Fuse from 'fuse.js';

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
  const apiLimitRef = useRef({ calls: 0, resetTime: Date.now() + 86400000 });
  const currentSearchRef = useRef({ query: "", filter: "", page: 1 });

  // Initialize cache and Fuse
  const initializeCache = useCallback(async () => {
    try {
      const storedCache = await AsyncStorage.getItem("movieCache");
      const storedApiLimit = await AsyncStorage.getItem("apiLimit");

      if (storedCache) {
        const cache = JSON.parse(storedCache);
        cacheRef.current = cache;
        
        fuseRef.current = new Fuse(cache, {
          keys: [
            { name: "Title", weight: 0.7 },
            { name: "Year", weight: 0.2 },
            { name: "Genre", weight: 0.1 },
          ],
          includeScore: true,
          threshold: 0.4,
          ignoreLocation: true,
          minMatchCharLength: 2,
        });
      }

      if (storedApiLimit) {
        const limit = JSON.parse(storedApiLimit);
        if (Date.now() > limit.resetTime) {
          apiLimitRef.current = { calls: 0, resetTime: Date.now() + 86400000 };
          setApiCallCount(0);
          await AsyncStorage.setItem("apiLimit", JSON.stringify(apiLimitRef.current));
        } else {
          apiLimitRef.current = limit;
          setApiCallCount(limit.calls);
        }
      }
    } catch (error) {
      console.warn("Failed to initialize cache:", error);
    }
  }, []);

  // Process query
  const processQuery = useCallback((input) => {
    const cleaned = input.trim();
    if (cleaned.length < 2) return null;
    return cleaned.replace(/\s+/g, ' ');
  }, []);

  // Check API limits
  const canMakeApiCall = useCallback(() => {
    const now = Date.now();
    if (now > apiLimitRef.current.resetTime) {
      apiLimitRef.current = { calls: 0, resetTime: now + 86400000 };
      setApiCallCount(0);
      AsyncStorage.setItem("apiLimit", JSON.stringify(apiLimitRef.current));
    }
    return apiLimitRef.current.calls < 900;
  }, []);

  // Increment API call
  const incrementApiCall = useCallback(async () => {
    apiLimitRef.current.calls += 1;
    setApiCallCount(apiLimitRef.current.calls);
    await AsyncStorage.setItem("apiLimit", JSON.stringify(apiLimitRef.current));
  }, []);

  // Perform local search
  const performLocalSearch = useCallback((searchQuery, filterType, page = 1) => {
    if (!fuseRef.current || !searchQuery) {
      return { results: [], hasMore: false, total: 0 };
    }

    try {
      const fuseResults = fuseRef.current.search(searchQuery, { limit: 100 });
      let localResults = fuseResults.map(({ item }) => item);

      if (filterType !== "all") {
        localResults = localResults.filter(item => item.Type === filterType);
      }

      const pageSize = 10;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
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
  }, []);

  // Update cache
  const updateCache = useCallback(async (newItems) => {
    if (!newItems || newItems.length === 0) return;

    const currentCache = cacheRef.current;
    const newCache = [...currentCache];
    let hasNewItems = false;

    newItems.forEach(item => {
      if (!newCache.some(cached => cached.imdbID === item.imdbID)) {
        newCache.push(item);
        hasNewItems = true;
      }
    });

    if (hasNewItems) {
      if (newCache.length > 1500) {
        newCache.splice(0, newCache.length - 1500);
      }

      cacheRef.current = newCache;
      
      fuseRef.current = new Fuse(newCache, {
        keys: [
          { name: "Title", weight: 0.7 },
          { name: "Year", weight: 0.2 },
          { name: "Genre", weight: 0.1 },
        ],
        includeScore: true,
        threshold: 0.4,
        ignoreLocation: true,
        minMatchCharLength: 2,
      });

      await AsyncStorage.setItem("movieCache", JSON.stringify(newCache));
    }
  }, []);

  // Main search function
  const performSearch = useCallback(async (searchTerm, filterType, page = 1, append = false) => {
    const cleanQuery = processQuery(searchTerm);
    if (!cleanQuery) {
      setError("Please enter a search term");
      return;
    }

    currentSearchRef.current = { query: cleanQuery, filter: filterType, page };

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
      const localSearchResult = performLocalSearch(cleanQuery, filterType, page);
      
      if (localSearchResult.results.length > 0) {
        allResults = localSearchResult.results;
        hasMoreResults = localSearchResult.hasMore;
        totalCount = localSearchResult.total;

        if (append && page > 1) {
          setResults(prev => [...prev, ...allResults]);
        } else {
          setResults(allResults);
        }

        if (page === 1 && (localSearchResult.total >= 20 || !canMakeApiCall())) {
          setHasMorePages(hasMoreResults);
          setTotalResults(totalCount);
          setCurrentPage(page);
          setTotalPages(Math.ceil(totalCount / 10));
          
          if (page === 1) setIsLoading(false);
          if (page > 1) setIsLoadingMore(false);
          return;
        }
      }

      // Make API call if needed
      if (canMakeApiCall() && (page === 1 || localSearchResult.total < 20)) {
        await incrementApiCall();
        
        const apiData = await searchMovies(cleanQuery, filterType, page);
        
        if (apiData && apiData.Search && apiData.Search.length > 0) {
          const processedResults = apiData.Search.map(item => ({
            ...item,
            Poster: item.Poster && item.Poster !== "N/A" 
              ? item.Poster 
              : "https://via.placeholder.com/300x450?text=No+Image"
          }));

          const apiTotalResults = parseInt(apiData.totalResults) || 0;
          const apiTotalPages = Math.ceil(apiTotalResults / 10);
          const apiHasMore = page < apiTotalPages;

          if (page === 1) {
            // Merge with local results
            const mergedResults = [];
            const seenIds = new Set();

            processedResults.forEach(item => {
              if (!seenIds.has(item.imdbID)) {
                mergedResults.push(item);
                seenIds.add(item.imdbID);
              }
            });

            allResults.forEach(item => {
              if (!seenIds.has(item.imdbID)) {
                mergedResults.push(item);
                seenIds.add(item.imdbID);
              }
            });

            setResults(mergedResults);
            setHasMorePages(apiHasMore || hasMoreResults);
            setTotalResults(Math.max(apiTotalResults, totalCount));
            setTotalPages(Math.max(apiTotalPages, Math.ceil(totalCount / 10)));
          } else {
            if (append) {
              setResults(prev => [...prev, ...processedResults]);
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
          setResults([]);
          setHasMorePages(false);
          setTotalResults(0);
          setTotalPages(0);
          setCurrentPage(1);
          setError("No results found. Try different keywords or check spelling.");
        } else {
          setHasMorePages(hasMoreResults);
          setTotalResults(totalCount);
          setTotalPages(Math.ceil(totalCount / 10));
          setCurrentPage(page);
        }
      } else if (page === 1 && allResults.length === 0) {
        setResults([]);
        setHasMorePages(false);
        setTotalResults(0);
        setTotalPages(0);
        setCurrentPage(1);
        setError("Daily API limit reached. Try again tomorrow or search from cached results.");
      } else {
        setHasMorePages(hasMoreResults);
        setTotalResults(totalCount);
        setTotalPages(Math.ceil(totalCount / 10));
        setCurrentPage(page);
      }
    } catch (error) {
      console.warn("Search error:", error);
      
      const localSearchResult = performLocalSearch(cleanQuery, filterType, page);
      if (localSearchResult.results.length > 0) {
        if (append && page > 1) {
          setResults(prev => [...prev, ...localSearchResult.results]);
        } else {
          setResults(localSearchResult.results);
        }
        setHasMorePages(localSearchResult.hasMore);
        setTotalResults(localSearchResult.total);
        setTotalPages(Math.ceil(localSearchResult.total / 10));
        setCurrentPage(page);
        setError(null);
      } else if (page === 1) {
        setResults([]);
        setHasMorePages(false);
        setTotalResults(0);
        setTotalPages(0);
        setCurrentPage(1);
        setError("Search failed. Please check your connection and try again.");
      }
    }

    if (page === 1) {
      setIsLoading(false);
    } else {
      setIsLoadingMore(false);
    }
  }, [processQuery, performLocalSearch, canMakeApiCall, incrementApiCall, updateCache]);

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
    setResults([]);
    setError(null);
    setIsLoading(false);
    setCurrentPage(1);
    setHasMorePages(false);
    setTotalResults(0);
    setTotalPages(0);
    setIsLoadingMore(false);
    currentSearchRef.current = { query: "", filter: "", page: 1 };
  }, []);

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
  };
};

export default useSearchLogic;