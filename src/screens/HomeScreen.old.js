import React, { useEffect, useState } from "react";
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
import ApiService, {
  getRecommendations,
  getBackendStatus,
} from "../services/api";
import MovieCard from "../components/HomeMovieCard";
import ShimmerMovieCard from "../components/ShimmerHomeMovieCard";
import RecommendationCard from "../components/RecommendationCard";
import { useCustomTheme } from "../contexts/ThemeContext";
import { getFavorites, getWatchlists } from "../utils/storage";
import Ionicons from "react-native-vector-icons/Ionicons";

// Fetch recommendation map (example for Firebase hosting JSON)
const fetchRecommendationsMap = async () => {
  const url = "https://cinelink-7343e.web.app/recommendations.json";
  const response = await fetch(url);
  return await response.json();
};

const HomeScreen = ({ navigation }) => {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [popularHits, setPopularHits] = useState([]);
  const [youMayLike, setYouMayLike] = useState([]);
  const [featuredMovie, setFeaturedMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);
  const [lastDataHash, setLastDataHash] = useState(null);
  const [backendError, setBackendError] = useState(false);

  const { colors } = useTheme();
  const { theme } = useCustomTheme();

  // Fetch static movie data (trending, popular, etc.)
  const fetchStaticMovies = async () => {
    setIsLoading(true);
    setBackendError(false);

    try {
      const trendingResp = await ApiService.searchMovies("2023");
      const trending = (trendingResp.results || []).slice(0, 10);
      setTrendingMovies(trending);
      setFeaturedMovie(trending[0]);

      const popularResp = await ApiService.searchMovies("2022");
      setPopularHits((popularResp.results || []).slice(0, 5));

      const shuffled = [...trending].sort(() => 0.5 - Math.random());
      setYouMayLike(shuffled.slice(0, 5));
    } catch (error) {
      console.error("Error fetching static movies:", error);
      setBackendError(true);

      // Check if it's a backend connection issue
      const backendStatus = getBackendStatus();
      if (!backendStatus.available) {
        console.log("Backend unavailable, but fallback should work");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Generate a simple hash from favorites and watchlists data
  const generateDataHash = (favorites, watchlists) => {
    const favIds = favorites
      .map((m) => m.imdbID)
      .sort()
      .join(",");
    const watchlistIds = Object.values(watchlists)
      .flat()
      .map((m) => m.imdbID)
      .sort()
      .join(",");
    return `${favIds}|${watchlistIds}`;
  };

  // Check if recommendations need to be updated
  const checkAndUpdateRecommendations = async () => {
    try {
      const [favorites, watchlists] = await Promise.all([
        getFavorites(),
        getWatchlists(),
      ]);

      const currentHash = generateDataHash(favorites, watchlists);

      // Only fetch recommendations if data has actually changed
      if (currentHash !== lastDataHash) {
        console.log("Data changed, updating recommendations...");
        setLastDataHash(currentHash);
        await fetchRecommendations(favorites, watchlists);
      } else {
        console.log("No data changes, keeping existing recommendations");
      }
    } catch (error) {
      console.error("Error checking for recommendation updates:", error);
    }
  };

  // Fetch personalized recommendations based on user's favorites and watchlists
  const fetchRecommendations = async (favorites = null, watchlists = null) => {
    setIsLoadingRecommendations(true);
    try {
      // Use provided data or fetch fresh data
      const [favs, lists] =
        favorites && watchlists
          ? [favorites, watchlists]
          : await Promise.all([getFavorites(), getWatchlists()]);

      const favTitles = favs.map((m) => m.Title);
      const watchlistTitles = Object.values(lists)
        .flat()
        .map((m) => m.Title);
      const allTitles = Array.from(new Set([...favTitles, ...watchlistTitles]));

      if (allTitles.length > 0) {
        // Get recommendations based on multiple titles for better variety
        const recommendationPromises = allTitles.slice(0, 3).map((title) =>
          getRecommendations(title).catch((err) => {
            console.warn(`Failed to get recommendations for ${title}:`, err);
            return [];
          }),
        );

        const allRecommendations = await Promise.all(recommendationPromises);

        // Flatten and deduplicate recommendations
        const flatRecommendations = allRecommendations.flat();
        const uniqueRecommendations = flatRecommendations.filter(
          (movie, index, self) =>
            movie.imdbID &&
            self.findIndex((m) => m.imdbID === movie.imdbID) === index,
        );

        // Limit to 10 recommendations and shuffle for variety
        const shuffledRecommendations = uniqueRecommendations
          .sort(() => 0.5 - Math.random())
          .slice(0, 10);

        setRecommendedMovies(shuffledRecommendations);
      } else {
        setRecommendedMovies([]);
      }
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setRecommendedMovies([]);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStaticMovies();
    checkAndUpdateRecommendations();
  }, []);

  // Listen for screen focus to update recommendations only if data changed
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      // Check if recommendations need updating when returning to home screen
      checkAndUpdateRecommendations();
    });

    return unsubscribe;
  }, [navigation, lastDataHash]);

  // --- Render shimmer skeleton ----
  const renderShimmer = (count = 5, horizontal = false) => (
    <FlatList
      data={Array(count).fill({})}
      keyExtractor={(_, index) => `shimmer-${horizontal ? "h" : "v"}-${index}`}
      renderItem={() => <ShimmerMovieCard />}
      horizontal={horizontal}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={
        horizontal ? styles.horizontalList : styles.listContent
      }
    />
  );

  // --- Featured Banner ---
  const renderFeaturedBanner = () =>
    featuredMovie && (
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
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={styles.gradientOverlay}
        >
          <Text
            style={styles.featuredTitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {featuredMovie?.Title}
          </Text>
          <Text style={styles.featuredSubtitle}>
            {featuredMovie?.Year} • {featuredMovie?.Type}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );

  // --- Horizontal sections ---
  const renderHorizontalSection = (title, data, keyPrefix, loading = false) => (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sectionUnderline} />
      {loading ? (
        renderShimmer(3, true)
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => `${keyPrefix}-${item.imdbID}`}
          renderItem={({ item }) => (
            <MovieCard
              movie={item}
              onPress={() =>
                navigation.navigate("Details", { imdbID: item.imdbID })
              }
              style={styles.horizontalCard}
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      )}
    </View>
  );

  // --- Recommendation section ---
  const renderRecommendationSection = (title, data, loading = false) => (
    <View style={styles.recommendationSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.sectionUnderline} />
      {loading ? (
        renderShimmer(3, true)
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(_, idx) => `rec-${idx}`}
          renderItem={({ item }) => <RecommendationCard item={item} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      )}
    </View>
  );

  // --- Sections list ---
  const sections = [
    {
      key: "featured",
      render: () =>
        isLoading ? (
          <View style={styles.featuredShimmer} />
        ) : (
          renderFeaturedBanner()
        ),
    },
    {
      key: "featuredThisWeek",
      render: () =>
        renderHorizontalSection(
          "Featured This Week",
          trendingMovies.slice(0, 5),
          "featured",
          isLoading,
        ),
    },
    {
      key: "popularHits",
      render: () =>
        renderHorizontalSection(
          "Popular Hits",
          popularHits,
          "popular",
          isLoading,
        ),
    },
    {
      key: "youMayLike",
      render: () =>
        renderHorizontalSection("You May Like", youMayLike, "like", isLoading),
    },
    {
      key: "personalRecommendations",
      render: () => {
        // Show section if we have recommendations or if we're loading them
        const hasValidRecommendations =
          recommendedMovies.length > 0 &&
          recommendedMovies.some((movie) => movie.imdbID);

        if (hasValidRecommendations || isLoadingRecommendations) {
          return renderRecommendationSection(
            "Recommended For You",
            recommendedMovies.filter((movie) => movie.imdbID),
            isLoadingRecommendations,
          );
        }
        return null;
      },
    },
  ];

  // Add backend error banner
  const renderBackendError = () => {
    if (!backendError) return null;

    return (
      <View style={styles.errorBanner}>
        <Ionicons name="warning" size={20} color="#ff6b35" />
        <Text style={[styles.errorText, { color: colors.text }]}>
          Using cached data. Check connection in Settings.
        </Text>
      </View>
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
      <View style={styles.container}>
        {/* HEADER with Search */}
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
              Your Movie Heaven
            </Text>
          </View>
        </View>

        {renderBackendError()}

        {/* Main List */}
        <FlatList
          data={sections}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => item.render()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1 },
  container: { flex: 1 },

  // ---- HEADER ----
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  appNameContainer: { flexDirection: "column" },
  appName: { fontSize: 28, fontWeight: "bold", letterSpacing: 1 },
  appTagline: { fontSize: 13, opacity: 0.7, marginTop: -2 },
  searchIcon: { fontSize: 22, color: "#1e88e5" },

  // ---- FEATURED ----
  featuredContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 25,
    borderRadius: 14,
    overflow: "hidden",
    elevation: 6,
    backgroundColor: "#000",
  },
  featuredImage: { width: "100%", height: 280, resizeMode: "cover" },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    justifyContent: "flex-end",
  },
  featuredTitle: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  featuredSubtitle: { color: "#ddd", fontSize: 15, opacity: 0.85 },
  featuredShimmer: {
    width: "90%",
    height: 280,
    borderRadius: 14,
    backgroundColor: "#ddd",
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 25,
  },

  // ---- SECTIONS ----
  sectionContainer: { marginBottom: 25 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginLeft: 20 },
  sectionUnderline: {
    width: 40,
    height: 3,
    backgroundColor: "#1e88e5",
    borderRadius: 2,
    marginLeft: 20,
    marginTop: 4,
    marginBottom: 12,
  },

  // ---- LIST STYLES ----
  horizontalList: { paddingLeft: 20 },
  horizontalCard: { width: 160, marginRight: 14 },
  listContent: { paddingBottom: 50 },

  // ---- PERSONALIZED SECTION ----
  recommendationSection: {
    paddingVertical: 20,
    backgroundColor: "rgba(30,136,229,0.05)", // light blue tint
    borderRadius: 10,
    marginHorizontal: 15,
    marginBottom: 25,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 107, 53, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#ff6b35",
  },
  errorText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
});

export default HomeScreen;
