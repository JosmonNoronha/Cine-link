import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FallbackArt, compact } from "./listArt";

/** Poster-first grid tile for the Explore feed. */
const PublicListTile = ({ list, width, onPress, onToggleLike, onToggleSave }) => {
  const liked = Boolean(list.viewerHasLiked);
  const saved = Boolean(list.viewerIsFollowing);
  const mine = Boolean(list.viewerIsOwner);

  return (
    <Pressable
      onPress={() => onPress(list)}
      style={({ pressed }) => [styles.tile, { width, height: width * 1.38, opacity: pressed ? 0.93 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`${list.name}, ${list.itemCount} titles, by ${list.ownerName || "Anonymous"}`}
    >
      {list.coverPoster ? (
        <Image
          source={{ uri: list.coverPoster }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          recyclingKey={list.id}
        />
      ) : (
        <FallbackArt id={list.id} />
      )}
      <LinearGradient
        colors={["rgba(0,0,0,0.35)", "transparent", "rgba(0,0,0,0.88)"]}
        locations={[0, 0.38, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.pill}>
        <Ionicons name="film" size={11} color="#fff" />
        <Text style={styles.pillText}>{list.itemCount}</Text>
      </View>

      {mine ? (
        <View style={styles.pill2}>
          <Text style={styles.pillText}>Yours</Text>
        </View>
      ) : (
        <Pressable
          hitSlop={8}
          onPress={() => onToggleSave(list)}
          style={[styles.save, saved && { backgroundColor: "#f2a93b" }]}
          accessibilityRole="button"
          accessibilityLabel={saved ? "Remove from library" : "Add to library"}
        >
          <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={15} color={saved ? "#1b1405" : "#fff"} />
        </Pressable>
      )}

      <View style={styles.bottom}>
        <Text style={styles.name} numberOfLines={2}>
          {list.name}
        </Text>
        <View style={styles.row}>
          <Text style={styles.owner} numberOfLines={1}>
            {list.ownerName || "Anonymous"}
          </Text>
          <Pressable
            hitSlop={10}
            disabled={mine}
            onPress={() => onToggleLike(list)}
            style={styles.like}
            accessibilityRole="button"
            accessibilityLabel={liked ? "Unlike" : "Like"}
          >
            <Ionicons name={liked ? "heart" : "heart-outline"} size={15} color={liked ? "#ff5a6e" : "#fff"} />
            <Text style={styles.likeText}>{compact(list.likeCount)}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

export default React.memo(PublicListTile);

const styles = StyleSheet.create({
  tile: { borderRadius: 20, overflow: "hidden", backgroundColor: "#1b1f2a" },
  pill: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 24,
  },
  pill2: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    paddingHorizontal: 8,
    height: 24,
    justifyContent: "center",
  },
  pillText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  save: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  bottom: { position: "absolute", left: 12, right: 12, bottom: 11, gap: 3 },
  name: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: -0.2, lineHeight: 19 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  owner: { flex: 1, color: "rgba(255,255,255,0.7)", fontSize: 12 },
  like: { flexDirection: "row", alignItems: "center", gap: 3 },
  likeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});