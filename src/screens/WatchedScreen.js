// screens/WatchedScreen.js
//
// Everything the user has watched, with or without a watchlist.
//   • Series tab: shows finished series and series still in progress (ring + "S2 E4 · 11 of 20 episodes")
//   • Movies tab: watched movies with the date
// Reached from the Watched tile in the Settings profile card.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCustomTheme } from "../contexts/ThemeContext";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import { getMovieDetails } from "../services/api";
import { getWatchedTitles } from "../utils/storage";
import ProgressRing from "../components/shared/ProgressRing";
import logger from "../services/logger";

const GREEN = "#4caf50";
const TABS = [
  { key: "series", label: "Series" },
  { key: "movie", label: "Movies" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// The line under the title. This is where "progress based on episodes / seasons" shows up.
function describe(item) {
  if (item.type === "movie") {
    return [item.year, formatDate(item.watchedAt) && `Watched ${formatDate(item.watchedAt)}`]
      .filter(Boolean)
      .join("  ·  ");
  }

  const parts = [];
  if (item.status === "completed") {
    parts.push(item.totalSeasons ? `${plural(item.totalSeasons, "season")} watched` : "Series watched");
  } else {
    if (item.lastEpisode) parts.push(`S${item.lastEpisode.season} E${item.lastEpisode.episode}`);
    parts.push(
      item.totalEpisodes
        ? `${item.episodesWatched} of ${item.totalEpisodes} episodes`
        : plural(item.episodesWatched, "episode") + " watched",
    );
  }
  return parts.join("  ·  ");
}

// Second small line for in-progress series: "1 of 3 seasons finished"
function seasonLine(item) {
  if (item.type !== "series" || item.status !== "inProgress") return null;
  if (item.completedSeasons == null || !item.totalSeasons) return null;
  return `${item.completedSeasons} of ${plural(item.totalSeasons, "season")} finished`;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

const Row = React.memo(({ item, onPress, colors, isDark }) => {
  const inProgress = item.status === "inProgress";
  const sub = describe(item);
  const sub2 = seasonLine(item);
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.row, { backgroundColor: cardBg, opacity: pressed ? 0.85 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title || "Title"}. ${sub}`}
    >
      {item.poster ? (
        <Image source={{ uri: item.poster }} style={styles.poster} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.poster, styles.posterEmpty, { backgroundColor: cardBg }]}>
          <Ionicons name={item.type === "movie" ? "film-outline" : "tv-outline"} size={22} color={colors.text} style={{ opacity: 0.35 }} />
        </View>
      )}

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title || "Loading…"}
        </Text>
        {sub ? (
          <Text style={[styles.sub, { color: colors.text }]} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
        {sub2 ? (
          <Text style={[styles.sub, { color: colors.text }]} numberOfLines={1}>
            {sub2}
          </Text>
        ) : null}
        {item.type === "series" && !inProgress ? (
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={13} color={GREEN} />
            <Text style={[styles.badgeText, { color: GREEN }]}>Completed</Text>
          </View>
        ) : null}
      </View>

      {inProgress ? (
        item.progress != null ? (
          <ProgressRing
            percent={Math.round(item.progress * 100)}
            size={44}
            stroke={5}
            color={colors.primary}
            textColor={colors.text}
            trackColor={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}
            showPercent
          />
        ) : (
          // total episode count not known yet: show a simple "in progress" mark
          <View style={[styles.unknownRing, { borderColor: colors.primary }]}>
            <Ionicons name="play" size={16} color={colors.primary} />
          </View>
        )
      ) : (
        <Ionicons name="checkmark-circle" size={26} color={GREEN} />
      )}
    </Pressable>
  );
});
Row.displayName = "WatchedRow";

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WatchedScreen({ navigation }) {
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const isDark = theme === "dark";
  const tabBarHeight = useTabBarHeight();

  const [tab, setTab] = useState("series");
  const [items, setItems] = useState(null); // null = first load
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [titles, setTitles] = useState({}); // contentId -> { title, poster, year } for old records
  const hydrating = useRef(new Set());

  const load = useCallback(async () => {
    try {
      const data = await getWatchedTitles();
      setItems(data.items || []);
      setError(false);
    } catch (e) {
      logger.warn("Failed to load watched titles", e?.message);
      setError(true);
      setItems((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    return navigation.addListener("focus", load);
  }, [navigation, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Records made before titles were stored have no name or poster: fill them in from the details API.
  useEffect(() => {
    if (!items) return;
    const missing = items.filter((i) => !i.title && !titles[i.contentId] && !hydrating.current.has(i.contentId)).slice(0, 12);
    missing.forEach((i) => {
      hydrating.current.add(i.contentId);
      getMovieDetails(i.contentId)
        .then((d) => {
          const poster = typeof d?.Poster === "string" && d.Poster !== "N/A" ? d.Poster : null;
          setTitles((p) => ({ ...p, [i.contentId]: { title: d?.Title || "Untitled", poster, year: (String(d?.Year || "").match(/\d{4}/) || [])[0] || null } }));
        })
        .catch(() => setTitles((p) => ({ ...p, [i.contentId]: { title: "Untitled" } })));
    });
  }, [items, titles]);

  const merged = useMemo(
    () => (items || []).map((i) => (i.title ? i : { ...i, ...(titles[i.contentId] || {}) })),
    [items, titles],
  );

  const counts = useMemo(() => {
    const series = merged.filter((i) => i.type === "series");
    return {
      series: series.length,
      movie: merged.length - series.length,
      inProgress: series.filter((i) => i.status === "inProgress").length,
    };
  }, [merged]);

  const data = useMemo(() => {
    const list = merged.filter((i) => i.type === tab);
    // In-progress series first (that's what you come back to), then newest first.
    return [...list].sort((a, b) => {
      const ap = a.status === "inProgress" ? 0 : 1;
      const bp = b.status === "inProgress" ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return String(b.watchedAt || "").localeCompare(String(a.watchedAt || ""));
    });
  }, [merged, tab]);

  const openTitle = useCallback((item) => navigation.navigate("Details", { imdbID: item.contentId }), [navigation]);
  const renderItem = useCallback(({ item }) => <Row item={item} onPress={openTitle} colors={colors} isDark={isDark} />, [openTitle, colors, isDark]);

  const chipBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={[styles.back, { backgroundColor: chipBg }]} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Watched</Text>
          <Text style={[styles.screenSub, { color: colors.text }]}>
            {items
              ? `${plural(counts.movie, "movie")} · ${plural(counts.series, "series")}${counts.inProgress ? ` · ${counts.inProgress} in progress` : ""}`
              : " "}
          </Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const selected = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              style={[styles.tab, { backgroundColor: selected ? colors.primary : chipBg }]}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.tabText, { color: selected ? "#fff" : colors.text }]}>
                {t.label}
                <Text style={{ opacity: 0.7 }}>{`  ${counts[t.key]}`}</Text>
              </Text>
            </Pressable>
          );
        })}
      </View>

      {items === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => i.contentId}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 16, gap: 10, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          initialNumToRender={10}
          windowSize={7}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name={error ? "cloud-offline-outline" : tab === "movie" ? "film-outline" : "tv-outline"} size={40} color={colors.text} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {error ? "Couldn't load your watched list" : tab === "movie" ? "No watched movies yet" : "No watched series yet"}
              </Text>
              <Text style={[styles.emptySub, { color: colors.text }]}>
                {error
                  ? "Pull down to try again."
                  : "Open any title and tap “Mark as watched”. A watchlist isn't needed."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  screenSub: { fontSize: 12.5, opacity: 0.55, marginTop: 1 },

  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  tabText: { fontSize: 14, fontWeight: "700" },

  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 16 },
  poster: { width: 56, height: 82, borderRadius: 10 },
  posterEmpty: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 15.5, fontWeight: "700", letterSpacing: -0.2 },
  sub: { fontSize: 12.5, opacity: 0.55 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  unknownRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, alignItems: "center", justifyContent: "center", opacity: 0.9 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptySub: { fontSize: 13.5, opacity: 0.55, textAlign: "center", lineHeight: 19 },
});
