import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const gradientFor = (id = "") => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 360;
  return [`hsl(${h}, 55%, 38%)`, `hsl(${(h + 40) % 360}, 60%, 26%)`];
};

const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

const PublicListCard = ({ list, colors, inLibrary = Boolean(list.viewerIsFollowing), onPress, onToggleLike, onToggleSave, onTagPress }) => {
  const liked = Boolean(list.viewerHasLiked);
  const canLike = !list.viewerIsOwner && typeof onToggleLike === "function";
  const canSave = !list.viewerIsOwner && typeof onToggleSave === "function";

  return (
    <Pressable
      onPress={() => onPress(list)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.92 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${list.name}, ${list.itemCount} titles, by ${list.ownerName}`}
    >
      <View style={styles.cover}>
        {list.coverPoster ? (
          <Image
            source={{ uri: list.coverPoster }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
            recyclingKey={list.id}
          />
        ) : (
          <LinearGradient colors={gradientFor(list.id)} style={StyleSheet.absoluteFill}>
            <View style={styles.coverFallback}>
              <Ionicons name="film-outline" size={30} color="rgba(255,255,255,0.7)" />
            </View>
          </LinearGradient>
        )}
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {list.name}
        </Text>
        <Text style={[styles.owner, { color: colors.text }]} numberOfLines={1}>
          by {list.ownerName || "Anonymous"}
        </Text>
        {list.description ? (
          <Text style={[styles.desc, { color: colors.text }]} numberOfLines={2}>
            {list.description}
          </Text>
        ) : null}

        <View style={styles.tagsRow}>
          {(list.tags || []).slice(0, 3).map((t) => (
            <Pressable
              key={t}
              hitSlop={6}
              onPress={() => onTagPress?.(t)}
              style={[styles.tag, { borderColor: colors.border }]}
            >
              <Text style={[styles.tagText, { color: colors.primary }]}>#{t}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.stat}>
            <Ionicons name="film-outline" size={14} color={colors.text} style={styles.dim} />
            <Text style={[styles.statText, { color: colors.text }]}>{list.itemCount}</Text>
          </View>
          <Pressable
            disabled={!canLike}
            hitSlop={10}
            onPress={() => onToggleLike(list)}
            style={styles.stat}
            accessibilityRole="button"
            accessibilityLabel={liked ? "Unlike" : "Like"}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={16}
              color={liked ? "#ff5a6e" : colors.text}
              style={liked ? null : styles.dim}
            />
            <Text style={[styles.statText, { color: colors.text }]}>{compact(list.likeCount || 0)}</Text>
          </Pressable>
          {canSave ? (
            <Pressable
              hitSlop={8}
              onPress={(event) => {
                event.stopPropagation();
                onToggleSave(list, !inLibrary);
              }}
              onPressIn={(event) => event.stopPropagation()}
              style={[
                styles.save,
                {
                  borderColor: inLibrary ? colors.primary : colors.border,
                  backgroundColor: inLibrary ? colors.primary : "transparent",
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={inLibrary ? "Remove from library" : "Add to library"}
            >
              <Ionicons
                name={inLibrary ? "checkmark" : "add"}
                size={14}
                color={inLibrary ? "#fff" : colors.text}
              />
              <Text style={[styles.saveText, { color: inLibrary ? "#fff" : colors.text }]}>
                {inLibrary ? "In library" : "Library"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

export default React.memo(PublicListCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 12,
  },
  cover: { width: 104, backgroundColor: "#1b1f2a" },
  coverFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, padding: 12, gap: 3 },
  name: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },
  owner: { fontSize: 12, opacity: 0.6 },
  desc: { fontSize: 13, opacity: 0.75, marginTop: 2 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  tag: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: "600" },
  footer: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: "auto", paddingTop: 8 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, fontWeight: "600", opacity: 0.8 },
  dim: { opacity: 0.6 },
  save: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  saveText: { fontSize: 12, fontWeight: "700" },
});