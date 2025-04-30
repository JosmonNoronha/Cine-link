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
import { searchMovies } from "../services/api";
import MovieCard from "../components/MovieCard";
import ShimmerMovieCard from "../components/ShimmerMovieCard";
import { useCustomTheme } from "../contexts/ThemeContext";

const HomeScreen = ({ navigation }) => {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [popularHits, setPopularHits] = useState([]);
  const [youMayLike, setYouMayLike] = useState([]);
  const [featuredMovie, setFeaturedMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { colors } = useTheme();
  const { theme } = useCustomTheme();

  useEffect(() => {
    const fetchMovies = async () => {
      setIsLoading(true);
      const trendingData = await searchMovies("2023");
      const trending = trendingData.slice(0, 10);
      setTrendingMovies(trending);
      setFeaturedMovie(trending[0]);

      const popularData = await searchMovies("2022");
      setPopularHits(popularData.slice(0, 5));

      const shuffled = [...trending].sort(() => 0.5 - Math.random());
      setYouMayLike(shuffled.slice(0, 5));

      setIsLoading(false);
    };
    fetchMovies();
  }, []);

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

  const renderFeaturedBanner = () => (
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

  const renderHorizontalSection = (title, data, keyPrefix) => (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {isLoading ? (
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
          "featured"
        ),
    },
    {
      key: "popularHits",
      render: () =>
        renderHorizontalSection("Popular Hits", popularHits, "popular"),
    },
    {
      key: "youMayLike",
      render: () => renderHorizontalSection("You May Like", youMayLike, "like"),
    },
    {
      key: "trendingMovies",
      render: () => (
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Trending Movies
          </Text>
          {isLoading ? renderShimmer() : null}
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView
      style={[styles.safeContainer, { backgroundColor: colors.background }]}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <View style={styles.container}>
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

        <FlatList
          data={isLoading ? sections : [...sections, ...trendingMovies]}
          keyExtractor={(item, index) => (item.key ? item.key : item.imdbID)}
          renderItem={({ item }) =>
            item.render ? (
              item.render()
            ) : (
              <MovieCard
                movie={item}
                onPress={() =>
                  navigation.navigate("Details", { imdbID: item.imdbID })
                }
              />
            )
          }
          contentContainerStyle={styles.listContent}
        />
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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  appNameContainer: {
    flexDirection: "column",
  },
  appName: {
    fontSize: 30,
    fontWeight: "bold",
    letterSpacing: 1.2,
  },
  appTagline: {
    fontSize: 14,
    opacity: 0.7,
  },
  featuredContainer: {
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 5,
  },
  featuredImage: {
    width: "100%",
    height: 250, // Increased to match card’s prominence
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  featuredTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 28,
  },
  featuredSubtitle: {
    color: "#fff",
    fontSize: 16,
    opacity: 0.9,
    marginTop: 4,
  },
  featuredShimmer: {
    width: "90%",
    height: 250,
    borderRadius: 12,
    backgroundColor: "#ddd",
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 20,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 15,
    marginTop: 15,
    marginBottom: 10,
  },
  horizontalList: {
    paddingLeft: 15,
    paddingRight: 15,
  },
  horizontalCard: {
    width: 180, // Increased to fit new card design
    marginRight: 12,
  },
  listContent: {
    paddingBottom: 30, // Extra space for bottom nav
  },
});

export default HomeScreen;