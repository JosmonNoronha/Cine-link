// screens/SearchScreen.js
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
import AutocompleteDropdown from "../components/search/AutocompleteDropdown";
import SearchFilters from "../components/search/SearchFilters";
import SearchResults from "../components/search/SearchResults";
import FloatingGlassHeader from "../components/search/FloatingGlassHeader";

import useSearchLogic from "../hooks/useSearchLogic";
import useAutocomplete from "../hooks/useAutocomplete";
import useSearchHistory from "../hooks/useSearchHistory";

const SearchScreen = ({ navigation }) => {
  const [query, setQuery]                     = useState("");
  const [searchQuery, setSearchQuery]         = useState("");
  const [filterType, setFilterType]           = useState("all");
  const [isFocused, setIsFocused]             = useState(false);
  const [showDropdown, setShowDropdown]       = useState(false);
  const [hasSearched, setHasSearched]         = useState(false);
  const [headerHeight, setHeaderHeight]       = useState(0);

  const { colors } = useTheme();
  const { theme }  = useCustomTheme();

  const {
    results, isLoading, error, totalResults,
    isLoadingMore, hasMorePages, isTotalExact,
    performSearch, loadMoreResults,
    clearSearch: clearSearchResults,
  } = useSearchLogic();

  const { searchHistory, saveToHistory, deleteHistoryItem, clearAllHistory } =
    useSearchHistory();

  // ── Autocomplete ────────────────────────────────────────────────────────

  const { items, titleLoading, trending, update, clear } = useAutocomplete({
    history: searchHistory,
    enabled: showDropdown,
  });

  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Analytics ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (searchQuery && !isLoading && hasSearched) {
      analyticsService.trackSearch(searchQuery, results?.length || 0);
    }
  }, [results, searchQuery, isLoading, hasSearched]);

  // ── Scroll handler ─────────────────────────────────────────────────────

  const handleScroll = useMemo(
    () =>
      Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: false },
      ),
    [scrollY],
  );

  // ── Input handlers ─────────────────────────────────────────────────────

  const handleChangeText = useCallback((text) => {
    setQuery(text);
    update(text);          // drives autocomplete
  }, [update]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setShowDropdown(true);
    update(query);         // populate immediately on focus
  }, [update, query]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Small delay so taps on dropdown items register before it hides
    setTimeout(() => setShowDropdown(false), 180);
  }, []);

  // ── Search execution ───────────────────────────────────────────────────

  const executeSearch = useCallback(async (text, type = filterType) => {
    if (!text?.trim()) return;
    const trimmed = text.trim();
    setSearchQuery(trimmed);
    setShowDropdown(false);
    setHasSearched(true);
    Keyboard.dismiss();
    clear();
    try {
      await performSearch(trimmed, type);
      await saveToHistory(trimmed);
    } catch (e) {
      logger.warn("Search failed", e);
    }
  }, [filterType, performSearch, saveToHistory, clear]);

  const handleSubmit = useCallback(() => {
    executeSearch(query);
  }, [query, executeSearch]);

  // Called when user taps a history or trending suggestion (plain text)
  const handleSelectText = useCallback((text) => {
    setQuery(text);
    executeSearch(text);
  }, [executeSearch]);

  // Called when user taps a rich title result from autocomplete
  const handleSelectTitle = useCallback((item) => {
    if (item.imdbID) {
      // Navigate directly to details — no need to search
      setShowDropdown(false);
      Keyboard.dismiss();
      clear();
      navigation.navigate("Details", { imdbID: item.imdbID });
    } else {
      // Person or result without imdbID — run a text search
      handleSelectText(item.text);
    }
  }, [navigation, handleSelectText, clear]);

  // ── Filter ─────────────────────────────────────────────────────────────

  const handleFilterChange = useCallback(async (type) => {
    if (filterType === type) return;
    setFilterType(type);
    if (searchQuery && hasSearched) {
      try { await performSearch(searchQuery, type); }
      catch (e) { logger.warn("Filter change failed", e); }
    }
  }, [filterType, searchQuery, hasSearched, performSearch]);

  // ── Clear ──────────────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    setQuery("");
    setSearchQuery("");
    setShowDropdown(false);
    setHasSearched(false);
    clearSearchResults();
    clear();
  }, [clearSearchResults, clear]);

  // ── History ────────────────────────────────────────────────────────────

  const handleDeleteHistory = useCallback(async (text) => {
    await deleteHistoryItem(text);
  }, [deleteHistoryItem]);

  const handleClearHistory = useCallback(async () => {
    await clearAllHistory();
  }, [clearAllHistory]);

  // ── Movie press ────────────────────────────────────────────────────────

  const handleMoviePress = useCallback(
    (imdbID) => navigation.navigate("Details", { imdbID }),
    [navigation],
  );

  // ── Load more ──────────────────────────────────────────────────────────

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMorePages && !isLoading) loadMoreResults();
  }, [isLoadingMore, hasMorePages, isLoading, loadMoreResults]);

  // ── Render ─────────────────────────────────────────────────────────────

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

          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>Search</Text>
          </View>

          {/* Input */}
          <View style={styles.inputSection}>
            <SearchInput
              query={query}
              onChangeText={handleChangeText}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onSubmit={handleSubmit}
              onClear={handleClear}
              // Show typeahead spinner in the input, not the main search spinner
              isLoading={isLoading && !showDropdown}
              isFocused={isFocused}
              theme={theme}
              colors={colors}
            />

            {/* Current search label */}
            {searchQuery && searchQuery !== query && !showDropdown && (
              <View style={styles.currentSearchRow}>
                <Text style={[styles.currentSearchLabel, { color: theme === "dark" ? "#888" : "#666" }]}>
                  Results for:
                </Text>
                <Text style={[styles.currentSearchText, { color: colors.text }]}>
                  "{searchQuery}"
                </Text>
                {totalResults > 0 && isTotalExact && (
                  <Text style={[styles.resultCount, { color: theme === "dark" ? "#888" : "#666" }]}>
                    ({totalResults})
                  </Text>
                )}
              </View>
            )}

            {/* Autocomplete dropdown */}
            {showDropdown && (
              <AutocompleteDropdown
                items={items}
                titleLoading={titleLoading}
                query={query}
                onSelectText={handleSelectText}
                onSelectTitle={handleSelectTitle}
                onDeleteHistory={handleDeleteHistory}
                onClearHistory={handleClearHistory}
                colors={colors}
                theme={theme}
              />
            )}
          </View>

          {/* Filters — only visible when not in dropdown mode */}
          {hasSearched && !showDropdown && (
            <SearchFilters
              filterType={filterType}
              onFilterChange={handleFilterChange}
              colors={colors}
              theme={theme}
            />
          )}

        </FloatingGlassHeader>

        {/* Results */}
        <SearchResults
          results={results}
          isLoading={isLoading}
          error={error}
          hasSearched={hasSearched}
          isLoadingMore={isLoadingMore}
          hasMorePages={hasMorePages}
          onEndReached={handleLoadMore}
          onLoadMorePress={handleLoadMore}
          onMoviePress={handleMoviePress}
          searchHistory={searchHistory}
          popularKeywords={trending}
          onSuggestionPress={handleSelectText}
          onDeleteHistory={handleDeleteHistory}
          onClearAllHistory={handleClearHistory}
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
  container: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  inputSection: {
    marginBottom: 12,
  },
  currentSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 4,
    flexWrap: "wrap",
    gap: 4,
  },
  currentSearchLabel: { fontSize: 12 },
  currentSearchText:  { fontSize: 12, fontWeight: "600" },
  resultCount:        { fontSize: 12, fontStyle: "italic" },
});

export default SearchScreen;