import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import { useCustomTheme } from "../contexts/ThemeContext";
import { getMovieDetails } from "../services/api";
import { getFreeShows, clearStreamingCache } from "../services/api/streaming";
import { deviceRegion, formatCount } from "../utils/streamingHelpers";
import logger from "../services/logger";

const SIDE = 20;
const GAP = 16;
const COLUMNS = 2;

// ─── Poster tile ──────────────────────────────────────────────────────────────

const ShowTile = React.memo(({ item, poster, width, onPress, colors, soft }) => (
  <Pressable
    onPress={() => onPress(item)}
    style={({ pressed }) => [{ width, opacity: pressed ? 0.8 : 1 }]}
    accessibilityRole="button"
    accessibilityLabel={`${item.title}, ${item.count} free episodes`}
  >
    <View style={[styles.poster, { width, height: width * 1.5, backgroundColor: soft }]}>
      {poster ? (
        <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <View style={styles.posterFallback}>
          <Ionicons name="tv-outline" size={26} color={colors.text} style={{ opacity: 0.3 }} />
          <Text style={[styles.fallbackTitle, { color: colors.text }]} numberOfLines={3}>
            {item.title}
          </Text>
        </View>
      )}
    </View>
    <Text style={[styles.tileTitle, { color: colors.text }]} numberOfLines={1}>
      {item.title}
    </Text>
    <Text style={[styles.tileMeta, { color: colors.text }]}>{formatCount(item.count)} episodes</Text>
  </Pressable>
));
ShowTile.displayName = "ShowTile";

const SkeletonGrid = ({ width, soft }) => (
  <View style={styles.skeletonWrap}>
    {Array.from({ length: 6 }).map((_, i) => (
      <View key={i} style={{ width }}>
        <View style={{ width, height: width * 1.5, borderRadius: 10, backgroundColor: soft }} />
        <View style={[styles.skelLine, { width: width * 0.7, backgroundColor: soft }]} />
        <View style={[styles.skelLine, { width: width * 0.4, backgroundColor: soft, marginTop: 6 }]} />
      </View>
    ))}
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const FreeShowsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const tabBarHeight = useTabBarHeight();
  const { width: screenW } = useWindowDimensions();
  const isDark = theme === "dark";
  const region = useMemo(() => deviceRegion(), []);

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [shows, setShows] = useState([]);
  const [posters, setPosters] = useState({});

  const tileW = Math.floor((screenW - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const soft = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const list = await getFreeShows(region);
      setShows(list);
      setStatus("ready");
      [...new Set(list.map((s) => s.tmdbId))].forEach((id) => {
        getMovieDetails(`tmdb:tv:${id}`)
          .then((d) => {
            if (d?.Poster && d.Poster !== "N/A") setPosters((p) => ({ ...p, [id]: d.Poster }));
          })
          .catch(() => {}); // a missing poster is fine
      });
    } catch (err) {
      logger.error("Failed to load free shows", err);
      setStatus("error");
    }
  }, [region]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = useCallback(() => {
    clearStreamingCache();
    load();
  }, [load]);

  const open = useCallback(
    (s) =>
      navigation.navigate("FreeShow", {
        tmdbId: s.tmdbId,
        title: s.title,
        season: s.season || 1,
        poster: posters[s.tmdbId] || null,
      }),
    [navigation, posters],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <ShowTile item={item} poster={posters[item.tmdbId]} width={tileW} onPress={open} colors={colors} soft={soft} />
    ),
    [posters, tileW, open, colors, soft],
  );

  const header = (
    <View style={styles.header}>
      <Text style={[styles.heading, { color: colors.text }]}>Library</Text>
      <Text style={[styles.subheading, { color: colors.text }]}>
        {status === "ready" && shows.length
          ? `${shows.length} ${shows.length === 1 ? "show" : "shows"} · free on official YouTube channels`
          : "Free on official YouTube channels"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      {status === "error" ? (
        <>
          {header}
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={34} color={colors.text} style={{ opacity: 0.4 }} />
            <Text style={[styles.stateText, { color: colors.text }]}>Couldn't load the library. Check your connection and try again.</Text>
            <Pressable onPress={retry} style={[styles.retry, { backgroundColor: colors.primary }]} accessibilityRole="button">
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        </>
      ) : status === "loading" ? (
        <>
          {header}
          <SkeletonGrid width={tileW} soft={soft} />
        </>
      ) : (
        <FlatList
          data={shows}
          numColumns={COLUMNS}
          keyExtractor={(s) => `${s.tmdbId}:${s.season || 1}`}
          renderItem={renderItem}
          ListHeaderComponent={header}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: SIDE }}
          ItemSeparatorComponent={() => <View style={{ height: 22 }} />}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.stateText, { color: colors.text }]}>Nothing is available in your region yet.</Text>
            </View>
          }
          ListFooterComponent={
            shows.length ? (
              <Text style={[styles.note, { color: colors.text }]}>
                CineLink doesn't host these videos. They play from the original channels on YouTube.
              </Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

export default FreeShowsScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: SIDE, paddingTop: 16, paddingBottom: 20 },
  heading: { fontSize: 32, fontWeight: "800", letterSpacing: -0.8 },
  subheading: { fontSize: 13.5, opacity: 0.55, marginTop: 4 },

  poster: { borderRadius: 10, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(128,128,128,0.35)" },
  posterFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 12 },
  fallbackTitle: { fontSize: 13, fontWeight: "700", textAlign: "center", opacity: 0.5 },
  tileTitle: { fontSize: 14.5, fontWeight: "700", letterSpacing: -0.2, marginTop: 10 },
  tileMeta: { fontSize: 12.5, opacity: 0.5, marginTop: 2 },

  skeletonWrap: { flexDirection: "row", flexWrap: "wrap", gap: GAP, paddingHorizontal: SIDE, rowGap: 22 },
  skelLine: { height: 10, borderRadius: 5, marginTop: 12 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  stateText: { fontSize: 14, opacity: 0.65, textAlign: "center", lineHeight: 20 },
  retry: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, marginTop: 4 },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  note: { fontSize: 12, opacity: 0.4, textAlign: "center", marginTop: 32, paddingHorizontal: 32 },
});