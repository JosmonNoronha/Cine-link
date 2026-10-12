import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { useCustomTheme } from "../contexts/ThemeContext";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import useLibrary from "../hooks/useLibrary";
import FavoritesScreen from "./FavoritesScreen";
import ExploreLists from "../components/publicWatchlists/ExploreLists";
import LibraryListCard from "../components/watchlist/LibraryListCard";
import LibraryFilterChips from "../components/watchlist/LibraryFilterChips";
import CreateWatchlistModal from "../components/watchlist/CreateWatchlistModal";
import GlassSegmentedControl from "../components/shared/GlassSegmentedControl";
import IconToggleButton from "../components/shared/IconToggleButton";
import CustomAlert from "../components/shared/CustomAlert";
import EmptyState from "../components/shared/EmptyState";
import RetryState from "../components/shared/RetryState";
import { useFavorites } from "../contexts/FavoritesContext";
import { addWatchlist, removeWatchlist } from "../utils/storage";
import { recordListCreatedWithName } from "../utils/gamification";
import {
  createPublicList,
  deletePublicList,
  toggleFollowPublicList,
} from "../services/api/publicWatchlists";
import publicListEvents from "../utils/publicListEvents";
import logger from "../services/logger";

const TABS = [
  { key: "watchlists", label: "Watchlists", icon: "bookmark-outline" },
  { key: "favorites", label: "Favorites", icon: "heart-outline" },
  { key: "explore", label: "Explore", icon: "compass-outline" },
];

const TAB_META = {
  watchlists: { title: "Watchlists", icon: "bookmark" },
  favorites: { title: "Favorites", icon: "heart" },
  explore: { title: "Explore", icon: "compass" },
};

const EMPTY = {
  all: ["No Watchlists Yet", "Create a private list for yourself, or a public one to share."],
  private: ["No private lists", "Private lists are only visible to you."],
  public: ["No public lists", "Create a public list so others can discover it."],
  saved: ["Nothing saved yet", "Tap the bookmark on any list in Explore to add it to your library."],
};

const WatchlistsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const { favorites } = useFavorites();

  const [activeTab, setActiveTab] = useState("watchlists");
  const [filter, setFilter] = useState("all");
  const [libraryViewType, setLibraryViewType] = useState("list");
  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false });
  const [toast, setToast] = useState(null);

  const library = useLibrary();
  const toastAnim = useRef(new Animated.Value(0)).current;
  const mountedAt = useRef(Date.now());

  // Re-sync when returning to this screen (e.g. after ticking titles as watched),
  // but not on the initial focus, which the hook already covers.
  useEffect(() => {
    const unsub = navigation.addListener("focus", () => {
      if (Date.now() - mountedAt.current > 1500) library.reload();
    });
    return unsub;
  }, [navigation, library.reload]);

  const showToast = useCallback(
    (message) => {
      setToast(message);
      toastAnim.setValue(0);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.delay(1700),
        Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => setToast(null));
    },
    [toastAnim],
  );

  const showAlert = useCallback((config) => setAlertConfig({ ...config, visible: true }), []);
  const hideAlert = useCallback(() => setAlertConfig({ visible: false }), []);
  const errorAlert = useCallback(
    (title, message) =>
      showAlert({
        title,
        message,
        icon: "alert-circle",
        iconColor: "#f44336",
        buttons: [{ text: "OK", style: "default" }],
      }),
    [showAlert],
  );

  // ── Create ──────────────────────────────────────────────────────────────────

  const handleCreate = useCallback(
    async ({ name, visibility, description, tags }) => {
      if (!name) return;

      if (visibility === "private") {
        if (library.privateLists[name]) {
          showAlert({
            title: "Watchlist Already Exists",
            message: "A private watchlist with this name already exists. Please choose a different name.",
            icon: "information-circle",
            iconColor: "#ffa726",
            buttons: [{ text: "OK", style: "default" }],
          });
          return;
        }
        try {
          setCreating(true);
          await addWatchlist(name);
          setModalVisible(false);
          library.addPrivateLocal(name);
          library.reload();
          navigation.setParams({ watchlistsModified: Date.now() });
          const gamification = await recordListCreatedWithName(name);
          showToast(gamification?.xpGained > 0 ? `Created "${name}" • +15 XP` : `Created "${name}"`);
        } catch (error) {
          logger.error("Error adding watchlist", error);
          errorAlert("Unable to Create Watchlist", "Something went wrong while creating your watchlist. Please try again.");
        } finally {
          setCreating(false);
        }
        return;
      }

      try {
        setCreating(true);
        const created = await createPublicList({ name, description, tags });
        setModalVisible(false);
        library.reload();
        publicListEvents.emit({ type: "library" });
        showToast(`Created public list "${name}"`);
        navigation.navigate("PublicWatchlist", { id: created.id, preview: created });
      } catch (error) {
        logger.error("Error creating public list", error);
        errorAlert(
          "Unable to Create Public List",
          error?.response?.status === 413
            ? "You've reached the limit of public lists."
            : "Something went wrong. Please try again.",
        );
      } finally {
        setCreating(false);
      }
    },
    [library, navigation, showAlert, showToast, errorAlert],
  );

  // ── Delete / remove ─────────────────────────────────────────────────────────

  const handleAction = useCallback(
    (entry) => {
      const isSaved = entry.kind === "saved";
      const isPublic = entry.kind === "public";
      showAlert({
        title: isSaved ? "Remove from library" : "Delete Watchlist",
        message: isSaved
          ? `Remove "${entry.name}" from your library? The list itself isn't affected.`
          : isPublic
            ? `Delete "${entry.name}"? It will disappear for everyone and can't be recovered.`
            : `Are you sure you want to delete "${entry.name}"? All titles in this list will be removed.`,
        icon: isSaved ? "bookmark" : "trash",
        iconColor: isSaved ? "#f2a93b" : "#f44336",
        buttons: [
          { text: "Cancel", style: "cancel" },
          {
            text: isSaved ? "Remove" : "Delete",
            style: "destructive",
            onPress: async () => {
              hideAlert();
              try {
                if (entry.kind === "private") {
                  await removeWatchlist(entry.name);
                  library.removePrivateLocal(entry.name);
                  navigation.setParams({ watchlistsModified: Date.now() });
                } else if (isPublic) {
                  await deletePublicList(entry.list.id);
                  library.removePublicLocal(entry.list.id);
                  publicListEvents.emit({ type: "removed", id: entry.list.id });
                  publicListEvents.emit({ type: "library" });
                } else {
                  await toggleFollowPublicList(entry.list.id);
                  library.removeSavedLocal(entry.list.id);
                  publicListEvents.emit({
                    type: "patch",
                    id: entry.list.id,
                    patch: { viewerIsFollowing: false },
                  });
                }
                showToast(isSaved ? `Removed "${entry.name}"` : `Deleted "${entry.name}"`);
              } catch (error) {
                logger.error("Error removing list", error);
                errorAlert("Something went wrong", "Please try again.");
                library.reload();
              }
            },
          },
        ],
      });
    },
    [library, navigation, showAlert, hideAlert, showToast, errorAlert],
  );

  const openEntry = useCallback(
    (entry) => {
      if (entry.kind === "private") navigation.navigate("WatchlistContent", { name: entry.name });
      else navigation.navigate("PublicWatchlist", { id: entry.list.id, preview: entry.list });
    },
    [navigation],
  );

  // ── Derived ─────────────────────────────────────────────────────────────────

  const visibleEntries = useMemo(
    () => (filter === "all" ? library.entries : library.entries.filter((e) => e.kind === filter)),
    [library.entries, filter],
  );

  const filterOptions = useMemo(
    () => [
      { key: "all", label: "All", count: library.counts.all },
      { key: "private", label: "Private", count: library.counts.private },
      { key: "public", label: "Public", count: library.counts.public },
      { key: "saved", label: "Saved", count: library.counts.saved },
    ],
    [library.counts],
  );

  const renderEntry = useCallback(
    ({ item }) => (
      <LibraryListCard entry={item} colors={colors} onPress={openEntry} onAction={handleAction} onLongPress={handleAction} />
    ),
    [colors, openEntry, handleAction],
  );

  const meta = TAB_META[activeTab];
  const [emptyTitle, emptySub] = EMPTY[filter];
  const isDark = theme === "dark";

  const body = (() => {
    if (activeTab === "explore") return <ExploreLists navigation={navigation} />;
    if (activeTab === "favorites") {
      return (
        <View style={styles.flex}>
          <FavoritesScreen
            navigation={navigation}
            embedded
            viewType={libraryViewType}
            onChangeViewType={setLibraryViewType}
          />
        </View>
      );
    }

    if (library.status === "loading" && library.entries.length === 0) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }
    if (library.status === "error" && library.entries.length === 0) {
      return (
        <RetryState
          title="Unable to load watchlists"
          message="Check your internet and try again."
          onRetry={library.reload}
          compact
        />
      );
    }

    return (
      <>
        <LibraryFilterChips options={filterOptions} value={filter} onChange={setFilter} />
        {library.partial ? (
          <Text style={[styles.partial, { color: colors.text }]}>Some lists couldn't be loaded. Pull back to retry.</Text>
        ) : null}
        <FlatList
          data={visibleEntries}
          keyExtractor={(e) => e.key}
          renderItem={renderEntry}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 72 }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          windowSize={7}
          removeClippedSubviews
          ListEmptyComponent={
            <EmptyState
              icon={filter === "saved" ? "bookmark-outline" : "list-outline"}
              title={emptyTitle}
              subtitle={emptySub}
              buttonText="Create Watchlist"
              onButtonPress={() => setModalVisible(true)}
              showButton={filter !== "saved"}
            />
          }
        />
        {library.entries.length > 0 ? (
          <Pressable
            onPress={() => setModalVisible(true)}
            style={[styles.fab, { bottom: tabBarHeight + 8 }]}
            accessibilityRole="button"
            accessibilityLabel="Create watchlist"
          >
            <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.fabGradient}>
              <Ionicons name="add" size={28} color="#fff" />
            </LinearGradient>
          </Pressable>
        ) : null}
      </>
    );
  })();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 22 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { borderColor: colors.border }]}>
        <BlurView
          intensity={isDark ? 32 : 48}
          tint={isDark ? "dark" : "light"}
          experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? "rgba(12,16,24,0.72)" : "rgba(255,255,255,0.76)" },
          ]}
        />
        <View style={styles.headerTop}>
          <View style={styles.titleRow}>
            <Ionicons name={meta.icon} size={18} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>{meta.title}</Text>
          </View>
          {activeTab === "favorites" && favorites.length > 0 ? (
            <IconToggleButton
              icon={libraryViewType === "list" ? "grid-outline" : "list-outline"}
              onPress={() => setLibraryViewType((v) => (v === "list" ? "grid" : "list"))}
              theme={theme}
            />
          ) : null}
        </View>
        <GlassSegmentedControl options={TABS} value={activeTab} onChange={setActiveTab} theme={theme} />
      </View>

      <View style={styles.flex}>{body}</View>

      <CreateWatchlistModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleCreate}
        isLoading={creating}
      />

      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
            },
          ]}
        >
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      ) : null}

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

export default WatchlistsScreen;
export { WatchlistsScreen };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 36 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  partial: { fontSize: 12, opacity: 0.6, marginBottom: 8, paddingHorizontal: 2 },
  fab: {
    position: "absolute",
    right: 4,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabGradient: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  toast: {
    position: "absolute",
    alignSelf: "center",
    bottom: 120,
    backgroundColor: "rgba(20,20,26,0.94)",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  toastText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});