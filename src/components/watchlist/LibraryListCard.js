import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import ProgressRing from "../shared/ProgressRing";

// Library list card.
//   private → lock, public → globe, saved → bookmark
// Kind lives as an icon inside the first pill; the cover stays untouched.
export const KIND_META = {
  private: { label: "Private", icon: "lock-closed", color: "#8d95a5" },
  public: { label: "Public", icon: "earth", color: "#4aa3ff" },
  saved: { label: "Saved", icon: "bookmark", color: "#f2a93b" },
};

const PILL_BG = "rgba(128,128,128,0.14)";

const hueFor = (s = "") => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

// ─── Pill ─────────────────────────────────────────────────────────────────────
const Pill = ({ icon, iconColor, text, textColor }) => (
  <View style={styles.pill}>
    <Ionicons name={icon} size={11} color={iconColor} />
    <Text style={[styles.pillText, { color: textColor }]}>{text}</Text>
  </View>
);

// ─── Card ─────────────────────────────────────────────────────────────────────
const LibraryListCard = ({ entry, colors, onPress, onAction, onLongPress }) => {
  const { kind } = entry;
  const meta = KIND_META[kind];
  const list = entry.list;

  const count = kind === "private" ? entry.movies.length : list.itemCount || 0;
  const watched = kind === "private" ? entry.movies.filter((m) => m.watched).length : 0;
  const pct = kind === "private" && count > 0 ? Math.round((watched / count) * 100) : 0;
  const hue = hueFor(entry.name);
  const cover = list?.coverPoster || null;
  const showRing = kind === "private" && count > 0;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card }]}
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${meta.label} list, ${count} titles`}
    >
      <Pressable
        onPress={() => onPress(entry)}
        onLongPress={() => onLongPress?.(entry)}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.9 : 1 }]}
      >
        {/* Poster-shaped cover, nothing on top of it */}
        <View style={styles.cover}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              recyclingKey={entry.key}
            />
          ) : (
            <LinearGradient
              colors={[`hsl(${hue}, 50%, 40%)`, `hsl(${(hue + 40) % 360}, 55%, 26%)`]}
              style={styles.coverFallback}
            >
              <Ionicons name="film-outline" size={24} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          )}
        </View>

        <View style={styles.body}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {entry.name}
          </Text>

          {kind === "saved" ? (
            <Text style={[styles.by, { color: colors.text }]} numberOfLines={1}>
              by {list.ownerName || "Anonymous"}
            </Text>
          ) : null}

          <View style={styles.pills}>
            <Pill
              icon={meta.icon}
              iconColor={meta.color}
              text={`${count} ${count === 1 ? "item" : "items"}`}
              textColor={colors.text}
            />
            {kind !== "private" ? (
              <Pill
                icon="heart"
                iconColor="#ff5a6e"
                text={String(list.likeCount || 0)}
                textColor={colors.text}
              />
            ) : null}
          </View>
        </View>

        {showRing ? (
          <View style={styles.ringWrap}>
            <ProgressRing percent={pct} textColor={colors.text} size={30} />
          </View>
        ) : null}
      </Pressable>

      <Pressable
        onPress={() => onAction(entry)}
        hitSlop={10}
        style={styles.action}
        accessibilityLabel={kind === "saved" ? "Remove from library" : "Delete list"}
      >
        <Ionicons
          name={kind === "saved" ? "bookmark-outline" : "trash-outline"}
          size={17}
          color={colors.text}
          style={styles.actionIcon}
        />
      </Pressable>
    </View>
  );
};

export default React.memo(LibraryListCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    marginBottom: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  main: { flex: 1, flexDirection: "row", alignItems: "center" },

  cover: {
    width: 62,
    height: 88,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1b1f2a",
  },
  coverFallback: { flex: 1, alignItems: "center", justifyContent: "center" },

  body: { flex: 1, marginLeft: 14, gap: 6 },
  name: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  by: { fontSize: 12, opacity: 0.5, marginTop: -3 },

  pills: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: PILL_BG,
  },
  pillText: { fontSize: 11.5, fontWeight: "600", opacity: 0.8 },

  ringWrap: { marginHorizontal: 4 },

  action: { paddingHorizontal: 8, paddingVertical: 6 },
  actionIcon: { opacity: 0.35 },
});