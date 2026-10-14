import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import PublicListPost from "./PublicListPost";
import FeaturedListCard from "./FeaturedListCard";
import RetryState from "../shared/RetryState";
import usePublicLists from "../../hooks/usePublicLists";
import { useTabBarHeight } from "../../hooks/useTabBarHeight";
import withAlpha from "../../utils/withAlpha";

const H_PAD = 16; // matches the Watchlists screen gutter
const GAP = 12;
const HERO_COUNT = 4;
const SORTS = [
  { key: "popular", label: "Trending", icon: "flame" },
  { key: "recent", label: "New", icon: "sparkles" },
];

/**
 * Discovery feed: a trending carousel, tag shortcuts, then post-style collections.
 * Your own lists live in the Watchlists tab; this is only for finding new ones.
 */
const ExploreLists = ({ navigation }) => {
  const { colors } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const tabBarHeight = useTabBarHeight();
  const [sort, setSort] = useState("popular");
  const [tag, setTag] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);

  const feed = usePublicLists({ sort, tag });

  const contentW = screenW - H_PAD * 2;
  const heroW = contentW;

  const openList = useCallback(
    (list) => navigation.navigate("PublicWatchlist", { id: list.id, preview: list }),
    [navigation],
  );

  // Hero only on the default view and only when there is enough to fill a grid after it.
  const showHero = sort === "popular" && !tag && feed.lists.length >= HERO_COUNT + 2;
  const hero = showHero ? feed.lists.slice(0, HERO_COUNT) : [];
  const grid = showHero ? feed.lists.slice(HERO_COUNT) : feed.lists;

  // Tag shortcuts come from what's been seen unfiltered, and stay put while a tag is applied.
  const tagsRef = useRef([]);
  const tags = useMemo(() => {
    if (tag) return tagsRef.current;
    const counts = {};
    feed.lists.forEach((l) => (l.tags || []).forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
    const top = Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])
      .slice(0, 12);
    if (top.length) tagsRef.current = top;
    return tagsRef.current;
  }, [feed.lists, tag]);

  const onHeroScroll = useCallback(
    (e) => setHeroIndex(Math.round(e.nativeEvent.contentOffset.x / (heroW + GAP))),
    [heroW],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <PublicListPost
        list={item}
        colors={colors}
        width={contentW}
        onPress={openList}
        onToggleLike={feed.toggleLike}
        onToggleSave={feed.toggleSave}
      />
    ),
    [colors, contentW, openList, feed.toggleLike, feed.toggleSave],
  );

  const Header = (
    <View>
      {hero.length ? (
        <View style={styles.heroBlock}>
          <ScrollView
            horizontal
            pagingEnabled={false}
            snapToInterval={heroW + GAP}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onScroll={onHeroScroll}
            scrollEventThrottle={32}
            contentContainerStyle={{ gap: GAP }}
          >
            {hero.map((l, i) => (
              <FeaturedListCard key={l.id} list={l} rank={i + 1} width={heroW} onPress={openList} />
            ))}
          </ScrollView>
          <View style={styles.dots}>
            {hero.map((l, i) => (
              <View
                key={l.id}
                style={[
                  styles.dot,
                  {
                    width: i === heroIndex ? 18 : 6,
                    backgroundColor: i === heroIndex ? colors.primary : withAlpha(colors.text, 0.2),
                  },
                ]}
              />
            ))}
          </View>
        </View>
      ) : null}

      {tags.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagScroll}
          contentContainerStyle={styles.tagRow}
        >
          {tags.map((t) => {
            const on = t === tag;
            return (
              <Pressable
                key={t}
                onPress={() => setTag(on ? null : t)}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: on ? colors.primary : withAlpha(colors.text, 0.07),
                  },
                ]}
              >
                <Text style={[styles.tagText, { color: on ? "#fff" : colors.text }]}>#{t}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.sectionRow}>
        <Text style={[styles.section, { color: colors.text }]}>
          {tag ? `#${tag}` : sort === "popular" ? "Popular collections" : "Fresh collections"}
        </Text>
        <View style={[styles.seg, { backgroundColor: withAlpha(colors.text, 0.07) }]}>
          {SORTS.map((s) => {
            const on = s.key === sort;
            return (
              <Pressable
                key={s.key}
                onPress={() => setSort(s.key)}
                style={[styles.segItem, on && { backgroundColor: colors.card }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Ionicons name={s.icon} size={12} color={on ? colors.primary : colors.text} style={{ opacity: on ? 1 : 0.6 }} />
                <Text style={[styles.segText, { color: on ? colors.text : withAlpha(colors.text, 0.6) }]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  if (feed.status === "error" && feed.lists.length === 0) {
    return (
      <RetryState title="Couldn't load lists" message="Check your connection and try again." onRetry={() => feed.reload()} compact />
    );
  }

  const loading = feed.status === "loading" && feed.lists.length === 0;

  return (
    <FlatList
      data={loading ? [] : grid}
      keyExtractor={(l) => l.id}
      renderItem={renderItem}
      ListHeaderComponent={Header}
      contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
      showsVerticalScrollIndicator={false}
      onEndReached={feed.loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={colors.primary} />}
      ListEmptyComponent={
        loading ? (
          <View style={styles.skelWrap}>
            {[0, 1].map((i) => (
              <View key={i} style={[styles.skel, { width: contentW, height: 330, backgroundColor: withAlpha(colors.text, 0.07) }]} />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="compass-outline" size={44} color={colors.text} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {tag ? `No lists tagged #${tag}` : "No public lists yet"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.text }]}>
              {tag ? "Try another tag." : "Create one from the Watchlists tab and share your taste."}
            </Text>
          </View>
        )
      }
      ListFooterComponent={feed.loadingMore ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
      initialNumToRender={4}
      windowSize={7}
      removeClippedSubviews
    />
  );
};

export default ExploreLists;

const styles = StyleSheet.create({
  heroBlock: { marginBottom: 14 },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, marginTop: 10 },
  dot: { height: 6, borderRadius: 3 },
  tagScroll: { flexGrow: 0, marginBottom: 16 },
  tagRow: { gap: 8 },
  tagChip: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  tagText: { fontSize: 13, fontWeight: "700" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  section: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  seg: { flexDirection: "row", borderRadius: 14, padding: 3 },
  segItem: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 6 },
  segText: { fontSize: 12, fontWeight: "700" },
  skelWrap: { gap: 16 },
  skel: { borderRadius: 24 },
  footer: { paddingVertical: 16 },
  empty: { alignItems: "center", paddingTop: 50, paddingHorizontal: 32, gap: 6 },
  emptyIcon: { opacity: 0.4, marginBottom: 6 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySub: { fontSize: 14, opacity: 0.6, textAlign: "center" },
});