import React, { useCallback } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { backdropUri } from "./mediaMeta";

const GAP = 12;
const PAD = 20;
const NEW_DAYS = 7;

const isNew = (iso) => {
  const t = Date.parse(iso || "");
  return Number.isFinite(t) && Date.now() - t < NEW_DAYS * 24 * 60 * 60 * 1000;
};

const label = (t) => {
  if (t.upcoming) return "Coming soon";
  return t.mediaType === "tv" ? "Series" : "Movie";
};

const thumb = (t) =>
  t.backdropPath || t.posterPath
    ? backdropUri({ backdrop_path: t.backdropPath, poster_path: t.posterPath }, "w780")
    : `https://i.ytimg.com/vi/${t.trailer.key}/mqdefault.jpg`;

const TrailerCard = React.memo(({ item, width, onPlay }) => {
  const handle = useCallback(() => onPlay(item), [onPlay, item]);
  const year = (item.releaseDate || "").slice(0, 4);
  return (
    <Pressable
      onPress={handle}
      accessibilityRole="button"
      accessibilityLabel={`Play trailer: ${item.title}`}
      style={({ pressed }) => [
        styles.card,
        { width, height: Math.round((width * 9) / 16) },
        pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
      ]}
    >
      <Image
        source={{ uri: thumb(item) }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        recyclingKey={String(item.id)}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.85)"]}
        locations={[0.3, 1]}
        style={StyleSheet.absoluteFill}
      />
      {isNew(item.trailer.publishedAt) && (
        <View style={styles.newBadge}>
          <Text style={styles.newText}>NEW</Text>
        </View>
      )}
      <View style={styles.playWrap} pointerEvents="none">
        <Ionicons name="play-circle" size={52} color="rgba(255,255,255,0.92)" />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.sub}>
          {label(item)}
          {year ? `  ${year}` : ""}
        </Text>
      </View>
    </Pressable>
  );
});
TrailerCard.displayName = "TrailerCard";

const Gap = () => <View style={{ width: GAP }} />;

const TrailersSection = ({ section, width, colors, onPlay }) => {
  const w = Math.min(Math.round(width * 0.78), 320);
  const render = useCallback(
    ({ item }) => <TrailerCard item={item} width={w} onPlay={onPlay} />,
    [w, onPlay],
  );
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: colors.text }]}>{section.title}</Text>
        {!!section.subtitle && (
          <Text style={[styles.subheading, { color: colors.text }]}>{section.subtitle}</Text>
        )}
      </View>
      <FlatList
        horizontal
        data={section.data}
        renderItem={render}
        keyExtractor={(t) => `${t.mediaType}:${t.id}`}
        ItemSeparatorComponent={Gap}
        contentContainerStyle={styles.rail}
        showsHorizontalScrollIndicator={false}
        snapToInterval={w + GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        initialNumToRender={3}
        windowSize={5}
      />
    </View>
  );
};

export default React.memo(TrailersSection);

const styles = StyleSheet.create({
  section: { marginBottom: 30 },
  header: { paddingHorizontal: PAD, marginBottom: 14, gap: 3 },
  heading: { fontSize: 21, fontWeight: "700", letterSpacing: -0.3 },
  subheading: { fontSize: 13, opacity: 0.6 },
  rail: { paddingHorizontal: PAD },
  card: { borderRadius: 18, overflow: "hidden", backgroundColor: "#1c1f26" },
  newBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#FF6B35",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  newText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  playWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  text: { position: "absolute", left: 14, right: 14, bottom: 12, gap: 2 },
  title: { color: "#fff", fontSize: 17, fontWeight: "800", lineHeight: 21 },
  sub: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "500" },
});
