import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Avatar, FallbackArt, compact, postersOf, timeAgo } from "./listArt";
import withAlpha from "../../utils/withAlpha";

const PW = 96; // poster width in the collection strip
const PH = 144;
const STRIP_H = 178;

/** The "collection": newest posters fanned and overlapping on a blurred backdrop. */
const CollectionStrip = ({ list, width }) => {
  const posters = postersOf(list).slice(0, 4);
  const n = posters.length;
  const extra = Math.max(0, (list.itemCount || 0) - n);
  const step = n > 1 ? Math.min(66, (width - 40 - PW) / (n - 1)) : 0;
  const groupW = PW + step * Math.max(0, n - 1);
  const startX = (width - groupW) / 2;
  const tilt = [-4, 2, -2, 4];

  return (
    <View style={[styles.strip, { width, height: STRIP_H }]}>
      {n ? (
        <Image source={{ uri: posters[0] }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={26} />
      ) : (
        <FallbackArt id={list.id} size={1} />
      )}
      <LinearGradient colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.6)"]} style={StyleSheet.absoluteFill} />

      {n ? (
        posters.map((uri, i) => (
          <View
            key={`${uri}-${i}`}
            style={[
              styles.posterShadow,
              { left: startX + step * i, top: (STRIP_H - PH) / 2, zIndex: n - i, transform: [{ rotate: `${tilt[i]}deg` }] },
            ]}
          >
            <Image source={{ uri }} style={styles.poster} contentFit="cover" transition={150} recyclingKey={`${list.id}-${i}`} />
            {i === n - 1 && extra > 0 ? (
              <View style={styles.more}>
                <Text style={styles.moreText}>+{extra}</Text>
              </View>
            ) : null}
          </View>
        ))
      ) : (
        <View style={styles.emptyStrip}>
          <Ionicons name="albums-outline" size={34} color="rgba(255,255,255,0.7)" />
          <Text style={styles.emptyText}>Empty collection</Text>
        </View>
      )}

      <View style={styles.badge}>
        <Ionicons name="albums" size={12} color="#fff" />
        <Text style={styles.badgeText}>
          {list.itemCount || 0} {list.itemCount === 1 ? "title" : "titles"}
        </Text>
      </View>
    </View>
  );
};

/** One public list rendered like a post: author, collection, caption, tags, actions. */
const PublicListPost = ({ list, colors, width, onPress, onToggleLike, onToggleSave }) => {
  const liked = Boolean(list.viewerHasLiked);
  const saved = Boolean(list.viewerIsFollowing);
  const mine = Boolean(list.viewerIsOwner);
  const ago = timeAgo(list.updatedAt || list.createdAt);
  const author = list.ownerName || "Anonymous";

  return (
    <View style={[styles.post, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.head}>
        <Avatar name={author} seed={list.ownerId} size={34} />
        <View style={styles.headText}>
          <Text style={[styles.author, { color: colors.text }]} numberOfLines={1}>
            {mine ? `${author} · you` : author}
          </Text>
          <Text style={[styles.sub, { color: colors.text }]}>
            {ago ? `Updated ${ago === "now" ? "just now" : `${ago} ago`}` : "Public collection"}
          </Text>
        </View>
      </View>

      <Pressable onPress={() => onPress(list)} accessibilityRole="button" accessibilityLabel={`${list.name} by ${author}, ${list.itemCount} titles`}>
        <CollectionStrip list={list} width={width - 24} />
        <View style={styles.caption}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
            {list.name}
          </Text>
          {list.description ? (
            <Text style={[styles.desc, { color: colors.text }]} numberOfLines={3}>
              {list.description}
            </Text>
          ) : null}
          {list.tags?.length ? (
            <Text style={[styles.tags, { color: colors.primary }]} numberOfLines={1}>
              {list.tags.slice(0, 4).map((t) => `#${t}`).join("  ")}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View style={[styles.actions, { borderTopColor: withAlpha(colors.text, 0.08) }]}>
        <Pressable
          disabled={mine}
          hitSlop={8}
          onPress={() => onToggleLike(list)}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={liked ? "Unlike" : "Like"}
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#ff5a6e" : colors.text} style={liked ? null : styles.dim} />
          <Text style={[styles.actionText, { color: colors.text }]}>{compact(list.likeCount)}</Text>
        </Pressable>

        <Pressable hitSlop={8} onPress={() => onPress(list)} style={styles.action} accessibilityRole="button" accessibilityLabel="Open collection">
          <Ionicons name="albums-outline" size={21} color={colors.text} style={styles.dim} />
          <Text style={[styles.actionText, { color: colors.text }]}>Browse</Text>
        </Pressable>

        {!mine ? (
          <Pressable
            hitSlop={8}
            onPress={() => onToggleSave(list)}
            style={[
              styles.save,
              {
                backgroundColor: saved ? withAlpha("#f2a93b", 0.16) : withAlpha(colors.text, 0.07),
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={saved ? "Remove from library" : "Add to library"}
          >
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={16} color={saved ? "#f2a93b" : colors.text} />
            <Text style={[styles.saveText, { color: saved ? "#f2a93b" : colors.text }]}>{saved ? "Saved" : "Save"}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

export default React.memo(PublicListPost);

const styles = StyleSheet.create({
  post: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginBottom: 16, overflow: "hidden" },
  head: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, marginBottom: 10 },
  headText: { flex: 1 },
  author: { fontSize: 14, fontWeight: "800" },
  sub: { fontSize: 11, opacity: 0.5, marginTop: 1 },
  strip: { alignSelf: "center", borderRadius: 18, overflow: "hidden", backgroundColor: "#1b1f2a" },
  posterShadow: {
    position: "absolute",
    width: PW,
    height: PH,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  poster: { width: PW, height: PH, borderRadius: 10, backgroundColor: "#2a3040", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  more: { ...StyleSheet.absoluteFillObject, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  moreText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  emptyStrip: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  emptyText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },
  badge: {
    position: "absolute",
    left: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    paddingHorizontal: 9,
    height: 24,
    zIndex: 20,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  caption: { paddingHorizontal: 14, paddingTop: 12, gap: 5 },
  name: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3, lineHeight: 23 },
  desc: { fontSize: 14, lineHeight: 20, opacity: 0.78 },
  tags: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { fontSize: 13, fontWeight: "700" },
  dim: { opacity: 0.7 },
  save: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 7 },
  saveText: { fontSize: 13, fontWeight: "800" },
});