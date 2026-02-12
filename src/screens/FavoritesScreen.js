import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  ActionSheetIOS,
  Platform,
  Alert,
  Dimensions,
  Modal,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useCustomTheme } from "../contexts/ThemeContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { Ionicons } from "@expo/vector-icons";
import AppLoader from "../components/AppLoader";

const { width } = Dimensions.get("window");

const FavoritesScreen = ({ navigation }) => {
  const hasLoadedOnce = useRef(false);
  const previousFavoritesCount = useRef(0);
  const sortButtonRef = useRef(null);
  const filterButtonRef = useRef(null);

  const [viewType, setViewType] = useState("list"); // 'list' or 'grid'
  const [sortBy, setSortBy] = useState("recent"); // 'recent', 'title', 'year', 'rating'
  const [filterType, setFilterType] = useState("all"); // 'all', 'movie', 'series'
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const {
    favorites,
    loading: initialLoading,
    refreshFavorites,
    removeFromFavorites,
  } = useFavorites();

  // Track changes for navigation updates
  useEffect(() => {
    if (
      favorites.length !== previousFavoritesCount.current &&
      hasLoadedOnce.current
    ) {
      navigation.setParams({ favoritesUpdated: Date.now() });
    }
    previousFavoritesCount.current = favorites.length;
    hasLoadedOnce.current = true;
  }, [favorites.length, navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (hasLoadedOnce.current) {
        refreshFavorites();
      }
    });
    return unsubscribe;
  }, [navigation, refreshFavorites]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (favorites.length === 0) return null;

    const movies = favorites.filter((f) => f.Type === "movie");
    const series = favorites.filter((f) => f.Type === "series");

    // Extract genres from favorites (if available)
    const genreCounts = {};
    favorites.forEach((item) => {
      if (item.Genre) {
        const genres = item.Genre.split(", ");
        genres.forEach((genre) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
    });

    const topGenre =
      Object.keys(genreCounts).length > 0
        ? Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0][0]
        : null;

    // Calculate average rating
    const ratingsAvailable = favorites.filter(
      (f) => f.imdbRating && f.imdbRating !== "N/A",
    );
    const avgRating =
      ratingsAvailable.length > 0
        ? (
            ratingsAvailable.reduce(
              (sum, f) => sum + parseFloat(f.imdbRating),
              0,
            ) / ratingsAvailable.length
          ).toFixed(1)
        : null;

    // Estimate total runtime (rough estimate: 2h per movie, 10h per series season)
    const estimatedHours = movies.length * 2 + series.length * 10;

    return {
      total: favorites.length,
      movies: movies.length,
      series: series.length,
      topGenre,
      avgRating,
      estimatedHours,
    };
  }, [favorites]);

  // Filter and sort favorites
  const processedFavorites = useMemo(() => {
    let filtered = [...favorites];

    // Apply filter
    if (filterType === "movie") {
      filtered = filtered.filter((f) => f.Type === "movie");
    } else if (filterType === "series") {
      filtered = filtered.filter((f) => f.Type === "series");
    }

    // Apply sort
    switch (sortBy) {
      case "title":
        filtered.sort((a, b) => a.Title.localeCompare(b.Title));
        break;
      case "year":
        filtered.sort((a, b) => {
          const yearA = parseInt(a.Year) || 0;
          const yearB = parseInt(b.Year) || 0;
          return yearB - yearA;
        });
        break;
      case "rating":
        filtered.sort((a, b) => {
          const ratingA =
            a.imdbRating && a.imdbRating !== "N/A"
              ? parseFloat(a.imdbRating)
              : 0;
          const ratingB =
            b.imdbRating && b.imdbRating !== "N/A"
              ? parseFloat(b.imdbRating)
              : 0;
          return ratingB - ratingA;
        });
        break;
      case "recent":
      default:
        // Reverse to show most recently added first
        filtered.reverse();
        break;
    }

    return filtered;
  }, [favorites, filterType, sortBy]);

  // Long press context menu
  const showContextMenu = (item) => {
    const options = [
      "Remove from Favorites",
      "View Details",
      "Share",
      "Cancel",
    ];
    const destructiveButtonIndex = 0;
    const cancelButtonIndex = 3;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          handleContextMenuAction(item, buttonIndex);
        },
      );
    } else {
      // Android fallback
      Alert.alert(
        item.Title,
        "Choose an action",
        [
          {
            text: "Remove from Favorites",
            onPress: () => handleContextMenuAction(item, 0),
            style: "destructive",
          },
          {
            text: "View Details",
            onPress: () => handleContextMenuAction(item, 1),
          },
          {
            text: "Share",
            onPress: () => handleContextMenuAction(item, 2),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ],
        { cancelable: true },
      );
    }
  };

  const handleContextMenuAction = async (item, actionIndex) => {
    switch (actionIndex) {
      case 0: // Remove from favorites
        try {
          await removeFromFavorites(item.imdbID);
        } catch (error) {
          Alert.alert("Error", "Failed to remove from favorites");
        }
        break;
      case 1: // View details
        navigation.navigate("Details", { imdbID: item.imdbID });
        break;
      case 2: // Share
        Alert.alert(
          "Share",
          `Check out ${item.Title} on IMDb: https://www.imdb.com/title/${item.imdbID}/`,
        );
        break;
      default:
        break;
    }
  };

  // Sort dropdown menu
  const showSortDropdown = () => {
    const options = ["Recent", "A-Z", "Year", "Rating", "Cancel"];
    const cancelButtonIndex = 4;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: "Sort By",
        },
        (buttonIndex) => {
          if (buttonIndex === 0) setSortBy("recent");
          else if (buttonIndex === 1) setSortBy("title");
          else if (buttonIndex === 2) setSortBy("year");
          else if (buttonIndex === 3) setSortBy("rating");
        },
      );
    } else {
      sortButtonRef.current?.measureInWindow((x, y, width, height) => {
        setMenuPosition({ top: y + height + 4, left: x, width });
        setShowSortMenu(true);
      });
    }
  };

  // Filter dropdown menu
  const showFilterDropdown = () => {
    const options = ["All", "Movies", "Series", "Cancel"];
    const cancelButtonIndex = 3;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: "Show",
        },
        (buttonIndex) => {
          if (buttonIndex === 0) setFilterType("all");
          else if (buttonIndex === 1) setFilterType("movie");
          else if (buttonIndex === 2) setFilterType("series");
        },
      );
    } else {
      filterButtonRef.current?.measureInWindow((x, y, width, height) => {
        setMenuPosition({ top: y + height + 4, left: x, width });
        setShowFilterMenu(true);
      });
    }
  };

  // Get display labels
  const getSortLabel = () => {
    switch (sortBy) {
      case "recent":
        return "Recent";
      case "title":
        return "A-Z";
      case "year":
        return "Year";
      case "rating":
        return "Rating";
      default:
        return "Recent";
    }
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case "all":
        return "All";
      case "movie":
        return "Movies";
      case "series":
        return "Series";
      default:
        return "All";
    }
  };

  // List item render
  const renderListItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("Details", { imdbID: item.imdbID })}
      onLongPress={() => showContextMenu(item)}
      style={[
        styles.card,
        { backgroundColor: colors.card, shadowColor: colors.text },
      ]}
    >
      {item.Poster && item.Poster !== "N/A" ? (
        <Image source={{ uri: item.Poster }} style={styles.poster} />
      ) : (
        <View
          style={[
            styles.poster,
            styles.placeholderPoster,
            { backgroundColor: colors.border },
          ]}
        >
          <Ionicons
            name="film-outline"
            size={32}
            color={colors.text}
            style={{ opacity: 0.3 }}
          />
        </View>
      )}
      <View style={styles.details}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.Title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.text, opacity: 0.7 }]}>
            {item.Year}
          </Text>
          {item.Type && (
            <>
              <Text style={[styles.meta, { color: colors.text, opacity: 0.5 }]}>
                {" • "}
              </Text>
              <Text style={[styles.meta, { color: colors.text, opacity: 0.7 }]}>
                {item.Type === "movie" ? "Movie" : "Series"}
              </Text>
            </>
          )}
          {item.imdbRating && item.imdbRating !== "N/A" && (
            <>
              <Text style={[styles.meta, { color: colors.text, opacity: 0.5 }]}>
                {" • "}
              </Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#FFC107" />
                <Text style={[styles.rating, { color: colors.text }]}>
                  {item.imdbRating}
                </Text>
              </View>
            </>
          )}
        </View>
        {item.Genre && (
          <Text
            style={[styles.genre, { color: colors.text, opacity: 0.6 }]}
            numberOfLines={1}
          >
            {item.Genre}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  // Grid item render
  const renderGridItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("Details", { imdbID: item.imdbID })}
      onLongPress={() => showContextMenu(item)}
      style={styles.gridItem}
    >
      {item.Poster && item.Poster !== "N/A" ? (
        <Image source={{ uri: item.Poster }} style={styles.gridPoster} />
      ) : (
        <View
          style={[
            styles.gridPoster,
            styles.placeholderPoster,
            { backgroundColor: colors.border },
          ]}
        >
          <Ionicons
            name="film-outline"
            size={48}
            color={colors.text}
            style={{ opacity: 0.3 }}
          />
        </View>
      )}
      {item.imdbRating && item.imdbRating !== "N/A" && (
        <View style={styles.gridRatingBadge}>
          <Ionicons name="star" size={10} color="#FFC107" />
          <Text style={styles.gridRating}>{item.imdbRating}</Text>
        </View>
      )}
      <Text
        style={[styles.gridTitle, { color: colors.text }]}
        numberOfLines={2}
      >
        {item.Title}
      </Text>
      <Text style={[styles.gridYear, { color: colors.text, opacity: 0.6 }]}>
        {item.Year}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.safeContainer, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <View style={styles.container}>
        {/* Header with view toggle */}
        <View style={styles.headerRow}>
          <Text style={[styles.header, { color: colors.text }]}>
            Your Favorites
          </Text>
          {!initialLoading && favorites.length > 0 && (
            <TouchableOpacity
              onPress={() => setViewType(viewType === "list" ? "grid" : "list")}
              style={[styles.viewToggle, { backgroundColor: colors.card }]}
            >
              <Ionicons
                name={viewType === "list" ? "grid-outline" : "list-outline"}
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
          )}
        </View>

        {initialLoading ? (
          <AppLoader message="Loading Favorites" />
        ) : favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="heart-outline"
              size={64}
              color={colors.text}
              style={{ opacity: 0.3 }}
            />
            <Text style={[styles.noFavorites, { color: colors.text }]}>
              You haven't added any favorites yet.
            </Text>
            <Text
              style={[
                styles.noFavoritesSubtext,
                { color: colors.text, opacity: 0.6 },
              ]}
            >
              Start exploring and add movies you love!
            </Text>
          </View>
        ) : (
          <>
            {/* Stats Banner */}
            {stats && (
              <View
                style={[styles.statsBanner, { backgroundColor: colors.card }]}
              >
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {stats.total}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.text }]}>
                      Total
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      ~{stats.estimatedHours}h
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.text }]}>
                      Runtime
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {stats.avgRating || "N/A"}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.text }]}>
                      Avg Rating
                    </Text>
                  </View>
                  {stats.topGenre && (
                    <>
                      <View style={styles.statDivider} />
                      <View style={styles.statItem}>
                        <Text
                          style={[
                            styles.statValue,
                            { color: colors.text, fontSize: 14 },
                          ]}
                          numberOfLines={1}
                        >
                          {stats.topGenre}
                        </Text>
                        <Text
                          style={[styles.statLabel, { color: colors.text }]}
                        >
                          Top Genre
                        </Text>
                      </View>
                    </>
                  )}
                </View>
                <Text
                  style={[
                    styles.statsSubtext,
                    { color: colors.text, opacity: 0.6 },
                  ]}
                >
                  {stats.movies} movies • {stats.series} series
                </Text>
              </View>
            )}

            {/* Sort and Filter Dropdowns */}
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                ref={sortButtonRef}
                activeOpacity={0.7}
                onPress={showSortDropdown}
                style={[styles.dropdown, { backgroundColor: colors.card }]}
              >
                <View style={styles.dropdownContent} pointerEvents="none">
                  <Text style={[styles.dropdownLabel, { color: colors.text }]}>
                    Sort by
                  </Text>
                  <Text style={[styles.dropdownValue, { color: colors.text }]}>
                    {getSortLabel()}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.text}
                  style={{ opacity: 0.6 }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                ref={filterButtonRef}
                activeOpacity={0.7}
                onPress={showFilterDropdown}
                style={[styles.dropdown, { backgroundColor: colors.card }]}
              >
                <View style={styles.dropdownContent} pointerEvents="none">
                  <Text style={[styles.dropdownLabel, { color: colors.text }]}>
                    Show
                  </Text>
                  <Text style={[styles.dropdownValue, { color: colors.text }]}>
                    {getFilterLabel()}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={colors.text}
                  style={{ opacity: 0.6 }}
                />
              </TouchableOpacity>
            </View>

            {/* Sort Menu Modal */}
            <Modal
              transparent
              visible={showSortMenu}
              animationType="fade"
              onRequestClose={() => setShowSortMenu(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowSortMenu(false)}
              >
                <View
                  style={[
                    styles.modalContent,
                    {
                      backgroundColor: colors.card,
                      position: "absolute",
                      top: menuPosition.top,
                      left: menuPosition.left,
                      width: menuPosition.width,
                    },
                  ]}
                  onStartShouldSetResponder={() => true}
                >
                  {[
                    { value: "recent", label: "Recent" },
                    { value: "title", label: "A-Z" },
                    { value: "year", label: "Year" },
                    { value: "rating", label: "Rating" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => {
                        setSortBy(option.value);
                        setShowSortMenu(false);
                      }}
                      style={[
                        styles.modalOption,
                        sortBy === option.value && {
                          backgroundColor: colors.primary + "20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          {
                            color: colors.text,
                            fontWeight: sortBy === option.value ? "600" : "400",
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      {sortBy === option.value && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>

            {/* Filter Menu Modal */}
            <Modal
              transparent
              visible={showFilterMenu}
              animationType="fade"
              onRequestClose={() => setShowFilterMenu(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowFilterMenu(false)}
              >
                <View
                  style={[
                    styles.modalContent,
                    {
                      backgroundColor: colors.card,
                      position: "absolute",
                      top: menuPosition.top,
                      left: menuPosition.left,
                      width: menuPosition.width,
                    },
                  ]}
                  onStartShouldSetResponder={() => true}
                >
                  {[
                    { value: "all", label: "All" },
                    { value: "movie", label: "Movies" },
                    { value: "series", label: "Series" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => {
                        setFilterType(option.value);
                        setShowFilterMenu(false);
                      }}
                      style={[
                        styles.modalOption,
                        filterType === option.value && {
                          backgroundColor: colors.primary + "20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          {
                            color: colors.text,
                            fontWeight:
                              filterType === option.value ? "600" : "400",
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                      {filterType === option.value && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            </Modal>

            {/* Results count */}
            <Text
              style={[
                styles.resultsCount,
                { color: colors.text, opacity: 0.6 },
              ]}
            >
              {processedFavorites.length}{" "}
              {processedFavorites.length === 1 ? "item" : "items"}
            </Text>

            {/* List/Grid */}
            <FlatList
              data={processedFavorites}
              keyExtractor={(item) => item.imdbID}
              renderItem={viewType === "list" ? renderListItem : renderGridItem}
              numColumns={viewType === "grid" ? 2 : 1}
              key={viewType} // Force re-render when switching views
              contentContainerStyle={styles.listContent}
              columnWrapperStyle={
                viewType === "grid" ? styles.gridRow : undefined
              }
            />
          </>
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
    paddingTop: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
  },
  viewToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  noFavorites: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 16,
    fontWeight: "600",
  },
  noFavoritesSubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
  statsBanner: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    opacity: 0.7,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#888",
    opacity: 0.2,
    marginHorizontal: 8,
  },
  statsSubtext: {
    fontSize: 12,
    textAlign: "center",
  },
  dropdownContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  dropdown: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dropdownContent: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 10,
    opacity: 0.6,
    marginBottom: 1,
  },
  dropdownValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  modalContent: {
    borderRadius: 8,
    padding: 4,
    elevation: 5,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 12,
    opacity: 0.6,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  modalOptionText: {
    fontSize: 14,
  },
  resultsCount: {
    fontSize: 12,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  // List View Styles
  card: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  poster: {
    width: 70,
    height: 100,
    borderRadius: 8,
  },
  placeholderPoster: {
    justifyContent: "center",
    alignItems: "center",
  },
  details: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  rating: {
    fontSize: 13,
    fontWeight: "600",
  },
  genre: {
    fontSize: 12,
    marginTop: 2,
  },
  // Grid View Styles
  gridRow: {
    justifyContent: "space-between",
  },
  gridItem: {
    width: (width - 48) / 2,
    marginBottom: 16,
  },
  gridPoster: {
    width: "100%",
    height: ((width - 48) / 2) * 1.5,
    borderRadius: 12,
    marginBottom: 8,
  },
  gridRatingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  gridRating: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  gridYear: {
    fontSize: 12,
  },
});

export default FavoritesScreen;
