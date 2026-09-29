import React, { useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { buildTmdbImageUrl } from "../../utils/imageHelper";

const CARD_W = 118;
const CARD_H = 172;
const GAP = 34; // wide gap so the connecting line reads clearly
const PAD = 20;
const CELL = CARD_W + GAP;
const DOT = 14;
const CURRENT_DOT = 20;
const LINE_H = 3;

const yearOf = (part) => (part?.release_date || "").slice(0, 4);
const centerOf = (index) => index * CELL + CARD_W / 2;

const PosterCard = React.memo(({ part, isCurrent, colors, onPress }) => {
  const handle = useCallback(() => onPress(part), [onPress, part]);
  const uri = part.poster_path ? buildTmdbImageUrl(part.poster_path, "w342") : null;

  return (
    <Pressable
      onPress={handle}
      disabled={isCurrent}
      style={({ pressed }) => [
        styles.cell,
        pressed && !isCurrent && styles.cardPressed,
      ]}
    >
      <View
        style={[
          styles.posterWrap,
          isCurrent && { borderColor: colors.primary, borderWidth: 3 },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.poster}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.poster, styles.noImage]}>
            <Ionicons name="film-outline" size={22} color="rgba(255,255,255,0.4)" />
          </View>
        )}
        {isCurrent && (
          <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.currentBadgeText}>You are here</Text>
          </View>
        )}
      </View>
      <Text
        style={[styles.title, { color: colors.text, fontWeight: isCurrent ? "800" : "600" }]}
        numberOfLines={2}
      >
        {part.title}
      </Text>
    </Pressable>
  );
});
PosterCard.displayName = "PosterCard";

// Just the dot + year label. The connecting line is drawn once, separately,
// behind this row — see the two "line" Views in TimelineSection below.
const TrackNode = React.memo(({ part, isCurrent, isPast, colors }) => (
  <View style={styles.cell}>
    <View
      style={[
        isCurrent ? styles.dotCurrent : styles.dot,
        {
          backgroundColor: isCurrent || isPast ? colors.primary : colors.background,
          borderColor: colors.primary,
        },
      ]}
    />
    <Text
      style={[
        styles.year,
        { color: isCurrent ? colors.primary : colors.text, fontWeight: isCurrent ? "800" : "600" },
      ]}
    >
      {yearOf(part) || "—"}
    </Text>
  </View>
));
TrackNode.displayName = "TrackNode";

const TimelineSection = ({ collectionStatus, collection, currentTmdbId, colors, onOpen }) => {
  const scrollRef = useRef(null);
  const didInitialScroll = useRef(false);

  const parts = useMemo(() => {
    if (!collection?.parts) return [];
    return [...collection.parts]
      .filter((p) => p?.id && p?.title)
      .sort((a, b) => (a.release_date || "9999").localeCompare(b.release_date || "9999"));
  }, [collection]);

  const currentIndex = useMemo(
    () => parts.findIndex((p) => String(p.id) === String(currentTmdbId)),
    [parts, currentTmdbId],
  );

  const handleContentSize = useCallback(() => {
    if (didInitialScroll.current || currentIndex < 0) return;
    didInitialScroll.current = true;
    const centerOffset = PAD + CELL * currentIndex + CARD_W / 2 - CELL / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, centerOffset), animated: false });
  }, [currentIndex]);

  if (collectionStatus === "loading") {
    return (
      <View style={[styles.section, styles.centerBox]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (collectionStatus !== "success" || parts.length < 2) return null;

  const totalWidth = parts.length * CARD_W + (parts.length - 1) * GAP;
  const baseLineWidth = totalWidth - CARD_W; // from first dot center to last dot center
  const progressWidth = currentIndex > 0 ? currentIndex * CELL : 0;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Timeline</Text>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onContentSizeChange={handleContentSize}
      >
        <View style={styles.row}>
          {parts.map((part) => (
            <PosterCard
              key={part.id}
              part={part}
              isCurrent={String(part.id) === String(currentTmdbId)}
              colors={colors}
              onPress={onOpen}
            />
          ))}
        </View>

        <View style={[styles.trackRow, { width: totalWidth }]}>
          {/* Full track, muted */}
          <View
            style={[
              styles.line,
              { left: CARD_W / 2, width: baseLineWidth, backgroundColor: "rgba(128,128,128,0.3)" },
            ]}
          />
          {/* Colored progress up to the currently-viewed movie */}
          {progressWidth > 0 && (
            <View
              style={[styles.line, { left: CARD_W / 2, width: progressWidth, backgroundColor: colors.primary }]}
            />
          )}
          <View style={styles.row}>
            {parts.map((part, i) => (
              <TrackNode
                key={part.id}
                part={part}
                isCurrent={i === currentIndex}
                isPast={currentIndex >= 0 && i < currentIndex}
                colors={colors}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default React.memo(TimelineSection);

const styles = StyleSheet.create({
  section: { marginTop: 20, marginBottom: 8 },
  centerBox: { height: 220, alignItems: "center", justifyContent: "center" },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  // A horizontal ScrollView's content container defaults flexDirection to
  // 'row' — without this override the poster row and track row below would
  // sit side by side instead of stacked.
  content: { paddingHorizontal: PAD, flexDirection: "column" },

  row: { flexDirection: "row" },
  cell: { width: CARD_W, marginRight: GAP },
  cardPressed: { opacity: 0.8 },

  posterWrap: { borderRadius: 14, overflow: "hidden", backgroundColor: "#1c1f26" },
  poster: { width: CARD_W, height: CARD_H },
  noImage: { alignItems: "center", justifyContent: "center" },
  currentBadge: {
    position: "absolute",
    bottom: 8,
    left: 6,
    right: 6,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: "center",
  },
  currentBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  title: { fontSize: 12, lineHeight: 16, marginTop: 8, textAlign: "center" },

  // Track: fixed, known width so the two absolute line bars line up exactly
  // with the dots rendered in the normal-flow row below them.
  trackRow: { marginTop: 22, height: 44 },
  line: {
    position: "absolute",
    top: DOT / 2 - LINE_H / 2,
    height: LINE_H,
    borderRadius: LINE_H / 2,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    alignSelf: "center",
  },
  dotCurrent: {
    width: CURRENT_DOT,
    height: CURRENT_DOT,
    borderRadius: CURRENT_DOT / 2,
    borderWidth: 3,
    alignSelf: "center",
    marginTop: (DOT - CURRENT_DOT) / 2,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  year: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
  },
});