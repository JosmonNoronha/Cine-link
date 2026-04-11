// components/SearchResults.js
import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
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
  hasMorePages,
  onEndReached,
  onLoadMorePress,
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
    if (isLoadingMore) {
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
    }

    if (!hasMorePages || !results?.length) return null;

    return (
      <TouchableOpacity
        style={[
          styles.loadMoreButton,
          {
            backgroundColor:
              theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            borderColor: theme === "dark" ? "#333" : "#ddd",
          },
        ]}
        onPress={onLoadMorePress || onEndReached}
        activeOpacity={0.8}
      >
        <Text style={[styles.loadMoreText, { color: colors.text }]}>Load more</Text>
      </TouchableOpacity>
    );
  };

  const renderShimmer = () => (
    <FlashList
      data={new Array(6).fill({})}
      keyExtractor={(_, index) => `shimmer-${index}`}
      renderItem={() => <ShimmerMovieCard />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      estimatedItemSize={180}
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
    <FlashList
      data={results}
      keyExtractor={(item, index) =>
        item?.imdbID ||
        `${item?.Title || "result"}-${item?.Year || ""}-${item?.Type || ""}-${index}`
      }
      renderItem={renderMovieItem}
      estimatedItemSize={180}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={Platform.OS !== "web"}
      maxToRenderPerBatch={20}
      initialNumToRender={20}
      windowSize={15}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
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
  loadMoreButton: {
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: "600",
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
});

export default SearchResults;
