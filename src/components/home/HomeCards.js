import React, { useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  getTitle,
  getYear,
  getRating,
  getKind,
  getOverview,
  getGenres,
  posterUri,
  backdropUri,
} from "./mediaMeta";

const pressed = (p) => p && { opacity: 0.88, transform: [{ scale: 0.98 }] };

/* ───────── shared bits ───────── */

const Poster = React.memo(({ uri, style }) =>
  uri ? (
    <Image
      source={{ uri }}
      style={style}
      contentFit="cover"
      transition={150}
      cachePolicy="memory-disk"
      recyclingKey={uri}
    />
  ) : (
    <View style={[style, styles.noImage]}>
      <Ionicons name="film-outline" size={26} color="rgba(255,255,255,0.45)" />
    </View>
  ),
);
Poster.displayName = "Poster";

const RatingChip = React.memo(({ rating, style }) =>
  rating ? (
    <View style={[styles.chip, style]}>
      <Ionicons name="star" size={11} color="#FFC107" />
      <Text style={styles.chipText}>{rating.toFixed(1)}</Text>
    </View>
  ) : null,
);
RatingChip.displayName = "RatingChip";

/* ───────── poster (classic, kept small and quiet) ───────── */

export const PosterCard = React.memo(({ item, onPress, colors, width = 124 }) => {
  const handle = useCallback(() => onPress(item), [onPress, item]);
  const year = getYear(item);
  const rating = getRating(item);
  return (
    <Pressable onPress={handle} style={({ pressed: p }) => [{ width }, pressed(p)]}>
      <Poster uri={posterUri(item)} style={{ width, height: width * 1.5, borderRadius: 14 }} />
      <Text style={[styles.posterTitle, { color: colors.text }]} numberOfLines={1}>
        {getTitle(item)}
      </Text>
      <View style={styles.metaRow}>
        {!!year && <Text style={[styles.metaText, { color: colors.text }]}>{year}</Text>}
        {rating && (
          <View style={styles.inlineRating}>
            <Ionicons name="star" size={11} color="#FFC107" />
            <Text style={[styles.metaText, { color: colors.text }]}>{rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
});
PosterCard.displayName = "PosterCard";

/* ───────── ranked (Top 10) ───────── */

export const RankedCard = React.memo(({ item, rank, onPress, colors }) => {
  const handle = useCallback(() => onPress(item), [onPress, item]);
  return (
    <Pressable onPress={handle} style={({ pressed: p }) => [styles.ranked, pressed(p)]}>
      <Text
        style={[styles.rankNumber, { color: colors.primary, width: rank >= 10 ? 104 : 64 }]}
        allowFontScaling={false}
      >
        {rank}
      </Text>
      <Poster uri={posterUri(item)} style={styles.rankedPoster} />
    </Pressable>
  );
});
RankedCard.displayName = "RankedCard";

/* ───────── wide (backdrop) ───────── */

export const WideCard = React.memo(({ item, onPress, width }) => {
  const handle = useCallback(() => onPress(item), [onPress, item]);
  const year = getYear(item);
  return (
    <Pressable
      onPress={handle}
      style={({ pressed: p }) => [styles.wide, { width, height: Math.round((width * 9) / 16) }, pressed(p)]}
    >
      <Poster uri={backdropUri(item)} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        locations={[0.35, 1]}
        style={StyleSheet.absoluteFill}
      />
      <RatingChip rating={getRating(item)} style={styles.wideRating} />
      <View style={styles.wideText}>
        <Text style={styles.wideTitle} numberOfLines={2}>
          {getTitle(item)}
        </Text>
        <Text style={styles.wideSub}>
          {getKind(item)}
          {year ? `  ${year}` : ""}
        </Text>
      </View>
    </Pressable>
  );
});
WideCard.displayName = "WideCard";

/* ───────── continue watching ───────── */

export const ContinueCard = React.memo(({ item, onPress, colors, theme, width }) => {
  const handle = useCallback(() => onPress(item), [onPress, item]);
  const year = getYear(item);
  return (
    <Pressable
      onPress={handle}
      style={({ pressed: p }) => [
        styles.continue,
        {
          width,
          backgroundColor: colors.card,
          borderColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
        },
        pressed(p),
      ]}
    >
      <Poster uri={posterUri(item, "w185")} style={styles.continuePoster} />
      <View style={styles.continueText}>
        <Text style={[styles.continueTitle, { color: colors.text }]} numberOfLines={2}>
          {getTitle(item)}
        </Text>
        <Text style={[styles.metaText, { color: colors.text }]}>
          {getKind(item)}
          {year ? `  ${year}` : ""}
        </Text>
      </View>
      <Ionicons name="play-circle" size={34} color={colors.primary} />
    </Pressable>
  );
});
ContinueCard.displayName = "ContinueCard";

/* ───────── stacked list page (3 rows per page) ───────── */

const StackedRow = React.memo(({ item, onPress, colors, last }) => {
  const handle = useCallback(() => onPress(item), [onPress, item]);
  const year = getYear(item);
  return (
    <Pressable
      onPress={handle}
      style={({ pressed: p }) => [
        styles.row,
        !last && styles.rowDivider,
        pressed(p),
      ]}
    >
      <Poster uri={posterUri(item, "w185")} style={styles.rowPoster} />
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
          {getTitle(item)}
        </Text>
        <Text style={[styles.metaText, { color: colors.text }]}>
          {getKind(item)}
          {year ? `  ${year}` : ""}
        </Text>
      </View>
      <RatingChip rating={getRating(item)} />
    </Pressable>
  );
});
StackedRow.displayName = "StackedRow";

export const StackedPage = React.memo(({ items, width, onPress, colors }) => (
  <View style={{ width }}>
    {items.map((item, i) => (
      <StackedRow
        key={item.imdbID}
        item={item}
        onPress={onPress}
        colors={colors}
        last={i === items.length - 1}
      />
    ))}
  </View>
));
StackedPage.displayName = "StackedPage";

/* ───────── spotlight ───────── */

export const SpotlightCard = React.memo(({ item, onPress, colors, width }) => {
  const handle = useCallback(() => onPress(item), [onPress, item]);
  const uri = posterUri(item, "w342");
  const overview = getOverview(item);
  const genres = getGenres(item);
  const year = getYear(item);
  return (
    <Pressable onPress={handle} style={({ pressed: p }) => [styles.spot, { width }, pressed(p)]}>
      {uri && (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={30} />
      )}
      <View style={[StyleSheet.absoluteFill, styles.spotShade]} />
      <View style={styles.spotInner}>
        <Poster uri={uri} style={styles.spotPoster} />
        <View style={styles.spotText}>
          {!!genres && (
            <Text style={styles.spotGenres} numberOfLines={1}>
              {genres}
            </Text>
          )}
          <Text style={styles.spotTitle} numberOfLines={3}>
            {getTitle(item)}
          </Text>
          <View style={styles.spotMeta}>
            <RatingChip rating={getRating(item)} />
            {!!year && <Text style={styles.spotYear}>{year}</Text>}
          </View>
          {!!overview && (
            <Text style={styles.spotOverview} numberOfLines={3}>
              {overview}
            </Text>
          )}
          <View style={[styles.spotButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.spotButtonText}>View details</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
});
SpotlightCard.displayName = "SpotlightCard";

/* ───────── genre chips ───────── */

export const GENRES = [
  { key: "action", label: "Action", icon: "flash-outline" },
  { key: "comedy", label: "Comedy", icon: "happy-outline" },
  { key: "drama", label: "Drama", icon: "sad-outline" },
  { key: "scifi", label: "Sci-Fi", icon: "planet-outline" },
  { key: "horror", label: "Horror", icon: "skull-outline" },
  { key: "romance", label: "Romance", icon: "heart-outline" },
  { key: "crime", label: "Crime", icon: "finger-print-outline" },
  { key: "animation", label: "Animation", icon: "color-palette-outline" },
];

export const GenreChips = React.memo(({ order, onPress, colors, theme }) => {
  const list = order
    .map((k) => GENRES.find((g) => g.key === k))
    .filter(Boolean)
    .concat(GENRES.filter((g) => !order.includes(g.key)));
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chips}
    >
      {list.map((g) => (
        <Pressable
          key={g.key}
          onPress={() => onPress(g.key)}
          style={({ pressed: p }) => [
            styles.genreChip,
            {
              backgroundColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
            },
            pressed(p),
          ]}
        >
          <Ionicons name={g.icon} size={16} color={colors.primary} />
          <Text style={[styles.genreChipText, { color: colors.text }]}>{g.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
});
GenreChips.displayName = "GenreChips";

/* ───────── styles ───────── */

const styles = StyleSheet.create({
  noImage: { backgroundColor: "#1c1f26", alignItems: "center", justifyContent: "center" },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chipText: { color: "#FFC107", fontSize: 11, fontWeight: "700" },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  metaText: { fontSize: 12, opacity: 0.6 },
  inlineRating: { flexDirection: "row", alignItems: "center", gap: 3 },

  posterTitle: { fontSize: 14, fontWeight: "600", marginTop: 8 },

  ranked: { flexDirection: "row", alignItems: "flex-end" },
  rankNumber: {
    fontSize: 104,
    lineHeight: 118,
    fontWeight: "900",
    letterSpacing: -8,
    textAlign: "right",
    includeFontPadding: false,
  },
  rankedPoster: { width: 112, height: 168, borderRadius: 14, marginLeft: -16 },

  wide: { borderRadius: 18, overflow: "hidden", backgroundColor: "#1c1f26" },
  wideRating: { position: "absolute", top: 10, right: 10 },
  wideText: { position: "absolute", left: 14, right: 14, bottom: 12, gap: 2 },
  wideTitle: { color: "#fff", fontSize: 17, fontWeight: "800", lineHeight: 21 },
  wideSub: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "500" },

  continue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  continuePoster: { width: 58, height: 87, borderRadius: 10 },
  continueText: { flex: 1, gap: 4 },
  continueTitle: { fontSize: 15, fontWeight: "700", lineHeight: 19 },

  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(128,128,128,0.3)" },
  rowPoster: { width: 52, height: 78, borderRadius: 10 },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, fontWeight: "600", lineHeight: 19 },

  spot: { borderRadius: 24, overflow: "hidden", backgroundColor: "#12151c" },
  spotShade: { backgroundColor: "rgba(8,10,16,0.66)" },
  spotInner: { flexDirection: "row", gap: 16, padding: 16 },
  spotPoster: { width: 112, height: 168, borderRadius: 14 },
  spotText: { flex: 1, justifyContent: "center", gap: 6 },
  spotGenres: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "500" },
  spotTitle: { color: "#fff", fontSize: 22, fontWeight: "800", lineHeight: 26, letterSpacing: -0.3 },
  spotMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  spotYear: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  spotOverview: { color: "rgba(255,255,255,0.8)", fontSize: 13, lineHeight: 18 },
  spotButton: { alignSelf: "flex-start", marginTop: 4, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18 },
  spotButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  chips: { paddingHorizontal: 20, gap: 10, paddingVertical: 4 },
  genreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  genreChipText: { fontSize: 14, fontWeight: "600" },
});