import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FallbackArt, compact } from "./listArt";

/** Large "trending" card: blurred poster backdrop with a sharp poster and the list's story. */
const FeaturedListCard = ({ list, width, rank, onPress }) => (
  <Pressable
    onPress={() => onPress(list)}
    style={({ pressed }) => [styles.card, { width, opacity: pressed ? 0.94 : 1 }]}
    accessibilityRole="button"
    accessibilityLabel={`Trending number ${rank}: ${list.name}, by ${list.ownerName || "Anonymous"}`}
  >
    {list.coverPoster ? (
      <Image source={{ uri: list.coverPoster }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={22} />
    ) : (
      <FallbackArt id={list.id} size={1} />
    )}
    <LinearGradient
      colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0.78)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />

    <View style={styles.body}>
      <View style={styles.posterWrap}>
        {list.coverPoster ? (
          <Image source={{ uri: list.coverPoster }} style={styles.poster} contentFit="cover" transition={150} />
        ) : (
          <View style={[styles.poster, styles.posterEmpty]}>
            <Ionicons name="film-outline" size={30} color="rgba(255,255,255,0.7)" />
          </View>
        )}
      </View>

      <View style={styles.text}>
        <View style={styles.eyebrow}>
          <Ionicons name="flame" size={13} color="#ff9f43" />
          <Text style={styles.eyebrowText}>TRENDING #{rank}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {list.name}
        </Text>
        <Text style={styles.owner} numberOfLines={1}>
          by {list.ownerName || "Anonymous"}
        </Text>
        {list.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {list.description}
          </Text>
        ) : null}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Ionicons name="heart" size={13} color="#ff5a6e" />
            <Text style={styles.statText}>{compact(list.likeCount)}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="film" size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statText}>{list.itemCount} titles</Text>
          </View>
        </View>
      </View>
    </View>
  </Pressable>
);

export default React.memo(FeaturedListCard);

const styles = StyleSheet.create({
  card: { height: 200, borderRadius: 26, overflow: "hidden", backgroundColor: "#1b1f2a" },
  body: { flex: 1, flexDirection: "row", alignItems: "center", padding: 16, gap: 16 },
  posterWrap: {
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    transform: [{ rotate: "-4deg" }],
  },
  poster: { width: 98, height: 147, borderRadius: 12, backgroundColor: "#2a3040" },
  posterEmpty: { alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 4 },
  eyebrow: { flexDirection: "row", alignItems: "center", gap: 4 },
  eyebrowText: { color: "#ffb36b", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  name: { color: "#fff", fontSize: 21, fontWeight: "800", letterSpacing: -0.4, lineHeight: 25 },
  owner: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  desc: { color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 18, marginTop: 2 },
  stats: { flexDirection: "row", gap: 14, marginTop: 4 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});