import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  Text,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  Keyboard,
  Alert,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useCustomTheme } from "../contexts/ThemeContext";
import { searchMovies } from "../services/api";
import MovieCard from "../components/MovieCard";
import ShimmerMovieCard from "../components/ShimmerMovieCard";
import { Ionicons } from "@expo/vector-icons";
import debounce from "lodash.debounce";
import Fuse from "fuse.js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SearchScreen = ({ navigation }) => {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [isFocused, setIsFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [apiCallCount, setApiCallCount] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMorePages, setHasMorePages] = useState(false);

  const { colors } = useTheme();
  const { theme } = useCustomTheme();

  // Refs to prevent unnecessary re-renders and loops
  const cacheRef = useRef([]);
  const searchHistoryRef = useRef([]);
  const apiLimitRef = useRef({ calls: 0, resetTime: Date.now() + 86400000 });
  const lastExecutedSearch = useRef("");
  const fuseRef = useRef(null);
  const suggestionFuseRef = useRef(null);
  const isInitialized = useRef(false);
  const currentSearchRef = useRef({ query: "", filter: "", page: 1 }); // Track current search state

  // Stable popular keywords and trending searches
  const popularKeywords = useMemo(
    () => [
      "action movies",
      "comedy series",
      "drama films",
      "thriller movies",
      "horror films",
      "romantic comedies",
      "sci-fi series",
      "adventure movies",
      "fantasy films",
      "crime series",
      "mystery movies",
      "war films",
      "western movies",
      "animated movies",
      "documentaries",
      "superhero movies",
      "marvel movies",
      "dc comics",
      "netflix series",
      "amazon prime",
      "breaking bad",
      "stranger things",
      "the office",
      "game of thrones",
      "friends",
      "avengers",
      "batman",
      "spider-man",
      "harry potter",
      "star wars",
      "lord of the rings",
    ],
    []
  );

  // Initialize data only once
  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      if (isInitialized.current) return;

      try {
        const [storedCache, storedHistory, storedApiLimit] = await Promise.all([
          AsyncStorage.getItem("movieCache"),
          AsyncStorage.getItem("searchHistory"),
          AsyncStorage.getItem("apiLimit"),
        ]);

        if (!isMounted) return;

        if (storedCache) {
          const cache = JSON.parse(storedCache);
          cacheRef.current = cache;

          // Initialize Fuse for search results
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

          // Initialize Fuse for suggestions (more permissive)
          suggestionFuseRef.current = new Fuse(cache, {
            keys: ["Title"],
            includeScore: true,
            threshold: 0.6,
            ignoreLocation: true,
            minMatchCharLength: 1,
          });
        }

        if (storedHistory) {
          const history = JSON.parse(storedHistory);
          searchHistoryRef.current = history;
          setSearchHistory(history);
        }

        if (storedApiLimit) {
          const limit = JSON.parse(storedApiLimit);
          if (Date.now() > limit.resetTime) {
            apiLimitRef.current = {
              calls: 0,
              resetTime: Date.now() + 86400000,
            };
            setApiCallCount(0);
            await AsyncStorage.setItem(
              "apiLimit",
              JSON.stringify(apiLimitRef.current)
            );
          } else {
            apiLimitRef.current = limit;
            setApiCallCount(limit.calls);
          }
        }

        isInitialized.current = true;
      } catch (error) {
        console.warn("Failed to initialize data:", error);
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Clean query processing
  const processQuery = useCallback((input) => {
    const cleaned = input.trim();
    if (cleaned.length < 2) return null;

    // Remove extra spaces
    return cleaned.replace(/\s+/g, " ");
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

  // Increment API call counter
  const incrementApiCall = useCallback(async () => {
    apiLimitRef.current.calls += 1;
    setApiCallCount(apiLimitRef.current.calls);
    await AsyncStorage.setItem("apiLimit", JSON.stringify(apiLimitRef.current));
  }, []);

  // Generate suggestions based on typing
  const generateSuggestions = useMemo(
    () =>
      debounce((input) => {
        if (!input || input.length < 1) {
          // Show recent searches and popular keywords when input is empty
          const recentSearches = searchHistoryRef.current.slice(0, 3);
          const popularSuggestions = popularKeywords.slice(0, 5);
          const combined = [...recentSearches, ...popularSuggestions];
          // Preserve order, remove exact duplicates
          const uniqueSuggestions = combined.filter(
            (item, index, self) => self.indexOf(item) === index
          );
          setSuggestions(uniqueSuggestions.slice(0, 8));
          return;
        }

        const inputLower = input.toLowerCase();
        const newSuggestions = [];

        // Priority 1: Exact matches from search history
        const exactHistoryMatches = searchHistoryRef.current
          .filter((item) => item.toLowerCase().startsWith(inputLower))
          .slice(0, 2);
        newSuggestions.push(...exactHistoryMatches);

        // Priority 2: Partial matches from search history
        const partialHistoryMatches = searchHistoryRef.current
          .filter(
            (item) =>
              item.toLowerCase().includes(inputLower) &&
              !item.toLowerCase().startsWith(inputLower)
          )
          .slice(0, 2);
        newSuggestions.push(...partialHistoryMatches);

        // Priority 3: Movie/Series titles from cache
        if (suggestionFuseRef.current) {
          const titleSuggestions = suggestionFuseRef.current
            .search(input, { limit: 4 })
            .map(({ item }) => item.Title)
            .filter((title) => !newSuggestions.includes(title));
          newSuggestions.push(...titleSuggestions);
        }

        // Priority 4: Popular keywords matching input
        const keywordMatches = popularKeywords
          .filter((keyword) => keyword.toLowerCase().includes(inputLower))
          .slice(0, 3)
          .filter((keyword) => !newSuggestions.includes(keyword));
        newSuggestions.push(...keywordMatches);

        // Remove exact duplicates while preserving order and limit
        const uniqueSuggestions = newSuggestions.filter(
          (suggestion, index, self) => self.indexOf(suggestion) === index
        );
        setSuggestions(uniqueSuggestions.slice(0, 8));
      }, 200),
    [popularKeywords]
  );

  // Update suggestions when query changes
  useEffect(() => {
    generateSuggestions(query);

    return () => {
      generateSuggestions.cancel();
    };
  }, [query, generateSuggestions]);

  // Perform local search efficiently
  const performLocalSearch = useCallback(
    (searchQuery, currentFilterType, page = 1) => {
      if (!fuseRef.current || !searchQuery)
        return { results: [], hasMore: false };

      try {
        const fuseResults = fuseRef.current.search(searchQuery, { limit: 100 }); // Get more results for pagination
        let localResults = fuseResults.map(({ item }) => item);

        // Apply filter
        if (currentFilterType !== "all") {
          localResults = localResults.filter(
            (item) => item.Type === currentFilterType
          );
        }

        // Implement pagination for local results
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
    },
    []
  );

  // Save search to history
  const saveToHistory = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return;

    const currentHistory = searchHistoryRef.current;
    if (currentHistory[0] === searchTerm) return; // Already at top

    const newHistory = [
      searchTerm,
      ...currentHistory.filter((item) => item !== searchTerm),
    ].slice(0, 20);
    searchHistoryRef.current = newHistory;
    setSearchHistory(newHistory);
    await AsyncStorage.setItem("searchHistory", JSON.stringify(newHistory));
  }, []);

  // Delete individual history item
  const deleteHistoryItem = useCallback(
    async (itemToDelete) => {
      const newHistory = searchHistoryRef.current.filter(
        (item) => item !== itemToDelete
      );
      searchHistoryRef.current = newHistory;
      setSearchHistory(newHistory);
      await AsyncStorage.setItem("searchHistory", JSON.stringify(newHistory));

      // Update suggestions if currently showing
      if (showSuggestions) {
        generateSuggestions(query);
      }
    },
    [showSuggestions, query, generateSuggestions]
  );

  // Clear all search history
  const clearAllHistory = useCallback(async () => {
    Alert.alert(
      "Clear Search History",
      "Are you sure you want to clear all search history?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            searchHistoryRef.current = [];
            setSearchHistory([]);
            await AsyncStorage.removeItem("searchHistory");

            // Update suggestions if currently showing
            if (showSuggestions) {
              generateSuggestions(query);
            }
          },
        },
      ]
    );
  }, [showSuggestions, query, generateSuggestions]);

  // Update cache efficiently
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
      // Keep cache manageable
      if (newCache.length > 1500) {
        newCache.splice(0, newCache.length - 1500);
      }

      cacheRef.current = newCache;

      // Update Fuse instances
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

      suggestionFuseRef.current = new Fuse(newCache, {
        keys: ["Title"],
        includeScore: true,
        threshold: 0.6,
        ignoreLocation: true,
        minMatchCharLength: 1,
      });

      await AsyncStorage.setItem("movieCache", JSON.stringify(newCache));
    }
  }, []);

  // Main search function with pagination support
  const performSearch = useCallback(
    async (searchTerm, currentFilterType, page = 1, append = false) => {
      const cleanQuery = processQuery(searchTerm);
      if (!cleanQuery) {
        setError("Please enter a search term");
        return;
      }

      // Update current search reference
      currentSearchRef.current = {
        query: cleanQuery,
        filter: currentFilterType,
        page,
      };

      // Set loading states
      if (page === 1) {
        setIsLoading(true);
        setError(null);
        setResults([]);
      } else {
        setIsLoadingMore(true);
      }

      setHasSearched(true);

      try {
        let allResults = [];
        let hasMoreResults = false;
        let totalCount = 0;

        // Always try local search first
        const localSearchResult = performLocalSearch(
          cleanQuery,
          currentFilterType,
          page
        );

        if (localSearchResult.results.length > 0) {
          allResults = localSearchResult.results;
          hasMoreResults = localSearchResult.hasMore;
          totalCount = localSearchResult.total;

          // Update results
          if (append && page > 1) {
            setResults((prev) => [...prev, ...allResults]);
          } else {
            setResults(allResults);
          }

          // If this is page 1 and we have enough local results, or can't make API call
          if (
            page === 1 &&
            (localSearchResult.total >= 20 || !canMakeApiCall())
          ) {
            setHasMorePages(hasMoreResults);
            setTotalResults(totalCount);
            setCurrentPage(page);
            setTotalPages(Math.ceil(totalCount / 10));

            if (page === 1) setIsLoading(false);
            if (page > 1) setIsLoadingMore(false);

            if (page === 1) await saveToHistory(searchTerm);
            return;
          }
        }

        // Make API call if possible (only for first page or when we have few local results)
        if (canMakeApiCall() && (page === 1 || localSearchResult.total < 20)) {
          await incrementApiCall();

          const apiData = await searchMovies(
            cleanQuery,
            currentFilterType,
            page
          );

          if (apiData && apiData.Search && apiData.Search.length > 0) {
            // Process API results
            const processedResults = apiData.Search.map((item) => ({
              ...item,
              Poster:
                item.Poster && item.Poster !== "N/A"
                  ? item.Poster
                  : "https://via.placeholder.com/300x450?text=No+Image",
            }));

            // Calculate pagination info
            const apiTotalResults = parseInt(apiData.totalResults) || 0;
            const apiTotalPages = Math.ceil(apiTotalResults / 10);
            const apiHasMore = page < apiTotalPages;

            // For first page, merge with local results
            if (page === 1) {
              // Merge with local results, prioritizing API results
              const mergedResults = [];
              const seenIds = new Set();

              // Add API results first
              processedResults.forEach((item) => {
                if (!seenIds.has(item.imdbID)) {
                  mergedResults.push(item);
                  seenIds.add(item.imdbID);
                }
              });

              // Add local results that aren't duplicates
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
                Math.max(apiTotalPages, Math.ceil(totalCount / 10))
              );
            } else {
              // For subsequent pages, just add API results
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
            setResults([]);
            setHasMorePages(false);
            setTotalResults(0);
            setTotalPages(0);
            setCurrentPage(1);
            setError(
              "No results found. Try different keywords or check spelling."
            );
          } else {
            // No API results but we have local results
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
          setError(
            "Daily API limit reached. Try again tomorrow or search from cached results."
          );
        } else {
          // Use local results
          setHasMorePages(hasMoreResults);
          setTotalResults(totalCount);
          setTotalPages(Math.ceil(totalCount / 10));
          setCurrentPage(page);
        }

        if (page === 1) await saveToHistory(searchTerm);
      } catch (error) {
        console.warn("Search error:", error);

        // Fallback to local results if API fails
        const localSearchResult = performLocalSearch(
          cleanQuery,
          currentFilterType,
          page
        );
        if (localSearchResult.results.length > 0) {
          if (append && page > 1) {
            setResults((prev) => [...prev, ...localSearchResult.results]);
          } else {
            setResults(localSearchResult.results);
          }
          setHasMorePages(localSearchResult.hasMore);
          setTotalResults(localSearchResult.total);
          setTotalPages(Math.ceil(localSearchResult.total / 10));
          setCurrentPage(page);
          setError(null);
        } else {
          if (page === 1) {
            setResults([]);
            setHasMorePages(false);
            setTotalResults(0);
            setTotalPages(0);
            setCurrentPage(1);
            setError(
              "Search failed. Please check your connection and try again."
            );
          }
        }

        if (page === 1) await saveToHistory(searchTerm);
      }

      if (page === 1) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    },
    [
      processQuery,
      performLocalSearch,
      canMakeApiCall,
      incrementApiCall,
      saveToHistory,
      updateCache,
    ]
  );

  // Load more results (pagination)
  const loadMoreResults = useCallback(() => {
    if (isLoadingMore || !hasMorePages) return;

    const nextPage = currentPage + 1;
    const { query: currentQuery, filter: currentFilter } =
      currentSearchRef.current;

    if (currentQuery && currentFilter !== undefined) {
      performSearch(currentQuery, currentFilter, nextPage, true);
    }
  }, [isLoadingMore, hasMorePages, currentPage, performSearch]);

  // Handle filter changes - re-search if we have an active search
  const handleFilterChange = useCallback(
    (type) => {
      if (filterType === type) return;

      setFilterType(type);

      // If we have an active search, apply new filter
      if (searchQuery && hasSearched) {
        // Reset pagination for new filter
        setCurrentPage(1);
        setHasMorePages(false);
        setTotalResults(0);
        setTotalPages(0);
        lastExecutedSearch.current = ""; // Reset to allow re-search
        performSearch(searchQuery, type, 1, false);
      }
    },
    [filterType, searchQuery, hasSearched, performSearch]
  );

  // Handle manual search (search button or enter key)
  const handleSearch = useCallback(() => {
    if (!query.trim()) return;

    const trimmedQuery = query.trim();
    setSearchQuery(trimmedQuery);
    setShowSuggestions(false);
    setCurrentPage(1);
    setHasMorePages(false);
    setTotalResults(0);
    setTotalPages(0);
    Keyboard.dismiss();
    performSearch(trimmedQuery, filterType, 1, false);
  }, [query, filterType, performSearch]);

  // Handle suggestion selection
  const handleSuggestionPress = useCallback(
    (suggestion) => {
      setQuery(suggestion);
      setSearchQuery(suggestion);
      setShowSuggestions(false);
      setCurrentPage(1);
      setHasMorePages(false);
      setTotalResults(0);
      setTotalPages(0);
      Keyboard.dismiss();

      // Perform search immediately when suggestion is selected
      performSearch(suggestion, filterType, 1, false);
    },
    [filterType, performSearch]
  );

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    setIsFocused(true);
    setShowSuggestions(true);
  }, []);

  // Handle input blur with delay for suggestion selection
  const handleInputBlur = useCallback(() => {
    setIsFocused(false);
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  // Clear everything
  const clearSearch = useCallback(() => {
    setQuery("");
    setSearchQuery("");
    setResults([]);
    setError(null);
    setIsLoading(false);
    setShowSuggestions(false);
    setSuggestions([]);
    setHasSearched(false);
    setCurrentPage(1);
    setHasMorePages(false);
    setTotalResults(0);
    setTotalPages(0);
    setIsLoadingMore(false);
    lastExecutedSearch.current = "";
    currentSearchRef.current = { query: "", filter: "", page: 1 };
  }, []);

  // Get suggestion icon and color
  const getSuggestionIcon = useCallback(
    (item) => {
      if (searchHistoryRef.current.includes(item)) {
        return {
          name: "time-outline",
          color: theme === "dark" ? "#4CAF50" : "#2E7D32",
        };
      } else if (popularKeywords.includes(item)) {
        return {
          name: "trending-up-outline",
          color: theme === "dark" ? "#FF9800" : "#F57C00",
        };
      } else {
        return {
          name: "film-outline",
          color: theme === "dark" ? "#2196F3" : "#1976D2",
        };
      }
    },
    [theme, popularKeywords]
  );

  // Render functions
  const renderSuggestion = useCallback(
    ({ item }) => {
      const iconInfo = getSuggestionIcon(item);
      const isHistoryItem = searchHistoryRef.current.includes(item);

      return (
        <View style={[styles.suggestionItem, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.suggestionContent}
            onPress={() => handleSuggestionPress(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={iconInfo.name}
              size={18}
              color={iconInfo.color}
              style={styles.suggestionIcon}
            />
            <Text
              style={[styles.suggestionText, { color: colors.text }]}
              numberOfLines={1}
            >
              {item}
            </Text>
            <Ionicons
              name="chevron-forward-outline"
              size={16}
              color={theme === "dark" ? "#666" : "#999"}
              style={styles.suggestionArrow}
            />
          </TouchableOpacity>

          {/* Delete button for history items */}
          {isHistoryItem && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteHistoryItem(item)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="close-outline"
                size={16}
                color={theme === "dark" ? "#ff6b6b" : "#d32f2f"}
              />
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [
      colors.card,
      colors.text,
      theme,
      handleSuggestionPress,
      deleteHistoryItem,
      getSuggestionIcon,
    ]
  );

  const renderShimmer = useCallback(
    () => (
      <FlatList
        data={new Array(6).fill({})}
        keyExtractor={(_, index) => `shimmer-${index}`}
        renderItem={() => <ShimmerMovieCard />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    ),
    []
  );

  const renderMovieItem = useCallback(
    ({ item }) => (
      <MovieCard
        movie={item}
        onPress={() => navigation.navigate("Details", { imdbID: item.imdbID })}
      />
    ),
    [navigation]
  );

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator
          size="small"
          color={theme === "dark" ? "#1e88e5" : "#1976d2"}
        />
        <Text
          style={[
            styles.loadingText,
            { color: theme === "dark" ? "#888" : "#666" },
          ]}
        >
          Loading more results...
        </Text>
      </View>
    );
  }, [isLoadingMore, theme]);

  const keyExtractor = useCallback(
    (item, index) =>
      item.imdbID ? `${item.imdbID}-${index}` : `result-${index}`,
    []
  );

  const suggestionKeyExtractor = useCallback(
    (item, index) => `suggestion-${index}-${item}`,
    []
  );

  // Handle end reached for pagination
  const handleEndReached = useCallback(() => {
    if (hasMorePages && !isLoadingMore && !isLoading) {
      loadMoreResults();
    }
  }, [hasMorePages, isLoadingMore, isLoading, loadMoreResults]);

  return (
    <SafeAreaView
      style={[styles.safeContainer, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Search</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchSection}>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme === "dark" ? "#2a2a2a" : "#ffffff",
                borderColor: isFocused
                  ? theme === "dark"
                    ? "#1e88e5"
                    : "#1976d2"
                  : theme === "dark"
                  ? "#444"
                  : "#ddd",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isFocused ? 0.25 : 0.1,
                shadowRadius: 4,
                elevation: isFocused ? 6 : 2,
              },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={theme === "dark" ? "#888" : "#666"}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Type to see suggestions, then select or hit search..."
              value={query}
              onChangeText={setQuery}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              placeholderTextColor={theme === "dark" ? "#888" : "#999"}
              style={[styles.input, { color: colors.text }]}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme === "dark" ? "#888" : "#757575"}
                />
              </TouchableOpacity>
            )}

            {/* Search Button */}
            <TouchableOpacity
              onPress={handleSearch}
              style={[
                styles.searchButton,
                { backgroundColor: theme === "dark" ? "#1e88e5" : "#1976d2" },
              ]}
              disabled={!query.trim()}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="search" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Current Search Query Display */}
          {searchQuery && searchQuery !== query && (
            <View style={styles.currentSearchContainer}>
              <Text
                style={[
                  styles.currentSearchLabel,
                  { color: theme === "dark" ? "#888" : "#666" },
                ]}
              >
                Showing results for:
              </Text>
              <Text style={[styles.currentSearchText, { color: colors.text }]}>
                "{searchQuery}"
              </Text>
              {totalResults > 0 && (
                <Text
                  style={[
                    styles.resultCount,
                    { color: theme === "dark" ? "#888" : "#666" },
                  ]}
                >
                  ({totalResults} results)
                </Text>
              )}
            </View>
          )}

          {/* Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <View
              style={[
                styles.suggestionsContainer,
                { backgroundColor: colors.card },
              ]}
            >
              {/* Clear history option */}
              {searchHistory.length > 0 && query.length === 0 && (
                <TouchableOpacity
                  style={[
                    styles.clearAllSuggestion,
                    { borderBottomColor: theme === "dark" ? "#333" : "#eee" },
                  ]}
                  onPress={clearAllHistory}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={theme === "dark" ? "#ff6b6b" : "#d32f2f"}
                    style={styles.suggestionIcon}
                  />
                  <Text
                    style={[
                      styles.clearAllText,
                      { color: theme === "dark" ? "#ff6b6b" : "#d32f2f" },
                    ]}
                  >
                    Clear All History
                  </Text>
                </TouchableOpacity>
              )}

              <FlatList
                data={suggestions}
                keyExtractor={suggestionKeyExtractor}
                renderItem={renderSuggestion}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                maxToRenderPerBatch={8}
                initialNumToRender={8}
              />
            </View>
          )}
        </View>

        {/* Filter Buttons - Only show when we have searched */}
        {hasSearched && (
          <View style={styles.filterContainer}>
            {["all", "movie", "series"].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor:
                      filterType === type
                        ? theme === "dark"
                          ? "#1e88e5"
                          : "#1976d2"
                        : colors.card,
                  },
                  filterType === type && styles.activeFilter,
                ]}
                onPress={() => handleFilterChange(type)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: filterType === type ? "#fff" : colors.text },
                  ]}
                >
                  {type === "all"
                    ? "All"
                    : type === "movie"
                    ? "Movies"
                    : "Series"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Results */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={24}
              color={theme === "dark" ? "#ff6b6b" : "#d32f2f"}
            />
            <Text
              style={[
                styles.errorText,
                { color: theme === "dark" ? "#ff6b6b" : "#d32f2f" },
              ]}
            >
              {error}
            </Text>
          </View>
        ) : isLoading ? (
          renderShimmer()
        ) : (
          <FlatList
            data={results}
            keyExtractor={keyExtractor}
            renderItem={renderMovieItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            initialNumToRender={10}
            windowSize={10}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name={hasSearched ? "search-outline" : "bulb-outline"}
                  size={48}
                  color={theme === "dark" ? "#666" : "#999"}
                />
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  {hasSearched
                    ? "No results found. Try different keywords or check spelling."
                    : "Start typing to see suggestions, then select one or hit search"}
                </Text>

                {/* Show recent searches and popular suggestions when not searched */}
                {!hasSearched && (
                  <View style={styles.welcomeContainer}>
                    {searchHistory.length > 0 && (
                      <View style={styles.historySection}>
                        <View style={styles.sectionHeader}>
                          <Text
                            style={[
                              styles.sectionTitle,
                              { color: colors.text },
                            ]}
                          >
                            Recent Searches
                          </Text>
                          <TouchableOpacity
                            onPress={clearAllHistory}
                            style={styles.smallClearButton}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={14}
                              color={theme === "dark" ? "#ff6b6b" : "#d32f2f"}
                            />
                            <Text
                              style={[
                                styles.smallClearText,
                                {
                                  color:
                                    theme === "dark" ? "#ff6b6b" : "#d32f2f",
                                },
                              ]}
                            >
                              Clear
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.chipContainer}>
                          {searchHistory.slice(0, 4).map((item, index) => (
                            <View key={index} style={styles.chipWrapper}>
                              <TouchableOpacity
                                style={[
                                  styles.chip,
                                  { backgroundColor: colors.card },
                                ]}
                                onPress={() => handleSuggestionPress(item)}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name="time-outline"
                                  size={14}
                                  color={
                                    theme === "dark" ? "#4CAF50" : "#2E7D32"
                                  }
                                />
                                <Text
                                  style={[
                                    styles.chipText,
                                    { color: colors.text },
                                  ]}
                                >
                                  {item}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.chipDelete}
                                onPress={() => deleteHistoryItem(item)}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name="close-outline"
                                  size={14}
                                  color={
                                    theme === "dark" ? "#ff6b6b" : "#d32f2f"
                                  }
                                />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    <View style={styles.popularSection}>
                      <Text
                        style={[styles.sectionTitle, { color: colors.text }]}
                      >
                        Popular Searches
                      </Text>
                      <View style={styles.chipContainer}>
                        {popularKeywords.slice(0, 6).map((item, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.chip,
                              { backgroundColor: colors.card },
                            ]}
                            onPress={() => handleSuggestionPress(item)}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name="trending-up-outline"
                              size={14}
                              color={theme === "dark" ? "#FF9800" : "#F57C00"}
                            />
                            <Text
                              style={[styles.chipText, { color: colors.text }]}
                            >
                              {item}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clearHistoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 12,
    gap: 4,
  },
  clearHistoryText: {
    fontSize: 12,
    fontWeight: "500",
  },
  apiCounter: {
    fontSize: 12,
    opacity: 0.8,
  },
  searchSection: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  currentSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 4,
    flexWrap: "wrap",
  },
  currentSearchLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  currentSearchText: {
    fontSize: 12,
    fontWeight: "600",
    marginRight: 4,
  },
  resultCount: {
    fontSize: 12,
    fontStyle: "italic",
  },
  suggestionsContainer: {
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 280,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  clearAllSuggestion: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  suggestionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 14,
    flex: 1,
  },
  suggestionArrow: {
    opacity: 0.6,
    marginLeft: 8,
  },
  deleteButton: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
  },
  activeFilter: {
    elevation: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
  },
  paginationInfo: {
    paddingVertical: 8,
    alignItems: "center",
  },
  paginationText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  loadingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
    opacity: 0.7,
  },
  welcomeContainer: {
    alignItems: "center",
    marginTop: 32,
    width: "100%",
  },
  historySection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
  },
  popularSection: {
    width: "100%",
    alignItems: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "left",
  },
  smallClearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  smallClearText: {
    fontSize: 12,
    fontWeight: "500",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 8,
    width: "100%",
  },
  chipWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chipText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
  },
  chipDelete: {
    marginLeft: -8,
    marginRight: 4,
    padding: 4,
    backgroundColor: "transparent",
    borderRadius: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default SearchScreen;
