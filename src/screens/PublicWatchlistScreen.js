import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RetryState from "../components/shared/RetryState";
import AddTitlesModal from "../components/publicWatchlists/AddTitlesModal";
import {
  getPublicList,
  getPublicListItems,
  toggleLikePublicList,
  toggleFollowPublicList,
  removePublicListItem,
  deletePublicList,
  reportPublicList,
  blockUser,
} from "../services/api/publicWatchlists";
import publicListEvents from "../utils/publicListEvents";
import logger from "../services/logger";

const COLS = 3;
const GAP = 10;
const PAD = 16;
const CARD_W = (Dimensions.get("window").width - PAD * 2 - GAP * (COLS - 1)) / COLS;

const REPORT_REASONS = [
  ["spam", "Spam"],
  ["offensive", "Offensive content"],
  ["copyright", "Copyright"],
  ["other", "Something else"],
];

const PublicWatchlistScreen = ({ route, navigation }) => {
  const { id, preview } = route.params;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [list, setList] = useState(preview || null);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error | gone
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const cursorRef = useRef(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [meta, page] = await Promise.all([getPublicList(id), getPublicListItems(id, { limit: 30 })]);
      if (!mountedRef.current) return;
      setList(meta);
      setItems(page?.items || []);
      cursorRef.current = page?.nextCursor || null;
      setHasMore(Boolean(page?.hasMore));
      setStatus("ready");
    } catch (error) {
      if (!mountedRef.current) return;
      setStatus(error?.response?.status === 404 ? "gone" : "error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = publicListEvents.subscribe((event) => {
      if (event.id && event.id !== id) return;

      if (event.type === "removed") {
        setList(null);
        setItems([]);
        cursorRef.current = null;
        setHasMore(false);
        setStatus("gone");
        return;
      }

      if (event.type === "library") {
        load();
      }
    });
    return unsubscribe;
  }, [id, load]);

  const loadMore = useCallback(async () => {
    if (!hasMore || busyRef.current || !cursorRef.current) return;
    busyRef.current = true;
    setLoadingMore(true);
    try {
      const page = await getPublicListItems(id, { limit: 30, cursor: cursorRef.current });
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...(page?.items || []).filter((i) => !seen.has(i.id))];
      });
      cursorRef.current = page?.nextCursor || null;
      setHasMore(Boolean(page?.hasMore));
    } catch (error) {
      logger.warn("Failed to load more items", error?.message);
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, id]);

  const isOwner = Boolean(list?.viewerIsOwner);

  // Optimistic like / follow with rollback.
  const toggle = useCallback(
    async (flag, countKey, call) => {
      if (!list) return;
      const next = !list[flag];
      const delta = next ? 1 : -1;
      setList((l) => ({ ...l, [flag]: next, [countKey]: Math.max(0, (l[countKey] || 0) + delta) }));
      const patch = (l) => ({ [flag]: next, [countKey]: Math.max(0, (l[countKey] || 0) + delta) });
      try {
        await call(id);
        publicListEvents.emit({ type: "patch", id, patch: patch(list) });
        if (flag === "viewerIsFollowing") publicListEvents.emit({ type: "library" });
      } catch {
        setList((l) => ({ ...l, [flag]: !next, [countKey]: Math.max(0, (l[countKey] || 0) - delta) }));
      }
    },
    [id, list],
  );

  const onLike = () => !isOwner && toggle("viewerHasLiked", "likeCount", toggleLikePublicList);
  const onFollow = () => toggle("viewerIsFollowing", "followCount", toggleFollowPublicList);

  const openItem = useCallback(
    (item) => navigation.navigate("Details", { imdbID: `tmdb:${item.media_type}:${item.tmdb_id}` }),
    [navigation],
  );

  const confirmRemove = useCallback(
    (item) => {
      if (!isOwner) return;
      Alert.alert("Remove title", `Remove "${item.title}" from this list?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const snapshot = items;
            setItems((prev) => prev.filter((i) => i.id !== item.id));
            setList((l) => ({ ...l, itemCount: Math.max(0, (l.itemCount || 1) - 1) }));
            try {
              await removePublicListItem(id, item.id);
              publicListEvents.emit({ type: "patch", id, patch: { itemCount: Math.max(0, (list?.itemCount || 1) - 1) } });
            } catch {
              setItems(snapshot);
              setList((l) => ({ ...l, itemCount: (l.itemCount || 0) + 1 }));
              Alert.alert("Couldn't remove", "Please try again.");
            }
          },
        },
      ]);
    },
    [id, isOwner, items],
  );

  const confirmDelete = () =>
    Alert.alert("Delete list", "This permanently deletes the list for everyone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePublicList(id);
            publicListEvents.emit({ type: "removed", id });
            navigation.goBack();
          } catch {
            Alert.alert("Couldn't delete", "Please try again.");
          }
        },
      },
    ]);

  const sendReport = (reason) =>
    reportPublicList(id, { reason })
      .then(() => Alert.alert("Thanks", "We'll review this list."))
      .catch(() => Alert.alert("Couldn't send report", "Please try again."));

  const confirmBlock = () => {
    if (!list?.ownerId) return;
    const who = list.ownerName || "this user";
    Alert.alert(
      `Block ${who}?`,
      "You won't see their public lists anymore. You can unblock them any time in Settings > Blocked users.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await blockUser(list.ownerId, list.ownerName || "");
              publicListEvents.emit({ type: "blocked", ownerId: list.ownerId });
              publicListEvents.emit({ type: "removed", id });
              publicListEvents.emit({ type: "library" });
              navigation.goBack();
            } catch {
              Alert.alert("Couldn't block", "Please try again.");
            }
          },
        },
      ],
    );
  };

  const openReportMenu = () =>
    Alert.alert("Report this list", "Why are you reporting it?", [
      ...REPORT_REASONS.map(([reason, label]) => ({ text: label, onPress: () => sendReport(reason) })),
      { text: "Cancel", style: "cancel" },
    ]);

  const openMenu = () => {
    if (isOwner) {
      Alert.alert(list?.name || "List", undefined, [
        { text: "Add titles", onPress: () => setAddVisible(true) },
        { text: "Delete list", style: "destructive", onPress: confirmDelete },
        { text: "Cancel", style: "cancel" },
      ]);
    } else {
      Alert.alert(list?.name || "List", undefined, [
        { text: "Report this list", onPress: openReportMenu },
        { text: `Block ${list?.ownerName || "this user"}`, style: "destructive", onPress: confirmBlock },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const existingKeys = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const Header = list ? (
    <View>
      <View style={styles.hero}>
        {list.coverPoster ? (
          <Image source={{ uri: list.coverPoster }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={BLUR} />
        ) : null}
        <LinearGradient
          colors={["rgba(0,0,0,0.25)", colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.heroBody, { paddingTop: insets.top + 64 }]}>
          <Text style={[styles.name, { color: colors.text }]}>{list.name}</Text>
          <Text style={[styles.owner, { color: colors.text }]}>
            by {list.ownerName || "Anonymous"} · {list.itemCount} {list.itemCount === 1 ? "title" : "titles"}
          </Text>
          {list.description ? (
            <Text style={[styles.desc, { color: colors.text }]}>{list.description}</Text>
          ) : null}
          {list.tags?.length ? (
            <View style={styles.tags}>
              {list.tags.map((t) => (
                <Text key={t} style={[styles.tag, { color: colors.primary, borderColor: colors.border }]}>
                  #{t}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.actions}>
            {!isOwner ? (
              <Pressable
                onPress={onLike}
                style={[styles.action, { borderColor: colors.border, backgroundColor: colors.card }]}
              >
                <Ionicons
                  name={list.viewerHasLiked ? "heart" : "heart-outline"}
                  size={18}
                  color={list.viewerHasLiked ? "#ff5a6e" : colors.text}
                />
                <Text style={[styles.actionText, { color: colors.text }]}>{list.likeCount || 0}</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setAddVisible(true)}
                style={[styles.action, { borderColor: colors.primary, backgroundColor: colors.primary }]}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={[styles.actionText, { color: "#fff" }]}>Add titles</Text>
              </Pressable>
            )}
            {!isOwner ? (
              <Pressable
                onPress={onFollow}
                style={[
                  styles.action,
                  {
                    borderColor: list.viewerIsFollowing ? "#f2a93b" : colors.border,
                    backgroundColor: colors.card,
                  },
                ]}
                accessibilityLabel={list.viewerIsFollowing ? "Remove from library" : "Add to library"}
              >
                <Ionicons
                  name={list.viewerIsFollowing ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={list.viewerIsFollowing ? "#f2a93b" : colors.text}
                />
                <Text style={[styles.actionText, { color: colors.text }]}>
                  {list.viewerIsFollowing ? "In library" : "Add to library"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
      {isOwner && items.length > 0 ? (
        <Text style={[styles.hintText, { color: colors.text }]}>Long-press a title to remove it</Text>
      ) : null}
    </View>
  ) : null;

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => openItem(item)}
      onLongPress={() => confirmRemove(item)}
      style={styles.cell}
      accessibilityLabel={item.title}
    >
      <Image
        source={item.poster ? { uri: item.poster } : undefined}
        style={styles.poster}
        contentFit="cover"
        transition={120}
        recyclingKey={item.id}
      />
      <Text style={[styles.cellTitle, { color: colors.text }]} numberOfLines={1}>
        {item.title}
      </Text>
      {item.year ? <Text style={[styles.cellYear, { color: colors.text }]}>{item.year}</Text> : null}
    </Pressable>
  );

  let body;
  if (status === "gone") {
    body = (
      <View style={styles.center}>
        <Ionicons name="eye-off-outline" size={44} color={colors.text} style={styles.dim} />
        <Text style={[styles.goneTitle, { color: colors.text }]}>This list isn't available</Text>
        <Text style={[styles.goneSub, { color: colors.text }]}>It may have been deleted or made private.</Text>
      </View>
    );
  } else if (status === "error" && !list) {
    body = (
      <View style={[styles.center, { paddingTop: insets.top + 60 }]}>
        <RetryState title="Couldn't load list" onRetry={load} compact />
      </View>
    );
  } else if (status === "loading" && !list) {
    body = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else {
    body = (
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        numColumns={COLS}
        columnWrapperStyle={styles.column}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          status === "ready" ? (
            <Text style={[styles.empty, { color: colors.text }]}>
              {isOwner ? "Nothing here yet — add your first title." : "This list is empty."}
            </Text>
          ) : (
            <ActivityIndicator style={styles.emptySpinner} color={colors.primary} />
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {body}

      {/* Fixed glass-style controls, matching the Details screen back button. */}
      <View style={[styles.topBar, { top: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.roundBtn, { backgroundColor: "rgba(18,18,22,0.72)" }]}
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        {list && status !== "gone" ? (
          <Pressable
            onPress={openMenu}
            style={[styles.roundBtn, { backgroundColor: "rgba(18,18,22,0.72)" }]}
            accessibilityLabel="More options"
          >
            <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      <AddTitlesModal
        visible={addVisible}
        listId={id}
        existingKeys={existingKeys}
        onClose={() => setAddVisible(false)}
        onAdded={(item) => {
          const nextItemCount = (list?.itemCount || 0) + 1;
          const nextCoverPoster = list?.coverPoster || item.poster;
          setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [item, ...prev]));
          setList((current) => ({
            ...current,
            itemCount: nextItemCount,
            coverPoster: nextCoverPoster,
          }));
          publicListEvents.emit({
            type: "patch",
            id,
            patch: { itemCount: nextItemCount, coverPoster: nextCoverPoster },
          });
        }}
      />
    </View>
  );
};

const BLUR = 24;

export default PublicWatchlistScreen;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 6 },
  dim: { opacity: 0.4 },
  hero: { overflow: "hidden" },
  heroBody: { paddingHorizontal: PAD, paddingBottom: 18, gap: 6 },
  name: { fontSize: 30, fontWeight: "800", letterSpacing: -0.6 },
  owner: { fontSize: 13, opacity: 0.7 },
  desc: { fontSize: 14, opacity: 0.85, marginTop: 4, lineHeight: 20 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  tag: { fontSize: 12, fontWeight: "700", borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, overflow: "hidden" },
  actions: { flexDirection: "row", gap: 10, marginTop: 12 },
  action: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 },
  actionText: { fontSize: 14, fontWeight: "700" },
  hintText: { fontSize: 12, opacity: 0.45, paddingHorizontal: PAD, marginBottom: 8 },
  column: { gap: GAP, paddingHorizontal: PAD },
  cell: { width: CARD_W, marginBottom: 14 },
  poster: { width: CARD_W, height: CARD_W * 1.5, borderRadius: 12, backgroundColor: "#1b1f2a" },
  cellTitle: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  cellYear: { fontSize: 11, opacity: 0.5 },
  empty: { textAlign: "center", opacity: 0.55, marginTop: 30, paddingHorizontal: 32 },
  emptySpinner: { marginTop: 30 },
  footer: { paddingVertical: 16 },
  goneTitle: { fontSize: 17, fontWeight: "700", marginTop: 8 },
  goneSub: { fontSize: 14, opacity: 0.6, textAlign: "center" },
  topBar: { position: "absolute", left: PAD, right: PAD, flexDirection: "row", justifyContent: "space-between" },
  roundBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.18)" },
});