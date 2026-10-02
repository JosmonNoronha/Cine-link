import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  View,
  Animated,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import { useCustomTheme } from "../contexts/ThemeContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { useUserProfile } from "../hooks/useUserProfile";
import useHomeFeed from "../hooks/useHomeFeed";
import { getWatchlists } from "../utils/storage";
import HomeScreenSkeleton from "../components/home/HomeScreenSkeleton";
import RetryState from "../components/shared/RetryState";
import HomeHeader from "../components/home/HomeHeader";
import FeaturedCarousel from "../components/home/FeaturedCarousel";
import HomeSection from "../components/home/HomeSections";
import { GenreChips } from "../components/home/HomeCards";
import logger from "../services/logger";

// Cheap change-detection so focus-refreshes don't re-render when nothing changed
const listsSignature = (lists) =>
  Object.entries(lists || {})
    .map(
      ([name, items]) =>
        `${name}:${(Array.isArray(items) ? items : [])
          .map((i) => `${i.imdbID}${i.watched ? 1 : 0}`)
          .join(",")}`,
    )
    .join("|");

const WelcomeCard = React.memo(({ colors, onExplore }) => (
  <View style={[styles.welcome, { backgroundColor: colors.card }]}>
    <Ionicons name="heart-outline" size={48} color={colors.primary} />
    <Text style={[styles.welcomeTitle, { color: colors.text }]}>
      Welcome to CineLink!
    </Text>
    <Text style={[styles.welcomeText, { color: colors.text }]}>
      Add movies to your favorites to get personalized recommendations
    </Text>
    <TouchableOpacity
      style={[styles.welcomeButton, { backgroundColor: colors.primary }]}
      onPress={onExplore}
    >
      <Text style={styles.welcomeButtonText}>Start Exploring</Text>
    </TouchableOpacity>
  </View>
));
WelcomeCard.displayName = "WelcomeCard";

const sectionKey = (s) => s.id;

const HomeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const {
    favorites,
    initialized: favoritesInitialized,
    refreshFavorites,
  } = useFavorites();
  const { width } = useWindowDimensions();
  const tabBarHeight = useTabBarHeight();

  const [watchlists, setWatchlists] = useState({});
  const [watchlistsLoaded, setWatchlistsLoaded] = useState(false);
  const [watchlistError, setWatchlistError] = useState(false);
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);

  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );

  const loadWatchlists = useCallback(async () => {
    try {
      const lists = await getWatchlists();
      setWatchlists((prev) =>
        listsSignature(prev) === listsSignature(lists) ? prev : lists,
      );
      setWatchlistError(false);
    } catch (error) {
      logger.error("Error loading watchlists", error);
      setWatchlistError(true);
    } finally {
      setWatchlistsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadWatchlists();
  }, [loadWatchlists]);

  // Refresh watchlists when returning to this screen (skip the initial focus)
  useEffect(() => {
    let focusCount = 0;
    return navigation.addListener("focus", () => {
      focusCount += 1;
      if (focusCount > 1) loadWatchlists();
    });
  }, [navigation, loadWatchlists]);

  const ready = favoritesInitialized && watchlistsLoaded;
  const isNewUser =
    ready && favorites.length === 0 && Object.keys(watchlists).length === 0;
  const profile = useUserProfile(watchlists);

  const feed = useHomeFeed({
    favorites,
    watchlists,
    profile,
    isNewUser,
    ready,
  });

  const openDetails = useCallback(
    (item) => {
      if (item?.imdbID) navigation.navigate("Details", { imdbID: item.imdbID });
    },
    [navigation],
  );
  const openGenre = useCallback(
    (genre) => navigation.navigate("Search", { genre }),
    [navigation],
  );
  const openSearch = useCallback(
    () => navigation.navigate("Search"),
    [navigation],
  );

  const handleRetry = useCallback(() => {
    setWatchlistError(false);
    setWatchlistsLoaded(false);
    loadWatchlists();
    refreshFavorites?.();
    feed.retry();
  }, [loadWatchlists, refreshFavorites, feed]);

  const onRefresh = useCallback(async () => {
    setPullRefreshing(true);
    await Promise.all([feed.reload(), loadWatchlists(), refreshFavorites?.()]);
    setPullRefreshing(false);
  }, [feed, loadWatchlists, refreshFavorites]);

  const renderSection = useCallback(
    ({ item }) => (
      <HomeSection
        section={item}
        width={width}
        colors={colors}
        theme={theme}
        onOpen={openDetails}
      />
    ),
    [width, colors, theme, openDetails],
  );

  const topGenres = profile.topGenres;
  const listHeader = useMemo(
    () => (
      <>
        {isNewUser && <WelcomeCard colors={colors} onExplore={openSearch} />}
        <FeaturedCarousel
          items={feed.featured}
          width={Math.max(width - 40, 280)}
          onOpen={openDetails}
        />
        <View style={styles.chipsWrap}>
          <GenreChips
            order={topGenres}
            onPress={openGenre}
            colors={colors}
            theme={theme}
          />
        </View>
      </>
    ),
    [
      isNewUser,
      colors,
      theme,
      feed.featured,
      width,
      openDetails,
      openGenre,
      openSearch,
      topGenres,
    ],
  );

  const tagline = isNewUser
    ? "Your Movie Heaven"
    : ready
      ? `${favorites.length} favorites • ${profile.watchProgress.total} in watchlist`
      : "Loading...";

  let body;
  if (watchlistError || feed.status === "error") {
    body = (
      <View style={{ flex: 1, paddingTop: headerHeight }}>
        <RetryState
          title="Unable to load home"
          message="We could not reach the server. Check your internet and retry."
          onRetry={handleRetry}
        />
      </View>
    );
  } else if (!ready || feed.status === "loading") {
    body = (
      <View style={{ flex: 1, paddingTop: headerHeight }}>
        <HomeScreenSkeleton />
      </View>
    );
  } else {
    body = (
      <Animated.FlatList
        data={feed.sections}
        keyExtractor={sectionKey}
        renderItem={renderSection}
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerHeight,
          paddingBottom: tabBarHeight + 16,
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        initialNumToRender={3}
        maxToRenderPerBatch={2}
        windowSize={5}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <HomeHeader
        tagline={tagline}
        theme={theme}
        colors={colors}
        scrollY={scrollY}
        onHeight={setHeaderHeight}
      />
      {body}
    </SafeAreaView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safe: { flex: 1 },
  chipsWrap: { marginBottom: 28 },
  welcome: {
    marginHorizontal: 20,
    marginTop: 20,
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
  welcomeButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
