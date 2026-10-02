import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Animated,
  Text,
  StatusBar,
  Keyboard,
  StyleSheet,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCustomTheme } from "../contexts/ThemeContext";
import analyticsService from "../services/analytics";
import logger from "../services/logger";

import SearchInput from "../components/search/SearchInput";
import SearchSuggestions from "../components/search/SearchSuggestions";
import SearchFilters from "../components/search/SearchFilters";
import SearchResults from "../components/search/SearchResults";
import FloatingGlassHeader from "../components/search/FloatingGlassHeader";

import useSearchLogic from "../hooks/useSearchLogic";
import useSuggestions from "../hooks/useSuggestions";
import useSearchHistory from "../hooks/useSearchHistory";

const SearchScreen = ({ navigation }) => {
  const [query, setQuery]                   = useState("");
  const [searchQuery, setSearchQuery]       = useState("");
  const [filterType, setFilterType]         = useState("all");
  const [isFocused, setIsFocused]           = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched]       = useState(false);

  const { colors } = useTheme();
  const { theme }  = useCustomTheme();

  const {
    results, isLoading, error, totalResults,
    isLoadingMore, hasMorePages, isTotalExact,
    performSearch, loadMoreResults, clearSearch: clearSearchResults, initializeCache,
  } = useSearchLogic();

  const { suggestions, trendingKeywords, generateSuggestions, initializeSuggestions } =
    useSuggestions();

  const { searchHistory, saveToHistory, deleteHistoryItem, clearAllHistory } =
    useSearchHistory();

  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    Promise.all([initializeCache(), initializeSuggestions()]).catch(() => {});
    return () => { mounted = false; };
  }, [initializeCache, initializeSuggestions]);

  useEffect(() => {
    generateSuggestions(query, searchHistory);
    return () => { generateSuggestions.cancel?.(); };
  }, [query, searchHistory, generateSuggestions]);

  // ── Analytics ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (searchQuery && !isLoading && hasSearched) {
      analyticsService.trackSearch(searchQuery, results?.length || 0);
    }
  }, [results, searchQuery, isLoading, hasSearched]);

  // ── Scroll handler ─────────────────────────────────────────────────────────

  const handleScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false },
      ),
    [scrollY],
  );

  // ── Search actions ────────────────────────────────────────────────────────

  const handleInputFocus = useCallback(() => {
    setIsFocused(true);
    setShowSuggestions(true);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsFocused(false);
    setTimeout(() => setShowSuggestions(false), 200);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    const trimmed = query.trim();
    setSearchQuery(trimmed);
    setShowSuggestions(false);
    setHasSearched(true);
    Keyboard.dismiss();
    try {
      await performSearch(trimmed, filterType);
      await saveToHistory(trimmed);
    } catch (e) {
      logger.warn("Search failed", e);
    }
  }, [query, filterType, performSearch, saveToHistory]);

  const handleSuggestionPress = useCallback(async (suggestion) => {
    setQuery(suggestion);
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    setHasSearched(true);
    Keyboard.dismiss();
    try {
      await performSearch(suggestion, filterType);
      await saveToHistory(suggestion);
    } catch (e) {
      logger.warn("Search failed", e);
    }
  }, [filterType, performSearch, saveToHistory]);

  const handleFilterChange = useCallback(async (type) => {
    if (filterType === type) return;
    setFilterType(type);
    if (searchQuery && hasSearched) {
      try { await performSearch(searchQuery, type); }
      catch (e) { logger.warn("Filter change failed", e); }
    }
  }, [filterType, searchQuery, hasSearched, performSearch]);

  const clearSearch = useCallback(() => {
    setQuery("");
    setSearchQuery("");
    setShowSuggestions(false);
    setHasSearched(false);
    clearSearchResults();
  }, [clearSearchResults]);

  const handleMoviePress = useCallback(
    (imdbID) => navigation.navigate("Details", { imdbID }),
    [navigation],
  );

  const handleClearAllHistory = useCallback(async () => {
    try {
      await clearAllHistory();
      if (showSuggestions) generateSuggestions(query, []);
    } catch (e) { logger.warn("Failed to clear history", e); }
  }, [clearAllHistory, showSuggestions, generateSuggestions, query]);

  const handleDeleteHistoryItem = useCallback(async (item) => {
    try {
      await deleteHistoryItem(item);
      if (showSuggestions) {
        generateSuggestions(query, searchHistory.filter((h) => h !== item));
      }
    } catch (e) { logger.warn("Failed to delete history item", e); }
  }, [deleteHistoryItem, showSuggestions, generateSuggestions, query, searchHistory]);

  const getSuggestionIcon = useCallback((item) => {
    if (searchHistory.includes(item))
      return { name: "time-outline", color: theme === "dark" ? "#4CAF50" : "#2E7D32" };
    if (trendingKeywords.includes(item))
      return { name: "trending-up-outline", color: theme === "dark" ? "#FF9800" : "#F57C00" };
    return { name: "film-outline", color: theme === "dark" ? "#2196F3" : "#1976D2" };
  }, [theme, searchHistory, trendingKeywords]);

  const handleLoadMoreResults = useCallback(() => {
    if (!isLoadingMore && hasMorePages && !isLoading) loadMoreResults();
  }, [isLoadingMore, hasMorePages, isLoading, loadMoreResults]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View style={styles.container}>

        <FloatingGlassHeader
          scrollY={scrollY}
          theme={theme}
          colors={colors}
          onHeight={setHeaderHeight}
        >
          {/* Title row */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>Search</Text>
          </View>

          {/* Search input */}
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
              <View style={styles.currentSearchRow}>
                <Text style={[styles.currentSearchLabel, { color: theme === "dark" ? "#888" : "#666" }]}>
                  Showing results for:
                </Text>
                <Text style={[styles.currentSearchText, { color: colors.text }]}>
                  "{searchQuery}"
                </Text>
                {totalResults > 0 && isTotalExact && (
                  <Text style={[styles.resultCount, { color: theme === "dark" ? "#888" : "#666" }]}>
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

          {hasSearched && (
            <SearchFilters
              filterType={filterType}
              onFilterChange={handleFilterChange}
              colors={colors}
              theme={theme}
            />
          )}
        </FloatingGlassHeader>

        {/* Results scroll behind the glass header; their initial content is offset below it. */}
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
  safe: { flex: 1 },
  container: {
    flex: 1,
    // No paddingHorizontal here — let each child control its own horizontal spacing
    // so the FlashList can go edge-to-edge while the header content is padded.
  },
  titleRow: {
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
  searchSection: {
    marginBottom: 16,
  },
  currentSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 4,
    flexWrap: "wrap",
  },
  currentSearchLabel: { fontSize: 12, marginRight: 4 },
  currentSearchText: { fontSize: 12, fontWeight: "600", marginRight: 4 },
  resultCount: { fontSize: 12, fontStyle: "italic" },
});

export default SearchScreen;