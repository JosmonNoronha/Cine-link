import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

// One card for every kind of list in the library, with a clear visual language:
//   private → lock,     grey  – only you
//   public  → globe,    blue  – you own it, everyone can see it
//   saved   → bookmark, amber – someone else's public list you added
export const KIND_META = {
  private: { label: "Private", icon: "lock-closed", color: "#8d95a5" },
  public: { label: "Public", icon: "earth", color: "#4aa3ff" },
  saved: { label: "Saved", icon: "bookmark", color: "#f2a93b" },
};

const hueFor = (s = "") => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

const LibraryListCard = ({ entry, colors, onPress, onAction, onLongPress }) => {
  const { kind } = entry;
  const meta = KIND_META[kind];
  const list = entry.list;

  const count = kind === "private" ? entry.movies.length : list.itemCount || 0;
  const watched = kind === "private" ? entry.movies.filter((m) => m.watched).length : 0;
  const pct = kind === "private" && count > 0 ? Math.round((watched / count) * 100) : 0;
  const hue = hueFor(entry.name);
  const cover = list?.coverPoster || null;

  return (
    <Pressable
      onPress={() => onPress(entry)}
      onLongPress={() => onLongPress?.(entry)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: kind === "private" ? colors.border : `${meta.color}55`,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${meta.label} list, ${count} titles`}
    >
      <View style={styles.cover}>
        {cover ? (
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={entry.key} />
        ) : (
          <LinearGradient
            colors={[`hsl(${hue}, 55%, 42%)`, `hsl(${(hue + 40) % 360}, 60%, 28%)`]}
            style={styles.coverFallback}
          >
            <Ionicons name="film-outline" size={26} color="rgba(255,255,255,0.75)" />
          </LinearGradient>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: `${meta.color}22` }]}>
            <Ionicons name={meta.icon} size={11} color={meta.color} />
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {kind === "saved" ? (
            <Text style={[styles.by, { color: colors.text }]} numberOfLines={1}>
              by {list.ownerName || "Anonymous"}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {entry.name}
        </Text>

        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: colors.text }]}>
            {count} {count === 1 ? "title" : "titles"}
          </Text>
          {kind === "private" && watched > 0 ? (
            <Text style={[styles.metaText, styles.watched]}>· {watched} watched</Text>
          ) : null}
          {kind !== "private" ? (
            <View style={styles.likes}>
              <Ionicons name="heart" size={11} color="#ff5a6e" />
              <Text style={[styles.metaText, { color: colors.text }]}>{list.likeCount || 0}</Text>
            </View>
          ) : null}
        </View>

        {kind === "private" && count > 0 ? (
          <View style={styles.progressRow}>
            <View style={[styles.track, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${pct}%`, backgroundColor: pct === 100 ? "#4caf50" : colors.primary },
                ]}
              />
            </View>
            <Text style={[styles.pct, { color: colors.text }]}>{pct}%</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onAction(entry);
        }}
        onPressIn={(event) => event.stopPropagation()}
        hitSlop={10}
        style={styles.action}
        accessibilityLabel={kind === "saved" ? "Remove from library" : "Delete list"}
      >
        <Ionicons
          name={kind === "saved" ? "bookmark-outline" : "trash-outline"}
          size={18}
          color={colors.text}
          style={styles.actionIcon}
        />
      </Pressable>
    </Pressable>
  );
};

export default React.memo(LibraryListCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
    minHeight: 96,
  },
  cover: { width: 84, backgroundColor: "#1b1f2a" },
  coverFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, justifyContent: "center", gap: 3 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },
  by: { fontSize: 11, opacity: 0.55, flexShrink: 1 },
  name: { fontSize: 16.5, fontWeight: "700", letterSpacing: -0.2 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12.5, opacity: 0.65 },
  watched: { color: "#4caf50", opacity: 1, fontWeight: "600" },
  likes: { flexDirection: "row", alignItems: "center", gap: 3 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2, minWidth: 3 },
  pct: { fontSize: 11, fontWeight: "700", opacity: 0.7, minWidth: 30, textAlign: "right" },
  action: { paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  actionIcon: { opacity: 0.45 },
});