import React, { useEffect, useState, useCallback, useMemo } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
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

const FreeShowsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const tabBarHeight = useTabBarHeight();
  const isDark = theme === "dark";
  const region = useMemo(() => deviceRegion(), []);

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [shows, setShows] = useState([]);
  const [posters, setPosters] = useState({});

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
    (s) => navigation.navigate("FreeShow", { tmdbId: s.tmdbId, title: s.title, season: s.season || 1, poster: posters[s.tmdbId] || null }),
    [navigation, posters],
  );

  const cardBg = colors.card;
  const soft = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => open(item)}
      style={({ pressed }) => [styles.card, { backgroundColor: cardBg, opacity: pressed ? 0.9 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.count} free episodes`}
    >
      <View style={[styles.poster, { backgroundColor: soft }]}>
        {posters[item.tmdbId] ? (
          <Image source={{ uri: posters[item.tmdbId] }} style={styles.posterImg} contentFit="cover" />
        ) : (
          <Ionicons name="tv-outline" size={28} color={colors.text} style={{ opacity: 0.4 }} />
        )}
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.cardMeta, { color: colors.text }]}>
          {item.seasonCount > 1 ? `${item.seasonCount} seasons  ·  ` : ""}
          {formatCount(item.count)} free episodes{item.latest ? `  ·  latest #${formatCount(item.latest)}` : ""}
        </Text>
        <View style={styles.badge}>
          <Ionicons name="logo-youtube" size={13} color="#ff0033" />
          <Text style={[styles.badgeText, { color: colors.text }]}>Official YouTube channels</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text} style={{ opacity: 0.4 }} />
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: colors.text }]}>Free to watch</Text>
        <Text style={[styles.subheading, { color: colors.text }]}>Full episodes, in order, from the original YouTube channels</Text>
      </View>

      {status === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={36} color={colors.text} style={{ opacity: 0.5 }} />
          <Text style={[styles.stateText, { color: colors.text }]}>Couldn't load the list.</Text>
          <Pressable onPress={retry} style={[styles.retry, { backgroundColor: colors.primary }]} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={shows}
          keyExtractor={(s) => `${s.tmdbId}:${s.season || 1}`}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: tabBarHeight + 24, gap: 12 }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.stateText, { color: colors.text }]}>Nothing is available to watch in your region yet.</Text>
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
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  heading: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  subheading: { fontSize: 13.5, opacity: 0.6, marginTop: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  stateText: { fontSize: 14, opacity: 0.7, textAlign: "center" },
  retry: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20 },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  poster: { width: 72, height: 104, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  posterImg: { width: "100%", height: "100%" },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  cardMeta: { fontSize: 12.5, opacity: 0.6 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  badgeText: { fontSize: 11.5, opacity: 0.55, fontWeight: "600" },
  note: { fontSize: 12, opacity: 0.45, textAlign: "center", marginTop: 8 },
});
