import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useCustomTheme } from "../contexts/ThemeContext";
import { getFavorites } from "../utils/storage";
import AppLoader from "../components/AppLoader";
import InlineUpdating from "../components/InlineUpdating";

const FavoritesScreen = ({ navigation }) => {
  const [favorites, setFavorites] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showUpdate, setShowUpdate] = useState(false);
  const hasLoadedOnce = useRef(false);
  const previousFavoritesCount = useRef(0);

  const { colors } = useTheme();
  const { theme } = useCustomTheme();

  const fetchFavorites = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    }

    const favs = await getFavorites();

    setFavorites((prev) => {
      const changed =
        favs.length !== prev.length ||
        favs.some((f, i) => f.imdbID !== prev[i]?.imdbID);

      if (changed && hasLoadedOnce.current) {
        setShowUpdate(true);
        setTimeout(() => setShowUpdate(false), 3000);
        
        // Mark that favorites have changed for other screens
        if (favs.length !== previousFavoritesCount.current) {
          // Set a flag in navigation params that HomeScreen can check
          navigation.setParams({ favoritesUpdated: Date.now() });
        }
      }

      previousFavoritesCount.current = favs.length;
      return favs;
    });

    if (isInitial) {
      setInitialLoading(false);
      hasLoadedOnce.current = true;
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchFavorites(!hasLoadedOnce.current);
    });
    return unsubscribe;
  }, [navigation]);

  // Listen for when user leaves this screen to potentially update HomeScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener("blur", () => {
      // This will help trigger updates when user navigates away
      if (hasLoadedOnce.current) {
        navigation.setParams({ lastVisited: Date.now() });
      }
    });
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("Details", { imdbID: item.imdbID })}
      style={[
        styles.card,
        { backgroundColor: colors.card, shadowColor: colors.text },
      ]}
    >
      {item.Poster !== "N/A" && (
        <Image source={{ uri: item.Poster }} style={styles.poster} />
      )}
      <View style={styles.details}>
        <Text style={[styles.title, { color: colors.text }]}>{item.Title}</Text>
        <Text style={[styles.year, { color: colors.text }]}>{item.Year}</Text>
      </View>
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
        <Text style={[styles.header, { color: colors.text }]}>
          Your Favorites
        </Text>

        {initialLoading ? (
          <AppLoader message="Loading Favorites" />
        ) : favorites.length === 0 ? (
          <Text style={[styles.noFavorites, { color: colors.text }]}>
            You haven't added any favorites yet.
          </Text>
        ) : (
          <>
            {showUpdate && <InlineUpdating text="Updating..." />}
            <FlatList
              data={favorites}
              keyExtractor={(item) => item.imdbID}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
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
  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 16,
  },
  noFavorites: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  listContent: {
    paddingBottom: 20,
  },
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
  details: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  year: {
    fontSize: 14,
    marginTop: 4,
  },
});

export default FavoritesScreen;