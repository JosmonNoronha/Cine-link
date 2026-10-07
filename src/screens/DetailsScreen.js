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
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import { useCustomTheme } from "../contexts/ThemeContext";
import { useFavorites } from "../contexts/FavoritesContext";
import analyticsService from "../services/analytics";
import Constants from "expo-constants";
import {
  getMovieDetails,
  getSeasonDetails,
  getMovieVideos,
  getMovieImages,
  getCredits,
  getTVVideos,
  getTVImages,
  getSeasonVideos,
  extractYouTubeTrailer,
  getWatchProviders,
  getUserSubscriptions,
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
  withSpring,
  useAnimatedStyle,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import WatchProvidersSection from "../components/details/WatchProvidersSection";
import ReviewsSection from "../components/details/ReviewsSection";
import ImageGallery from "../components/details/ImageGallery";
import { StatusBar } from "expo-status-bar";
import logger from "../services/logger";
import useReviews from "../hooks/useReviews";
import useCollection from "../hooks/useCollection";
import TimelineSection from "../components/details/TimelineSection";
import { buildTmdbImageUrl } from "../utils/imageHelper";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const YOUTUBE_API_KEY =
  process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ||
  Constants?.expoConfig?.extra?.YOUTUBE_API_KEY;

// Fixed height for every episode row — required for getItemLayout to work
// without measuring. Change this if you change episodeItem padding/font.
const EPISODE_ITEM_HEIGHT = 88;
// How many episodes to render in the first batch inside a season FlatList
const EPISODE_INITIAL_BATCH = 20;

// ─── Toast ────────────────────────────────────────────────────────────────────

const Toast = React.memo(({ visible, message, type, onHide }) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    opacity.value = withTiming(1, { duration: 300 });
    const t1 = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 });
    }, 2500);
    const t2 = setTimeout(onHide, 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visible, onHide, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

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

  // Plain View owns pointerEvents — Reanimated's Animated.View
  // does not reliably respect the pointerEvents prop on Android
  return (
    <View
      style={styles.toastWrapper}
      pointerEvents={visible ? "box-none" : "none"}
    >
      <Animated.View style={animatedStyle}>
        <View style={[styles.toast, { backgroundColor: config.color }]}>
          <Ionicons name={config.icon} size={18} color="#fff" />
          <Text style={styles.toastText}>{message}</Text>
        </View>
      </Animated.View>
    </View>
  );
});
Toast.displayName = "Toast";

// ─── Header ───────────────────────────────────────────────────────────────────

const Header = React.memo(({ onBack, theme }) => {
  const isDark = theme === "dark";
  const pressScale = useSharedValue(1);

  const accent = isDark ? "#74b7ff" : "#2f6bff";
  const barBg = isDark ? "rgba(18,18,22,0.86)" : "rgba(216,224,238,0.86)";
  const barBorder = isDark ? "rgba(255,255,255,0.15)" : "rgba(37,56,94,0.28)";
  const topSheen = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.54)";

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.88, { damping: 14, stiffness: 380 });
  }, [pressScale]);
  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, {
      damping: 11,
      stiffness: 260,
      mass: 0.65,
    });
  }, [pressScale]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <View style={styles.headerContainer} pointerEvents="box-none">
      <Animated.View style={[styles.headerButton, wrapStyle]}>
        <TouchableOpacity
          onPress={onBack}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          style={[
            styles.backButton,
            {
              backgroundColor: barBg,
              borderColor: barBorder,
              shadowColor: isDark ? "#000" : "#162035",
            },
          ]}
        >
          <View
            style={[styles.backButtonSheen, { backgroundColor: topSheen }]}
          />
          <Ionicons name="arrow-back" size={22} color={accent} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});
Header.displayName = "Header";

// ─── HeroSection ─────────────────────────────────────────────────────────────

const HeroSection = React.memo(({ movie, colors }) => (
  <View style={styles.heroSection} pointerEvents="none">
    {typeof movie?.Poster === "string" &&
    movie.Poster &&
    movie.Poster !== "N/A" ? (
      <View style={styles.posterContainer} pointerEvents="none">
        <Image
          source={{ uri: movie.Poster }}
          style={styles.heroPoster}
          contentFit="cover"
        />
        <LinearGradient
          colors={[
            "transparent",
            colors.background + "66",
            colors.background,
          ]}
          locations={[0, 0.58, 1]}
          style={styles.posterGradient}
          pointerEvents="none"
        />
      </View>
    ) : (
      <View
        style={[styles.heroPlaceholder, { backgroundColor: colors.card }]}
        pointerEvents="none"
      >
        <Ionicons name="film-outline" size={80} color={colors.text} />
        <Text style={[styles.placeholderText, { color: colors.text }]}>
          No Poster Available
        </Text>
      </View>
    )}
  </View>
));
HeroSection.displayName = "HeroSection";

// ─── RatingBadge ─────────────────────────────────────────────────────────────

const RatingBadge = React.memo(({ rating }) => {
  if (!rating || rating === "N/A") return null;
  return (
    <View style={styles.ratingBadge}>
      <Text style={styles.ratingText}>★ {rating}/10</Text>
    </View>
  );
});
RatingBadge.displayName = "RatingBadge";

// ─── GenreTags ────────────────────────────────────────────────────────────────

const GenreTags = React.memo(({ genres, colors, theme }) => {
  const genreList = useMemo(() => {
    if (!genres || typeof genres !== "string" || genres === "N/A") return [];
    return genres
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);
  }, [genres]);

  if (genreList.length === 0) return null;

  const tagBg =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <View style={styles.genreSection}>
      <Text style={[styles.genreLabel, { color: colors.text }]}>Genres</Text>
      <View style={styles.genreTags}>
        {genreList.map((genre, index) => (
          <View
            key={index}
            style={[styles.genreTag, { backgroundColor: tagBg }]}
          >
            <Text style={[styles.genreText, { color: colors.text }]}>
              {genre}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});
GenreTags.displayName = "GenreTags";

// ── MetaChip ─────────────────────────────────────────────────────────────────
const MetaChip = React.memo(({ icon, text, colors, theme }) => {
  if (!text || text === "N/A") return null;
  return (
    <View
      style={[
        chipStyles.chip,
        {
          backgroundColor:
            theme === "dark"
              ? "rgba(255,255,255,0.10)"
              : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <Ionicons name={icon} size={12} color={colors.primary} />
      <Text style={[chipStyles.text, { color: colors.text }]}>{text}</Text>
    </View>
  );
});
MetaChip.displayName = "MetaChip";

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  text: { fontSize: 12, fontWeight: "600", opacity: 0.9 },
});

// ── CastCard ──────────────────────────────────────────────────────────────────
const CAST_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#14b8a6",
];
const castColor = (name) => {
  const n = (name || "")
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  return CAST_COLORS[n % CAST_COLORS.length];
};
const initials = (name) =>
  (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

const CastCard = React.memo(({ name, character, profilePath, profileUrl, colors }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUri =
    profileUrl ||
    (profilePath ? buildTmdbImageUrl(profilePath, "card") : null);
  const showImage = Boolean(imageUri) && !imageFailed;

  return (
    <View style={castCardStyles.card}>
      <View
        style={[castCardStyles.avatar, { backgroundColor: castColor(name) }]}
      >
        {showImage ? (
          <Image
            source={{ uri: imageUri }}
            style={castCardStyles.avatarImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Text style={castCardStyles.initials}>{initials(name)}</Text>
        )}
      </View>
      <Text
        style={[castCardStyles.name, { color: colors.text }]}
        numberOfLines={2}
      >
        {name}
      </Text>
      {character ? (
        <Text
          style={[castCardStyles.character, { color: colors.text }]}
          numberOfLines={1}
        >
          {character}
        </Text>
      ) : null}
    </View>
  );
});
CastCard.displayName = "CastCard";

const castCardStyles = StyleSheet.create({
  card: { width: 72, alignItems: "center", gap: 8 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  initials: { color: "#fff", fontSize: 18, fontWeight: "800" },
  name: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    opacity: 0.85,
    lineHeight: 15,
  },
  character: {
    fontSize: 10,
    textAlign: "center",
    opacity: 0.5,
    lineHeight: 13,
  },
});

// ── InfoRow ───────────────────────────────────────────────────────────────────
const InfoRow = React.memo(({ icon, label, value, colors, theme }) => {
  if (!value || value === "N/A") return null;
  return (
    <View
      style={[
        infoStyles.row,
        {
          borderBottomColor:
            theme === "dark"
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      <View
        style={[
          infoStyles.iconWrap,
          { backgroundColor: colors.primary + "18" },
        ]}
      >
        <Ionicons name={icon} size={15} color={colors.primary} />
      </View>
      <View style={infoStyles.content}>
        <Text style={[infoStyles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[infoStyles.value, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
});
InfoRow.displayName = "InfoRow";

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.45,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  value: { fontSize: 14, fontWeight: "600", marginTop: 2, lineHeight: 19 },
});

// ─── ActionButtons ────────────────────────────────────────────────────────────

const ActionButtons = React.memo(
  ({
    favorite,
    inWatchlist,
    onFavoritePress,
    onWatchlistPress,
    colors,
    theme,
  }) => {
    const btnBg =
      theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
    return (
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            favorite && styles.actionButtonActive,
            { backgroundColor: btnBg },
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
            { backgroundColor: btnBg },
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
    );
  },
);
ActionButtons.displayName = "ActionButtons";

// ─── EpisodeItem ──────────────────────────────────────────────────────────────
// Fixed height = EPISODE_ITEM_HEIGHT. If you change padding/font here,
// update that constant too so getItemLayout stays accurate.

const EpisodeItem = React.memo(
  ({ episode, season, isWatched, onToggleWatch, colors, theme }) => (
    <TouchableOpacity
      style={[
        styles.episodeItem,
        {
          backgroundColor: isWatched
            ? theme === "dark"
              ? "rgba(76,175,80,0.15)"
              : "rgba(76,175,80,0.1)"
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
          {episode.runtime && episode.runtime !== "N/A" && (
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
          )}
          {episode.rating && episode.rating !== "N/A" && (
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
  (prev, next) =>
    // Custom comparator — only re-render if watch state, episode data, or theme changes
    prev.isWatched === next.isWatched &&
    prev.episode.episodeNumber === next.episode.episodeNumber &&
    prev.episode.title === next.episode.title &&
    prev.theme === next.theme,
);
EpisodeItem.displayName = "EpisodeItem";

// ─── Season ───────────────────────────────────────────────────────────────────

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
    const isLoaded = season.episodes && season.episodes.length > 0;

    // Memoized so filtering 4000 episodes doesn't run on every parent re-render
    const { watchedCount, totalEpisodes, progress } = useMemo(() => {
      const total = season.episodeCount || season.episodes?.length || 0;
      if (!isLoaded)
        return { watchedCount: 0, totalEpisodes: total, progress: 0 };
      const count = season.episodes.filter(
        (ep) => watchedEpisodes[`s${season.seasonNumber}e${ep.episodeNumber}`],
      ).length;
      return {
        watchedCount: count,
        totalEpisodes: total,
        progress: total > 0 ? (count / total) * 100 : 0,
      };
    }, [
      isLoaded,
      season.episodes,
      season.episodeCount,
      season.seasonNumber,
      watchedEpisodes,
    ]);

    // Stable renderItem — useCallback so FlatList doesn't re-render all rows
    // when only one episode's watch state changes (only that row re-renders
    // because of EpisodeItem's custom comparator above).
    const renderEpisode = useCallback(
      ({ item: episode }) => (
        <EpisodeItem
          key={`${season.seasonNumber}-${episode.episodeNumber}`}
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
      ),
      [
        season.seasonNumber,
        watchedEpisodes,
        onToggleWatch,
        colors,
        theme,
        imdbID,
      ],
    );

    // Fixed-height layout so FlatList never has to measure any item
    const getItemLayout = useCallback(
      (_, index) => ({
        length: EPISODE_ITEM_HEIGHT,
        offset: EPISODE_ITEM_HEIGHT * index,
        index,
      }),
      [],
    );

    const episodeKeyExtractor = useCallback(
      (ep, idx) => `${season.seasonNumber}-${ep.episodeNumber ?? idx}`,
      [season.seasonNumber],
    );

    const isDark = theme === "dark";

    return (
      <View style={styles.seasonContainer}>
        {/* Season header row */}
        <TouchableOpacity
          style={[
            styles.seasonHeader,
            {
              backgroundColor: isDark
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

            {progress > 0 && isLoaded && (
              <View
                style={[
                  styles.progressBarContainer,
                  {
                    backgroundColor: isDark
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

        {/* Expanded content */}
        {isExpanded && (
          <View style={styles.episodesContainer}>
            {/* Season trailer */}
            {onTrailerPress && (
              <View
                style={[
                  styles.seasonTrailerSection,
                  {
                    backgroundColor: isDark
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

            {/* Episode list */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Loading Episodes…
                </Text>
              </View>
            ) : isLoaded ? (
              <FlatList
                data={season.episodes}
                renderItem={renderEpisode}
                keyExtractor={episodeKeyExtractor}
                getItemLayout={getItemLayout}
                // Critical: this FlatList is nested inside a ScrollView.
                // scrollEnabled=false hands scroll control back to the parent.
                scrollEnabled={false}
                // Render only enough to fill the screen on first paint.
                initialNumToRender={EPISODE_INITIAL_BATCH}
                // Keep a small window — beyond this, rows are unmounted to free memory.
                windowSize={5}
                maxToRenderPerBatch={30}
                updateCellsBatchingPeriod={50}
                removeClippedSubviews={Platform.OS === "android"}
                // No separator needed — episodeItem already has marginVertical
              />
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

// ─── TrailerSection ───────────────────────────────────────────────────────────

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
            Loading trailer…
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

// ─── WatchlistModal ───────────────────────────────────────────────────────────

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
                    ? "rgba(126,87,194,0.2)"
                    : "rgba(126,87,194,0.1)"
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

    if (!visible) return null;

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

// ─── DetailsScreen ────────────────────────────────────────────────────────────

const DetailsScreen = ({ route, navigation }) => {
  const { imdbID } = route.params;
  const [movie, setMovie] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [isTrailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seasonTrailers, setSeasonTrailers] = useState({});
  const [loadingSeasonTrailers, setLoadingSeasonTrailers] = useState({});
  const [playingSeasonTrailer, setPlayingSeasonTrailer] = useState(null);
  const [seriesDetails, setSeriesDetails] = useState(null);
  const [expandedSeasons, setExpandedSeasons] = useState({});
  const [loadingEpisodes, setLoadingEpisodes] = useState({});
  const [watchedEpisodes, setWatchedEpisodes] = useState({});
  const [watchlists, setWatchlists] = useState({});
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [movieInWatchlists, setMovieInWatchlists] = useState([]);
  const [processingWatchlist, setProcessingWatchlist] = useState(null);
  const [watchProviders, setWatchProviders] = useState(null);
  const [loadingWatchProviders, setLoadingWatchProviders] = useState(false);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [images, setImages] = useState({ backdrops: [], posters: [] });
  const [loadingImages, setLoadingImages] = useState(false);
  const [imagesError, setImagesError] = useState(null);
  const [cast, setCast] = useState([]);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info",
  });

  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const tabBarHeight = useTabBarHeight();
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();

  // ── ID derivation ──────────────────────────────────────────────────────────

  const effectiveImdbID = useMemo(() => {
    const ids = [imdbID, movie?.imdbID].filter(Boolean);
    const tmdbId = ids.find(
      (id) => typeof id === "string" && id.startsWith("tmdb:"),
    );
    return tmdbId || movie?.imdbID || imdbID;
  }, [imdbID, movie?.imdbID]);

  const tmdbInfo = useMemo(() => {
    if (!effectiveImdbID?.startsWith("tmdb:")) return null;
    const parts = effectiveImdbID.split(":");
    if (parts.length !== 3) return null;
    return { id: parts[2], type: parts[1] };
  }, [effectiveImdbID]);

  const candidateIds = useMemo(
    () => Array.from(new Set([imdbID, movie?.imdbID].filter(Boolean))),
    [imdbID, movie?.imdbID],
  );

  const favorite = useMemo(
    () => candidateIds.some((id) => isFavorite(id)),
    [candidateIds, isFavorite],
  );

  // ── Custom hooks ───────────────────────────────────────────────────────────

  const reviewsState = useReviews(tmdbInfo);
  const collectionState = useCollection(movie, tmdbInfo);

  // ── Toast helpers ──────────────────────────────────────────────────────────

  const showToast = useCallback((message, type = "info") => {
    setToast({ visible: true, message, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  // ── Batched secondary data fetch ───────────────────────────────────────────
  // Images, watch providers, and user subscriptions are all independent.
  // We kick them off in parallel after the main movie data lands,
  // rather than in three separate effects that each re-run on their own deps.

  const fetchSecondaryData = useCallback(
    async (movieData, tmdbInfoSnapshot, effectiveId) => {
      const tasks = [];

      // Images
      if (tmdbInfoSnapshot?.id && tmdbInfoSnapshot?.type) {
        tasks.push(
          getCredits(tmdbInfoSnapshot.type, tmdbInfoSnapshot.id)
            .then((data) => {
              setCast(Array.isArray(data?.cast) ? data.cast : []);
            })
            .catch((err) => {
              logger.error("Failed to load cast credits", err);
              setCast([]);
            }),
        );

        tasks.push(
          (tmdbInfoSnapshot.type === "tv"
            ? getTVImages(tmdbInfoSnapshot.id)
            : getMovieImages(tmdbInfoSnapshot.id)
          )
            .then((data) => {
              setImages({
                backdrops: data?.backdrops || data?.images?.backdrops || [],
                posters: data?.posters || data?.images?.posters || [],
              });
              setLoadingImages(false);
            })
            .catch((err) => {
              logger.error("Failed to load TMDB images", err);
              setImagesError("Failed to load images");
              setLoadingImages(false);
            }),
        );
        setLoadingImages(true);
      }

      // Watch providers
      if (effectiveId) {
        tasks.push(
          getWatchProviders(effectiveId)
            .then((data) => {
              setWatchProviders(formatWatchProviders(data, "US"));
            })
            .catch((err) => {
              logger.error("Failed to load watch providers", err);
              setWatchProviders(null);
            })
            .finally(() => setLoadingWatchProviders(false)),
        );
        setLoadingWatchProviders(true);
      }

      // User subscriptions
      tasks.push(
        getUserSubscriptions()
          .then(setUserSubscriptions)
          .catch(() => {}),
      );

      await Promise.allSettled(tasks);
    },
    [],
  );

  // ── Season cache (ref — not state, doesn't trigger renders) ───────────────

  const seasonCacheRef = useRef(new Map());

  const fetchSeasonDetails = useCallback(async (id, seasonNumber) => {
    const cacheKey = `${id}:${seasonNumber}`;
    const cached = seasonCacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
      return cached.data;
    }
    const seasonData = await getSeasonDetails(id, seasonNumber);
    if (!seasonData?.Episodes?.length) return null;

    const airYear = seasonData.Episodes[0]?.Released
      ? new Date(seasonData.Episodes[0].Released).getFullYear()
      : "N/A";

    const episodes = seasonData.Episodes.map((ep) => ({
      title: ep.Title,
      episodeNumber: ep.Episode,
      runtime: ep.Runtime || "N/A",
      rating: ep.imdbRating || "N/A",
    }));

    const processed = {
      seasonNumber,
      episodeCount: episodes.length,
      airYear,
      episodes,
    };
    seasonCacheRef.current.set(cacheKey, {
      data: processed,
      timestamp: Date.now(),
    });
    return processed;
  }, []);

  // ── Initial data fetch ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const fetchDetails = async () => {
      try {
        const data = await getMovieDetails(imdbID);
        if (cancelled) return;

        setMovie(data);
        analyticsService.trackContentView(
          data.Type === "series" ? "tv" : "movie",
          imdbID,
          data.Title,
        );

        if (data.Type === "series" && data.totalSeasons) {
          setSeriesDetails({
            seasons: [],
            totalSeasons: parseInt(data.totalSeasons),
            initialized: true,
          });
        }

        // Kick off secondary data in parallel — don't await, let them trickle in
        const resolvedTmdb = (() => {
          const ids = [imdbID, data?.imdbID].filter(Boolean);
          const tmdbId = ids.find(
            (id) => typeof id === "string" && id.startsWith("tmdb:"),
          );
          const eff = tmdbId || data?.imdbID || imdbID;
          if (!eff?.startsWith("tmdb:")) return null;
          const parts = eff.split(":");
          return parts.length === 3 ? { id: parts[2], type: parts[1] } : null;
        })();

        fetchSecondaryData(data, resolvedTmdb, data?.imdbID || imdbID);

        // Watchlist check
        checkInAnyWatchlist();

        // Watched episodes for series
        if (data.Type === "series") {
          try {
            const watched = await getWatchedEpisodes(data.imdbID || imdbID);
            if (!cancelled) setWatchedEpisodes(watched);
          } catch (e) {
            logger.error("Failed to load watched episodes", e);
          }
        }
      } catch (error) {
        logger.error("Failed to load movie details", error);
        if (!cancelled) {
          setMovie(null);
          showToast("Failed to load movie details", "error");
        }
      }
    };

    fetchDetails();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imdbID]);

  // ── Loading animation — only runs when episodes are loading ───────────────

  const loadingOpacity = useSharedValue(1);

  useEffect(() => {
    const anyLoading = Object.values(loadingEpisodes).some(Boolean);
    if (anyLoading) {
      loadingOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(loadingOpacity);
      loadingOpacity.value = withTiming(1);
    }
  }, [loadingEpisodes, loadingOpacity]);

  // ── Watchlist helpers ──────────────────────────────────────────────────────

  const syncWatchlistState = useCallback(
    (lists) => {
      setWatchlists(lists);
      const inLists = Object.keys(lists || {}).filter((name) => {
        const movies = Array.isArray(lists[name]) ? lists[name] : [];
        return movies.some((m) => candidateIds.includes(m.imdbID));
      });
      setMovieInWatchlists(inLists);
      setInWatchlist(inLists.length > 0);
    },
    [candidateIds],
  );

  const checkInAnyWatchlist = useCallback(async () => {
    try {
      const lists = await getWatchlists();
      syncWatchlistState(lists);
    } catch (error) {
      logger.error("Error checking watchlist status", error);
    }
  }, [syncWatchlistState]);

  const handleWatchlistButton = useCallback(async () => {
    if (toast.visible) return;
    try {
      await checkInAnyWatchlist();
      if (inWatchlist && movieInWatchlists.length === 1) {
        const name = movieInWatchlists[0];
        setInWatchlist(false);
        setMovieInWatchlists([]);
        await removeFromWatchlist(name, effectiveImdbID);
        setWatchlists((prev) => {
          const next = { ...(prev || {}) };
          next[name] = (Array.isArray(next[name]) ? next[name] : []).filter(
            (m) => m.imdbID !== effectiveImdbID,
          );
          setTimeout(() => syncWatchlistState(next), 0);
          return next;
        });
        showToast(`Removed from '${name}'`, "info");
        analyticsService.trackWatchlistAction(
          "remove",
          effectiveImdbID,
          movie?.Title || "Unknown",
        );
        return;
      }
      setShowWatchlistModal(true);
    } catch (error) {
      logger.error("Error opening watchlist", error);
      showToast("Failed to load watchlists", "error");
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
      if (processingWatchlist === name) return;
      try {
        setProcessingWatchlist(name);
        const alreadyIn = await isInWatchlist(name, effectiveImdbID);
        setMovieInWatchlists((prev) =>
          alreadyIn ? prev.filter((wl) => wl !== name) : [...prev, name],
        );
        setInWatchlist((prev) =>
          alreadyIn ? movieInWatchlists.length > 1 : true,
        );

        if (alreadyIn) {
          await removeFromWatchlist(name, effectiveImdbID);
          showToast(`Removed from '${name}'`, "info");
          analyticsService.trackWatchlistAction(
            "remove",
            effectiveImdbID,
            movie?.Title || "Unknown",
          );
        } else {
          const toStore = movie
            ? { ...movie, imdbID: effectiveImdbID }
            : { imdbID: effectiveImdbID };
          await addToWatchlist(name, toStore);
          showToast(`Added to '${name}'!`, "success");
          analyticsService.trackWatchlistAction(
            "add",
            effectiveImdbID,
            movie?.Title || "Unknown",
          );
        }

        setWatchlists((prev) => {
          const next = { ...(prev || {}) };
          const list = Array.isArray(next[name]) ? next[name] : [];
          if (alreadyIn) {
            next[name] = list.filter((m) => m.imdbID !== effectiveImdbID);
          } else {
            const toStore = movie
              ? { ...movie, imdbID: effectiveImdbID, watched: false }
              : { imdbID: effectiveImdbID, watched: false };
            next[name] = [
              ...list.filter((m) => m.imdbID !== effectiveImdbID),
              toStore,
            ];
          }
          setTimeout(() => syncWatchlistState(next), 0);
          return next;
        });
        checkInAnyWatchlist();
      } catch (error) {
        logger.error("Error handling watchlist", error);
        showToast("Failed to update watchlist", "error");
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

  const handleModalClose = useCallback(() => {
    setShowWatchlistModal(false);
    setTimeout(checkInAnyWatchlist, 200);
  }, [checkInAnyWatchlist]);

  // ── Favorite ───────────────────────────────────────────────────────────────

  const toggleFavorite = useCallback(async () => {
    try {
      const currentlyFavorite = candidateIds.some((id) => isFavorite(id));
      if (currentlyFavorite) {
        await Promise.all(candidateIds.map((id) => removeFromFavorites(id)));
        showToast("Removed from favorites", "info");
        analyticsService.trackFavoriteAction(
          "remove",
          effectiveImdbID,
          movie?.Title || "Unknown",
        );
      } else {
        const toStore = movie ? { ...movie, imdbID: effectiveImdbID } : null;
        if (toStore) {
          await addToFavorites(toStore);
          showToast("Added to favorites!", "success");
          analyticsService.trackFavoriteAction(
            "add",
            effectiveImdbID,
            movie?.Title || "Unknown",
          );
        }
      }
    } catch (error) {
      logger.error("Error toggling favorite", error);
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

  // ── Trailer ────────────────────────────────────────────────────────────────

  const fetchTrailer = useCallback(
    async (title, tmdbId, type = "movie") => {
      setTrailerLoading(true);
      setTrailerError(null);
      try {
        let videosData;
        if (tmdbId) {
          videosData =
            type === "tv" || type === "series"
              ? await getTVVideos(tmdbId)
              : await getMovieVideos(tmdbId);
          const key = extractYouTubeTrailer(videosData);
          if (key) {
            setVideoId(key);
          } else {
            setTrailerError("No trailer found.");
            showToast("No trailer found", "info");
          }
        } else {
          const query = encodeURIComponent(`${title} official trailer`);
          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`,
          );
          const data = await res.json();
          if (data.items?.length > 0) {
            setVideoId(data.items[0].id.videoId);
          } else {
            setTrailerError("No trailer found.");
            showToast("No trailer found", "info");
          }
        }
      } catch (err) {
        logger.error("Error fetching trailer", err);
        setTrailerError("Failed to load trailer. Please try again.");
        showToast("Failed to load trailer", "error");
      } finally {
        setTrailerLoading(false);
      }
    },
    [showToast],
  );

  const handleWatchTrailer = useCallback(() => {
    if (!videoId && movie?.Title && tmdbInfo)
      fetchTrailer(movie.Title, tmdbInfo.id, tmdbInfo.type);
    setIsPlaying(true);
  }, [videoId, movie?.Title, tmdbInfo, fetchTrailer]);

  const handleTrailerStateChange = useCallback((event) => {
    if (event === "ended") setIsPlaying(false);
  }, []);

  const handleTrailerError = useCallback(() => {
    setTrailerError("Error playing trailer. Please try again.");
    showToast("Error playing trailer", "error");
  }, [showToast]);

  // ── Season trailer ─────────────────────────────────────────────────────────

  const fetchSeasonTrailer = useCallback(
    async (seasonNumber) => {
      if (!tmdbInfo || tmdbInfo.type !== "tv") {
        showToast("Season trailers only available for TV series", "info");
        return;
      }
      setLoadingSeasonTrailers((prev) => ({ ...prev, [seasonNumber]: true }));
      try {
        const videosData = await getSeasonVideos(tmdbInfo.id, seasonNumber);
        const key = extractYouTubeTrailer(videosData);
        if (key) {
          setSeasonTrailers((prev) => ({ ...prev, [seasonNumber]: key }));
          setPlayingSeasonTrailer(seasonNumber);
        } else {
          showToast(`No trailer found for Season ${seasonNumber}`, "info");
        }
      } catch (err) {
        logger.error(`Error fetching season ${seasonNumber} trailer`, err);
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

  const handleSeasonTrailerPress = useCallback(
    (seasonNumber) => {
      if (playingSeasonTrailer === seasonNumber) {
        setPlayingSeasonTrailer(null);
      } else if (seasonTrailers[seasonNumber]) {
        setPlayingSeasonTrailer(seasonNumber);
      } else {
        fetchSeasonTrailer(seasonNumber);
      }
    },
    [playingSeasonTrailer, seasonTrailers, fetchSeasonTrailer],
  );

  // ── Episode watched toggle ─────────────────────────────────────────────────

  const toggleEpisodeWatched = useCallback(
    async (season, episodeNumber) => {
      const key = `s${season}e${episodeNumber}`;
      const wasWatched = !!watchedEpisodes[key];

      setWatchedEpisodes((prev) => {
        const next = { ...prev };
        if (wasWatched) {
          delete next[key];
        } else {
          next[key] = {
            watchedAt: new Date().toISOString(),
            season,
            episode: episodeNumber,
          };
        }
        return next;
      });

      try {
        await markEpisodeWatched(
          effectiveImdbID,
          season,
          episodeNumber,
          !wasWatched,
        );
        showToast(
          wasWatched ? "Marked as unwatched" : "Marked as watched",
          "success",
        );
      } catch (error) {
        logger.error("Failed to update watch status", error);
        // Revert
        setWatchedEpisodes((prev) => {
          const next = { ...prev };
          if (wasWatched) {
            next[key] = {
              watchedAt: new Date().toISOString(),
              season,
              episode: episodeNumber,
            };
          } else {
            delete next[key];
          }
          return next;
        });
        showToast("Failed to update watch status", "error");
      }
    },
    [effectiveImdbID, watchedEpisodes, showToast],
  );

  // ── Season expand / collapse ───────────────────────────────────────────────
  // Removed expandedSeasons + seriesDetails from deps — both are read via
  // functional updater / local lookup so the callback stays stable.

  const toggleSeason = useCallback(
    async (seasonNumber) => {
      let willExpand = false;
      setExpandedSeasons((prev) => {
        willExpand = !prev[seasonNumber];
        return { ...prev, [seasonNumber]: !prev[seasonNumber] };
      });

      // Give React one tick to update expandedSeasons before checking
      await Promise.resolve();

      if (!willExpand) return; // collapsing — nothing to fetch

      setSeriesDetails((prev) => {
        if (prev?.seasons?.find((s) => s.seasonNumber === seasonNumber))
          return prev; // already loaded
        return prev; // return unchanged; fetch below will update it
      });

      // Check if already loaded without capturing stale closure
      setSeriesDetails((prev) => {
        if (prev?.seasons?.find((s) => s.seasonNumber === seasonNumber)) {
          return prev; // already there, no fetch needed
        }

        // Kick off async fetch outside of setState
        setLoadingEpisodes((le) => ({ ...le, [seasonNumber]: true }));
        fetchSeasonDetails(imdbID, seasonNumber)
          .then((seasonData) => {
            if (!seasonData) return;
            setSeriesDetails((sd) => ({
              ...sd,
              seasons: [...(sd?.seasons || []), seasonData].sort(
                (a, b) => a.seasonNumber - b.seasonNumber,
              ),
            }));
          })
          .catch((err) => {
            logger.error(`Error loading season ${seasonNumber}`, err);
            showToast("Failed to load season details", "error");
          })
          .finally(() => {
            setLoadingEpisodes((le) => {
              const next = { ...le };
              delete next[seasonNumber];
              return next;
            });
          });

        return prev;
      });
    },
    [imdbID, fetchSeasonDetails, showToast],
  );

  // ── Collection ─────────────────────────────────────────────────────────────

  const openCollectionPart = useCallback(
    (part) => {
      if (!part?.id) return;
      navigation.push("Details", { imdbID: `tmdb:movie:${part.id}` });
    },
    [navigation],
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  // ── Render ─────────────────────────────────────────────────────────────────

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
        { backgroundColor: colors.background },
      ]}
      edges={["left", "right"]}
    >
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: tabBarHeight },
        ]}
        scrollEnabled={!showWatchlistModal}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
      >
        <Header onBack={handleBack} theme={theme} />

        {/* Hero */}
        <HeroSection movie={movie} colors={colors} />

        {/* Title card */}
        <View
          style={[
            streamStyles.card,
            streamStyles.titleCard,
            { backgroundColor: colors.card },
          ]}
        >
          <View style={streamStyles.titleRow}>
            <Text
              style={[streamStyles.title, { color: colors.text }]}
              numberOfLines={3}
            >
              {movie.Title}
            </Text>
            <RatingBadge rating={movie.imdbRating} />
          </View>
          <View style={streamStyles.chipsRow}>
            <MetaChip
              icon="calendar-outline"
              text={movie.Year}
              colors={colors}
              theme={theme}
            />
            {movie.Type !== "series" ? (
              <MetaChip
                icon="time-outline"
                text={movie.Runtime}
                colors={colors}
                theme={theme}
              />
            ) : (
              <MetaChip
                icon="tv-outline"
                text={`${seriesDetails?.totalSeasons || movie.totalSeasons || "?"} Seasons`}
                colors={colors}
                theme={theme}
              />
            )}
            {movie.Rated && movie.Rated !== "N/A" && (
              <MetaChip
                icon="shield-checkmark-outline"
                text={movie.Rated}
                colors={colors}
                theme={theme}
              />
            )}
          </View>
          <GenreTags genres={movie.Genre} colors={colors} theme={theme} />
        </View>

        {/* Actions card */}
        <View style={[streamStyles.card, { backgroundColor: colors.card }]}>
          <ActionButtons
            favorite={favorite}
            inWatchlist={inWatchlist}
            onFavoritePress={toggleFavorite}
            onWatchlistPress={handleWatchlistButton}
            colors={colors}
            theme={theme}
          />
        </View>

        {/* Synopsis card */}
        {movie.Plot && movie.Plot !== "N/A" && (
          <View style={[streamStyles.card, { backgroundColor: colors.card }]}>
            <Text style={[streamStyles.cardHeading, { color: colors.text }]}>
              Synopsis
            </Text>
            <Text style={[streamStyles.synopsis, { color: colors.text }]}>
              {movie.Plot}
            </Text>
          </View>
        )}

        {/* Cast card */}
        {cast.length > 0 && (
          <View style={[streamStyles.card, { backgroundColor: colors.card }]}>
            <Text style={[streamStyles.cardHeading, { color: colors.text }]}>
              Cast
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={streamStyles.castRow}
            >
              {cast.map((person, index) => (
                <CastCard
                  key={person.id || `${person.name}-${index}`}
                  name={person.name}
                  character={person.character}
                  profilePath={person.profilePath}
                  profileUrl={person.profileUrl}
                  colors={colors}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Details card */}
        {(movie.Director ||
          movie.Writer ||
          movie.Language ||
          movie.Country ||
          movie.Awards ||
          movie.BoxOffice) && (
          <View style={[streamStyles.card, { backgroundColor: colors.card }]}>
            <Text style={[streamStyles.cardHeading, { color: colors.text }]}>
              Details
            </Text>
            <InfoRow
              icon="film-outline"
              label="Director"
              value={movie.Director}
              colors={colors}
              theme={theme}
            />
            <InfoRow
              icon="create-outline"
              label="Writer"
              value={movie.Writer}
              colors={colors}
              theme={theme}
            />
            <InfoRow
              icon="language-outline"
              label="Language"
              value={movie.Language}
              colors={colors}
              theme={theme}
            />
            <InfoRow
              icon="earth-outline"
              label="Country"
              value={movie.Country}
              colors={colors}
              theme={theme}
            />
            <InfoRow
              icon="trophy-outline"
              label="Awards"
              value={movie.Awards}
              colors={colors}
              theme={theme}
            />
            <InfoRow
              icon="storefront-outline"
              label="Box Office"
              value={movie.BoxOffice}
              colors={colors}
              theme={theme}
            />
          </View>
        )}

        <WatchProvidersSection
          providers={watchProviders}
          userSubscriptions={userSubscriptions}
          loading={loadingWatchProviders}
          colors={colors}
          theme={theme}
        />

        {movie?.Type === "series" && seriesDetails?.initialized && (
          <View
            style={[styles.seriesSection, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Episodes
            </Text>
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

        <ImageGallery
          images={images}
          loading={loadingImages}
          error={imagesError}
          colors={colors}
          theme={theme}
        />

        <TimelineSection
          collectionStatus={collectionState.status}
          collection={collectionState.data}
          currentTmdbId={tmdbInfo?.id}
          colors={colors}
          theme={theme}
          onOpen={openCollectionPart}
        />

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
          reviews={reviewsState.reviews}
          total={reviewsState.total}
          status={reviewsState.status}
          loadingMore={reviewsState.loadingMore}
          loadMoreError={reviewsState.loadMoreError}
          hasMore={reviewsState.hasMore}
          onLoadMore={reviewsState.loadMore}
          onRetry={reviewsState.retry}
          colors={colors}
          theme={theme}
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

const streamStyles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  titleCard: {
    marginTop: -48,
    paddingTop: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  cardHeading: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    opacity: 0.45,
    marginBottom: 16,
  },
  synopsis: {
    fontSize: 15,
    lineHeight: 24,
    opacity: 0.8,
  },
  castRow: {
    gap: 16,
    paddingRight: 4,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Replace toastContainer with toastWrapper
  toastWrapper: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: "center",
    // Explicit height prevents the view from expanding to fill parent
    height: 60,
    // pointerEvents="none" on the plain View wrapper handles touch passthrough
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
  headerContainer: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
    width: 44,
    height: 44,
  },
  headerButton: {
    width: 44,
    height: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  backButtonSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 1,
  },
  heroSection: { position: "relative", height: screenHeight * 0.55 },
  posterContainer: { position: "relative", width: "100%", height: "100%" },
  heroPoster: { width: "100%", height: "100%", contentFit: "cover" },
  posterGradient: {
    position: "absolute",
    bottom: -96,
    left: 0,
    right: 0,
    height: 260,
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
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { fontSize: 16, marginTop: 10, opacity: 0.7 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  genreSection: { marginTop: 16 },
  genreLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    opacity: 0.8,
  },
  genreTags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  genreTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  genreText: { fontSize: 13, fontWeight: "500" },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  actionButtonsContainer: { flexDirection: "row", gap: 12, marginTop: 20 },
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
    backgroundColor: "rgba(126,87,194,0.15)",
    borderColor: "rgba(126,87,194,0.4)",
  },
  actionButtonText: { fontSize: 16, fontWeight: "600" },
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
  seasonContainer: { marginBottom: 16, borderRadius: 12, overflow: "hidden" },
  seasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderRadius: 12,
  },
  seasonHeaderContent: { flex: 1 },
  seasonTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  seasonTitle: { fontSize: 17, fontWeight: "bold" },
  seasonInfo: { fontSize: 13, marginTop: 2 },
  progressBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  progressBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", borderRadius: 2 },
  episodesContainer: { paddingHorizontal: 12, paddingVertical: 8 },
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
  seasonTrailerText: { fontSize: 14, fontWeight: "600" },
  seasonVideoWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  episodeItem: {
    marginVertical: 4,
    marginHorizontal: 4,
    padding: 14,
    borderRadius: 12,
    height: EPISODE_ITEM_HEIGHT,
    justifyContent: "center",
  },
  episodeContent: { flex: 1 },
  episodeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 6,
  },
  episodeNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(126,87,194,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  episodeNumber: { fontSize: 14, fontWeight: "bold" },
  episodeTitle: { flex: 1, fontSize: 15, fontWeight: "600", lineHeight: 20 },
  episodeMetadata: { flexDirection: "row", alignItems: "center", gap: 16 },
  episodeInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  episodeRuntime: { fontSize: 13, opacity: 0.7, fontWeight: "500" },
  episodeRating: { fontSize: 13, opacity: 0.8, fontWeight: "600" },
  watchButton: { marginLeft: "auto" },
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
  errorIcon: { marginBottom: 12 },
  trailerPlaceholder: {
    height: (screenWidth - 88) * (9 / 16),
    borderRadius: 12,
    overflow: "hidden",
  },
  trailerGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  buttonText: { fontSize: 16, fontWeight: "600" },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: { fontSize: 16, fontWeight: "600", marginTop: 8 },
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
  modalItemText: { fontSize: 16, fontWeight: "500" },
  inWatchlistBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  inWatchlistText: { fontSize: 12, fontWeight: "600" },
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
  modalCancelText: { fontSize: 16, fontWeight: "600" },
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
  webTrailerButtonText: { fontSize: 16, fontWeight: "600" },
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
