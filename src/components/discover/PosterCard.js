import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

// "2026-11-21" -> "Nov 21" (parsed by hand so time zones can't shift the day)
function shortDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const PosterCard = ({ item, width, dateLabel, hideYear, ranked, showNote, onPress, colors, isDark }) => {
  const rating = item.imdbRating && item.imdbRating !== "N/A" ? item.imdbRating : null;
  const date = shortDate(item.releaseDate);
  const sub = [!hideYear && item.Year !== "N/A" ? item.Year : null, date && dateLabel ? `${dateLabel} ${date}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.85 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`${item.Title}${sub ? `, ${sub}` : ""}`}
    >
      <View style={[styles.posterWrap, { width, height: width * 1.5, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
        <Image source={{ uri: item.Poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        {ranked && item.rank ? (
          <View style={styles.rank}>
            <Text style={styles.rankText}>#{item.rank}</Text>
          </View>
        ) : null}
        {rating ? (
          <View style={styles.rating}>
            <Ionicons name="star" size={10} color="#f5c518" />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {item.Title}
      </Text>
      {showNote && item.note ? (
        <Text style={[styles.note, { color: colors.text }]} numberOfLines={3}>
          {item.note}
        </Text>
      ) : null}
      {sub ? (
        <Text style={[styles.sub, { color: colors.text }]} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </Pressable>
  );
};

export default React.memo(PosterCard);

const styles = StyleSheet.create({
  posterWrap: { borderRadius: 12, overflow: "hidden" },
  rating: { position: "absolute", top: 6, left: 6, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  ratingText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  rank: { position: "absolute", top: 6, right: 6, backgroundColor: "#ffb300", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  rankText: { color: "#1a1a1a", fontSize: 11, fontWeight: "900" },
  title: { fontSize: 13, fontWeight: "700", marginTop: 7, lineHeight: 17 },
  note: { fontSize: 11.5, fontStyle: "italic", opacity: 0.7, marginTop: 3, lineHeight: 15 },
  sub: { fontSize: 11.5, opacity: 0.55, marginTop: 2 },
});
