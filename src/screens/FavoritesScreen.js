import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActionSheetIOS,
  Platform,
  Alert,
  Dimensions,
  Modal,
  Animated,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCustomTheme } from "../contexts/ThemeContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { Ionicons } from "@expo/vector-icons";
import AppLoader from "../components/AppLoader";
import RetryState from "../components/RetryState";
import { getBackendStatus } from "../services/api";
import {
  getGamificationState,
  getLevelInfo,
  ACHIEVEMENTS,
} from "../utils/gamification";

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
  const [gamification, setGamification] = useState(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [favoritesLoadError, setFavoritesLoadError] = useState(false);
  const [favoritesLoadMessage, setFavoritesLoadMessage] = useState(
    "Unable to load favorites. Please check your internet connection.",
  );
  const xpBlockAnims = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0)),
  ).current;
  const cursorBlink = useRef(new Animated.Value(1)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const hudBarAnim = useRef(new Animated.Value(0)).current;
  const hudAnimated = useRef(false);

  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const {
    favorites,
    loading: initialLoading,
    refreshFavorites,
    removeFromFavorites,
  } = useFavorites();

  const loadGamification = useCallback(async () => {
    const state = await getGamificationState();
    setGamification(state);
  }, []);

  useEffect(() => {
    loadGamification();
  }, [loadGamification]);

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
      loadGamification();
    });
    return unsubscribe;
  }, [navigation, refreshFavorites, loadGamification]);

  useEffect(() => {
    if (initialLoading) return;

    const status = getBackendStatus();
    const isBackendError = status?.tested && status?.available === false;

    if (favorites.length === 0 && isBackendError) {
      setFavoritesLoadError(true);
      setFavoritesLoadMessage(
        status?.lastError
          ? `Unable to load favorites. ${status.lastError}`
          : "Unable to load favorites. Please check your internet connection.",
      );
    } else {
      setFavoritesLoadError(false);
    }
  }, [initialLoading, favorites.length]);

  const handleRetryFavorites = useCallback(async () => {
    setFavoritesLoadError(false);
    await refreshFavorites();

    const status = getBackendStatus();
    if (status?.tested && status?.available === false) {
      setFavoritesLoadError(true);
      setFavoritesLoadMessage(
        status?.lastError
          ? `Unable to load favorites. ${status.lastError}`
          : "Unable to load favorites. Please check your internet connection.",
      );
    }
  }, [refreshFavorites]);

  useEffect(() => {
    if (!gamification) return;
    const li = getLevelInfo(gamification.xp);
    const filled = li.next ? Math.round(li.progress * 20) : 20;

    if (!hudAnimated.current) {
      // First time: run full intro animation (scan line, bar entrance, cursor)
      hudAnimated.current = true;

      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }).start();

      Animated.spring(hudBarAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 9,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(cursorBlink, {
            toValue: 0,
            duration: 450,
            useNativeDriver: true,
          }),
          Animated.timing(cursorBlink, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }

    // Always update the XP block positions so the bar reflects current XP
    Animated.stagger(
      38,
      xpBlockAnims.map((a, i) =>
        Animated.spring(a, {
          toValue: i < filled ? 1 : 0.45,
          useNativeDriver: true,
          tension: 220,
          friction: 11,
        }),
      ),
    ).start();
  }, [gamification]);

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
        {/* Clean page header */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>
            YOUR FAVORITES
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

        {/* Gamification HUD panel */}
        {gamification &&
          (() => {
            const li = getLevelInfo(gamification.xp);
            return (
              <View style={styles.hudPanel}>
                <View style={styles.hudCornerTL} />
                <View style={styles.hudCornerTR} />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.hudScanLine,
                    {
                      transform: [
                        {
                          translateX: scanAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-60, 600],
                          }),
                        },
                      ],
                    },
                  ]}
                />
                {li.next ? (
                  <View style={styles.hudXpBarInline}>
                    <View style={styles.hudXpSegments}>
                      {Array.from({ length: 20 }, (_, i) => (
                        <Animated.View
                          key={i}
                          style={[
                            styles.hudXpBlock,
                            i / 20 < li.progress
                              ? styles.hudXpBlockFilled
                              : styles.hudXpBlockEmpty,
                            { transform: [{ scaleY: xpBlockAnims[i] }] },
                          ]}
                        />
                      ))}
                    </View>
                    <View style={styles.hudProgressFooter}>
                      <View style={styles.hudProgressLeft}>
                        <Text style={styles.hudProgressLabel} numberOfLines={1}>
                          {li.current.icon} LVL {li.current.level}
                        </Text>
                        <Animated.Text
                          style={[styles.hudCursor, { opacity: cursorBlink }]}
                        >
                          █
                        </Animated.Text>
                      </View>
                      <Text
                        style={[styles.hudXpMetaText, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {li.xpInLevel}/{li.xpForNext} XP
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.hudMaxLvlText}>
                    MAX LEVEL • {gamification.xp} XP
                  </Text>
                )}
              </View>
            );
          })()}

        {initialLoading ? (
          <AppLoader message="Loading Favorites" />
        ) : favoritesLoadError ? (
          <RetryState
            title="Unable to load favorites"
            message={favoritesLoadMessage}
            onRetry={handleRetryFavorites}
          />
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
            {/* Unified Pixel HUD Stats Strip */}
            {stats && (
              <Animated.View
                style={{
                  opacity: hudBarAnim,
                  transform: [
                    {
                      translateY: hudBarAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                }}
              >
                <View
                  style={[styles.pixelHudBar, { backgroundColor: colors.card }]}
                >
                  <View style={styles.pixelHudRowCompact}>
                    <View style={styles.pixelHudCellCompact}>
                      <Ionicons name="heart" size={11} color="#E50914" />
                      <Text
                        style={[
                          styles.pixelHudValCompact,
                          { color: colors.text },
                        ]}
                      >
                        {stats.total}
                      </Text>
                      <Text style={styles.pixelHudLblCompact}>SAVED</Text>
                    </View>
                    <View style={styles.pixelHudCellCompact}>
                      <Ionicons name="time-outline" size={11} color="#E50914" />
                      <Text
                        style={[
                          styles.pixelHudValCompact,
                          { color: colors.text },
                        ]}
                      >
                        ~{stats.estimatedHours}h
                      </Text>
                      <Text style={styles.pixelHudLblCompact}>RUNTIME</Text>
                    </View>
                    <View style={styles.pixelHudCellCompact}>
                      <Ionicons name="star" size={11} color="#E50914" />
                      <Text
                        style={[
                          styles.pixelHudValCompact,
                          { color: colors.text },
                        ]}
                      >
                        {stats.avgRating || "N/A"}
                      </Text>
                      <Text style={styles.pixelHudLblCompact}>AVG</Text>
                    </View>
                    <View style={styles.pixelHudCellCompact}>
                      <Ionicons name="trophy" size={11} color="#E50914" />
                      <Text
                        style={[
                          styles.pixelHudValCompact,
                          { color: colors.text },
                        ]}
                      >
                        {gamification?.unlockedAchievements.length || 0}
                      </Text>
                      <Text style={styles.pixelHudLblCompact}>BADGES</Text>
                    </View>
                  </View>

                  <View style={styles.pixelHudMetaLine}>
                    {gamification?.currentStreak > 0 ? (
                      <Text style={styles.pixelHudMetaText}>
                        STREAK {gamification.currentStreak}
                      </Text>
                    ) : (
                      <Text style={styles.pixelHudMetaTextMuted}>STREAK —</Text>
                    )}

                    {stats.topGenre ? (
                      <Text style={styles.pixelHudMetaText} numberOfLines={1}>
                        TOP GENRE {stats.topGenre.toUpperCase()}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Animated.View>
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
    marginBottom: 10,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 6,
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  hudPanel: {
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.22)",
    borderRadius: 0,
    backgroundColor: "rgba(229,9,20,0.02)",
    padding: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  hudTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginBottom: 8,
  },
  hudXpBarInline: {
    gap: 6,
  },
  header: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  hudLvlChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 2,
    borderColor: "#E50914",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    backgroundColor: "rgba(229,9,20,0.06)",
  },
  hudScoreChip: {
    borderWidth: 2,
    borderColor: "rgba(229,9,20,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 0,
    backgroundColor: "rgba(229,9,20,0.03)",
    alignItems: "flex-end",
    minWidth: 76,
  },
  hudScoreValue: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 15,
  },
  hudScoreLabel: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#E50914",
    opacity: 0.7,
  },
  hudLvlChipEmoji: { fontSize: 12 },
  hudLvlChipText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#E50914",
    letterSpacing: 1.2,
  },
  hudXpBarOuter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  hudXpSegments: {
    flexDirection: "row",
    gap: 3,
    flex: 1,
  },
  hudXpBlock: {
    flex: 1,
    height: 14,
    borderRadius: 0,
  },
  hudXpBlockFilled: {
    backgroundColor: "#E50914",
    borderWidth: 1,
    borderColor: "rgba(255,60,60,0.7)",
  },
  hudXpBlockEmpty: {
    backgroundColor: "rgba(229,9,20,0.05)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.28)",
  },
  hudXpMetaText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    opacity: 0.45,
    minWidth: 70,
    textAlign: "right",
    flexShrink: 0,
  },
  hudProgressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  hudProgressLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  hudProgressLabel: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#E50914",
    opacity: 0.8,
    flexShrink: 1,
  },
  hudMaxLvlText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: "#E50914",
    marginBottom: 2,
  },
  hudCursor: {
    fontSize: 9,
    color: "#E50914",
    fontWeight: "900",
    marginLeft: 2,
  },
  hudScanLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 50,
    backgroundColor: "rgba(229,9,20,0.07)",
    zIndex: 0,
  },
  hudCornerTL: {
    position: "absolute",
    top: 8,
    left: 0,
    width: 10,
    height: 10,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: "#E50914",
    opacity: 0.45,
  },
  hudCornerTR: {
    position: "absolute",
    top: 8,
    right: 0,
    width: 10,
    height: 10,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: "#E50914",
    opacity: 0.45,
  },
  pixelHudBar: {
    flexDirection: "column",
    borderWidth: 2,
    borderColor: "rgba(229,9,20,0.35)",
    borderRadius: 0,
    padding: 8,
    marginBottom: 14,
    overflow: "hidden",
    gap: 6,
  },
  pixelHudRowCompact: {
    flexDirection: "row",
    gap: 6,
  },
  pixelHudCellCompact: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 3,
    gap: 1,
    backgroundColor: "rgba(229,9,20,0.025)",
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.15)",
  },
  pixelHudValCompact: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.1,
    lineHeight: 14,
  },
  pixelHudLblCompact: {
    fontSize: 6,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#E50914",
    opacity: 0.7,
  },
  pixelHudMetaLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
  },
  pixelHudMetaText: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#E50914",
    opacity: 0.72,
  },
  pixelHudMetaTextMuted: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#E50914",
    opacity: 0.4,
  },
  pixelHudCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 4,
    gap: 2,
  },
  pixelHudVal: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  pixelHudLbl: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: "#E50914",
    opacity: 0.7,
  },
  pixelHudDivider: {
    width: 2,
    backgroundColor: "rgba(229,9,20,0.18)",
  },
  pixelHudRow: {
    flexDirection: "row",
    gap: 8,
  },
  pixelHudDividerRow: {
    height: 1,
    backgroundColor: "rgba(229,9,20,0.16)",
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

  // ─── PIXEL / MINIMAL GAMIFICATION STYLES ─────────────────
});

export default FavoritesScreen;
