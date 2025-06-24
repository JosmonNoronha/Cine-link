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
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  getWatchlists,
  addWatchlist,
  removeWatchlist,
} from "../utils/storage";

const WatchlistsScreen = ({ navigation }) => {
  const [watchlists, setWatchlists] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const { colors } = useTheme();

  const fetchWatchlists = async () => {
    const data = await getWatchlists();
    setWatchlists(data);
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
      Alert.alert("Already Exists", "A watchlist with that name already exists.");
      return;
    }
    await addWatchlist(name);
    setNewName("");
    setModalVisible(false);
    fetchWatchlists();
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

  const renderWatchlistItem = ({ item: name }) => (
    <TouchableOpacity
      style={[styles.listItem, { borderColor: colors.border, backgroundColor: colors.card }]}
      onPress={() => navigation.navigate("WatchlistContent", { name })}
      onLongPress={() => handleRemoveWatchlist(name)}
    >
      <Text style={[styles.listItemText, { color: colors.text }]}>{name}</Text>
      <Ionicons name="chevron-forward" size={20} color={colors.text} />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={[styles.header, { color: colors.text }]}>My Watchlists</Text>

      <FlatList
        data={Object.keys(watchlists)}
        keyExtractor={(item) => item}
        renderItem={renderWatchlistItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.text }]}>
            You haven’t created any watchlists yet.
          </Text>
        }
      />

      {/* FAB button */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.fab}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal for new watchlist */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Create New Watchlist
            </Text>
            <TextInput
              placeholder="Enter watchlist name"
              placeholderTextColor={colors.text + "88"}
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
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#ccc" }]}
                onPress={() => {
                  setModalVisible(false);
                  setNewName("");
                }}
              >
                <Text style={{ color: "#333" }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: "#1976d2" }]}
                onPress={handleAddWatchlist}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Create</Text>
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

  const renderMovie = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => navigation.navigate("Details", { imdbID: item.imdbID })}
    >
      <Image source={{ uri: item.Poster }} style={styles.poster} />
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]}>{item.Title}</Text>
        <Text style={[styles.year, { color: colors.text }]}>{item.Year}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text
          style={[styles.header, { color: colors.text, marginLeft: 12 }]}
          numberOfLines={1}
        >
          {name}
        </Text>
      </View>

      {movies.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No movies in this watchlist.
        </Text>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.imdbID}
          renderItem={renderMovie}
          contentContainerStyle={{ paddingBottom: 20 }}
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
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  listContainer: {
    paddingBottom: 30,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 1,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  card: {
    flexDirection: "row",
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 3,
  },
  poster: {
    width: 80,
    height: 120,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  info: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  year: {
    fontSize: 14,
    opacity: 0.7,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    opacity: 0.6,
    marginTop: 40,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#1976d2",
    padding: 16,
    borderRadius: 50,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#00000099",
    padding: 20,
  },
  modalContainer: {
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    fontSize: 16,
  },
});

export { WatchlistsScreen, WatchlistContentScreen };
