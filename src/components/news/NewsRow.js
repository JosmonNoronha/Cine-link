import React, { useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import NewsThumb from "./NewsThumb";
import openArticle, { timeAgo } from "../../utils/openArticle";

const THUMB_W = 112;

/** Headline row: source and time, bold headline, optional excerpt; square-ish thumbnail on the right. */
const NewsRow = ({ item, colors, compact, showBuzz }) => {
  const open = useCallback(() => openArticle(item.url), [item.url]);
  const hot = showBuzz && item.buzz >= 1;
  return (
    <Pressable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={`${item.title}. ${item.sourceName}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
    >
      <View style={styles.text}>
        <View style={styles.metaRow}>
          <Text style={[styles.source, { color: colors.primary }]} numberOfLines={1}>
            {item.sourceName.toUpperCase()}
          </Text>
          <Text style={[styles.time, { color: colors.text }]}>{timeAgo(item.publishedAt)}</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={compact ? 3 : 4}>
          {item.title}
        </Text>
        {!compact && !!item.excerpt && (
          <Text style={[styles.excerpt, { color: colors.text }]} numberOfLines={2}>
            {item.excerpt}
          </Text>
        )}
      </View>
      <NewsThumb uri={item.image} style={styles.thumb} />
    </Pressable>
  );
};
export default React.memo(NewsRow);

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  text: { flex: 1, gap: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  source: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, flexShrink: 1 },
  time: { fontSize: 11, opacity: 0.5, fontWeight: "600" },
  title: { fontSize: 16, fontWeight: "800", lineHeight: 21, letterSpacing: -0.2 },
  excerpt: { fontSize: 13, opacity: 0.62, lineHeight: 18 },
  hot: { flexDirection: "row", alignItems: "center", gap: 4 },
  hotText: { fontSize: 11, fontWeight: "700", color: "#FF6B35" },
  thumb: { width: THUMB_W, height: THUMB_W, borderRadius: 10, overflow: "hidden", alignSelf: "flex-start" },
});
