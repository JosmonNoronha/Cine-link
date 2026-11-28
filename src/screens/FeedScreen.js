// screens/FeedScreen.js
//
// One curated list from the Home "Discover" menu (In Theaters, and later Upcoming, Top of all time, ...).
// Which list comes from route.params.feed; how it is described comes from FEED_META.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCustomTheme } from "../contexts/ThemeContext";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import useRegion from "../hooks/useRegion";
import useDiscoverFeed from "../hooks/useDiscoverFeed";
import RetryState from "../components/shared/RetryState";
import PosterCard from "../components/discover/PosterCard";
import RegionSheet from "../components/discover/RegionSheet";
import { FEED_META } from "../components/discover/features";
import { regionName } from "../utils/region";
import { getWatchedTitles } from "../utils/storage";

const COLUMNS = 3;
const GAP = 12;
const PAD = 16;

export default function FeedScreen({ navigation, route }) {
  const feed = route?.params?.feed;
  const meta = FEED_META[feed];
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const isDark = theme === "dark";
  const { width } = useWindowDimensions();
  const tabBarHeight = useTabBarHeight();

  const [region, setRegion] = useRegion();
  const [regionOpen, setRegionOpen] = useState(false);
  const [type, setType] = useState(meta?.types?.[0] || "movie");
  const showRegion = !!meta?.regionalTypes?.includes(type);

  const list = useDiscoverFeed(feed, { type, region, enabled: !!meta && !!region });

  // "Hide watched": ids of everything the user has finished (movies, and series with every episode seen)
  const [hideWatched, setHideWatched] = useState(false);
  const [watchedIds, setWatchedIds] = useState(null);
  useEffect(() => {
    if (!meta?.watchedFilter) return undefined;
    const load = () =>
      getWatchedTitles()
        .then((d) =>
          setWatchedIds(new Set((d?.items || []).filter((i) => i.status === "completed").map((i) => i.contentId))),
        )
        .catch(() => setWatchedIds((prev) => prev || new Set()));
    load();
    return navigation.addListener("focus", load);
  }, [meta, navigation]);

  const shown = useMemo(
    () => (hideWatched && watchedIds ? list.items.filter((i) => !watchedIds.has(i.imdbID)) : list.items),
    [hideWatched, watchedIds, list.items],
  );
  // If hiding leaves the screen nearly empty, keep fetching pages so the list doesn't look finished.
  useEffect(() => {
    if (hideWatched && list.status === "ready" && shown.length < 12) list.loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideWatched, list.status, list.page, list.items.length]);

  const cardWidth = Math.floor((width - PAD * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const openDetails = useCallback(
    (item) => item?.imdbID && navigation.navigate("Details", { imdbID: item.imdbID }),
    [navigation],
  );
  const renderItem = useCallback(
    ({ item }) => (
      <PosterCard item={item} width={cardWidth} dateLabel={meta?.dateLabel} hideYear={meta?.hideYear} ranked={meta?.ranked} showNote={meta?.showNote} onPress={openDetails} colors={colors} isDark={isDark} />
    ),
    [cardWidth, meta, openDetails, colors, isDark],
  );

  const chipBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const loading = !region || list.status === "loading";

  const skeleton = useMemo(
    () => (
      <View style={styles.skeletonGrid}>
        {Array.from({ length: 9 }, (_, i) => (
          <View key={i} style={{ width: cardWidth }}>
            <View style={{ width: cardWidth, height: cardWidth * 1.5, borderRadius: 12, backgroundColor: chipBg }} />
            <View style={{ width: cardWidth * 0.8, height: 10, borderRadius: 5, marginTop: 9, backgroundColor: chipBg }} />
          </View>
        ))}
      </View>
    ),
    [cardWidth, chipBg],
  );

  if (!meta) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
        <RetryState title="Not available" message="This list isn't available in this version." onRetry={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={[styles.back, { backgroundColor: chipBg }]} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {meta.title}
          </Text>
          {region && meta.subtitle ? (
            <Text style={[styles.sub, { color: colors.text }]} numberOfLines={1}>
              {meta.subtitle(regionName(region), type)}
            </Text>
          ) : null}
        </View>
        {showRegion && region ? (
          <Pressable onPress={() => setRegionOpen(true)} style={[styles.region, { backgroundColor: chipBg }]} accessibilityRole="button" accessibilityLabel={`Region ${regionName(region)}. Change`}>
            <Ionicons name="location-outline" size={14} color={colors.text} />
            <Text style={[styles.regionText, { color: colors.text }]}>{region}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.text} style={{ opacity: 0.6 }} />
          </Pressable>
        ) : null}
      </View>

      {meta.types.length > 1 || meta.watchedFilter ? (
        <View style={styles.tabs}>
          {(meta.types.length > 1 ? meta.types : []).map((t) => {
            const on = t === type;
            return (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[styles.tab, { backgroundColor: on ? colors.primary : chipBg }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.tabText, { color: on ? "#fff" : colors.text }]}>
                  {meta.typeLabels?.[t] || t}
                </Text>
              </Pressable>
            );
          })}
          {meta.watchedFilter ? (
            <Pressable
              onPress={() => setHideWatched((v) => !v)}
              style={[styles.tab, styles.hideChip, { backgroundColor: hideWatched ? `${colors.primary}26` : chipBg, borderColor: hideWatched ? colors.primary : "transparent" }]}
              accessibilityRole="switch"
              accessibilityState={{ checked: hideWatched }}
              accessibilityLabel="Hide watched"
            >
              <Ionicons name={hideWatched ? "eye-off" : "eye-off-outline"} size={15} color={hideWatched ? colors.primary : colors.text} />
              <Text style={[styles.tabText, { color: hideWatched ? colors.primary : colors.text }]}>Hide watched</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {list.status === "error" ? (
        <RetryState title="Couldn't load this list" message="Check your connection and try again." onRetry={list.retry} />
      ) : loading ? (
        skeleton
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(i) => i.imdbID}
          renderItem={renderItem}
          numColumns={COLUMNS}
          columnWrapperStyle={{ gap: GAP }}
          contentContainerStyle={{ padding: PAD, paddingBottom: tabBarHeight + 16, gap: 18, flexGrow: 1 }}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.6}
          initialNumToRender={9}
          windowSize={7}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.reload} tintColor={colors.primary} />}
          ListFooterComponent={list.loadingMore ? <ActivityIndicator style={{ paddingVertical: 12 }} color={colors.primary} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="film-outline" size={40} color={colors.text} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyText, { color: colors.text }]}>{hideWatched ? "You've watched everything on this list so far." : meta.emptyText || "Nothing to show right now."}</Text>
            </View>
          }
        />
      )}

      <RegionSheet
        visible={regionOpen}
        selected={region}
        onSelect={(code) => {
          setRegion(code);
          setRegionOpen(false);
        }}
        onClose={() => setRegionOpen(false)}
        colors={colors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 12 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  sub: { fontSize: 12.5, opacity: 0.55, marginTop: 1 },
  region: { flexDirection: "row", alignItems: "center", gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 17 },
  regionText: { fontSize: 13, fontWeight: "800" },
  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: PAD, paddingBottom: 12 },
  tab: { paddingHorizontal: 16, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  hideChip: { marginLeft: "auto", flexDirection: "row", gap: 6, borderWidth: 1 },
  tabText: { fontSize: 13.5, fontWeight: "800" },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", gap: GAP, padding: PAD, rowGap: 18 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 60, paddingHorizontal: 32 },
  emptyText: { fontSize: 14.5, opacity: 0.6, textAlign: "center", lineHeight: 20 },
});
