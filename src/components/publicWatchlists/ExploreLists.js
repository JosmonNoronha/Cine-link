import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import PublicListCard from "./PublicListCard";
import RetryState from "../shared/RetryState";
import usePublicLists from "../../hooks/usePublicLists";
import { useTabBarHeight } from "../../hooks/useTabBarHeight";

const SORTS = [
  { key: "popular", label: "Popular" },
  { key: "recent", label: "New" },
];

/**
 * Pure discovery. Your own lists live in the Watchlists tab; here you browse
 * other people's public lists, like them, and add them to your library.
 */
const ExploreLists = ({ navigation }) => {
  const { colors } = useTheme();
  const tabBarHeight = useTabBarHeight();
  const [sort, setSort] = useState("popular");
  const [tag, setTag] = useState(null);

  const feed = usePublicLists({ sort, tag });

  const openList = useCallback(
    (list) => navigation.navigate("PublicWatchlist", { id: list.id, preview: list }),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <PublicListCard
        list={item}
        colors={colors}
        inLibrary={Boolean(item.viewerIsFollowing)}
        onPress={openList}
        onToggleLike={feed.toggleLike}
        onToggleSave={feed.toggleSave}
        onTagPress={setTag}
      />
    ),
    [colors, openList, feed.toggleLike, feed.toggleSave],
  );

  return (
    <View style={styles.flex}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chips}
      >
        {SORTS.map((s) => {
          const active = s.key === sort;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSort(s.key)}
              style={[
                styles.chip,
                {
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? `${colors.primary}22` : "transparent",
                },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.text }]}>{s.label}</Text>
            </Pressable>
          );
        })}
        {tag ? (
          <Pressable
            onPress={() => setTag(null)}
            style={[styles.chip, { borderColor: colors.primary, backgroundColor: colors.primary }]}
          >
            <Text style={[styles.chipText, { color: "#fff" }]}>#{tag}  ✕</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {feed.status === "loading" && feed.lists.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : feed.status === "error" && feed.lists.length === 0 ? (
        <RetryState
          title="Couldn't load lists"
          message="Check your connection and try again."
          onRetry={() => feed.reload()}
          compact
        />
      ) : (
        <FlatList
          data={feed.lists}
          keyExtractor={(l) => l.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: 2, paddingBottom: tabBarHeight + 16 }}
          showsVerticalScrollIndicator={false}
          onEndReached={feed.loadMore}
          onEndReachedThreshold={0.6}
          refreshControl={
            <RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="compass-outline" size={44} color={colors.text} style={styles.emptyIcon} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {tag ? `No lists tagged #${tag}` : "No public lists yet"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.text }]}>
                {tag ? "Try another tag." : "Create one from the Watchlists tab and share your taste."}
              </Text>
            </View>
          }
          ListFooterComponent={
            feed.loadingMore ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null
          }
          initialNumToRender={6}
          windowSize={7}
          removeClippedSubviews
        />
      )}
    </View>
  );
};

export default ExploreLists;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chipsScroll: { flexGrow: 0, marginBottom: 12 },
  chips: { gap: 8, paddingHorizontal: 2 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  footer: { paddingVertical: 16 },
  empty: { alignItems: "center", paddingTop: 70, paddingHorizontal: 32, gap: 6 },
  emptyIcon: { opacity: 0.4, marginBottom: 6 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySub: { fontSize: 14, opacity: 0.6, textAlign: "center" },
});