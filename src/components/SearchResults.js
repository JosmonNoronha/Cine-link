// components/SearchResults.js
import React from "react";
import {
  FlatList,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MovieCard from "./MovieCard";
import ShimmerMovieCard from "./ShimmerMovieCard";
import SearchWelcome from "./SearchWelcome";

const SearchResults = ({
  results,
  isLoading,
  error,
  hasSearched,
  isLoadingMore,
  onEndReached,
  onMoviePress,
  // Welcome screen props
  searchHistory,
  popularKeywords,
  onSuggestionPress,
  onDeleteHistory,
  onClearAllHistory,
  colors,
  theme,
}) => {
  const renderMovieItem = ({ item }) => (
    <MovieCard movie={item} onPress={() => onMoviePress(item.imdbID)} />
  );

  const renderFooter = () => {
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
  };

  const renderShimmer = () => (
    <FlatList
      data={new Array(6).fill({})}
      keyExtractor={(_, index) => `shimmer-${index}`}
      renderItem={() => <ShimmerMovieCard />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );

  const renderEmptyComponent = () => (
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

      {!hasSearched && (
        <SearchWelcome
          searchHistory={searchHistory}
          popularKeywords={popularKeywords}
          onSuggestionPress={onSuggestionPress}
          onDeleteHistory={onDeleteHistory}
          onClearAllHistory={onClearAllHistory}
          colors={colors}
          theme={theme}
        />
      )}
    </View>
  );

  if (error) {
    return (
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
    );
  }

  if (isLoading) {
    return renderShimmer();
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(item, index) =>
        item?.imdbID ||
        `${item?.Title || "result"}-${item?.Year || ""}-${item?.Type || ""}-${index}`
      }
      renderItem={renderMovieItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      initialNumToRender={10}
      windowSize={10}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmptyComponent}
    />
  );
};

const styles = StyleSheet.create({
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
  listContent: {
    paddingBottom: 20,
  },
});

export default SearchResults;
