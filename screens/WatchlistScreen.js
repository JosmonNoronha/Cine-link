// screens/WatchlistScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  Dimensions,
  Animated,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getWatchlists,
  addWatchlist,
  removeWatchlist,
  removeFromWatchlist,
} from "../utils/storage";
import { Swipeable } from "react-native-gesture-handler";

const { width } = Dimensions.get("window");

const WatchlistsScreen = ({ navigation }) => {
  const [watchlists, setWatchlists] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const { colors } = useTheme();

  const fetchWatchlists = async () => {
    try {
      const data = await getWatchlists();
      console.log("Fetched watchlists:", data);
      console.log("Watchlist keys:", Object.keys(data));
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

  const handleAddWatchlist = async () => {
    const name = newName.trim();
    if (!name) return;
    if (watchlists[name]) {
      Alert.alert(
        "Already Exists",
        "A watchlist with that name already exists."
      );
      return;
    }

    try {
      await addWatchlist(name);
      setNewName("");
      setModalVisible(false);

      // Update the state immediately with the new watchlist
      setWatchlists((prevWatchlists) => ({
        ...prevWatchlists,
        [name]: [],
      }));

      // Also fetch from database to ensure consistency
      setTimeout(() => {
        fetchWatchlists();
      }, 100);
    } catch (error) {
      console.error("Error adding watchlist:", error);
      Alert.alert("Error", "Failed to create watchlist. Please try again.");
    }
  };

  const handleRemoveWatchlist = async (name) => {
    Alert.alert("Delete Watchlist", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await removeWatchlist(name);
          fetchWatchlists();
        },
      },
    ]);
  };

  const renderWatchlistItem = ({ item: name, index }) => {
    const movieCount = watchlists[name]?.length || 0;
    const gradientColors = [
      `hsl(${(index * 137.5) % 360}, 70%, 85%)`,
      `hsl(${(index * 137.5) % 360}, 60%, 75%)`,
    ];

    return (
      <TouchableOpacity
        style={styles.watchlistCard}
        onPress={() => navigation.navigate("WatchlistContent", { name })}
        onLongPress={() => handleRemoveWatchlist(name)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="film-outline"
                  size={24}
                  color={`hsl(${(index * 137.5) % 360}, 50%, 40%)`}
                />
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleRemoveWatchlist(name)}
              >
                <Ionicons name="trash-outline" size={16} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.watchlistName} numberOfLines={2}>
              {name}
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.movieCountContainer}>
                <Ionicons name="videocam-outline" size={14} color="#666" />
                <Text style={styles.movieCount}>
                  {movieCount} {movieCount === 1 ? "movie" : "movies"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={styles.emptyIconGradient}
        >
          <Ionicons name="list-outline" size={48} color="#fff" />
        </LinearGradient>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No Watchlists Yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.text }]}>
        Create your first watchlist to organize your favorite movies
      </Text>
      <Text
        style={[
          styles.emptySubtitle,
          { color: colors.text, fontSize: 12, marginTop: 10 },
        ]}
      >
        Debug: watchlists = {JSON.stringify(watchlists)}
      </Text>
      <TouchableOpacity
        style={styles.createFirstButton}
        onPress={() => setModalVisible(true)}
      >
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={styles.createButtonGradient}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>Create Watchlist</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

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
        data={Object.keys(watchlists)}
        keyExtractor={(item) => item}
        renderItem={renderWatchlistItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={EmptyState}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => {
          console.log("Rendering FlatList with watchlists:", watchlists);
          console.log("Watchlists keys:", Object.keys(watchlists));
          return null;
        }}
      />

      {/* Enhanced FAB button */}
      {Object.keys(watchlists).length > 0 && (
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

      {/* Enhanced Modal for new watchlist */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setModalVisible(false)}
          />
          <View
            style={[styles.modalContainer, { backgroundColor: colors.card }]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <LinearGradient
                  colors={["#667eea", "#764ba2"]}
                  style={styles.modalIconGradient}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Create New Watchlist
              </Text>
            </View>

            <TextInput
              placeholder="Enter watchlist name"
              placeholderTextColor={colors.text + "66"}
              value={newName}
              onChangeText={setNewName}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setModalVisible(false);
                  setNewName("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.createButton]}
                onPress={handleAddWatchlist}
              >
                <LinearGradient
                  colors={["#667eea", "#764ba2"]}
                  style={styles.createButtonGradient}
                >
                  <Text style={styles.createButtonText}>Create</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const WatchlistContentScreen = ({ route, navigation }) => {
  const { name } = route.params;
  const [movies, setMovies] = useState([]);
  const { colors } = useTheme();

  const fetchMovies = async () => {
    const lists = await getWatchlists();
    setMovies(lists[name] || []);
  };

  useEffect(() => {
    fetchMovies();
    const unsubscribe = navigation.addListener("focus", fetchMovies);
    return unsubscribe;
  }, [navigation]);

  const handleDeleteMovie = async (imdbID) => {
    try {
      await removeFromWatchlist(name, imdbID);
      setMovies((prev) => prev.filter((m) => m.imdbID !== imdbID));
    } catch (error) {
      console.error("Failed to remove movie:", error);
    }
  };

  // Swipe delete action component for swipeable row (classic Animated API)
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
      <Animated.View
        style={{
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "transparent",
          width: 90,
          height: 120,
        }}
      >
        <TouchableOpacity
          onPress={onPress}
          style={{
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
          }}
          activeOpacity={0.7}
        >
          <Animated.View
            style={{
              transform: [{ scale }],
              opacity,
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: "rgba(255,255,255,0.13)",
              justifyContent: "center",
              alignItems: "center",
            }}
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
        Alert.alert(
          "Remove Movie",
          `Remove \"${movie.Title}\" from \"${name}\"?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", onPress: () => handleDeleteMovie(movie.imdbID) },
          ]
        )
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

  const EmptyWatchlist = () => (
    <View style={styles.emptyWatchlistContainer}>
      <View style={styles.emptyWatchlistIcon}>
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={styles.emptyWatchlistGradient}
        >
          <Ionicons name="videocam-outline" size={48} color="#fff" />
        </LinearGradient>
      </View>
      <Text style={[styles.emptyWatchlistTitle, { color: colors.text }]}>
        No Movies Yet
      </Text>
      <Text style={[styles.emptyWatchlistSubtitle, { color: colors.text }]}>
        Add movies to "{name}" from the search screen
      </Text>
    </View>
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
        <EmptyWatchlist />
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.imdbID}
          renderItem={renderMovie}
          contentContainerStyle={styles.movieListContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  watchlistCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardGradient: {
    padding: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    padding: 8,
  },
  watchlistName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    lineHeight: 24,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  movieCountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  movieCount: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    marginTop: -50,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  createFirstButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  createButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#00000099",
  },
  modalContainer: {
    borderRadius: 20,
    padding: 24,
    width: width - 40,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
  createButton: {
    overflow: "hidden",
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    textAlign: "center",
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
  emptyWatchlistContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyWatchlistIcon: {
    marginBottom: 24,
  },
  emptyWatchlistGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWatchlistTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyWatchlistSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 22,
  },
});

export { WatchlistsScreen, WatchlistContentScreen };
