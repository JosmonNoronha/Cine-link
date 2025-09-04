import React, { useEffect, useState, useRef } from "react";
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
  TextInput,
  Alert,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useCustomTheme } from "../contexts/ThemeContext";
import {
  getMovieDetails,
  getSeasonDetails,
  getEpisodeDetails,
} from "../services/api";
import {
  saveFavorite,
  removeFavorite,
  isFavorite,
  saveSeriesDetails,
  getSeriesDetails,
  getWatchlists,
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
} from "../utils/storage";
import YoutubePlayer from "react-native-youtube-iframe";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  FadeInDown,
  useSharedValue,
  withTiming,
  withSequence,
  withRepeat,
  useAnimatedStyle,
} from "react-native-reanimated";
import ShimmerPlaceholder from "react-native-shimmer-placeholder";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;

const DetailsScreen = ({ route, navigation }) => {
  const { imdbID } = route.params;
  const [movie, setMovie] = useState(null);
  const [favorite, setFavorite] = useState(false);
  const [videoId, setVideoId] = useState(null);
  const [isTrailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [seriesDetails, setSeriesDetails] = useState(null);
  const [expandedSeasons, setExpandedSeasons] = useState({});
  const [loadingEpisodes, setLoadingEpisodes] = useState({});
  const [watchlists, setWatchlists] = useState({});
  const [showWatchlistModal, setShowWatchlistModal] = useState(false);
  const [selectedWatchlist, setSelectedWatchlist] = useState(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [movieInWatchlists, setMovieInWatchlists] = useState([]);
  const { colors } = useTheme();
  const { theme } = useCustomTheme();

  const loadingOpacity = useSharedValue(1);

  // Fix: Pause animations when modal is visible
  useEffect(() => {
    if (showWatchlistModal) {
      // Stop the animation when modal is open
      loadingOpacity.value = withTiming(1, { duration: 200 });
      return;
    }

    if (Object.values(loadingEpisodes).some((isLoading) => isLoading)) {
      loadingOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1, // Infinite loop
        true // Reverse
      );
    } else {
      loadingOpacity.value = withTiming(1); // Reset to full opacity
    }
  }, [loadingEpisodes, showWatchlistModal]); // Added showWatchlistModal dependency

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
    color: theme === "dark" ? "#7e57c2" : "#5e35b1",
  }));

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const data = await getMovieDetails(imdbID);
        setMovie(data);
        const favStatus = await isFavorite(imdbID);
        setFavorite(favStatus);
        await checkInAnyWatchlist();
        if (data.Type === "series" && data.totalSeasons) {
          await fetchSeriesDetails(imdbID, parseInt(data.totalSeasons));
        }
      } catch (error) {
        console.error("Failed to load movie details:", error);
        setMovie(null);
      }
    };
    fetchDetails();
    fetchWatchlists();
  }, [imdbID]);

  const fetchSeriesDetails = async (imdbID, totalSeasons) => {
    try {
      const cached = await getSeriesDetails(imdbID);
      if (
        cached &&
        cached.seasons?.length > 0 &&
        cached.seasons[0]?.episodes?.every((ep) => ep.runtime && ep.rating)
      ) {
        console.log("Loaded series from cache:", cached);
        setSeriesDetails(cached);
        setLoadingEpisodes({});
        return;
      }

      const seasons = [];
      for (let season = 1; season <= totalSeasons; season++) {
        console.log(`Fetching season ${season}`);
        setLoadingEpisodes((prev) => ({ ...prev, [season]: true }));
        try {
          const seasonData = await getSeasonDetails(imdbID, season);
          if (seasonData && seasonData.Episodes) {
            const airYear = seasonData.Episodes[0]?.Released
              ? new Date(seasonData.Episodes[0].Released).getFullYear()
              : "N/A";
            const episodes = await Promise.all(
              seasonData.Episodes.map(async (ep) => {
                const episodeNumber = parseInt(ep.Episode, 10);
                if (isNaN(episodeNumber)) {
                  console.warn(
                    `Invalid episode number for ${ep.Title}: ${ep.Episode}`
                  );
                  return {
                    title: ep.Title,
                    episodeNumber: ep.Episode,
                    runtime: "N/A",
                    rating: "N/A",
                  };
                }
                const episodeData = await getEpisodeDetails(
                  imdbID,
                  season,
                  episodeNumber
                );
                console.log(
                  `Episode ${season}-${episodeNumber} data:`,
                  episodeData
                );
                return {
                  title: ep.Title,
                  episodeNumber: ep.Episode,
                  runtime: episodeData?.Runtime || "N/A",
                  rating: episodeData?.imdbRating || "N/A",
                };
              })
            );
            seasons.push({
              seasonNumber: season,
              episodeCount: seasonData.Episodes.length,
              airYear,
              episodes,
            });
          } else {
            throw new Error("No episodes found for season");
          }
        } catch (error) {
          console.error(`Error fetching season ${season}:`, error);
        }
        setLoadingEpisodes((prev) => {
          console.log(`Clearing loading for season ${season}`);
          return { ...prev, [season]: false };
        });
      }

      const seriesData = { seasons, fallback: seasons.length === 0 };
      console.log("Saving series data:", seriesData);
      await saveSeriesDetails(imdbID, seriesData);
      setSeriesDetails(seriesData);
    } catch (error) {
      console.error("Error fetching series details:", error);
      setSeriesDetails({ seasons: [], fallback: true });
      setLoadingEpisodes({});
    }
  };

  const fetchTrailer = async (title) => {
    setTrailerLoading(true);
    setTrailerError(null);
    try {
      const query = encodeURIComponent(`${title} official trailer`);
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&maxResults=1&key=${YOUTUBE_API_KEY}`
      );
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        const videoId = data.items[0].id.videoId;
        setVideoId(videoId);
      } else {
        setTrailerError("No trailer found for this title.");
      }
    } catch (err) {
      setTrailerError("Failed to load trailer. Please try again.");
    } finally {
      setTrailerLoading(false);
    }
  };

  const toggleFavorite = async () => {
    if (favorite) {
      await removeFavorite(imdbID);
    } else {
      await saveFavorite(movie);
    }
    setFavorite(!favorite);
  };

  const handleWatchlistButton = async () => {
    // Fix: Ensure fresh data before showing modal
    await fetchWatchlists();
    await checkInAnyWatchlist();
    setShowWatchlistModal(true);
  };

  const handleSelectWatchlist = async (name) => {
    try {
      const alreadyIn = await isInWatchlist(name, imdbID);
      if (alreadyIn) {
        await removeFromWatchlist(name, imdbID);
        Alert.alert("Removed", `Removed from '${name}' watchlist.`);
      } else {
        await addToWatchlist(name, movie);
        Alert.alert("Added", `Added to '${name}' watchlist.`);
      }
      setShowWatchlistModal(false);
      setSelectedWatchlist(null);
      // Fix: Update watchlist status after modal closes
      setTimeout(() => {
        checkInAnyWatchlist();
      }, 100);
    } catch (error) {
      console.error("Error handling watchlist:", error);
      Alert.alert("Error", "Failed to update watchlist. Please try again.");
    }
  };

  const handleWatchTrailer = () => {
    if (!videoId && movie?.Title) {
      fetchTrailer(movie.Title);
    }
    setIsPlaying(true);
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const exitFullScreen = () => {
    setIsFullScreen(false);
  };

  const toggleSeason = (seasonNumber) => {
    console.log(
      `Toggling season ${seasonNumber}, loadingEpisodes:`,
      loadingEpisodes
    );
    setExpandedSeasons((prev) => ({
      ...prev,
      [seasonNumber]: !prev[seasonNumber],
    }));
    if (!seriesDetails?.seasons?.find((s) => s.seasonNumber === seasonNumber)) {
      console.log(`No data for season ${seasonNumber}, fetching...`);
      setLoadingEpisodes((prev) => ({ ...prev, [seasonNumber]: true }));
      fetchSeriesDetails(imdbID, movie.totalSeasons);
    }
  };

  const renderSeasonEpisodes = (season) => {
    const isExpanded = expandedSeasons[season.seasonNumber];
    const isLoading = loadingEpisodes[season.seasonNumber];

    return (
      <View key={season.seasonNumber} style={styles.seasonContainer}>
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
          onPress={() => toggleSeason(season.seasonNumber)}
        >
          <View style={styles.seasonHeaderContent}>
            <Text style={[styles.seasonTitle, { color: colors.text }]}>
              Season {season.seasonNumber}
            </Text>
            <Text style={[styles.seasonInfo, { color: colors.text }]}>
              {season.episodeCount} Episodes • {season.airYear}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? "chevron-down" : "chevron-forward"}
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.episodesContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Loading Episodes...
                </Text>
              </View>
            ) : (
              season.episodes.map((episode, index) => (
                <View
                  key={index}
                  style={[
                    styles.episodeItem,
                    {
                      borderBottomColor:
                        theme === "dark"
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(0,0,0,0.1)",
                    },
                  ]}
                >
                  <Text style={[styles.episodeTitle, { color: colors.text }]}>
                    {episode.episodeNumber}. {episode.title}
                  </Text>
                  <View style={styles.episodeInfo}>
                    <Text
                      style={[styles.episodeRuntime, { color: colors.text }]}
                    >
                      {episode.runtime}
                    </Text>
                    <Text
                      style={[styles.episodeRating, { color: colors.text }]}
                    >
                      ⭐ {episode.rating}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  // Fix: Only show loading state when modal is not visible
  const renderLoadingState = () => {
    const isLoading = Object.values(loadingEpisodes).some(
      (isLoading) => isLoading
    );
    if (!isLoading || showWatchlistModal) return null;

    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.loadingContainer, { backgroundColor: colors.card }]}
      >
        <Animated.Text style={[styles.loadingText, animatedTextStyle]}>
          Loading Episodes...
        </Animated.Text>
      </Animated.View>
    );
  };

  const fetchWatchlists = async () => {
    try {
      const data = await getWatchlists();
      setWatchlists(data);
    } catch (error) {
      console.error("Error fetching watchlists:", error);
    }
  };

  const checkInAnyWatchlist = async () => {
    try {
      const lists = await getWatchlists();
      setWatchlists(lists);
      let found = false;
      const movieWatchlists = [];

      for (const name of Object.keys(lists)) {
        if (lists[name].some((m) => m.imdbID === imdbID)) {
          found = true;
          movieWatchlists.push(name);
        }
      }

      setInWatchlist(found);
      setMovieInWatchlists(movieWatchlists);
    } catch (error) {
      console.error("Error checking watchlist status:", error);
    }
  };

  // Fix: Handle modal close properly
  const handleModalClose = () => {
    setShowWatchlistModal(false);
    setSelectedWatchlist(null);
    // Small delay to ensure smooth transition
    setTimeout(() => {
      checkInAnyWatchlist();
    }, 100);
  };

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

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        // Fix: Disable scroll when modal is open to prevent conflicts
        scrollEnabled={!showWatchlistModal}
      >
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.backButton,
              {
                backgroundColor: colors.primary, // Solid contrast color
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
                elevation: 5, // For Android shadow
              },
            ]}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-back"
              size={26}
              color="#fff" // White icon for contrast
            />
          </TouchableOpacity>
        </View>

        {/* Hero Section with Poster */}
        <View style={styles.heroSection}>
          {movie.Poster !== "N/A" ? (
            <View style={styles.posterContainer}>
              <Image
                source={{ uri: movie.Poster }}
                style={styles.heroPoster}
                resizeMode="cover"
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
            <View
              style={[styles.heroPlaceholder, { backgroundColor: colors.card }]}
            >
              <Ionicons name="film-outline" size={80} color={colors.text} />
              <Text style={[styles.placeholderText, { color: colors.text }]}>
                No Poster Available
              </Text>
            </View>
          )}
        </View>

        {/* Movie/Series Details Card */}
        <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: colors.text }]}>
              {movie.Title}
            </Text>
            {movie.imdbRating && movie.imdbRating !== "N/A" && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>★ {movie.imdbRating}/10</Text>
              </View>
            )}
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
                      ? `${seriesDetails.seasons.length}`
                      : `${movie.totalSeasons || "N/A"}`}
                  </Text>
                </View>
              )}
            </View>

            {movie.Genre && movie.Genre !== "N/A" && (
              <View style={styles.genreSection}>
                <Text style={[styles.genreLabel, { color: colors.text }]}>
                  Genres
                </Text>
                <View style={styles.genreTags}>
                  {movie.Genre.split(", ").map((genre, index) => (
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
            )}
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

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                favorite && styles.actionButtonActive,
                {
                  backgroundColor:
                    theme === "dark"
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                },
              ]}
              onPress={toggleFavorite}
              onLongPress={() =>
                Alert.alert(
                  "Favorites",
                  favorite ? "Remove from Favorites" : "Add to Favorites"
                )
              }
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
                    theme === "dark"
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                },
              ]}
              onPress={handleWatchlistButton}
              onLongPress={() =>
                Alert.alert(
                  "Watchlist",
                  inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"
                )
              }
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
        </View>

        {/* Series Seasons Section */}
        {movie?.Type === "series" && seriesDetails && (
          <View
            style={[styles.seriesSection, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Episodes
            </Text>
            {seriesDetails.seasons.map(renderSeasonEpisodes)}
          </View>
        )}

        {/* Loading State */}
        {renderLoadingState()}

        {/* Trailer Section */}
        <View style={[styles.trailerSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Trailer
          </Text>

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
                style={[
                  styles.retryButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleWatchTrailer}
              >
                <Text style={[styles.buttonText, { color: "#fff" }]}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : videoId && isPlaying ? (
            <View style={styles.videoWrapper}>
              <YoutubePlayer
                height={Math.min(240, (screenWidth - 40) * (9 / 16))}
                width={screenWidth - 40}
                play={isPlaying}
                videoId={videoId}
                onChangeState={(event) => {
                  if (event === "ended") setIsPlaying(false);
                }}
                onError={() =>
                  setTrailerError("Error playing trailer. Please try again.")
                }
              />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.trailerPlaceholder}
              onPress={handleWatchTrailer}
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
      </ScrollView>

      {/* Watchlist Selection Modal */}
      <Modal
        visible={showWatchlistModal}
        transparent
        animationType="slide"
        onRequestClose={handleModalClose}
        // Fix: Ensure modal has higher z-index and proper rendering
        supportedOrientations={['portrait', 'landscape']}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Watchlist
            </Text>
            <FlatList
              data={Object.keys(watchlists)}
              keyExtractor={(name) => name}
              renderItem={({ item: name }) => {
                const isInThisWatchlist = movieInWatchlists.includes(name);
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
                      },
                    ]}
                    onPress={() => handleSelectWatchlist(name)}
                  >
                    <View style={styles.modalItemContent}>
                      <Text
                        style={[styles.modalItemText, { color: colors.text }]}
                      >
                        {name}
                      </Text>
                      {isInThisWatchlist && (
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
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.modalEmptyText, { color: colors.text }]}>
                  No watchlists. Create one in the Watchlists tab.
                </Text>
              }
            />
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={handleModalClose}
            >
              <Text style={[styles.modalCancelText, { color: colors.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  },
  heroPoster: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    gap: 8,
  },
  actionButtonActive: {
    backgroundColor: "rgba(126, 87, 194, 0.15)",
    borderColor: "rgba(126, 87, 194, 0.4)",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
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
  seasonTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  seasonInfo: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
  episodesContainer: {
    padding: 16,
  },
  episodeItem: {
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  episodeInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    alignItems: "center",
  },
  episodeRuntime: {
    fontSize: 13,
    opacity: 0.8,
    fontWeight: "500",
  },
  episodeRating: {
    fontSize: 13,
    opacity: 0.8,
    fontWeight: "500",
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
  detailsLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});

export default DetailsScreen;
