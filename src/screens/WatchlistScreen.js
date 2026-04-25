import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Swipeable } from "react-native-gesture-handler";

import CustomAlert from "../components/CustomAlert";
import WatchlistCard from "../components/WatchlistCard";
import EmptyState from "../components/EmptyState";
import CreateWatchlistModal from "../components/CreateWatchlistModal";
import RetryState from "../components/RetryState";
import logger from "../services/logger";

import {
  getWatchlists,
  addWatchlist,
  removeWatchlist,
  removeFromWatchlist,
  toggleWatchedStatus,
} from "../utils/storage";
import {
  getGamificationState,
  getLevelInfo,
  recordMovieWatched,
  recordMovieUnwatched,
  recordListCreatedWithName,
  recordListCompleted,
} from "../utils/gamification";

const WatchlistsScreen = ({ navigation }) => {
  const [watchlists, setWatchlists] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [alertConfig, setAlertConfig] = useState({ visible: false });
  const [isCreatingWatchlist, setIsCreatingWatchlist] = useState(false);
  const [createToast, setCreateToast] = useState(null);
  const [gamification, setGamification] = useState(null);
  const [watchlistsLoading, setWatchlistsLoading] = useState(true);
  const [watchlistsLoadError, setWatchlistsLoadError] = useState(false);
  const [watchlistsLoadMessage, setWatchlistsLoadMessage] = useState(
    "Unable to load your watchlists. Check your internet and try again.",
  );
  const xpBlockAnims = useRef(
    Array.from({ length: 20 }, () => new Animated.Value(0)),
  ).current;
  const cursorBlink = useRef(new Animated.Value(1)).current;
  const scanAnim = useRef(new Animated.Value(0)).current;
  const createToastAnim = useRef(new Animated.Value(0)).current;
  const hudAnimated = useRef(false);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const loadGamification = useCallback(async () => {
    const state = await getGamificationState();
    setGamification(state);
  }, []);

  const showCustomAlert = (config) => {
    setAlertConfig({ ...config, visible: true });
  };

  const hideAlert = () => {
    setAlertConfig({ visible: false });
  };

  const showCreateToast = (message) => {
    setCreateToast(message);
    createToastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(createToastAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.delay(1700),
      Animated.timing(createToastAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start(() => setCreateToast(null));
  };

  const fetchWatchlists = async ({ showLoader = false } = {}) => {
    if (showLoader) {
      setWatchlistsLoading(true);
    }

    try {
      const data = await getWatchlists();
      logger.info("Fetched watchlists:", data);
      setWatchlists(data || {});
      setWatchlistsLoadError(false);
    } catch (error) {
      logger.error("Error fetching watchlists", error);
      setWatchlistsLoadError(true);
      setWatchlistsLoadMessage(
        error?.message
          ? `Unable to load your watchlists. ${error.message}`
          : "Unable to load your watchlists. Check your internet and try again.",
      );
    } finally {
      if (showLoader) {
        setWatchlistsLoading(false);
      }
    }
  };

  const handleRetryWatchlists = useCallback(async () => {
    setWatchlistsLoadError(false);
    await fetchWatchlists({ showLoader: true });
  }, []);

  useEffect(() => {
    fetchWatchlists({ showLoader: true });
    loadGamification();
    const unsubscribe = navigation.addListener("focus", () => {
      fetchWatchlists();
      loadGamification();
    });
    return unsubscribe;
  }, [navigation, loadGamification]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      navigation.setParams({ watchlistsUpdated: Date.now() });
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!gamification) return;
    const li = getLevelInfo(gamification.xp);
    const filled = li.next ? Math.round(li.progress * 20) : 20;

    if (!hudAnimated.current) {
      // First time: run intro animation (scan + cursor)
      hudAnimated.current = true;

      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: false,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(cursorBlink, {
            toValue: 0,
            duration: 450,
            useNativeDriver: false,
          }),
          Animated.timing(cursorBlink, {
            toValue: 1,
            duration: 450,
            useNativeDriver: false,
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
          useNativeDriver: false,
          tension: 220,
          friction: 11,
        }),
      ),
    ).start();
  }, [gamification]);

  const handleAddWatchlist = async () => {
    const name = newName.trim();
    if (!name) return;

    if (watchlists[name]) {
      showCustomAlert({
        title: "Watchlist Already Exists",
        message:
          "A watchlist with this name already exists. Please choose a different name.",
        icon: "information-circle",
        iconColor: "#ffa726",
        buttons: [{ text: "OK", style: "default" }],
      });
      return;
    }

    try {
      setIsCreatingWatchlist(true);
      await new Promise((resolve) => setTimeout(resolve, 800));

      await addWatchlist(name);
      setNewName("");
      setModalVisible(false);

      setWatchlists((prev) => ({ ...prev, [name]: [] }));
      setTimeout(fetchWatchlists, 100);
      navigation.setParams({ watchlistsModified: Date.now() });

      // Record gamification (server-authoritative)
      const listCreateGamification = await recordListCreatedWithName(name);
      loadGamification();

      showCreateToast(
        listCreateGamification?.xpGained > 0
          ? `Created "${name}" • +15 XP`
          : `Created "${name}"`,
      );
    } catch (error) {
      logger.error("Error adding watchlist", error);
      showCustomAlert({
        title: "Unable to Create Watchlist",
        message:
          "Something went wrong while creating your watchlist. Please try again.",
        icon: "alert-circle",
        iconColor: "#f44336",
        buttons: [{ text: "OK", style: "default" }],
      });
    } finally {
      setIsCreatingWatchlist(false);
    }
  };

  const handleRemoveWatchlist = async (name) => {
    showCustomAlert({
      title: "Delete Watchlist",
      message: `Are you sure you want to delete "${name}"? This action cannot be undone and all movies in this list will be removed.`,
      icon: "trash",
      iconColor: "#f44336",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await removeWatchlist(name);
              fetchWatchlists();
              navigation.setParams({ watchlistsModified: Date.now() });
              showCreateToast(`Deleted "${name}"`);
            } catch (error) {
              logger.error("Error deleting watchlist", error);
              showCustomAlert({
                title: "Unable to Delete Watchlist",
                message:
                  "Something went wrong while deleting your watchlist. Please try again.",
                icon: "alert-circle",
                iconColor: "#f44336",
                buttons: [{ text: "OK", style: "default" }],
              });
            }
          },
        },
      ],
    });
  };

  const renderWatchlistItem = ({ item: name, index }) => {
    const movieList = watchlists[name] || [];
    const totalCount = movieList.length;
    const watchedCount = movieList.filter((movie) => movie.watched).length;

    return (
      <WatchlistCard
        name={name}
        movieCount={totalCount}
        watchedCount={watchedCount}
        index={index}
        onPress={() => navigation.navigate("WatchlistContent", { name })}
        onLongPress={() => handleRemoveWatchlist(name)}
        onDelete={() => handleRemoveWatchlist(name)}
      />
    );
  };

  const watchlistKeys = Object.keys(watchlists);

  const levelInfo = gamification ? getLevelInfo(gamification.xp) : null;

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 8 },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ─── Clean Page Header ─── */}
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>
          MY WATCHLISTS
        </Text>
      </View>

      {/* ─── Gamification HUD Panel ─── */}
      {gamification && levelInfo && (
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
          {/* XP progress */}
          {levelInfo.next ? (
            <View style={styles.hudXpBarInline}>
              <View style={styles.hudXpSegments}>
                {Array.from({ length: 20 }, (_, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.hudXpBlock,
                      i / 20 < levelInfo.progress
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
                    {levelInfo.current.icon} LVL {levelInfo.current.level}
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
                  {levelInfo.xpInLevel}/{levelInfo.xpForNext} XP
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.hudMaxLvlText}>
              MAX LEVEL • {gamification.xp} XP
            </Text>
          )}
        </View>
      )}

      {watchlistsLoading && watchlistKeys.length === 0 ? (
        <View style={styles.watchlistsLoadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.watchlistsLoadingText, { color: colors.text }]}>
            Loading watchlists...
          </Text>
        </View>
      ) : watchlistsLoadError && watchlistKeys.length === 0 ? (
        <RetryState
          title="Unable to load watchlists"
          message={watchlistsLoadMessage}
          onRetry={handleRetryWatchlists}
          compact
        />
      ) : (
        <FlatList
          data={watchlistKeys}
          keyExtractor={(item) => item}
          renderItem={renderWatchlistItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <EmptyState
              title="No Watchlists Yet"
              subtitle="Create your first watchlist to organize your favorite movies"
              buttonText="Create Watchlist"
              onButtonPress={() => setModalVisible(true)}
              showButton
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {watchlistKeys.length > 0 && (
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.fab}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <CreateWatchlistModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        newName={newName}
        setNewName={setNewName}
        onSubmit={handleAddWatchlist}
        isLoading={isCreatingWatchlist}
      />

      {createToast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.createToast,
            {
              opacity: createToastAnim,
              transform: [
                {
                  translateY: createToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.createToastText}>{createToast}</Text>
        </Animated.View>
      )}

      <CustomAlert
        visible={alertConfig.visible}
        onClose={hideAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
      />
    </KeyboardAvoidingView>
  );
};

const WatchlistContentScreen = ({ route, navigation }) => {
  const watchlistName = route?.params?.name || "";
  const [movies, setMovies] = useState([]);
  const [contentLoadError, setContentLoadError] = useState(false);
  const [contentLoadMessage, setContentLoadMessage] = useState(
    "Unable to load movies in this watchlist. Check your internet and try again.",
  );
  const [contentLoading, setContentLoading] = useState(true);
  const [alertConfig, setAlertConfig] = useState({ visible: false });
  const [showUnwatchedOnly, setShowUnwatchedOnly] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});
  const [xpToast, setXpToast] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [achievementToast, setAchievementToast] = useState({
    visible: false,
    achievement: null,
  });
  const [levelUpBanner, setLevelUpBanner] = useState({
    visible: false,
    level: null,
  });
  const xpToastAnim = useRef(new Animated.Value(0)).current;
  const achToastAnim = useRef(new Animated.Value(0)).current;
  const levelUpBannerAnim = useRef(new Animated.Value(0)).current;
  const swipeRefs = useRef({}); // Store refs for each swipeable item
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const showCustomAlert = (config) => {
    setAlertConfig({ ...config, visible: true });
  };

  const hideAlert = () => {
    setAlertConfig({ visible: false });
  };

  const showXpToast = (xpGained, streakDays) => {
    if (!xpGained) return; // no toast when XP was blocked by cooldown
    const msg =
      streakDays > 1
        ? `+${xpGained} XP  🔥 ${streakDays} day streak!`
        : `+${xpGained} XP`;
    setXpToast(msg);
    Animated.sequence([
      Animated.timing(xpToastAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.delay(1600),
      Animated.timing(xpToastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => setXpToast(null));
  };

  const showAchievementToast = (achievement) => {
    setAchievementToast({ visible: true, achievement });
    achToastAnim.setValue(0);
    Animated.sequence([
      Animated.spring(achToastAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 100,
        friction: 10,
      }),
      Animated.delay(3000),
      Animated.timing(achToastAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: false,
      }),
    ]).start(() => setAchievementToast({ visible: false, achievement: null }));
  };

  const showLevelUpBanner = (level) => {
    setLevelUpBanner({ visible: true, level });
    levelUpBannerAnim.setValue(0);
    Animated.sequence([
      Animated.spring(levelUpBannerAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 100,
        friction: 10,
      }),
      Animated.delay(2500),
      Animated.timing(levelUpBannerAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: false,
      }),
    ]).start(() => setLevelUpBanner({ visible: false, level: null }));
  };

  const fetchMovies = useCallback(async () => {
    if (!watchlistName) {
      setContentLoadError(true);
      setContentLoadMessage("This watchlist could not be opened.");
      setContentLoading(false);
      return;
    }

    setContentLoading(true);
    try {
      const lists = await getWatchlists();
      const listMovies = Array.isArray(lists?.[watchlistName])
        ? lists[watchlistName].filter(Boolean)
        : [];
      setMovies(listMovies);
      setContentLoadError(false);
    } catch (error) {
      logger.error("Failed to fetch movies in watchlist", error);
      setContentLoadError(true);
      setContentLoadMessage(
        error?.message
          ? `Unable to load movies. ${error.message}`
          : "Unable to load movies in this watchlist. Check your internet and try again.",
      );
    } finally {
      setContentLoading(false);
    }
  }, [watchlistName]);

  const handleRetryContent = useCallback(async () => {
    setContentLoadError(false);
    await fetchMovies();
  }, [fetchMovies]);

  useEffect(() => {
    fetchMovies();
    const unsubscribe = navigation.addListener("focus", fetchMovies);
    return unsubscribe;
  }, [navigation, fetchMovies]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      navigation.setParams({ contentUpdated: Date.now() });
    });
    return unsubscribe;
  }, [navigation]);

  const handleDeleteMovie = async (imdbID) => {
    if (!watchlistName) return;

    try {
      await removeFromWatchlist(watchlistName, imdbID);
      setMovies((prev) => prev.filter((m) => m.imdbID !== imdbID));
      navigation.setParams({ movieRemoved: Date.now() });

      // Close the swipeable after deletion
      if (swipeRefs.current[imdbID]) {
        swipeRefs.current[imdbID].close();
      }
    } catch (error) {
      logger.error("Failed to remove movie", error);
    }
  };

  const handleToggleWatched = async (movie) => {
    const movieId = movie.imdbID;

    if (!watchlistName) return;

    try {
      // Set loading state
      setLoadingStates((prev) => ({ ...prev, [movieId]: true }));

      // Optimistic update - immediately update UI
      const newWatchedStatus = !movie.watched;
      setMovies((prev) =>
        prev.map((m) =>
          m.imdbID === movieId ? { ...m, watched: newWatchedStatus } : m,
        ),
      );

      // Perform actual async operation
      await toggleWatchedStatus(watchlistName, movieId);

      navigation.setParams({ movieWatchedToggled: Date.now() });

      // Gamification: record watch/unwatch
      if (newWatchedStatus) {
        const { state, newAchievements, xpGained, leveledUp } =
          await recordMovieWatched(movie.imdbID, watchlistName);
        showXpToast(xpGained, state.currentStreak);

        if (leveledUp) {
          setTimeout(() => showLevelUpBanner(leveledUp), 1800);
        }

        // Check if the entire list is now complete
        const updatedMovies = movies.map((m) =>
          m.imdbID === movieId ? { ...m, watched: true } : m,
        );
        const allWatched =
          updatedMovies.length > 0 && updatedMovies.every((m) => m.watched);
        if (allWatched) {
          const completionResult = await recordListCompleted(watchlistName);
          if (!completionResult.alreadyCompleted) {
            setTimeout(() => setShowCelebration(true), 500);
          }
          if (completionResult.newAchievements.length > 0) {
            setTimeout(
              () => showAchievementToast(completionResult.newAchievements[0]),
              2500,
            );
          }
          if (completionResult.leveledUp) {
            setTimeout(
              () => showLevelUpBanner(completionResult.leveledUp),
              4200,
            );
          }
        } else if (newAchievements.length > 0) {
          setTimeout(() => showAchievementToast(newAchievements[0]), 2000);
        }
      } else {
        await recordMovieUnwatched(movie.imdbID);
      }

      // Auto close the swipeable after successful toggle with a slight delay
      setTimeout(() => {
        if (swipeRefs.current[movieId]) {
          swipeRefs.current[movieId].close();
        }
      }, 300); // Small delay to show the action completed
    } catch (error) {
      logger.error("Failed to toggle watched status", error);

      // Revert optimistic update on error
      setMovies((prev) =>
        prev.map((m) =>
          m.imdbID === movieId
            ? { ...m, watched: movie.watched } // Revert to original state
            : m,
        ),
      );

      // Show error feedback
      showCustomAlert({
        title: "Update Failed",
        message: "Failed to update watched status. Please try again.",
        icon: "alert-circle",
        iconColor: "#f44336",
        buttons: [{ text: "OK", style: "default" }],
      });
    } finally {
      // Clear loading state
      setLoadingStates((prev) => {
        const newState = { ...prev };
        delete newState[movieId];
        return newState;
      });
    }
  };

  const SwipeActions = ({ dragX, movie, onDelete, onToggleWatched }) => {
    const isLoading = loadingStates[movie.imdbID];

    const deleteScale = dragX.interpolate({
      inputRange: [-180, -90, 0],
      outputRange: [1.2, 0.8, 0],
      extrapolate: "clamp",
    });

    const watchedScale = dragX.interpolate({
      inputRange: [-90, -45, 0],
      outputRange: [1.2, 0.8, 0],
      extrapolate: "clamp",
    });

    const deleteOpacity = dragX.interpolate({
      inputRange: [-180, -120, -90, 0],
      outputRange: [1, 0.9, 0.7, 0],
      extrapolate: "clamp",
    });

    const watchedOpacity = dragX.interpolate({
      inputRange: [-90, -60, -30, 0],
      outputRange: [1, 0.9, 0.7, 0],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.swipeActionsContainer}>
        <TouchableOpacity
          onPress={onToggleWatched}
          style={[
            styles.swipeButton,
            styles.watchedButton,
            { backgroundColor: movie.watched ? "#ff9800" : "#4caf50" },
            isLoading && styles.buttonDisabled,
          ]}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <Animated.View
            style={[
              styles.swipeIcon,
              { transform: [{ scale: watchedScale }], opacity: watchedOpacity },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons
                name={movie.watched ? "eye-off" : "checkmark"}
                size={24}
                color="white"
              />
            )}
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDelete}
          style={[styles.swipeButton, styles.deleteButton]}
          activeOpacity={0.7}
        >
          <Animated.View
            style={[
              styles.swipeIcon,
              { transform: [{ scale: deleteScale }], opacity: deleteOpacity },
            ]}
          >
            <Ionicons name="trash" size={24} color="white" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderRightActions = (progress, dragX, movie) => (
    <SwipeActions
      dragX={dragX}
      movie={movie}
      onToggleWatched={() => handleToggleWatched(movie)}
      onDelete={() =>
        showCustomAlert({
          title: "Remove from Watchlist",
          message: `Are you sure you want to remove "${movie.Title}" from "${watchlistName}"?`,
          icon: "remove-circle",
          iconColor: "#f44336",
          buttons: [
            { text: "Cancel", style: "cancel" },
            {
              text: "Remove",
              style: "destructive",
              onPress: () => handleDeleteMovie(movie.imdbID),
            },
          ],
        })
      }
    />
  );

  const renderMovie = ({ item }) => {
    const movieId = item?.imdbID || item?.id || `movie-${Math.random()}`;
    const movieType = typeof item?.Type === "string" ? item.Type : "movie";
    const movieTitle = item?.Title || "Untitled";
    const movieYear = item?.Year || "Unknown";
    const moviePoster =
      typeof item?.Poster === "string" && item.Poster !== "N/A"
        ? item.Poster
        : "https://via.placeholder.com/300x450?text=No+Poster";
    const isWatched = !!item?.watched;
    const isLoading = loadingStates[movieId];

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeRefs.current[movieId] = ref;
          } else {
            delete swipeRefs.current[movieId];
          }
        }}
        renderRightActions={(progress, dragX) =>
          renderRightActions(progress, dragX, item)
        }
        rightThreshold={40}
        friction={2}
        enableTrackpadTwoFingerGesture
      >
        <TouchableOpacity
          style={[
            styles.movieCard,
            { backgroundColor: colors.card },
            isWatched && styles.watchedMovieCard,
            isLoading && styles.loadingCard,
          ]}
          onPress={() => navigation.navigate("Details", { imdbID: movieId })}
          activeOpacity={0.8}
        >
          <View style={styles.posterContainer}>
            <Image
              source={{ uri: moviePoster }}
              style={[styles.moviePoster, isWatched && styles.watchedPoster]}
              resizeMode="cover"
            />
            {isWatched && !isLoading && (
              <View style={styles.watchedOverlay}>
                <Ionicons name="checkmark-circle" size={32} color="#4caf50" />
              </View>
            )}
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#667eea" />
              </View>
            )}
          </View>

          <View style={styles.movieInfo}>
            <Text
              style={[
                styles.movieTitle,
                { color: colors.text },
                isWatched && styles.watchedText,
                isLoading && styles.loadingText,
              ]}
              numberOfLines={2}
            >
              {movieTitle}
            </Text>
            <Text
              style={[
                styles.movieYear,
                { color: colors.text },
                isWatched && styles.watchedText,
                isLoading && styles.loadingText,
              ]}
            >
              {movieYear}
            </Text>
            <View style={styles.tagsContainer}>
              <View style={styles.movieTypeContainer}>
                <Text
                  style={[
                    styles.movieType,
                    isWatched && styles.watchedTypeText,
                    isLoading && styles.loadingTypeText,
                  ]}
                >
                  {movieType.charAt(0).toUpperCase() + movieType.slice(1)}
                </Text>
              </View>
              {isWatched && !isLoading && (
                <View style={styles.watchedBadge}>
                  <Text style={styles.watchedBadgeText}>Watched</Text>
                </View>
              )}
              {isLoading && (
                <View style={styles.loadingBadge}>
                  <ActivityIndicator size="small" color="#667eea" />
                  <Text style={styles.loadingBadgeText}>Updating...</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.movieArrow}>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isWatched ? colors.text + "60" : colors.text}
            />
          </View>
          {isWatched && !isLoading && <View style={styles.cardOverlay} />}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  // Clean up refs when movies change
  useEffect(() => {
    const currentMovieIds = new Set(movies.map((movie) => movie.imdbID));
    Object.keys(swipeRefs.current).forEach((id) => {
      if (!currentMovieIds.has(id)) {
        delete swipeRefs.current[id];
      }
    });
  }, [movies]);

  const filteredMovies = showUnwatchedOnly
    ? movies.filter((movie) => !movie.watched)
    : movies;

  const watchedCount = movies.filter((movie) => movie.watched).length;
  const totalCount = movies.length;
  const unwatchedCount = totalCount - watchedCount;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top + 8 },
      ]}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text
            style={[styles.watchlistHeader, { color: colors.text }]}
            numberOfLines={1}
          >
            {watchlistName}
          </Text>
          <Text style={[styles.movieCountText, { color: colors.text }]}>
            {totalCount} {totalCount === 1 ? "movie" : "movies"}
            {watchedCount > 0 && (
              <Text style={styles.watchedCountText}>
                {" • "}
                <Text style={styles.watchedCountHighlight}>
                  {watchedCount} watched
                </Text>
              </Text>
            )}
          </Text>
        </View>

        {unwatchedCount > 0 && (
          <TouchableOpacity
            style={[
              styles.filterButton,
              showUnwatchedOnly && styles.filterButtonActive,
            ]}
            onPress={() => setShowUnwatchedOnly(!showUnwatchedOnly)}
          >
            <Ionicons
              name={showUnwatchedOnly ? "eye-off" : "eye"}
              size={20}
              color={showUnwatchedOnly ? "#4caf50" : colors.text}
            />
          </TouchableOpacity>
        )}
      </View>

      {contentLoading && filteredMovies.length === 0 ? (
        <View style={styles.contentLoadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : contentLoadError ? (
        <RetryState
          title="Unable to load watchlist"
          message={contentLoadMessage}
          onRetry={handleRetryContent}
          compact
        />
      ) : filteredMovies.length === 0 ? (
        <EmptyState
          icon={showUnwatchedOnly ? "eye-off" : "videocam-outline"}
          title={showUnwatchedOnly ? "No Unwatched Movies" : "No Movies Yet"}
          subtitle={
            showUnwatchedOnly
              ? "Everything in this list has been marked as watched"
              : `Add movies to "${watchlistName}" from the search screen`
          }
        />
      ) : (
        <FlatList
          data={filteredMovies}
          keyExtractor={(item, index) =>
            item?.imdbID || item?.id || `movie-${index}`
          }
          renderItem={renderMovie}
          contentContainerStyle={styles.movieListContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CustomAlert
        visible={alertConfig.visible}
        onClose={hideAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
      />

      {/* XP Toast */}
      {xpToast && (
        <Animated.View
          style={[
            styles.pixelToast,
            {
              opacity: xpToastAnim,
              transform: [
                {
                  translateY: xpToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-24, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <View
            style={[styles.pixelToastInner, { backgroundColor: colors.card }]}
          >
            <Ionicons
              name="flash"
              size={14}
              color="#E50914"
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.pixelToastText, { color: colors.text }]}>
              {xpToast}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* List Completion Celebration */}
      <Modal
        visible={showCelebration}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCelebration(false)}
      >
        <View style={styles.pixelModalOverlay}>
          <View
            style={[styles.pixelModalCard, { backgroundColor: colors.card }]}
          >
            <View
              style={[styles.pixelModalTopBar, { backgroundColor: "#10B981" }]}
            />
            <Text style={[styles.pixelModalLabel, { color: "#10B981" }]}>
              WATCHLIST COMPLETE
            </Text>
            <View style={styles.pixelAchIconBox}>
              <Text style={styles.pixelAchIconEmoji}>🏆</Text>
            </View>
            <Text style={[styles.pixelAchTitle, { color: colors.text }]}>
              {watchlistName}
            </Text>
            <Text style={[styles.pixelAchDesc, { color: colors.text }]}>
              All titles marked as watched{"\n"}+100 XP awarded
            </Text>
            <TouchableOpacity
              style={[styles.pixelButton, { backgroundColor: "#10B981" }]}
              onPress={() => setShowCelebration(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.pixelButtonText}>CONTINUE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Achievement Toast — slides up from bottom */}
      {achievementToast.visible && (
        <Animated.View
          style={[
            styles.achToast,
            {
              opacity: achToastAnim,
              transform: [
                {
                  translateY: achToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [80, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <View
            style={[styles.achToastInner, { backgroundColor: colors.card }]}
          >
            <View style={styles.achToastLeft}>
              <Text style={styles.achToastLabel}>BADGE EARNED</Text>
              <Text style={[styles.achToastTitle, { color: colors.text }]}>
                {achievementToast.achievement?.title}
              </Text>
              <Text style={styles.achToastDesc}>
                {achievementToast.achievement?.desc}
              </Text>
            </View>
            <Text style={styles.achToastIcon}>
              {achievementToast.achievement?.icon}
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Level-Up Banner — slides down from top */}
      {levelUpBanner.visible && (
        <Animated.View
          style={[
            styles.levelUpBanner,
            {
              opacity: levelUpBannerAnim,
              transform: [
                {
                  translateY: levelUpBannerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-80, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.levelUpBannerInner,
              { backgroundColor: colors.card },
            ]}
          >
            <View>
              <Text style={styles.levelUpLabel}>LEVEL UP ▲</Text>
              <Text style={[styles.levelUpTitle, { color: colors.text }]}>
                {levelUpBanner.level?.icon} {levelUpBanner.level?.title}
              </Text>
            </View>
            <Text style={styles.levelUpLvlTag}>
              LVL {levelUpBanner.level?.level}
            </Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  header: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingBottom: 100,
  },
  watchlistsLoadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  watchlistsLoadingText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.8,
    fontWeight: "500",
  },
  contentLoadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  contentLoadingText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.8,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    borderRadius: 28,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  watchlistHeader: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  movieCountText: {
    fontSize: 14,
    opacity: 0.7,
  },
  watchedCountText: {
    opacity: 0.8,
  },
  watchedCountHighlight: {
    color: "#4caf50",
    fontWeight: "600",
  },
  filterButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterButtonActive: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderColor: "#4caf50",
  },
  movieCard: {
    flexDirection: "row",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  watchedMovieCard: {
    // Keep existing styles
  },
  loadingCard: {
    opacity: 0.8,
  },
  posterContainer: {
    position: "relative",
    width: 80,
    height: 120,
  },
  moviePoster: {
    width: 80,
    height: 120,
  },
  watchedPoster: {
    opacity: 0.5,
  },
  watchedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  movieInfo: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  movieTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
    lineHeight: 20,
  },
  watchedText: {
    opacity: 0.6,
  },
  loadingText: {
    opacity: 0.7,
  },
  movieYear: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  movieTypeContainer: {
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  movieType: {
    fontSize: 12,
    color: "#667eea",
    fontWeight: "600",
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  watchedTypeText: {
    color: "#999",
    backgroundColor: "rgba(153, 153, 153, 0.1)",
  },
  loadingTypeText: {
    color: "#667eea",
    backgroundColor: "rgba(102, 126, 234, 0.05)",
  },
  watchedBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  watchedBadgeText: {
    fontSize: 10,
    color: "#4caf50",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  loadingBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    gap: 4,
  },
  loadingBadgeText: {
    fontSize: 10,
    color: "#667eea",
    fontWeight: "600",
  },
  movieArrow: {
    justifyContent: "center",
    paddingRight: 16,
  },
  movieListContainer: {
    paddingBottom: 20,
  },
  swipeActionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 120,
  },
  swipeButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "90%",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  watchedButton: {
    backgroundColor: "#4caf50",
  },
  deleteButton: {
    backgroundColor: "#e74c3c",
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  swipeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  tagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 16,
  },

  // ─── PIXEL HUD STYLES ────────────────────────────────────
  pageHeader: {
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
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 10,
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
  hudHeader: {
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "rgba(229,9,20,0.2)",
    marginBottom: 14,
  },
  hudTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  hudLvlChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 2,
    borderColor: "#E50914",
    paddingHorizontal: 9,
    paddingVertical: 5,
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
  hudLvlChipEmoji: { fontSize: 13 },
  hudLvlChipText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#E50914",
    letterSpacing: 1.2,
  },
  hudXpBarOuter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  hudXpSegments: {
    flexDirection: "row",
    gap: 2,
    flex: 1,
  },
  hudXpBlock: {
    flex: 1,
    height: 10,
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
    letterSpacing: 0.6,
    opacity: 0.7,
    minWidth: 76,
    textAlign: "right",
    marginLeft: 8,
  },
  hudProgressFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    minHeight: 14,
  },
  hudProgressLeft: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: 4,
    flexShrink: 1,
  },
  hudProgressLabel: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.9,
    color: "#E50914",
    opacity: 0.9,
  },
  hudMaxLvlText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: "#E50914",
    marginBottom: 2,
  },
  hudChipsRow: {
    flexDirection: "row",
    gap: 6,
  },
  hudChip: {
    flex: 1,
    borderWidth: 2,
    borderColor: "rgba(229,9,20,0.35)",
    borderRadius: 0,
    paddingVertical: 9,
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(229,9,20,0.03)",
  },
  hudChipVal: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 17,
  },
  hudChipLbl: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#E50914",
    opacity: 0.65,
  },
  hudCursor: {
    fontSize: 9,
    color: "#E50914",
    fontWeight: "900",
    marginLeft: 2,
  },
  hudCornerTL: {
    position: "absolute",
    top: 10,
    left: 12,
    width: 10,
    height: 10,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: "#E50914",
    opacity: 0.45,
  },
  hudCornerTR: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 10,
    height: 10,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: "#E50914",
    opacity: 0.45,
  },
  hudScanLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 50,
    backgroundColor: "rgba(229,9,20,0.07)",
    zIndex: 0,
  },
  hudChipCornerTL: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 5,
    height: 5,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: "#E50914",
    opacity: 0.55,
  },
  hudChipCornerTR: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 5,
    height: 5,
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: "#E50914",
    opacity: 0.55,
  },
  hudChipCornerBL: {
    position: "absolute",
    bottom: 3,
    left: 3,
    width: 5,
    height: 5,
    borderBottomWidth: 1.5,
    borderLeftWidth: 1.5,
    borderColor: "#E50914",
    opacity: 0.55,
  },
  hudChipCornerBR: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 5,
    height: 5,
    borderBottomWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: "#E50914",
    opacity: 0.55,
  },
  // ─── PIXEL MODAL / TOAST STYLES ───────────────────────────
  pixelModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  pixelModalCard: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.25)",
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 0,
    elevation: 8,
  },
  pixelModalTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#E50914",
  },
  pixelModalLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#E50914",
    marginBottom: 20,
    marginTop: 4,
  },
  pixelAchIconBox: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.25)",
    borderRadius: 0,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  pixelAchIconEmoji: { fontSize: 40 },
  pixelAchTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 8,
  },
  pixelAchDesc: {
    fontSize: 13,
    opacity: 0.6,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
  pixelButton: {
    backgroundColor: "#E50914",
    borderRadius: 0,
    width: "100%",
    paddingVertical: 13,
    alignItems: "center",
  },
  pixelButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 2,
  },

  // XP Toast
  pixelToast: {
    position: "absolute",
    top: 48,
    alignSelf: "center",
    zIndex: 999,
  },
  pixelToastInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "rgba(229,9,20,0.35)",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
  },
  pixelToastText: { fontWeight: "700", fontSize: 13, letterSpacing: 0.5 },

  createToast: {
    position: "absolute",
    bottom: 88,
    alignSelf: "center",
    backgroundColor: "rgba(20,20,20,0.9)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 999,
  },
  createToastText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  // ─── Achievement Toast (slides up from bottom) ─────────
  achToast: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  achToastInner: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 3,
    borderTopColor: "#E50914",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftColor: "rgba(229,9,20,0.2)",
    borderRightColor: "rgba(229,9,20,0.2)",
    borderBottomColor: "rgba(229,9,20,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 13,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  achToastLeft: {
    flex: 1,
    marginRight: 12,
  },
  achToastLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#E50914",
    marginBottom: 3,
  },
  achToastTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  achToastDesc: {
    fontSize: 12,
    opacity: 0.55,
    lineHeight: 16,
  },
  achToastIcon: {
    fontSize: 38,
  },

  // ─── Level-Up Banner (slides down from top) ────────────
  levelUpBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  levelUpBannerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 3,
    borderBottomColor: "#E50914",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: "rgba(229,9,20,0.2)",
    borderRightColor: "rgba(229,9,20,0.2)",
    paddingHorizontal: 18,
    paddingVertical: 14,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  levelUpLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#E50914",
    marginBottom: 3,
  },
  levelUpTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  levelUpLvlTag: {
    fontSize: 22,
    fontWeight: "900",
    color: "#E50914",
    letterSpacing: -0.5,
  },
});

export { WatchlistsScreen, WatchlistContentScreen };
