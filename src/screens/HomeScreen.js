import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import {
  getTrending,
  getPopular,
  getNewReleases,
  searchByGenre,
  getRecommendations,
} from "../services/api";
import MovieCard from "../components/HomeMovieCard";
import ShimmerMovieCard from "../components/ShimmerHomeMovieCard";
import RecommendationCard from "../components/RecommendationCard";
import { useCustomTheme } from "../contexts/ThemeContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { getWatchlists } from "../utils/storage";
import { useUserProfile } from "../hooks/useUserProfile";
import Ionicons from "react-native-vector-icons/Ionicons";

const HomeScreen = ({ navigation }) => {
  // State management
  const [sections, setSections] = useState([]);
  const [watchlists, setWatchlists] = useState({});
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [watchlistsLoaded, setWatchlistsLoaded] = useState(false);
  const [featuredMovie, setFeaturedMovie] = useState(null);

  // Refs to track loading state and prevent unnecessary reloads
  const hasLoadedRef = useRef(false);
  const lastDataHashRef = useRef("");

  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const { favorites, initialized: favoritesInitialized } = useFavorites();

  // Generate hash to detect actual data changes
  const dataHash = useMemo(() => {
    const favIds = favorites
      .map((f) => f.imdbID)
      .sort()
      .join(",");
    const watchlistIds = Object.keys(watchlists).sort().join(",");
    const watchlistItems = Object.values(watchlists).flat().length;
    return `${favIds}|${watchlistIds}|${watchlistItems}`;
  }, [favorites, watchlists]);

  // Determine if user is truly new (has no data at all)
  const isNewUser = useMemo(() => {
    return (
      favoritesInitialized &&
      watchlistsLoaded &&
      favorites.length === 0 &&
      Object.keys(watchlists).length === 0
    );
  }, [favorites, watchlists, favoritesInitialized, watchlistsLoaded]);

  const userProfile = useUserProfile(watchlists);

  // Fetch watchlists
  const loadWatchlists = useCallback(async () => {
    try {
      const lists = await getWatchlists();
      setWatchlists(lists);
    } catch (error) {
      console.error("Error loading watchlists:", error);
    } finally {
      setWatchlistsLoaded(true);
    }
  }, []);

  // Build dynamic sections based on user profile
  const buildSections = useCallback(async () => {
    setSectionsLoading(true);
    const newSections = [];

    // Helper function to normalize movie data and ensure proper ID format
    const normalizeMovie = (item) => {
      if (!item) return null;

      // If already has proper imdbID, return as is
      if (
        item.imdbID &&
        (item.imdbID.startsWith("tt") || item.imdbID.startsWith("tmdb:"))
      ) {
        return item;
      }

      // Create TMDB format ID if item has id
      if (item.id) {
        // Determine media type: use media_type if available, otherwise infer from context
        const mediaType =
          item.media_type || (item.first_air_date ? "tv" : "movie");
        const type = mediaType === "tv" ? "series" : "movie";

        return {
          ...item,
          imdbID: `tmdb:${mediaType}:${item.id}`,
          Title: item.Title || item.title || item.name,
          Year:
            item.Year ||
            item.release_date?.split("-")[0] ||
            item.first_air_date?.split("-")[0],
          Type: item.Type || type,
          Poster:
            item.Poster ||
            (item.poster_path
              ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
              : "N/A"),
        };
      }

      return item;
    };

    try {
      // SECTION 1: Continue Watching (Priority - show first if applicable)
      if (userProfile.watchProgress.unwatched > 0) {
        const unwatchedItems = Object.values(watchlists)
          .flat()
          .filter((item) => !item.watched)
          .slice(0, 10);

        if (unwatchedItems.length > 0) {
          newSections.push({
            id: "continue-watching",
            title: "Continue Watching",
            subtitle: `${userProfile.watchProgress.unwatched} unwatched`,
            data: unwatchedItems,
            type: "watchlist",
            priority: 1,
          });
        }
      }

      // PARALLEL API CALLS - Fetch all sections simultaneously for 3-5x faster load
      const topGenre = userProfile.topGenres?.[0];
      const secondGenre = userProfile.topGenres?.[1];
      const currentYear = new Date().getFullYear();

      const apiCalls = [
        getTrending("all", "week").catch((err) => {
          console.warn("Trending failed:", err);
          return null;
        }),
        getNewReleases("movie").catch((err) => {
          console.warn("New releases failed:", err);
          return null;
        }),
        getPopular().catch((err) => {
          console.warn("Popular failed:", err);
          return null;
        }),
        !isNewUser && userProfile.randomFavorite
          ? getRecommendations(userProfile.randomFavorite.Title).catch(
              (err) => {
                console.warn("Recommendations failed:", err);
                return null;
              },
            )
          : Promise.resolve(null),
        topGenre
          ? searchByGenre(topGenre, "movie").catch((err) => {
              console.warn(`Genre ${topGenre} failed:`, err);
              return null;
            })
          : Promise.resolve(null),
        userProfile.contentPreference === "series" && !isNewUser
          ? getTrending("tv", "week").catch((err) => {
              console.warn("Series failed:", err);
              return null;
            })
          : Promise.resolve(null),
        secondGenre
          ? searchByGenre(secondGenre, "all").catch((err) => {
              console.warn(`Second genre ${secondGenre} failed:`, err);
              return null;
            })
          : Promise.resolve(null),
      ];

      const [
        trendingData,
        newReleasesData,
        popularData,
        recommendationsData,
        genreData,
        seriesData,
        secondGenreData,
      ] = await Promise.all(apiCalls);

      // SECTION 2: Trending Now
      if (trendingData) {
        const trending = Array.isArray(trendingData)
          ? trendingData.map(normalizeMovie).filter(Boolean).slice(0, 10)
          : [];

        if (trending.length > 0) {
          setFeaturedMovie(trending[0]);
          newSections.push({
            id: "trending",
            title: "Trending This Week",
            subtitle: "What everyone's watching",
            data: trending,
            type: "movies",
            priority: 2,
          });
        }
      }

      // SECTION 3: Because You Liked
      if (recommendationsData && recommendationsData.length > 0) {
        newSections.push({
          id: "because-you-liked",
          title: `Because You Liked "${userProfile.randomFavorite.Title}"`,
          subtitle: "More movies like this",
          data: recommendationsData.slice(0, 10),
          type: "recommendations",
          priority: 3,
        });
      }

      // SECTION 4: New Releases
      if (newReleasesData) {
        const releases = Array.isArray(newReleasesData)
          ? newReleasesData.map(normalizeMovie).filter(Boolean).slice(0, 10)
          : [];

        if (releases.length > 0) {
          newSections.push({
            id: "new-releases",
            title: `New in ${currentYear}`,
            subtitle: "Fresh releases",
            data: releases,
            type: "movies",
            priority: 4,
          });
        }
      }

      // SECTION 5: Genre-based
      if (genreData && topGenre) {
        const genreLabel = topGenre.charAt(0).toUpperCase() + topGenre.slice(1);
        const genreMovies = Array.isArray(genreData)
          ? genreData.map(normalizeMovie).filter(Boolean).slice(0, 10)
          : [];

        if (genreMovies.length > 0) {
          newSections.push({
            id: `genre-${topGenre}`,
            title: `Popular ${genreLabel}`,
            subtitle: `Because you love ${genreLabel.toLowerCase()}`,
            data: genreMovies,
            type: "movies",
            priority: 5,
          });
        }
      }

      // SECTION 6: Content Type Preference (Series)
      if (seriesData) {
        const series = Array.isArray(seriesData)
          ? seriesData.map(normalizeMovie).filter(Boolean).slice(0, 10)
          : [];

        if (series.length > 0) {
          newSections.push({
            id: "more-series",
            title: "Popular Series For You",
            subtitle: "Based on your preferences",
            data: series,
            type: "series",
            priority: 6,
          });
        }
      }

      // SECTION 7: Popular
      if (popularData) {
        const popular = Array.isArray(popularData)
          ? popularData.map(normalizeMovie).filter(Boolean).slice(0, 10)
          : [];

        if (popular.length > 0) {
          newSections.push({
            id: "popular",
            title: "Popular Right Now",
            subtitle: "Top picks worldwide",
            data: popular,
            type: "movies",
            priority: 7,
          });
        }
      }

      // SECTION 8: Second Genre
      if (secondGenreData && secondGenre) {
        const genreLabel =
          secondGenre.charAt(0).toUpperCase() + secondGenre.slice(1);
        const genreMovies = Array.isArray(secondGenreData)
          ? secondGenreData.map(normalizeMovie).filter(Boolean).slice(0, 10)
          : [];

        if (genreMovies.length > 0) {
          newSections.push({
            id: `genre-${secondGenre}`,
            title: `Explore ${genreLabel}`,
            subtitle: "Expand your horizons",
            data: genreMovies,
            type: "discovery",
            priority: 8,
          });
        }
      }

      // Sort sections by priority
      newSections.sort((a, b) => a.priority - b.priority);

      setSections(newSections);
    } catch (error) {
      console.error("Error building sections:", error);
    } finally {
      setSectionsLoading(false);
    }
  }, [userProfile, watchlists, isNewUser]);

  // Initial load
  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadWatchlists();
      hasLoadedRef.current = true;
    }
  }, [loadWatchlists]);

  // Only rebuild sections when data hash actually changes AND user data is loaded
  useEffect(() => {
    if (
      favoritesInitialized &&
      watchlistsLoaded &&
      dataHash !== lastDataHashRef.current
    ) {
      console.log("📊 Data changed, rebuilding sections...");
      lastDataHashRef.current = dataHash;
      buildSections();
    }
  }, [dataHash, favoritesInitialized, watchlistsLoaded, buildSections]);

  // Refresh on screen focus - only reload watchlists if coming back from another screen
  useEffect(() => {
    let focusCount = 0;
    const unsubscribe = navigation.addListener("focus", () => {
      focusCount++;
      // Skip first focus (initial mount), only refresh on subsequent focuses
      if (focusCount > 1 && hasLoadedRef.current) {
        loadWatchlists();
      }
    });
    return unsubscribe;
  }, [navigation, loadWatchlists]);

  // Render shimmer loading
  const renderShimmer = () => (
    <View style={styles.shimmerWrapper}>
      <FlatList
        horizontal
        data={Array(5).fill({})}
        keyExtractor={(_, index) => `shimmer-${index}`}
        renderItem={() => <ShimmerMovieCard />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      />
    </View>
  );

  // Featured Banner
  const renderFeaturedBanner = () => {
    if (!featuredMovie) return null;

    return (
      <TouchableOpacity
        style={styles.featuredContainer}
        onPress={() =>
          navigation.navigate("Details", { imdbID: featuredMovie.imdbID })
        }
      >
        <Image
          source={{
            uri: featuredMovie?.Poster || "https://via.placeholder.com/400x250",
          }}
          style={styles.featuredImage}
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.9)"]}
          style={styles.gradientOverlay}
        >
          <View style={styles.featuredBadge}>
            <Ionicons name="flame" size={16} color="#FF6B35" />
            <Text style={styles.featuredBadgeText}>TRENDING</Text>
          </View>
          <Text style={styles.featuredTitle} numberOfLines={2}>
            {featuredMovie?.Title || featuredMovie?.title}
          </Text>
          <Text style={styles.featuredSubtitle}>
            {featuredMovie?.Year || featuredMovie?.release_date?.split("-")[0]}{" "}
            • {featuredMovie?.Type || "Movie"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Render section
  const renderSection = (section) => {
    const isRecommendation = section.type === "recommendations";

    return (
      <View key={section.id} style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              {section.subtitle}
            </Text>
          </View>
        </View>
        <View style={styles.sectionUnderline} />

        <FlatList
          horizontal
          data={section.data}
          keyExtractor={(item, index) =>
            `${section.id}-${item.imdbID || index}`
          }
          renderItem={({ item }) => {
            if (isRecommendation) {
              return <RecommendationCard item={item} />;
            }

            return (
              <MovieCard
                movie={item}
                onPress={() =>
                  navigation.navigate("Details", { imdbID: item.imdbID })
                }
                style={styles.horizontalCard}
              />
            );
          }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
          initialNumToRender={3}
          maxToRenderPerBatch={2}
          windowSize={5}
          removeClippedSubviews={true}
        />
      </View>
    );
  };

  // Welcome message for new users
  const renderWelcomeMessage = () => {
    return (
      <View style={[styles.welcomeContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="heart-outline" size={48} color={colors.primary} />
        <Text style={[styles.welcomeTitle, { color: colors.text }]}>
          Welcome to CineLink!
        </Text>
        <Text style={[styles.welcomeText, { color: colors.text }]}>
          Add movies to your favorites to get personalized recommendations
        </Text>
        <TouchableOpacity
          style={[styles.welcomeButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate("Search")}
        >
          <Text style={styles.welcomeButtonText}>Start Exploring</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Determine what to show based on loading state and user data
  const renderContent = () => {
    // Still initializing - show shimmer for returning users, nothing for new users yet
    if (!favoritesInitialized || !watchlistsLoaded) {
      return <View style={styles.loadingContainer}>{renderShimmer()}</View>;
    }

    // Data loaded - check if user is new
    if (isNewUser) {
      // New user with no data - show welcome message + basic trending content
      return (
        <>
          {renderWelcomeMessage()}
          {sectionsLoading ? (
            <View style={styles.loadingContainer}>{renderShimmer()}</View>
          ) : (
            <>
              {featuredMovie && renderFeaturedBanner()}
              {sections.map((section) => renderSection(section))}
            </>
          )}
        </>
      );
    }

    // Returning user with data - show shimmer while loading sections, then content
    if (sectionsLoading) {
      return <View style={styles.loadingContainer}>{renderShimmer()}</View>;
    }

    // Show actual content
    return (
      <>
        {featuredMovie && renderFeaturedBanner()}
        {sections.map((section) => renderSection(section))}
      </>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeContainer, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.appNameContainer}>
          <Text
            style={[
              styles.appName,
              { color: theme === "dark" ? "#1e88e5" : "#1976d2" },
            ]}
          >
            CineLink
          </Text>
          <Text style={[styles.appTagline, { color: colors.text }]}>
            {isNewUser
              ? "Your Movie Heaven"
              : favoritesInitialized && watchlistsLoaded
                ? `${favorites.length} favorites • ${userProfile.watchProgress.total} in watchlist`
                : "Loading..."}
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <FlatList
        data={[{ key: "content" }]}
        keyExtractor={(item) => item.key}
        renderItem={renderContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews={true}
        maxToRenderPerBatch={1}
        windowSize={3}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  appNameContainer: { flexDirection: "column" },
  appName: { fontSize: 28, fontWeight: "bold", letterSpacing: 1 },
  appTagline: { fontSize: 13, opacity: 0.7, marginTop: 2 },

  // Featured Banner
  featuredContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 25,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  featuredImage: { width: "100%", height: 320, contentFit: "cover" },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,107,53,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  featuredBadgeText: {
    color: "#FF6B35",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 6,
  },
  featuredTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 6,
  },
  featuredSubtitle: {
    color: "#ddd",
    fontSize: 15,
    opacity: 0.9,
  },

  // Sections
  sectionContainer: { marginBottom: 30 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  sectionSubtitle: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  sectionUnderline: {
    width: 50,
    height: 3,
    backgroundColor: "#1e88e5",
    borderRadius: 2,
    marginLeft: 20,
    marginTop: 4,
    marginBottom: 12,
  },

  // Lists
  horizontalList: { paddingLeft: 20 },
  horizontalCard: { width: 160, marginRight: 14 },
  listContent: { paddingBottom: 30 },
  loadingContainer: { marginTop: 20 },
  shimmerWrapper: { marginBottom: 20 },

  // Welcome Message
  welcomeContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 25,
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 15,
    textAlign: "center",
    opacity: 0.7,
    marginBottom: 20,
    lineHeight: 22,
  },
  welcomeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  welcomeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HomeScreen;
