// screens/WatchlistScreen.js
import React, { useEffect, useState } from "react";
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
} from "react-native";
import { useTheme } from "@react-navigation/native";
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
} from "../utils/storage";

const WatchlistsScreen = ({ navigation }) => {
  const [watchlists, setWatchlists] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [alertConfig, setAlertConfig] = useState({ visible: false });
  const [isCreatingWatchlist, setIsCreatingWatchlist] = useState(false);
  const { colors } = useTheme();

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
    const unsubscribe = navigation.addListener("focus", fetchWatchlists);
    return unsubscribe;
  }, [navigation]);

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
        message: "A watchlist with this name already exists. Please choose a different name.",
        icon: "information-circle",
        iconColor: "#ffa726",
        buttons: [{ text: "OK", style: "default" }]
      });
      return;
    }

    try {
      setIsCreatingWatchlist(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      await addWatchlist(name);
      setNewName("");
      setModalVisible(false);

      setWatchlists((prev) => ({ ...prev, [name]: [] }));
      setTimeout(fetchWatchlists, 100);
      navigation.setParams({ watchlistsModified: Date.now() });

      showCustomAlert({
        title: "Watchlist Created!",
        message: `"${name}" has been successfully created.`,
        icon: "checkmark-circle",
        iconColor: "#4caf50",
        buttons: [{ text: "Great!", style: "default" }]
      });
    } catch (error) {
      console.error("Error adding watchlist:", error);
      showCustomAlert({
        title: "Unable to Create Watchlist",
        message: "Something went wrong while creating your watchlist. Please try again.",
        icon: "alert-circle",
        iconColor: "#f44336",
        buttons: [{ text: "OK", style: "default" }]
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
          }
        }
      ]
    });
  };

  const renderWatchlistItem = ({ item: name, index }) => {
    const movieCount = watchlists[name]?.length || 0;

    return (
      <WatchlistCard
        name={name}
        movieCount={movieCount}
        index={index}
        onPress={() => navigation.navigate("WatchlistContent", { name })}
        onLongPress={() => handleRemoveWatchlist(name)}
        onDelete={() => handleRemoveWatchlist(name)}
      />
    );
  };

  const watchlistKeys = Object.keys(watchlists);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.headerContainer}>
        <Text style={[styles.header, { color: colors.text }]}>
          My Watchlists
        </Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          Organize your favorite movies
        </Text>
      </View>

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

      {/* FAB */}
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
    </KeyboardAvoidingView>
  );
};

const WatchlistContentScreen = ({ route, navigation }) => {
  const { name } = route.params;
  const [movies, setMovies] = useState([]);
  const [alertConfig, setAlertConfig] = useState({ visible: false });
  const { colors } = useTheme();

  const showCustomAlert = (config) => {
    setAlertConfig({ ...config, visible: true });
  };

  const hideAlert = () => {
    setAlertConfig({ visible: false });
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
    } catch (error) {
      console.error("Failed to remove movie:", error);
    }
  };

  const SwipeDeleteAction = ({ dragX, movie, onPress }) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1.2, 0.8],
      extrapolate: "clamp",
    });
    const opacity = dragX.interpolate({
      inputRange: [-100, -20, 0],
      outputRange: [1, 0.7, 0],
      extrapolate: "clamp",
    });
    
    return (
      <Animated.View style={styles.swipeActionContainer}>
        <TouchableOpacity
          onPress={onPress}
          style={styles.swipeDeleteButton}
          activeOpacity={0.7}
        >
          <Animated.View
            style={[
              styles.swipeDeleteIcon,
              { transform: [{ scale }], opacity }
            ]}
          >
            <Ionicons name="trash" size={28} color="white" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRightActions = (progress, dragX, movie) => (
    <SwipeDeleteAction
      dragX={dragX}
      movie={movie}
      onPress={() =>
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
              onPress: () => handleDeleteMovie(movie.imdbID) 
            },
          ]
        })
      }
    />
  );

  const renderMovie = ({ item }) => (
    <Swipeable
      renderRightActions={(progress, dragX) =>
        renderRightActions(progress, dragX, item)
      }
    >
      <TouchableOpacity
        style={[styles.movieCard, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate("Details", { imdbID: item.imdbID })}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: item.Poster }}
          style={styles.moviePoster}
          resizeMode="cover"
        />
        <View style={styles.movieInfo}>
          <Text
            style={[styles.movieTitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.Title}
          </Text>
          <Text style={[styles.movieYear, { color: colors.text }]}>
            {item.Year}
          </Text>
          <View style={styles.movieTypeContainer}>
            <Text style={styles.movieType}>
              {item.Type.charAt(0).toUpperCase() + item.Type.slice(1)}
            </Text>
          </View>
        </View>
        <View style={styles.movieArrow}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            {movies.length} {movies.length === 1 ? "movie" : "movies"}
          </Text>
        </View>
      </View>

      {movies.length === 0 ? (
        <EmptyState
          icon="videocam-outline"
          title="No Movies Yet"
          subtitle={`Add movies to "${name}" from the search screen`}
        />
      ) : (
        <FlatList
          data={movies}
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
  // WatchlistContent styles
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
  moviePoster: {
    width: 80,
    height: 120,
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
  movieYear: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  movieTypeContainer: {
    alignSelf: "flex-start",
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
  movieArrow: {
    justifyContent: "center",
    paddingRight: 16,
  },
  movieListContainer: {
    paddingBottom: 20,
  },
  swipeActionContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    width: 90,
    height: 120,
  },
  swipeDeleteButton: {
    backgroundColor: "#e74c3c",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    height: "90%",
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  swipeDeleteIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.13)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export { WatchlistsScreen, WatchlistContentScreen };