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
  recordListCreated,
  recordListCompleted,
  ACHIEVEMENTS,
} from "../utils/gamification";

const WatchlistsScreen = ({ navigation }) => {
  const [watchlists, setWatchlists] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [alertConfig, setAlertConfig] = useState({ visible: false });
  const [isCreatingWatchlist, setIsCreatingWatchlist] = useState(false);
  const [gamification, setGamification] = useState(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [latestAchievement, setLatestAchievement] = useState(null);
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

  const fetchWatchlists = async () => {
    try {
      const data = await getWatchlists();
      console.log("Fetched watchlists:", data);
      setWatchlists(data);
    } catch (error) {
      console.error("Error fetching watchlists:", error);
    }
  };

  useEffect(() => {
    fetchWatchlists();
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

      // Record gamification
      const { newAchievements } = await recordListCreated();
      loadGamification();
      if (newAchievements.length > 0) {
        setLatestAchievement(newAchievements[0]);
        setShowAchievementModal(true);
      }

      showCustomAlert({
        title: "Watchlist Created! +15 XP",
        message: `"${name}" has been successfully created.`,
        icon: "checkmark-circle",
        iconColor: "#4caf50",
        buttons: [{ text: "Great!", style: "default" }],
      });
    } catch (error) {
      console.error("Error adding watchlist:", error);
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
            await removeWatchlist(name);
            fetchWatchlists();
            navigation.setParams({ watchlistsModified: Date.now() });
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

  // Count total stats across all watchlists
  const totalMovies = Object.values(watchlists).reduce(
    (sum, list) => sum + list.length,
    0,
  );
  const totalWatchedInLists = Object.values(watchlists).reduce(
    (sum, list) => sum + list.filter((m) => m.watched).length,
    0,
  );

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.headerContainer}>
        <Text style={[styles.header, { color: colors.text }]}>
          My Watchlists
        </Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          Organize your cinema
        </Text>
      </View>

      {/* Gamification Stats Card */}
      {gamification && levelInfo && (
        <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
          <View style={styles.statsRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelIcon}>{levelInfo.current.icon}</Text>
              <View>
                <Text style={[styles.levelTitle, { color: colors.text }]}>
                  {levelInfo.current.title}
                </Text>
                <Text style={[styles.levelSubtext, { color: colors.text }]}>
                  Level {levelInfo.current.level}
                </Text>
              </View>
            </View>
            <View style={styles.xpContainer}>
              <Text style={styles.xpText}>{gamification.xp} XP</Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          {levelInfo.next && (
            <View style={styles.xpBarContainer}>
              <View style={styles.xpBarTrack}>
                <LinearGradient
                  colors={["#667eea", "#764ba2"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.xpBarFill,
                    { width: `${Math.max(5, levelInfo.progress * 100)}%` },
                  ]}
                />
              </View>
              <Text style={[styles.xpBarLabel, { color: colors.text }]}>
                {levelInfo.xpInLevel}/{levelInfo.xpForNext} to{" "}
                {levelInfo.next.title}
              </Text>
            </View>
          )}

          {/* Quick Stats Row */}
          <View style={styles.quickStats}>
            {gamification.currentStreak > 0 && (
              <View style={styles.quickStat}>
                <Text style={styles.quickStatIcon}>🔥</Text>
                <Text style={[styles.quickStatValue, { color: colors.text }]}>
                  {gamification.currentStreak}
                </Text>
                <Text style={[styles.quickStatLabel, { color: colors.text }]}>
                  Streak
                </Text>
              </View>
            )}
            <View style={styles.quickStat}>
              <Text style={styles.quickStatIcon}>🎬</Text>
              <Text style={[styles.quickStatValue, { color: colors.text }]}>
                {totalMovies}
              </Text>
              <Text style={[styles.quickStatLabel, { color: colors.text }]}>
                Movies
              </Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatIcon}>✅</Text>
              <Text style={[styles.quickStatValue, { color: colors.text }]}>
                {totalWatchedInLists}
              </Text>
              <Text style={[styles.quickStatLabel, { color: colors.text }]}>
                Watched
              </Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatIcon}>🏆</Text>
              <Text style={[styles.quickStatValue, { color: colors.text }]}>
                {gamification.unlockedAchievements.length}
              </Text>
              <Text style={[styles.quickStatLabel, { color: colors.text }]}>
                Badges
              </Text>
            </View>
          </View>
        </View>
      )}

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

      <CustomAlert
        visible={alertConfig.visible}
        onClose={hideAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
      />

      {/* Achievement Unlocked Modal */}
      <Modal
        visible={showAchievementModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAchievementModal(false)}
      >
        <View style={styles.achievementOverlay}>
          <View
            style={[styles.achievementCard, { backgroundColor: colors.card }]}
          >
            <Text style={styles.achievementUnlockedText}>
              🎉 Achievement Unlocked!
            </Text>
            {latestAchievement && (
              <>
                <Text style={styles.achievementBigIcon}>
                  {latestAchievement.icon}
                </Text>
                <Text style={[styles.achievementTitle, { color: colors.text }]}>
                  {latestAchievement.title}
                </Text>
                <Text style={[styles.achievementDesc, { color: colors.text }]}>
                  {latestAchievement.desc}
                </Text>
              </>
            )}
            <TouchableOpacity
              style={styles.achievementButton}
              onPress={() => setShowAchievementModal(false)}
            >
              <LinearGradient
                colors={["#667eea", "#764ba2"]}
                style={styles.achievementButtonGradient}
              >
                <Text style={styles.achievementButtonText}>Awesome!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const WatchlistContentScreen = ({ route, navigation }) => {
  const { name } = route.params;
  const [movies, setMovies] = useState([]);
  const [alertConfig, setAlertConfig] = useState({ visible: false });
  const [showWatchedOnly, setShowWatchedOnly] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});
  const [xpToast, setXpToast] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [latestAchievement, setLatestAchievement] = useState(null);
  const xpToastAnim = useRef(new Animated.Value(0)).current;
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
    const msg =
      streakDays > 1
        ? `+${xpGained} XP  🔥 ${streakDays} day streak!`
        : `+${xpGained} XP`;
    setXpToast(msg);
    Animated.sequence([
      Animated.timing(xpToastAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(xpToastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setXpToast(null));
  };

  const fetchMovies = async () => {
    const lists = await getWatchlists();
    setMovies(lists[name] || []);
  };

  useEffect(() => {
    fetchMovies();
    const unsubscribe = navigation.addListener("focus", fetchMovies);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      navigation.setParams({ contentUpdated: Date.now() });
    });
    return unsubscribe;
  }, [navigation]);

  const handleDeleteMovie = async (imdbID) => {
    try {
      await removeFromWatchlist(name, imdbID);
      setMovies((prev) => prev.filter((m) => m.imdbID !== imdbID));
      navigation.setParams({ movieRemoved: Date.now() });

      // Close the swipeable after deletion
      if (swipeRefs.current[imdbID]) {
        swipeRefs.current[imdbID].close();
      }
    } catch (error) {
      console.error("Failed to remove movie:", error);
    }
  };

  const handleToggleWatched = async (movie) => {
    const movieId = movie.imdbID;

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
      await toggleWatchedStatus(name, movieId);

      navigation.setParams({ movieWatchedToggled: Date.now() });

      // Gamification: record watch/unwatch
      if (newWatchedStatus) {
        const { state, newAchievements, xpGained } = await recordMovieWatched();
        showXpToast(xpGained, state.currentStreak);

        // Check if the entire list is now complete
        const updatedMovies = movies.map((m) =>
          m.imdbID === movieId ? { ...m, watched: true } : m,
        );
        const allWatched =
          updatedMovies.length > 0 && updatedMovies.every((m) => m.watched);
        if (allWatched) {
          const completionResult = await recordListCompleted();
          setTimeout(() => setShowCelebration(true), 500);
          if (completionResult.newAchievements.length > 0) {
            setTimeout(() => {
              setLatestAchievement(completionResult.newAchievements[0]);
              setShowAchievementModal(true);
            }, 2500);
          }
        } else if (newAchievements.length > 0) {
          setTimeout(() => {
            setLatestAchievement(newAchievements[0]);
            setShowAchievementModal(true);
          }, 2000);
        }
      } else {
        await recordMovieUnwatched();
      }

      // Auto close the swipeable after successful toggle with a slight delay
      setTimeout(() => {
        if (swipeRefs.current[movieId]) {
          swipeRefs.current[movieId].close();
        }
      }, 300); // Small delay to show the action completed
    } catch (error) {
      console.error("Failed to toggle watched status:", error);

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
          message: `Are you sure you want to remove "${movie.Title}" from "${name}"?`,
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
    const isWatched = item.watched;
    const isLoading = loadingStates[item.imdbID];

    return (
      <Swipeable
        ref={(ref) => {
          if (ref) {
            swipeRefs.current[item.imdbID] = ref;
          } else {
            delete swipeRefs.current[item.imdbID];
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
          onPress={() =>
            navigation.navigate("Details", { imdbID: item.imdbID })
          }
          activeOpacity={0.8}
        >
          <View style={styles.posterContainer}>
            <Image
              source={{ uri: item.Poster }}
              style={[styles.moviePoster, isWatched && styles.watchedPoster]}
              contentFit="cover"
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
              {item.Title}
            </Text>
            <Text
              style={[
                styles.movieYear,
                { color: colors.text },
                isWatched && styles.watchedText,
                isLoading && styles.loadingText,
              ]}
            >
              {item.Year}
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
                  {item.Type.charAt(0).toUpperCase() + item.Type.slice(1)}
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

  const filteredMovies = showWatchedOnly
    ? movies.filter((movie) => movie.watched)
    : movies;

  const watchedCount = movies.filter((movie) => movie.watched).length;
  const totalCount = movies.length;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
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
            {name}
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

        {watchedCount > 0 && (
          <TouchableOpacity
            style={[
              styles.filterButton,
              showWatchedOnly && styles.filterButtonActive,
            ]}
            onPress={() => setShowWatchedOnly(!showWatchedOnly)}
          >
            <Ionicons
              name={showWatchedOnly ? "eye" : "eye-off"}
              size={20}
              color={showWatchedOnly ? "#4caf50" : colors.text}
            />
          </TouchableOpacity>
        )}
      </View>

      {filteredMovies.length === 0 ? (
        <EmptyState
          icon={showWatchedOnly ? "eye" : "videocam-outline"}
          title={showWatchedOnly ? "No Watched Movies" : "No Movies Yet"}
          subtitle={
            showWatchedOnly
              ? "You haven't marked any movies as watched yet"
              : `Add movies to "${name}" from the search screen`
          }
        />
      ) : (
        <FlatList
          data={filteredMovies}
          keyExtractor={(item) => item.imdbID}
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
            styles.xpToast,
            {
              opacity: xpToastAnim,
              transform: [
                {
                  translateY: xpToastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={styles.xpToastGradient}
          >
            <Text style={styles.xpToastText}>{xpToast}</Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* List Completion Celebration */}
      <Modal
        visible={showCelebration}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCelebration(false)}
      >
        <View style={styles.achievementOverlay}>
          <View
            style={[styles.celebrationCard, { backgroundColor: colors.card }]}
          >
            <Text style={styles.celebrationEmoji}>🎬🏆🎉</Text>
            <Text style={[styles.celebrationTitle, { color: colors.text }]}>
              Watchlist Complete!
            </Text>
            <Text style={[styles.celebrationSubtitle, { color: colors.text }]}>
              You finished every movie in "{name}"!{"\n"}+100 XP bonus!
            </Text>
            <TouchableOpacity
              style={styles.achievementButton}
              onPress={() => setShowCelebration(false)}
            >
              <LinearGradient
                colors={["#4caf50", "#2e7d32"]}
                style={styles.achievementButtonGradient}
              >
                <Text style={styles.achievementButtonText}>Amazing! 🎉</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Achievement Modal */}
      <Modal
        visible={showAchievementModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAchievementModal(false)}
      >
        <View style={styles.achievementOverlay}>
          <View
            style={[styles.achievementCard, { backgroundColor: colors.card }]}
          >
            <Text style={styles.achievementUnlockedText}>
              🎉 Achievement Unlocked!
            </Text>
            {latestAchievement && (
              <>
                <Text style={styles.achievementBigIcon}>
                  {latestAchievement.icon}
                </Text>
                <Text style={[styles.achievementTitle, { color: colors.text }]}>
                  {latestAchievement.title}
                </Text>
                <Text style={[styles.achievementDesc, { color: colors.text }]}>
                  {latestAchievement.desc}
                </Text>
              </>
            )}
            <TouchableOpacity
              style={styles.achievementButton}
              onPress={() => setShowAchievementModal(false)}
            >
              <LinearGradient
                colors={["#667eea", "#764ba2"]}
                style={styles.achievementButtonGradient}
              >
                <Text style={styles.achievementButtonText}>Awesome!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 10,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
  listContainer: {
    paddingBottom: 100,
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

  // ─── GAMIFICATION STYLES ──────────────────────────────────
  statsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  levelIcon: {
    fontSize: 32,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  levelSubtext: {
    fontSize: 12,
    opacity: 0.6,
  },
  xpContainer: {
    backgroundColor: "rgba(102, 126, 234, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  xpText: {
    color: "#667eea",
    fontWeight: "bold",
    fontSize: 14,
  },
  xpBarContainer: {
    marginBottom: 12,
  },
  xpBarTrack: {
    height: 6,
    backgroundColor: "rgba(102, 126, 234, 0.15)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  xpBarLabel: {
    fontSize: 11,
    opacity: 0.5,
    textAlign: "right",
  },
  quickStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  quickStat: {
    alignItems: "center",
    minWidth: 55,
  },
  quickStatIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  quickStatLabel: {
    fontSize: 10,
    opacity: 0.5,
  },

  // Achievement Modal
  achievementOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  achievementCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    elevation: 10,
  },
  achievementUnlockedText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#667eea",
    marginBottom: 16,
  },
  achievementBigIcon: {
    fontSize: 56,
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  achievementDesc: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 24,
  },
  achievementButton: {
    borderRadius: 25,
    overflow: "hidden",
    width: "100%",
  },
  achievementButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 25,
  },
  achievementButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  // Celebration
  celebrationCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    elevation: 10,
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: 16,
    letterSpacing: 8,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  celebrationSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },

  // XP Toast
  xpToast: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    zIndex: 999,
  },
  xpToastGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 6,
  },
  xpToastText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});

export { WatchlistsScreen, WatchlistContentScreen };
