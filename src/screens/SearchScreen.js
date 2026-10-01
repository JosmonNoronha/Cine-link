// SearchScreen.js
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Animated,
  Text,
  StatusBar,
  Keyboard,
  Alert,
  StyleSheet,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCustomTheme } from "../contexts/ThemeContext";
import analyticsService from "../services/analytics";
import logger from "../services/logger";

// Components
import SearchInput from "../components/search/SearchInput";
import SearchSuggestions from "../components/search/SearchSuggestions";
import SearchFilters from "../components/search/SearchFilters";
import SearchResults from "../components/search/SearchResults";

// Hooks
import useSearchLogic from "../hooks/useSearchLogic";
import useSuggestions from "../hooks/useSuggestions";
import useSearchHistory from "../hooks/useSearchHistory";
import FloatingGlassHeader from "../components/search/FloatingGlassHeader";

const SearchScreen = ({ navigation }) => {
  // Local state
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { colors } = useTheme();
  const { theme } = useCustomTheme();

  // Custom hooks for logic separation
  const {
    results,
    isLoading,
    error,
    totalResults,
    isLoadingMore,
    hasMorePages,
    isTotalExact,
    performSearch,
    loadMoreResults,
    clearSearch: clearSearchResults,
    initializeCache,
  } = useSearchLogic();

  const {
    suggestions,
    trendingKeywords,
    generateSuggestions,
    initializeSuggestions,
  } = useSuggestions();

  const { searchHistory, saveToHistory, deleteHistoryItem, clearAllHistory } =
    useSearchHistory();

  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);

  // Initialize data on mount
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (isMounted) {
        await Promise.all([initializeCache(), initializeSuggestions()]);
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [initializeCache, initializeSuggestions]);

  // Update suggestions when query or history changes.
  useEffect(() => {
    generateSuggestions(query, searchHistory);

    return () => {
      generateSuggestions.cancel?.();
    };
  }, [query, searchHistory, generateSuggestions]);

  // Track analytics when results are updated
  useEffect(() => {
    // Only track if we have a search query and not loading (results are ready)
    if (searchQuery && !isLoading && hasSearched) {
      logger.info(
        `📊 Analytics: search "${searchQuery}" with ${results?.length || 0} results (total: ${totalResults})`,
      );
      analyticsService.trackSearch(searchQuery, results?.length || 0);
    }
  }, [results, searchQuery, isLoading, hasSearched, totalResults]);

  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
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

  // Handle manual search
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    const trimmedQuery = query.trim();
    setSearchQuery(trimmedQuery);
    setShowSuggestions(false);
    setHasSearched(true);
    Keyboard.dismiss();

    try {
      await performSearch(trimmedQuery, filterType);
      await saveToHistory(trimmedQuery);
      // Analytics now tracked by useEffect when results update
    } catch (error) {
      logger.warn("Search failed", error);
    }
  }, [query, filterType, performSearch, saveToHistory]);

  // Handle suggestion selection
  const handleSuggestionPress = useCallback(
    async (suggestion) => {
      setQuery(suggestion);
      setSearchQuery(suggestion);
      setShowSuggestions(false);
      setHasSearched(true);
      Keyboard.dismiss();

      try {
        await performSearch(suggestion, filterType);
        await saveToHistory(suggestion);
        // Analytics now tracked by useEffect when results update
      } catch (error) {
        logger.warn("Search failed", error);
      }
    },
    [filterType, performSearch, saveToHistory],
  );

  // Handle filter changes
  const handleFilterChange = useCallback(
    async (type) => {
      if (filterType === type) return;

      setFilterType(type);

      if (searchQuery && hasSearched) {
        try {
          await performSearch(searchQuery, type);
        } catch (error) {
          logger.warn("Filter change failed", error);
        }
      }
    },
    [filterType, searchQuery, hasSearched, performSearch],
  );

  // Clear everything
  const clearSearch = useCallback(() => {
    setQuery("");
    setSearchQuery("");
    setShowSuggestions(false);
    setHasSearched(false);
    clearSearchResults();
  }, [clearSearchResults]);

  // Handle movie press
  const handleMoviePress = useCallback(
    (imdbID) => {
      navigation.navigate("Details", { imdbID });
    },
    [navigation],
  );

  // Handle clear all history
  const handleClearAllHistory = useCallback(async () => {
    try {
      await clearAllHistory();
      if (showSuggestions) {
        generateSuggestions(query, []);
      }
    } catch (error) {
      logger.warn("Failed to clear history", error);
    }
  }, [clearAllHistory, showSuggestions, generateSuggestions, query]);

  // Handle delete individual history item
  const handleDeleteHistoryItem = useCallback(
    async (item) => {
      try {
        await deleteHistoryItem(item);
        if (showSuggestions) {
          // Get updated history for regenerating suggestions
          const updatedHistory = searchHistory.filter(
            (historyItem) => historyItem !== item,
          );
          generateSuggestions(query, updatedHistory);
        }
      } catch (error) {
        logger.warn("Failed to delete history item", error);
      }
    },
    [
      deleteHistoryItem,
      showSuggestions,
      generateSuggestions,
      query,
      searchHistory,
    ],
  );

  // Get suggestion icon and color
  const getSuggestionIcon = useCallback(
    (item) => {
      if (searchHistory.includes(item)) {
        return {
          name: "time-outline",
          color: theme === "dark" ? "#4CAF50" : "#2E7D32",
        };
      } else if (trendingKeywords.includes(item)) {
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
    [theme, searchHistory, trendingKeywords],
  );

  // Handle load more results
  const handleLoadMoreResults = useCallback(() => {
    if (!isLoadingMore && hasMorePages && !isLoading) {
      loadMoreResults();
    }
  }, [isLoadingMore, hasMorePages, isLoading, loadMoreResults]);

  return (
    <SafeAreaView
      style={[styles.safeContainer, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View style={styles.container}>
        <FloatingGlassHeader
          scrollY={scrollY}
          onHeight={setHeaderHeight}
          theme={theme}
          colors={colors}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={[styles.title, { color: colors.text }]}>Search</Text>
          </View>

          {/* Search Input Section — SearchInput itself stays solid, see its own patch */}
          <View style={styles.searchSection}>
            <SearchInput
              query={query}
              onChangeText={setQuery}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onSubmit={handleSearch}
              onClear={clearSearch}
              isLoading={isLoading}
              isFocused={isFocused}
              theme={theme}
              colors={colors}
            />

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
                <Text
                  style={[styles.currentSearchText, { color: colors.text }]}
                >
                  “{searchQuery}”
                </Text>
                {totalResults > 0 && isTotalExact && (
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

            {showSuggestions && suggestions.length > 0 && (
              <SearchSuggestions
                suggestions={suggestions}
                onSuggestionPress={handleSuggestionPress}
                onDeleteHistory={handleDeleteHistoryItem}
                onClearAllHistory={handleClearAllHistory}
                getSuggestionIcon={getSuggestionIcon}
                searchHistory={searchHistory}
                query={query}
                colors={colors}
                theme={theme}
              />
            )}
          </View>

          {/* Filter Buttons - Only show when we have searched */}
          {hasSearched && (
            <SearchFilters
              filterType={filterType}
              onFilterChange={handleFilterChange}
              colors={colors}
              theme={theme}
            />
          )}
        </FloatingGlassHeader>

        {/* Results — now scrolls underneath the floating header above */}
        <SearchResults
          results={results}
          isLoading={isLoading}
          error={error}
          hasSearched={hasSearched}
          isLoadingMore={isLoadingMore}
          hasMorePages={hasMorePages}
          onEndReached={handleLoadMoreResults}
          onLoadMorePress={handleLoadMoreResults}
          onMoviePress={handleMoviePress}
          searchHistory={searchHistory}
          popularKeywords={trendingKeywords}
          onSuggestionPress={handleSuggestionPress}
          onDeleteHistory={handleDeleteHistoryItem}
          onClearAllHistory={handleClearAllHistory}
          colors={colors}
          theme={theme}
          headerHeight={headerHeight}
          onScroll={handleScroll}
        />
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
  apiCounter: {
    fontSize: 12,
    opacity: 0.8,
  },
  searchSection: {
    marginBottom: 16,
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
  paginationInfo: {
    paddingVertical: 8,
    alignItems: "center",
  },
  paginationText: {
    fontSize: 12,
    fontStyle: "italic",
  },
});

export default SearchScreen;
