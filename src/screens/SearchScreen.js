// SearchScreen.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  Keyboard,
  Alert,
  StyleSheet,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useCustomTheme } from "../contexts/ThemeContext";
import analyticsService from "../services/analytics";

// Components
import SearchInput from "../components/SearchInput";
import SearchSuggestions from "../components/SearchSuggestions";
import SearchFilters from "../components/SearchFilters";
import SearchResults from "../components/SearchResults";

// Hooks
import useSearchLogic from "../hooks/useSearchLogic";
import useSuggestions from "../hooks/useSuggestions";
import useSearchHistory from "../hooks/useSearchHistory";

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

  // Update suggestions when query changes (removed searchHistory from deps to prevent excessive re-renders)
  useEffect(() => {
    generateSuggestions(query, searchHistory);

    return () => {
      generateSuggestions.cancel?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, generateSuggestions]);

  // Track analytics when results are updated
  useEffect(() => {
    // Only track if we have a search query and not loading (results are ready)
    if (searchQuery && !isLoading && hasSearched) {
      console.log(
        `📊 Analytics: search "${searchQuery}" with ${results?.length || 0} results (total: ${totalResults})`,
      );
      analyticsService.trackSearch(searchQuery, results?.length || 0);
    }
  }, [results, searchQuery, isLoading, hasSearched, totalResults]);

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
      console.warn("Search failed:", error);
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
        console.warn("Search failed:", error);
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
          console.warn("Filter change failed:", error);
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
      console.warn("Failed to clear history:", error);
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
        console.warn("Failed to delete history item:", error);
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
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Search</Text>
        </View>

        {/* Search Input Section */}
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
                “{searchQuery}”
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

        {/* Results */}
        <SearchResults
          results={results}
          isLoading={isLoading}
          error={error}
          hasSearched={hasSearched}
          isLoadingMore={isLoadingMore}
          onEndReached={handleLoadMoreResults}
          onMoviePress={handleMoviePress}
          // Welcome screen props
          searchHistory={searchHistory}
          popularKeywords={trendingKeywords}
          onSuggestionPress={handleSuggestionPress}
          onDeleteHistory={handleDeleteHistoryItem}
          onClearAllHistory={handleClearAllHistory}
          colors={colors}
          theme={theme}
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
