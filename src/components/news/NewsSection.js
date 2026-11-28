import React, { useCallback } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import NewsThumb from "./NewsThumb";
import TeaCupIcon from "./TeaCupIcon";
import openArticle, { timeAgo } from "../../utils/openArticle";

const GAP = 12;
const PAD = 20;

const NewsCard = React.memo(({ item, width }) => {
  const open = useCallback(() => openArticle(item.url), [item.url]);
  return (
    <Pressable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={`${item.title}. ${item.sourceName}`}
      style={({ pressed }) => [
        styles.card,
        { width, height: Math.round((width * 10) / 16) },
        pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
      ]}
    >
      <NewsThumb uri={item.image} style={StyleSheet.absoluteFill} iconSize={36} />
      <LinearGradient
        colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.88)"]}
        locations={[0.25, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.newsBadge} pointerEvents="none">
        <Ionicons name="newspaper-outline" size={14} color="#fff" />
        <Text style={styles.newsBadgeText}>NEWS</Text>
      </View>
      <View style={styles.text} pointerEvents="none">
        <Text style={styles.title} numberOfLines={3}>
          {item.title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {item.sourceName} · {timeAgo(item.publishedAt)}
        </Text>
      </View>
    </Pressable>
  );
});
NewsCard.displayName = "NewsCard";

const Gap = () => <View style={{ width: GAP }} />;

/** Home row: trending headlines, with the full News screen shortcut. */
const NewsSection = ({ section, width, colors, onSeeAll }) => {
  const w = Math.min(Math.round(width * 0.78), 320);
  const render = useCallback(({ item }) => <NewsCard item={item} width={w} />, [w]);
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.heading, { color: colors.text }]}>{section.title}</Text>
          {!!section.subtitle && (
            <Text style={[styles.subheading, { color: colors.text }]}>{section.subtitle}</Text>
          )}
        </View>
        <Pressable
          onPress={onSeeAll}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Open news discovery"
          style={({ pressed }) => [
            styles.discoveryButton,
            pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
          ]}
        >
          <TeaCupIcon size={30} color={colors.primary} />
        </Pressable>
      </View>
      <FlatList
        horizontal
        data={section.data}
        renderItem={render}
        keyExtractor={(n) => n.id}
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
export default React.memo(NewsSection);

const styles = StyleSheet.create({
  section: { marginBottom: 30 },
  header: { paddingHorizontal: PAD, marginBottom: 14, flexDirection: "row", alignItems: "flex-end" },
  heading: { fontSize: 21, fontWeight: "700", letterSpacing: -0.3 },
  subheading: { fontSize: 13, opacity: 0.6 },
  discoveryButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  rail: { paddingHorizontal: PAD },
  card: { borderRadius: 2, overflow: "hidden", backgroundColor: "#1c1f26" },
  newsBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  newsBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  text: { position: "absolute", left: 14, right: 14, bottom: 12, gap: 4 },
  title: { color: "#fff", fontSize: 16, fontWeight: "800", lineHeight: 20 },
  sub: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "500" },
});
