import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Modal,
  FlatList,
  Platform,
  Linking,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useCustomTheme } from "../contexts/ThemeContext";
import { useFavorites } from "../contexts/FavoritesContext";
import analyticsService from "../services/analytics";
import {
  getMovieDetails,
  getSeasonDetails,
  getMovieVideos,
  getTVVideos,
  getSeasonVideos,
  extractYouTubeTrailer,
  getWatchProviders,
  getUserSubscriptions,
  getMovieReviews,
  getTVReviews,
} from "../services/api";
import {
  getWatchlists,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
  markEpisodeWatched,
  getWatchedEpisodes,
} from "../utils/storage";
import { formatWatchProviders } from "../config/streamingProviders";
import YoutubePlayer from "react-native-youtube-iframe";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  withTiming,
  withSequence,
  withRepeat,
  useAnimatedStyle,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import WatchProvidersSection from "../components/WatchProvidersSection";
import ReviewsSection from "../components/ReviewsSection";
import { StatusBar } from "expo-status-bar";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

// Simple Toast Component
const Toast = React.memo(({ visible, message, type, onHide }) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    let timer;
    let hideTimer;
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
        hideTimer = setTimeout(onHide, 300);
      }, 2500);
    }

    return () => {
      if (timer) clearTimeout(timer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [visible, onHide, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const toastConfig = useMemo(
    () => ({
      success: { color: "#10B981", icon: "checkmark-circle" },
      error: { color: "#EF4444", icon: "alert-circle" },
      info: { color: "#3B82F6", icon: "information-circle" },
      default: { color: "#6B7280", icon: "information-circle" },
    }),
    [],
  );

  const config = toastConfig[type] || toastConfig.default;

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toastContainer, animatedStyle]}>
      <View style={[styles.toast, { backgroundColor: config.color }]}>
        <Ionicons name={config.icon} size={18} color="#fff" />
        <Text style={styles.toastText}>{message}</Text>
      </View>
    </Animated.View>
  );
});

Toast.displayName = "Toast";

// Header Component
const Header = React.memo(({ onBack, colors }) => (
  <View style={styles.header}>
    <TouchableOpacity
      onPress={onBack}
      style={[styles.backButton, { backgroundColor: colors.primary }]}
      activeOpacity={0.8}
    >
      <Ionicons name="arrow-back" size={26} color="#fff" />
    </TouchableOpacity>
  </View>
));

Header.displayName = "Header";

// Hero Section Component
const HeroSection = React.memo(({ movie, colors }) => (
  <View style={styles.heroSection}>
    {typeof movie?.Poster === "string" &&
    movie.Poster &&
    movie.Poster !== "N/A" ? (
      <View style={styles.posterContainer}>
        <Image
          source={{ uri: movie.Poster }}
          style={styles.heroPoster}
          contentFit="cover"
        />
        <LinearGradient
          colors={[
            "transparent",
            "transparent",
            colors.background + "80",
            colors.background,
          ]}
          style={styles.posterGradient}
        />
      </View>
    ) : (
      <View style={[styles.heroPlaceholder, { backgroundColor: colors.card }]}>
        <Ionicons name="film-outline" size={80} color={colors.text} />
        <Text style={[styles.placeholderText, { color: colors.text }]}>
          No Poster Available
        </Text>
      </View>
    )}
  </View>
));

HeroSection.displayName = "HeroSection";

// Rating Badge Component
const RatingBadge = React.memo(({ rating }) => {
  if (!rating || rating === "N/A") return null;

  return (
    <View style={styles.ratingBadge}>
      <Text style={styles.ratingText}>★ {rating}/10</Text>
    </View>
  );
});

RatingBadge.displayName = "RatingBadge";

// Genre Tags Component
const GenreTags = React.memo(({ genres, colors, theme }) => {
  const normalizedGenres = typeof genres === "string" ? genres : "";
  const genreList = useMemo(() => {
    if (!normalizedGenres || normalizedGenres === "N/A") return [];
    return normalizedGenres
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
  }, [normalizedGenres]);

  if (genreList.length === 0) return null;

  return (
    <View style={styles.genreSection}>
      <Text style={[styles.genreLabel, { color: colors.text }]}>Genres</Text>
      <View style={styles.genreTags}>
        {genreList.map((genre, index) => (
          <View
            key={index}
            style={[
              styles.genreTag,
              {
                backgroundColor:
                  theme === "dark"
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
              },
            ]}
          >
            <Text style={[styles.genreText, { color: colors.text }]}>
              {genre.trim()}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

GenreTags.displayName = "GenreTags";

// Action Buttons Component
const ActionButtons = React.memo(
  ({
    favorite,
    inWatchlist,
    onFavoritePress,
    onWatchlistPress,
    colors,
    theme,
  }) => (
    <View style={styles.actionButtonsContainer}>
      <TouchableOpacity
        style={[
          styles.actionButton,
          favorite && styles.actionButtonActive,
          {
            backgroundColor:
              theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
          },
        ]}
        onPress={onFavoritePress}
        activeOpacity={0.7}
      >
        <Ionicons
          name={favorite ? "heart" : "heart-outline"}
          size={24}
          color={favorite ? "#ff6b81" : colors.text}
        />
        <Text style={[styles.actionButtonText, { color: colors.text }]}>
          {favorite ? "Favorited" : "Favorite"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.actionButton,
          inWatchlist && styles.actionButtonActive,
          {
            backgroundColor:
              theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
          },
        ]}
        onPress={onWatchlistPress}
        activeOpacity={0.7}
      >
        <Ionicons
          name={inWatchlist ? "bookmark" : "bookmark-outline"}
          size={24}
          color={inWatchlist ? "#42a5f5" : colors.text}
        />
        <Text style={[styles.actionButtonText, { color: colors.text }]}>
          {inWatchlist ? "In List" : "Watchlist"}
        </Text>
      </TouchableOpacity>
    </View>
  ),
);

ActionButtons.displayName = "ActionButtons";

// Episode Item Component - Enhanced with watch tracking
const EpisodeItem = React.memo(
  ({ episode, imdbID, season, isWatched, onToggleWatch, colors, theme }) => (
    <TouchableOpacity
      style={[
        styles.episodeItem,
        {
          backgroundColor: isWatched
            ? theme === "dark"
              ? "rgba(76, 175, 80, 0.15)"
              : "rgba(76, 175, 80, 0.1)"
            : "transparent",
          borderLeftWidth: isWatched ? 3 : 0,
          borderLeftColor: "#4caf50",
        },
      ]}
      onPress={() => onToggleWatch(season, episode.episodeNumber)}
      activeOpacity={0.7}
    >
      <View style={styles.episodeContent}>
        <View style={styles.episodeHeader}>
          <View style={styles.episodeNumberBadge}>
            <Text style={[styles.episodeNumber, { color: colors.primary }]}>
              {episode.episodeNumber}
            </Text>
          </View>
          <Text
            style={[
              styles.episodeTitle,
              {
                color: colors.text,
                textDecorationLine: isWatched ? "line-through" : "none",
                opacity: isWatched ? 0.7 : 1,
              },
            ]}
            numberOfLines={2}
          >
            {episode.title}
          </Text>
        </View>

        <View style={styles.episodeMetadata}>
          <View style={styles.episodeInfo}>
            <Ionicons
              name="time-outline"
              size={14}
              color={colors.text}
              opacity={0.6}
            />
            <Text style={[styles.episodeRuntime, { color: colors.text }]}>
              {episode.runtime}
            </Text>
          </View>

          {episode.rating !== "N/A" && (
            <View style={styles.episodeInfo}>
              <Ionicons name="star" size={14} color="#ffd700" />
              <Text style={[styles.episodeRating, { color: colors.text }]}>
                {episode.rating}
              </Text>
            </View>
          )}

          <View style={styles.watchButton}>
            <Ionicons
              name={isWatched ? "checkmark-circle" : "checkmark-circle-outline"}
              size={24}
              color={isWatched ? "#4caf50" : colors.text}
              opacity={isWatched ? 1 : 0.4}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ),
);

EpisodeItem.displayName = "EpisodeItem";

// Season Component - Enhanced with progress tracking and trailers
const Season = React.memo(
  ({
    season,
    isExpanded,
    isLoading,
    onToggle,
    colors,
    theme,
    imdbID,
    watchedEpisodes,
    onToggleWatch,
    trailerVideoId,
    isTrailerLoading,
    isTrailerPlaying,
    onTrailerPress,
  }) => {
    // Check if season is actually loaded (has episode data)
    const isLoaded = season.episodes && season.episodes.length > 0;

    // Calculate watched count for this season
    const watchedCount = isLoaded
      ? season.episodes.filter(
          (ep) =>
            watchedEpisodes[`s${season.seasonNumber}e${ep.episodeNumber}`],
        ).length
      : 0;
    const totalEpisodes = season.episodeCount || season.episodes?.length || 0;
    const progress =
      totalEpisodes > 0 ? (watchedCount / totalEpisodes) * 100 : 0;

    return (
      <View style={styles.seasonContainer}>
        <TouchableOpacity
          style={[
            styles.seasonHeader,
            {
              backgroundColor:
                theme === "dark"
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.03)",
            },
          ]}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <View style={styles.seasonHeaderContent}>
            <View style={styles.seasonTitleRow}>
              <Text style={[styles.seasonTitle, { color: colors.text }]}>
                Season {season.seasonNumber}
              </Text>
              {watchedCount > 0 && isLoaded && (
                <View
                  style={[
                    styles.progressBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.progressBadgeText}>
                    {watchedCount}/{totalEpisodes}
                  </Text>
                </View>
              )}
            </View>

            {/* Show different info based on loaded state */}
            {isLoaded ? (
              <Text
                style={[
                  styles.seasonInfo,
                  { color: colors.text, opacity: 0.7 },
                ]}
              >
                {totalEpisodes} Episodes
                {season.airYear && season.airYear !== "N/A"
                  ? ` • ${season.airYear}`
                  : ""}
              </Text>
            ) : (
              <Text
                style={[
                  styles.seasonInfo,
                  { color: colors.text, opacity: 0.5 },
                ]}
              >
                Tap to load episodes
              </Text>
            )}

            {/* Progress bar - only show if loaded and has progress */}
            {progress > 0 && isLoaded && (
              <View
                style={[
                  styles.progressBarContainer,
                  {
                    backgroundColor:
                      theme === "dark"
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.1)",
                  },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progress}%`,
                      backgroundColor:
                        progress === 100 ? "#4caf50" : colors.primary,
                    },
                  ]}
                />
              </View>
            )}
          </View>
          <Ionicons
            name={isExpanded ? "chevron-down" : "chevron-forward"}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.episodesContainer}>
            {/* Season Trailer Section */}
            {onTrailerPress && (
              <View
                style={[
                  styles.seasonTrailerSection,
                  {
                    backgroundColor:
                      theme === "dark"
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.02)",
                  },
                ]}
              >
                {isTrailerPlaying && trailerVideoId ? (
                  Platform.OS === "web" ? (
                    <View style={styles.seasonVideoWrapper}>
                      <TouchableOpacity
                        style={[
                          styles.webTrailerButton,
                          { backgroundColor: colors.primary },
                        ]}
                        onPress={() =>
                          Linking.openURL(
                            `https://www.youtube.com/watch?v=${trailerVideoId}`,
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <Ionicons name="logo-youtube" size={28} color="#fff" />
                        <Text
                          style={[
                            styles.webTrailerButtonText,
                            { color: "#fff" },
                          ]}
                        >
                          Watch Season Trailer on YouTube
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.seasonVideoWrapper}>
                      <YoutubePlayer
                        height={180}
                        width={screenWidth - 80}
                        play={isTrailerPlaying}
                        videoId={trailerVideoId}
                        onChangeState={(state) => {
                          if (state === "ended") {
                            // Trailer ended, could handle this if needed
                          }
                        }}
                      />
                    </View>
                  )
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.seasonTrailerButton,
                      { borderColor: colors.primary },
                    ]}
                    onPress={onTrailerPress}
                    activeOpacity={0.7}
                    disabled={isTrailerLoading}
                  >
                    {isTrailerLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Ionicons
                          name="play-circle-outline"
                          size={24}
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            styles.seasonTrailerText,
                            { color: colors.primary },
                          ]}
                        >
                          {trailerVideoId
                            ? "Watch Season Trailer"
                            : "Load Season Trailer"}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Loading Episodes...
                </Text>
              </View>
            ) : isLoaded ? (
              season.episodes.map((episode, index) => (
                <EpisodeItem
                  key={`${season.seasonNumber}-${episode.episodeNumber || index}`}
                  episode={episode}
                  imdbID={imdbID}
                  season={season.seasonNumber}
                  isWatched={
                    !!watchedEpisodes[
                      `s${season.seasonNumber}e${episode.episodeNumber}`
                    ]
                  }
                  onToggleWatch={onToggleWatch}
                  colors={colors}
                  theme={theme}
                />
              ))
            ) : (
              <Text style={[styles.noEpisodesText, { color: colors.text }]}>
                No episodes available
              </Text>
            )}
          </View>
        )}
      </View>
    );
  },
);

Season.displayName = "Season";

// Trailer Section Component
const TrailerSection = React.memo(
  ({
    isTrailerLoading,
    trailerError,
    videoId,
    isPlaying,
    onWatchTrailer,
    onRetry,
    colors,
    onStateChange,
    onError,
  }) => (
    <View style={[styles.trailerSection, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Trailer</Text>

      {isTrailerLoading ? (
        <View style={styles.trailerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.trailerText, { color: colors.text }]}>
            Loading trailer...
          </Text>
        </View>
      ) : trailerError ? (
        <View style={styles.trailerError}>
          <Ionicons
            name="alert-circle-outline"
            size={40}
            color={colors.text}
            style={styles.errorIcon}
          />
          <Text style={[styles.trailerText, { color: colors.text }]}>
            {trailerError}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: "#fff" }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : videoId && isPlaying ? (
        Platform.OS === "web" ? (
          <View style={styles.videoWrapper}>
            <TouchableOpacity
              style={[
                styles.webTrailerButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() =>
                Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)
              }
              activeOpacity={0.8}
            >
              <Ionicons name="logo-youtube" size={32} color="#fff" />
              <Text style={[styles.webTrailerButtonText, { color: "#fff" }]}>
                Watch on YouTube
              </Text>
            </TouchableOpacity>
            <Text style={[styles.webTrailerNote, { color: colors.text }]}>
              Click to open in YouTube
            </Text>
          </View>
        ) : (
          <View style={styles.videoWrapper}>
            <YoutubePlayer
              height={Math.min(240, (screenWidth - 40) * (9 / 16))}
              width={screenWidth - 40}
              play={isPlaying}
              videoId={videoId}
              onChangeState={onStateChange}
              onError={onError}
            />
          </View>
        )
      ) : (
        <TouchableOpacity
          style={styles.trailerPlaceholder}
          onPress={onWatchTrailer}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, colors.primary + "80"]}
            style={styles.trailerGradient}
          >
            <Ionicons name="play-circle" size={60} color="#fff" />
            <Text style={[styles.trailerText, { color: "#fff" }]}>
              Watch Trailer
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  ),
);

TrailerSection.displayName = "TrailerSection";

// Watchlist Modal Component
const WatchlistModal = React.memo(
  ({
    visible,
    watchlists,
    movieInWatchlists,
    onSelectWatchlist,
    onClose,
    colors,
    theme,
    processingWatchlist,
  }) => {
    const watchlistNames = useMemo(() => Object.keys(watchlists), [watchlists]);

    const renderWatchlistItem = useCallback(
      ({ item: name }) => {
        const isInThisWatchlist = movieInWatchlists.includes(name);
        const isProcessing = processingWatchlist === name;

        return (
          <TouchableOpacity
            style={[
              styles.modalItem,
              {
                borderBottomColor: colors.border,
                backgroundColor: isInThisWatchlist
                  ? theme === "dark"
                    ? "rgba(126, 87, 194, 0.2)"
                    : "rgba(126, 87, 194, 0.1)"
                  : "transparent",
                opacity: isProcessing ? 0.6 : 1,
              },
            ]}
            onPress={() => onSelectWatchlist(name)}
            activeOpacity={0.7}
            disabled={isProcessing}
          >
            <View style={styles.modalItemContent}>
              <Text style={[styles.modalItemText, { color: colors.text }]}>
                {name}
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                {isProcessing && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
                {isInThisWatchlist && !isProcessing && (
                  <View style={styles.inWatchlistBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.inWatchlistText,
                        { color: colors.primary },
                      ]}
                    >
                      Added
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      },
      [
        movieInWatchlists,
        onSelectWatchlist,
        colors,
        theme,
        processingWatchlist,
      ],
    );

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        supportedOrientations={["portrait", "landscape"]}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Watchlist
            </Text>
            <FlatList
              data={watchlistNames}
              keyExtractor={(name) => name}
              showsVerticalScrollIndicator={false}
              renderItem={renderWatchlistItem}
              ListEmptyComponent={
                <Text style={[styles.modalEmptyText, { color: colors.text }]}>
                  No watchlists. Create one in the Watchlists tab.
                </Text>
              }
            />
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: colors.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  },
);

WatchlistModal.displayName = "WatchlistModal";

const DetailsScreen = ({ route, navigation }) => {
  const { imdbID } = route.params;
  const [movie, setMovie] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [isTrailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seasonTrailers, setSeasonTrailers] = useState({}); // Store trailers by season number
  const [loadingSeasonTrailers, setLoadingSeasonTrailers] = useState({});
  const [playingSeasonTrailer, setPlayingSeasonTrailer] = useState(null); // Track which season trailer is playing
  const [seriesDetails, setSeriesDetails] = useState(null);
  const [expandedSeasons, setExpandedSeasons] = useState({});
  const [loadingEpisodes, setLoadingEpisodes] = useState({});
  const [watchedEpisodes, setWatchedEpisodes] = useState({});
  const [watchlists, setWatchlists] = useState({});
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [movieInWatchlists, setMovieInWatchlists] = useState([]);
  const [processingWatchlist, setProcessingWatchlist] = useState(null); // Track which watchlist is being processed

  // Watch providers state
  const [watchProviders, setWatchProviders] = useState(null);
  const [loadingWatchProviders, setLoadingWatchProviders] = useState(false);
  const [userSubscriptions, setUserSubscriptions] = useState([]);

  // Reviews state
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);

  // Toast state
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();

  // The backend can resolve a tmdb:* id into a real IMDb tt* id.
  // For app-wide consistency (Search cards, Favorites, Watchlists), prefer
  // storing/operating on the tmdb:* id when we have it.
  const effectiveImdbID = useMemo(() => {
    const ids = [imdbID, movie?.imdbID].filter(Boolean);
    const tmdbId = ids.find(
      (id) => typeof id === "string" && id.startsWith("tmdb:"),
    );
    return tmdbId || movie?.imdbID || imdbID;
  }, [imdbID, movie?.imdbID]);

  // Extract TMDB ID and type from effectiveImdbID
  const tmdbInfo = useMemo(() => {
    if (effectiveImdbID && effectiveImdbID.startsWith("tmdb:")) {
      const parts = effectiveImdbID.split(":");
      if (parts.length === 3) {
        return {
          id: parts[2],
          type: parts[1], // "movie" or "tv"
        };
      }
    }
    return null;
  }, [effectiveImdbID]);

  const candidateIds = useMemo(
    () => Array.from(new Set([imdbID, movie?.imdbID].filter(Boolean))),
    [imdbID, movie?.imdbID],
  );

  // Compute favorite status directly from context (instant, no async)
  const favorite = useMemo(() => {
    return candidateIds.some((id) => isFavorite(id));
  }, [candidateIds, isFavorite]);

  const loadingOpacity = useSharedValue(1);

  // Memoized functions
  const showToast = useCallback((message, type = "info") => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Client-side cache for season data (30-minute TTL)
  const seasonCacheRef = useRef(new Map());

  // Optimized: Fetch single season with all episode data (no individual episode requests!)
  // TMDB season endpoint already includes complete episode details
  const fetchSeasonDetails = useCallback(async (imdbID, seasonNumber) => {
    const cacheKey = `${imdbID}:${seasonNumber}`;

    // Check cache first
    const cached = seasonCacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
      console.log(`✅ Using cached season ${seasonNumber}`);
      return cached.data;
    }

    try {
      // Single request gets ALL episode data!
      const seasonData = await getSeasonDetails(imdbID, seasonNumber);

      if (!seasonData?.Episodes || seasonData.Episodes.length === 0) {
        return null;
      }

      const airYear = seasonData.Episodes[0]?.Released
        ? new Date(seasonData.Episodes[0].Released).getFullYear()
        : "N/A";

      // Process episodes from the season response (no additional requests needed!)
      const episodes = seasonData.Episodes.map((ep) => ({
        title: ep.Title,
        episodeNumber: ep.Episode,
        runtime: ep.Runtime || "N/A",
        rating: ep.imdbRating || "N/A",
      }));

      const processedSeason = {
        seasonNumber,
        episodeCount: episodes.length,
        airYear,
        episodes,
      };

      // Cache it
      seasonCacheRef.current.set(cacheKey, {
        data: processedSeason,
        timestamp: Date.now(),
      });

      return processedSeason;
    } catch (error) {
      console.error(`Failed to load season ${seasonNumber}:`, error);
      return null;
    }
  }, []);

  const fetchTrailer = useCallback(
    async (title, tmdbId, type = "movie") => {
      setTrailerLoading(true);
      setTrailerError(null);
      try {
        let videosData;

        // If we have a TMDB ID, use the backend API (preferred method)
        if (tmdbId) {
          if (type === "tv" || type === "series") {
            videosData = await getTVVideos(tmdbId);
          } else {
            videosData = await getMovieVideos(tmdbId);
          }

          const youtubeKey = extractYouTubeTrailer(videosData);
          if (youtubeKey) {
            setVideoId(youtubeKey);
          } else {
            setTrailerError("No trailer found for this title.");
            showToast("No trailer found", "info");
          }
        } else {
          // Fallback to direct YouTube API search (legacy method)
          const query = encodeURIComponent(`${title} official trailer`);
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`,
          );
          const data = await response.json();
          if (data.items?.length > 0) {
            setVideoId(data.items[0].id.videoId);
          } else {
            setTrailerError("No trailer found for this title.");
            showToast("No trailer found", "info");
          }
        }
      } catch (err) {
        console.error("Error fetching trailer:", err);
        setTrailerError("Failed to load trailer. Please try again.");
        showToast("Failed to load trailer", "error");
      } finally {
        setTrailerLoading(false);
      }
    },
    [showToast],
  );

  const toggleFavorite = useCallback(async () => {
    try {
      const currentlyFavorite = candidateIds.some((id) => isFavorite(id));

      if (currentlyFavorite) {
        await Promise.all(candidateIds.map((id) => removeFromFavorites(id)));
        showToast("Removed from favorites", "info");
        // Track favorite removal
        analyticsService.trackFavoriteAction(
          "remove",
          effectiveImdbID,
          movie?.Title || "Unknown",
        );
        return;
      }

      const movieToStore = movie ? { ...movie, imdbID: effectiveImdbID } : null;
      if (movieToStore) {
        await addToFavorites(movieToStore);
        showToast("Added to favorites!", "success");
        // Track favorite add
        analyticsService.trackFavoriteAction(
          "add",
          effectiveImdbID,
          movie?.Title || "Unknown",
        );
      } else {
        showToast("Movie not loaded yet", "info");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast("Failed to update favorites", "error");
    }
  }, [
    candidateIds,
    movie,
    effectiveImdbID,
    showToast,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
  ]);

  const syncWatchlistState = useCallback(
    (lists) => {
      setWatchlists(lists);

      const movieWatchlists = [];
      for (const name of Object.keys(lists || {})) {
        const movies = Array.isArray(lists[name]) ? lists[name] : [];
        if (movies.some((m) => candidateIds.includes(m.imdbID))) {
          movieWatchlists.push(name);
        }
      }

      setMovieInWatchlists(movieWatchlists);
      setInWatchlist(movieWatchlists.length > 0);
    },
    [candidateIds],
  );

  const checkInAnyWatchlist = useCallback(async () => {
    try {
      const lists = await getWatchlists();
      syncWatchlistState(lists);
    } catch (error) {
      console.error("Error checking watchlist status:", error);
    }
  }, [syncWatchlistState]);

  const handleWatchlistButton = useCallback(async () => {
    if (toast.visible) return;

    try {
      // Always refresh current membership before deciding what to do.
      await checkInAnyWatchlist();

      // If the movie is in exactly one watchlist, treat the button as a toggle.
      if (inWatchlist && movieInWatchlists.length === 1) {
        const name = movieInWatchlists[0];

        // OPTIMISTIC UPDATE: Update UI immediately
        setInWatchlist(false);
        setMovieInWatchlists([]);

        await removeFromWatchlist(name, effectiveImdbID);

        setWatchlists((prev) => {
          const next = { ...(prev || {}) };
          const list = Array.isArray(next[name]) ? next[name] : [];
          next[name] = list.filter((m) => m.imdbID !== effectiveImdbID);
          // keep derived state in sync
          setTimeout(() => syncWatchlistState(next), 0);
          return next;
        });

        showToast(`Removed from '${name}'`, "info");
        // Track watchlist removal
        analyticsService.trackWatchlistAction(
          "remove",
          effectiveImdbID,
          movie?.Title || "Unknown",
        );
        return;
      }

      setShowWatchlistModal(true);
    } catch (error) {
      console.error("Error opening watchlist:", error);
      showToast("Failed to load watchlists", "error");
      // Revert optimistic update on error
      checkInAnyWatchlist();
    }
  }, [
    toast.visible,
    checkInAnyWatchlist,
    inWatchlist,
    movieInWatchlists,
    effectiveImdbID,
    syncWatchlistState,
    showToast,
    movie?.Title,
  ]);

  const handleSelectWatchlist = useCallback(
    async (name) => {
      // Prevent multiple clicks on the same watchlist
      if (processingWatchlist === name) return;

      try {
        setProcessingWatchlist(name);

        const alreadyIn = await isInWatchlist(name, effectiveImdbID);

        // OPTIMISTIC UPDATE: Update UI immediately
        setMovieInWatchlists((prev) =>
          alreadyIn ? prev.filter((wl) => wl !== name) : [...prev, name],
        );

        setInWatchlist((prev) => {
          if (alreadyIn) {
            return movieInWatchlists.length > 1;
          } else {
            return true;
          }
        });

        // Perform actual operation
        if (alreadyIn) {
          await removeFromWatchlist(name, effectiveImdbID);
          showToast(`Removed from '${name}'`, "info");
          // Track watchlist removal
          analyticsService.trackWatchlistAction(
            "remove",
            effectiveImdbID,
            movie?.Title || "Unknown",
          );
        } else {
          const movieToStore = movie
            ? { ...movie, imdbID: effectiveImdbID }
            : { imdbID: effectiveImdbID };
          await addToWatchlist(name, movieToStore);
          showToast(`Added to '${name}'!`, "success");
          // Track watchlist add
          analyticsService.trackWatchlistAction(
            "add",
            effectiveImdbID,
            movie?.Title || "Unknown",
          );
        }

        // Update local watchlists state
        setWatchlists((prev) => {
          const next = { ...(prev || {}) };
          const list = Array.isArray(next[name]) ? next[name] : [];
          if (alreadyIn) {
            next[name] = list.filter((m) => m.imdbID !== effectiveImdbID);
          } else {
            const movieToStore = movie
              ? { ...movie, imdbID: effectiveImdbID, watched: false }
              : { imdbID: effectiveImdbID, watched: false };
            next[name] = [
              ...list.filter((m) => m.imdbID !== effectiveImdbID),
              movieToStore,
            ];
          }
          setTimeout(() => syncWatchlistState(next), 0);
          return next;
        });

        // Recheck watchlist status
        checkInAnyWatchlist();
      } catch (error) {
        console.error("Error handling watchlist:", error);
        showToast("Failed to update watchlist", "error");

        // REVERT OPTIMISTIC UPDATE on error
        checkInAnyWatchlist();
      } finally {
        setProcessingWatchlist(null);
      }
    },
    [
      effectiveImdbID,
      movie,
      showToast,
      checkInAnyWatchlist,
      syncWatchlistState,
      processingWatchlist,
      movieInWatchlists,
    ],
  );

  const handleWatchTrailer = useCallback(() => {
    if (!videoId && movie?.Title && tmdbInfo) {
      fetchTrailer(movie.Title, tmdbInfo.id, tmdbInfo.type);
    }
    setIsPlaying(true);
  }, [videoId, movie?.Title, tmdbInfo, fetchTrailer]);

  // Fetch season-specific trailer
  const fetchSeasonTrailer = useCallback(
    async (seasonNumber) => {
      if (!tmdbInfo || tmdbInfo.type !== "tv") {
        showToast("Season trailers only available for TV series", "info");
        return;
      }

      setLoadingSeasonTrailers((prev) => ({ ...prev, [seasonNumber]: true }));

      try {
        const videosData = await getSeasonVideos(tmdbInfo.id, seasonNumber);
        const youtubeKey = extractYouTubeTrailer(videosData);

        if (youtubeKey) {
          setSeasonTrailers((prev) => ({
            ...prev,
            [seasonNumber]: youtubeKey,
          }));
          setPlayingSeasonTrailer(seasonNumber);
        } else {
          showToast(`No trailer found for Season ${seasonNumber}`, "info");
        }
      } catch (err) {
        console.error(`Error fetching season ${seasonNumber} trailer:`, err);
        showToast("Failed to load season trailer", "error");
      } finally {
        setLoadingSeasonTrailers((prev) => ({
          ...prev,
          [seasonNumber]: false,
        }));
      }
    },
    [tmdbInfo, showToast],
  );

  // Handle season trailer button press
  const handleSeasonTrailerPress = useCallback(
    (seasonNumber) => {
      if (playingSeasonTrailer === seasonNumber) {
        // If already playing, stop it
        setPlayingSeasonTrailer(null);
      } else if (seasonTrailers[seasonNumber]) {
        // If trailer is cached, just play it
        setPlayingSeasonTrailer(seasonNumber);
      } else {
        // Fetch and play the trailer
        fetchSeasonTrailer(seasonNumber);
      }
    },
    [playingSeasonTrailer, seasonTrailers, fetchSeasonTrailer],
  );

  const handleTrailerStateChange = useCallback((event) => {
    if (event === "ended") setIsPlaying(false);
  }, []);

  const handleTrailerError = useCallback(() => {
    setTrailerError("Error playing trailer. Please try again.");
    showToast("Error playing trailer", "error");
  }, [showToast]);

  // Toggle watched status for an episode
  const toggleEpisodeWatched = useCallback(
    async (season, episodeNumber) => {
      const episodeKey = `s${season}e${episodeNumber}`;
      const isCurrentlyWatched = !!watchedEpisodes[episodeKey];

      try {
        // Optimistic update
        setWatchedEpisodes((prev) => {
          const updated = { ...prev };
          if (isCurrentlyWatched) {
            delete updated[episodeKey];
          } else {
            updated[episodeKey] = {
              watchedAt: new Date().toISOString(),
              season,
              episode: episodeNumber,
            };
          }
          return updated;
        });

        // Persist to Firestore
        await markEpisodeWatched(
          imdbID,
          season,
          episodeNumber,
          !isCurrentlyWatched,
        );

        // Show feedback
        showToast(
          isCurrentlyWatched ? "Marked as unwatched" : "Marked as watched",
          "success",
        );
      } catch (error) {
        console.error("Failed to update watch status:", error);
        // Revert optimistic update
        setWatchedEpisodes((prev) => {
          const reverted = { ...prev };
          if (isCurrentlyWatched) {
            reverted[episodeKey] = {
              watchedAt: new Date().toISOString(),
              season,
              episode: episodeNumber,
            };
          } else {
            delete reverted[episodeKey];
          }
          return reverted;
        });
        showToast("Failed to update watch status", "error");
      }
    },
    [imdbID, watchedEpisodes, showToast],
  );

  const toggleSeason = useCallback(
    async (seasonNumber) => {
      // Toggle expansion state
      setExpandedSeasons((prev) => ({
        ...prev,
        [seasonNumber]: !prev[seasonNumber],
      }));

      // Only fetch if expanding AND not already loaded
      const isExpanding = !expandedSeasons[seasonNumber];
      const alreadyLoaded = seriesDetails?.seasons?.find(
        (s) => s.seasonNumber === seasonNumber,
      );

      if (isExpanding && !alreadyLoaded) {
        setLoadingEpisodes((prev) => ({ ...prev, [seasonNumber]: true }));

        try {
          const seasonData = await fetchSeasonDetails(imdbID, seasonNumber);

          if (seasonData) {
            setSeriesDetails((prev) => ({
              ...prev,
              seasons: [...(prev?.seasons || []), seasonData].sort(
                (a, b) => a.seasonNumber - b.seasonNumber,
              ),
            }));
          }
        } catch (error) {
          console.error(`Error loading season ${seasonNumber}:`, error);
          showToast("Failed to load season details", "error");
        } finally {
          setLoadingEpisodes((prev) => {
            const next = { ...prev };
            delete next[seasonNumber];
            return next;
          });
        }
      }
    },
    [expandedSeasons, seriesDetails, imdbID, fetchSeasonDetails, showToast],
  );

  const handleModalClose = useCallback(() => {
    setShowWatchlistModal(false);
    setTimeout(checkInAnyWatchlist, 200);
  }, [checkInAnyWatchlist]);

  // Load watched episodes for series
  useEffect(() => {
    const loadWatchedEpisodes = async () => {
      if (movie?.Type === "series" && imdbID) {
        try {
          const watched = await getWatchedEpisodes(imdbID);
          setWatchedEpisodes(watched);
        } catch (error) {
          console.error("Failed to load watched episodes:", error);
        }
      }
    };

    loadWatchedEpisodes();
  }, [movie?.Type, imdbID]);

  // Animation effect
  useEffect(() => {
    if (Object.values(loadingEpisodes).some((isLoading) => isLoading)) {
      loadingOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      loadingOpacity.value = withTiming(1);
    }
  }, [loadingEpisodes, loadingOpacity]);

  // Load user subscriptions
  useEffect(() => {
    const loadSubscriptions = async () => {
      try {
        const subs = await getUserSubscriptions();
        setUserSubscriptions(subs);
      } catch (error) {
        console.error("Failed to load user subscriptions:", error);
      }
    };

    loadSubscriptions();
  }, []);

  // Load watch providers when movie details are available
  useEffect(() => {
    const loadWatchProviders = async () => {
      if (!effectiveImdbID) {
        console.log("⚠️ No effectiveImdbID, skipping watch providers");
        return;
      }

      console.log("🎬 Loading watch providers for:", effectiveImdbID);
      setLoadingWatchProviders(true);
      try {
        const providersData = await getWatchProviders(effectiveImdbID);
        console.log("📊 Providers data received:", providersData);
        const formatted = formatWatchProviders(providersData, "US");
        console.log("✅ Formatted providers:", formatted);
        setWatchProviders(formatted);
      } catch (error) {
        console.error("❌ Failed to load watch providers:", error);
        setWatchProviders(null);
      } finally {
        setLoadingWatchProviders(false);
      }
    };

    if (movie) {
      console.log("🎥 Movie loaded, fetching watch providers...");
      loadWatchProviders();
    }
  }, [effectiveImdbID, movie]);

  // Load reviews when TMDB info is available
  useEffect(() => {
    const loadReviews = async () => {
      if (!tmdbInfo) {
        console.log("⚠️ No TMDB info, skipping reviews");
        return;
      }

      console.log(`📝 Loading reviews for ${tmdbInfo.type} ${tmdbInfo.id}`);
      setLoadingReviews(true);
      setReviews([]);
      setReviewsPage(1);

      try {
        const reviewsData =
          tmdbInfo.type === "movie"
            ? await getMovieReviews(tmdbInfo.id, 1)
            : await getTVReviews(tmdbInfo.id, 1);

        console.log("✅ Reviews fetched:", reviewsData?.results?.length || 0);
        setReviews(reviewsData.results || []);
        setTotalReviews(reviewsData.total_results || 0);
      } catch (error) {
        console.error("❌ Failed to load reviews:", error);
        setReviews([]);
        setTotalReviews(0);
      } finally {
        setLoadingReviews(false);
      }
    };

    if (movie && tmdbInfo) {
      console.log("🎥 Movie loaded, fetching reviews...");
      loadReviews();
    }
  }, [tmdbInfo, movie]);

  // Load more reviews handler
  const handleLoadMoreReviews = useCallback(async () => {
    if (!tmdbInfo || loadingReviews) return;

    const nextPage = reviewsPage + 1;
    console.log(`📝 Loading more reviews, page ${nextPage}`);
    setLoadingReviews(true);

    try {
      const reviewsData =
        tmdbInfo.type === "movie"
          ? await getMovieReviews(tmdbInfo.id, nextPage)
          : await getTVReviews(tmdbInfo.id, nextPage);

      setReviews((prev) => [...prev, ...(reviewsData.results || [])]);
      setReviewsPage(nextPage);
      console.log("✅ More reviews loaded:", reviewsData?.results?.length || 0);
    } catch (error) {
      console.error("❌ Failed to load more reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  }, [tmdbInfo, reviewsPage, loadingReviews]);

  // Initial data fetch
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await getMovieDetails(imdbID);
        setMovie(data);

        // Track content view
        const contentType = data.Type === "series" ? "tv" : "movie";
        analyticsService.trackContentView(contentType, imdbID, data.Title);

        // Favorite status is now instant from context - no async call needed

        // For series, initialize with empty seasons - we'll lazy load on expansion
        if (data.Type === "series" && data.totalSeasons) {
          setSeriesDetails({
            seasons: [],
            totalSeasons: parseInt(data.totalSeasons),
            initialized: true,
          });
        }

        checkInAnyWatchlist();
      } catch (error) {
        console.error("Failed to load movie details:", error);
        setMovie(null);
        showToast("Failed to load movie details", "error");
      }
    };

    fetchDetails();
  }, [imdbID, checkInAnyWatchlist, showToast]);

  // Memoized render functions (removed unused renderLoadingState)

  if (!movie) {
    return (
      <SafeAreaView
        style={[
          styles.detailsLoadingContainer,
          { backgroundColor: colors.background },
        ]}
        edges={["top"]}
      >
        <ActivityIndicator size="large" color={colors.text} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme === "dark" ? "#0a0a0a" : "#f8f9fa" },
      ]}
      edges={["top"]}
    >
      <StatusBar
        style={theme === "dark" ? "light" : "dark"}
        translucent={false}
        backgroundColor={theme === "dark" ? "#0a0a0a" : "#f8f9fa"}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!showWatchlistModal}
      >
        <Header onBack={handleBack} colors={colors} />

        <HeroSection movie={movie} colors={colors} />

        {/* Movie/Series Details Card */}
        <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              {movie.Title}
            </Text>
            <RatingBadge rating={movie.imdbRating} />
          </View>

          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: colors.text }]}>
                  Release Year
                </Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>
                  {movie.Year}
                </Text>
              </View>

              {movie.Type !== "series" &&
                movie.Runtime &&
                movie.Runtime !== "N/A" && (
                  <View style={styles.metaItem}>
                    <Text style={[styles.metaLabel, { color: colors.text }]}>
                      Runtime
                    </Text>
                    <Text style={[styles.metaValue, { color: colors.text }]}>
                      {movie.Runtime}
                    </Text>
                  </View>
                )}

              {movie.Type === "series" && (
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: colors.text }]}>
                    Seasons
                  </Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {seriesDetails && !seriesDetails.fallback
                      ? `${seriesDetails.totalSeasons || movie.totalSeasons || "N/A"}`
                      : `${movie.totalSeasons || "N/A"}`}
                  </Text>
                </View>
              )}
            </View>

            <GenreTags genres={movie.Genre} colors={colors} theme={theme} />
          </View>

          {movie.Plot && movie.Plot !== "N/A" && (
            <Text style={[styles.plot, { color: colors.text }]}>
              {movie.Plot}
            </Text>
          )}

          {movie.Actors && movie.Actors !== "N/A" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Cast
              </Text>
              <Text style={[styles.cast, { color: colors.text }]}>
                {movie.Actors}
              </Text>
            </View>
          )}

          {movie.Director && movie.Director !== "N/A" && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Director
              </Text>
              <Text style={[styles.director, { color: colors.text }]}>
                {movie.Director}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons in Details Card */}
        <View
          style={[
            styles.detailsCard,
            { backgroundColor: colors.card, marginTop: 0, paddingTop: 0 },
          ]}
        >
          <ActionButtons
            favorite={favorite}
            inWatchlist={inWatchlist}
            onFavoritePress={toggleFavorite}
            onWatchlistPress={handleWatchlistButton}
            colors={colors}
            theme={theme}
          />
        </View>

        {/* Where to Watch Section */}
        <WatchProvidersSection
          providers={watchProviders}
          userSubscriptions={userSubscriptions}
          loading={loadingWatchProviders}
          colors={colors}
          theme={theme}
        />

        {/* Series Seasons Section */}
        {movie?.Type === "series" && seriesDetails?.initialized && (
          <View
            style={[styles.seriesSection, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Episodes
            </Text>
            {/* Render season placeholders for lazy loading */}
            {Array.from(
              { length: seriesDetails.totalSeasons },
              (_, i) => i + 1,
            ).map((seasonNum) => {
              const loadedSeason = seriesDetails.seasons.find(
                (s) => s.seasonNumber === seasonNum,
              );

              return (
                <Season
                  key={seasonNum}
                  season={
                    loadedSeason || {
                      seasonNumber: seasonNum,
                      episodeCount: 0,
                      episodes: [],
                    }
                  }
                  isExpanded={expandedSeasons[seasonNum]}
                  isLoading={loadingEpisodes[seasonNum]}
                  onToggle={() => toggleSeason(seasonNum)}
                  imdbID={imdbID}
                  watchedEpisodes={watchedEpisodes}
                  onToggleWatch={toggleEpisodeWatched}
                  colors={colors}
                  theme={theme}
                  trailerVideoId={seasonTrailers[seasonNum]}
                  isTrailerLoading={loadingSeasonTrailers[seasonNum]}
                  isTrailerPlaying={playingSeasonTrailer === seasonNum}
                  onTrailerPress={
                    tmdbInfo?.type === "tv"
                      ? () => handleSeasonTrailerPress(seasonNum)
                      : null
                  }
                />
              );
            })}
          </View>
        )}

        <TrailerSection
          isTrailerLoading={isTrailerLoading}
          trailerError={trailerError}
          videoId={videoId}
          isPlaying={isPlaying}
          onWatchTrailer={handleWatchTrailer}
          onRetry={handleWatchTrailer}
          colors={colors}
          onStateChange={handleTrailerStateChange}
          onError={handleTrailerError}
        />

        <ReviewsSection
          reviews={reviews}
          loading={loadingReviews}
          colors={colors}
          theme={theme}
          totalReviews={totalReviews}
          onLoadMore={
            reviews.length < totalReviews ? handleLoadMoreReviews : null
          }
        />
      </ScrollView>

      <WatchlistModal
        visible={showWatchlistModal}
        watchlists={watchlists}
        movieInWatchlists={movieInWatchlists}
        onSelectWatchlist={handleSelectWatchlist}
        onClose={handleModalClose}
        colors={colors}
        theme={theme}
        processingWatchlist={processingWatchlist}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Toast Styles
  toastContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
    maxWidth: screenWidth - 40,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  heroSection: {
    position: "relative",
    height: screenHeight * 0.55,
  },
  posterContainer: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  heroPoster: {
    width: "100%",
    height: "100%",
    contentFit: "cover",
  },
  posterGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 16,
    marginTop: 10,
    opacity: 0.7,
  },
  ratingBadge: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    alignSelf: "flex-start",
  },
  ratingText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  detailsCard: {
    marginHorizontal: 20,
    marginTop: -40, // Overlap with poster
    padding: 28,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
    letterSpacing: -0.8,
    flex: 1,
    paddingRight: 16,
  },
  metaContainer: {
    marginBottom: 24,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  metaItem: {
    alignItems: "center",
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 6,
    fontWeight: "500",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaValue: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  genreSection: {
    marginTop: 16,
  },
  genreLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    opacity: 0.8,
  },
  genreTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    fontSize: 13,
    fontWeight: "500",
  },
  plot: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.7,
    fontStyle: "italic",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  cast: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.7,
  },
  director: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.7,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 8,
  },
  actionButtonActive: {
    backgroundColor: "rgba(126, 87, 194, 0.15)",
    borderColor: "rgba(126, 87, 194, 0.4)",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  seriesSection: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 28,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  seasonContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  seasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderRadius: 12,
  },
  seasonHeaderContent: {
    flex: 1,
  },
  seasonTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  seasonTitle: {
    fontSize: 17,
    fontWeight: "bold",
  },
  seasonInfo: {
    fontSize: 13,
    marginTop: 2,
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  episodesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  seasonTrailerSection: {
    marginBottom: 12,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  seasonTrailerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  seasonTrailerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  seasonVideoWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  episodeItem: {
    marginVertical: 6,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 12,
  },
  episodeContent: {
    flex: 1,
  },
  episodeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  episodeNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(126, 87, 194, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  episodeNumber: {
    fontSize: 14,
    fontWeight: "bold",
  },
  episodeTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  episodeMetadata: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 4,
  },
  episodeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  episodeRuntime: {
    fontSize: 13,
    opacity: 0.7,
    fontWeight: "500",
  },
  episodeRating: {
    fontSize: 13,
    opacity: 0.8,
    fontWeight: "600",
  },
  watchButton: {
    marginLeft: "auto",
  },
  noEpisodesText: {
    textAlign: "center",
    fontSize: 14,
    opacity: 0.5,
    paddingVertical: 24,
  },
  trailerSection: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 28,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  trailerLoading: {
    height: (screenWidth - 88) * (9 / 16),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  trailerError: {
    height: (screenWidth - 88) * (9 / 16),
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    borderRadius: 12,
  },
  errorIcon: {
    marginBottom: 12,
  },
  trailerPlaceholder: {
    height: (screenWidth - 88) * (9 / 16),
    borderRadius: 12,
    overflow: "hidden",
  },
  trailerGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  trailerText: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 24,
    padding: 28,
    width: "85%",
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  modalItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  inWatchlistBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inWatchlistText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalEmptyText: {
    textAlign: "center",
    fontSize: 16,
    opacity: 0.7,
    padding: 20,
  },
  modalCancelButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  videoWrapper: {
    marginTop: 16,
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: 12,
  },
  webTrailerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  webTrailerButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  webTrailerNote: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    opacity: 0.7,
    fontStyle: "italic",
  },
  detailsLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});

export default DetailsScreen;
