import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import logger from "../../services/logger";

/* ───────────────────────── constants & helpers ───────────────────────── */

const CARD_HEIGHT = 236;
const CARD_GAP = 12;
const LIST_PADDING = 20;
const PREVIEW_LINES = 5;
const PREVIEW_CHAR_LIMIT = 230;
const AVATAR_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#ef4444",
  "#22c55e",
];

const getRatingColor = (rating) => {
  if (rating >= 8) return "#10b981";
  if (rating >= 6.5) return "#84cc16";
  if (rating >= 5) return "#f59e0b";
  if (rating >= 3.5) return "#f97316";
  return "#ef4444";
};

// TMDB reviews contain markdown + CRLF; flatten to readable plain text.
const cleanContent = (text) =>
  (typeof text === "string" ? text : "")
    .replace(/\r\n?/g, "\n")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(\*\*|__)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const formatDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getRating = (review) => {
  const r = review?.author_details?.rating;
  return typeof r === "number" && r > 0 ? r : null;
};

const avatarColor = (name = "") => {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const initialsOf = (name = "") => (name.trim().charAt(0) || "?").toUpperCase();

const openUrl = (url) => {
  if (!url) return;
  Linking.openURL(url).catch((err) =>
    logger.error("Failed to open review link", err),
  );
};

/* ───────────────────────── small building blocks ───────────────────────── */

const Avatar = React.memo(({ name, size = 36 }) => (
  <View
    style={[
      styles.avatar,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: avatarColor(name),
      },
    ]}
  >
    <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>
      {initialsOf(name)}
    </Text>
  </View>
));
Avatar.displayName = "Avatar";

const RatingPill = React.memo(({ rating, large }) => {
  if (rating == null) return null;
  return (
    <View
      style={[
        styles.ratingPill,
        large && styles.ratingPillLarge,
        { backgroundColor: getRatingColor(rating) },
      ]}
    >
      <Ionicons name="star" size={large ? 14 : 11} color="#fff" />
      <Text
        style={[styles.ratingPillText, large && styles.ratingPillTextLarge]}
      >
        {rating}
      </Text>
    </View>
  );
});
RatingPill.displayName = "RatingPill";

const SkeletonCard = React.memo(({ width, surface, pulse }) => {
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const bar = { backgroundColor: "rgba(128,128,128,0.25)" };
  return (
    <Animated.View
      style={[
        styles.card,
        { width, backgroundColor: surface.bg, borderColor: surface.border },
        style,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.skelCircle, bar]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.skelLine, bar, { width: "55%" }]} />
          <View style={[styles.skelLine, bar, { width: "35%", height: 8 }]} />
        </View>
      </View>
      <View style={{ gap: 8, marginTop: 6 }}>
        <View style={[styles.skelLine, bar]} />
        <View style={[styles.skelLine, bar]} />
        <View style={[styles.skelLine, bar]} />
        <View style={[styles.skelLine, bar, { width: "70%" }]} />
      </View>
    </Animated.View>
  );
});
SkeletonCard.displayName = "SkeletonCard";

const LoadingSkeleton = React.memo(({ cardWidth, surface }) => {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  return (
    <View style={styles.skeletonRow}>
      {[0, 1].map((i) => (
        <SkeletonCard
          key={i}
          width={cardWidth}
          surface={surface}
          pulse={pulse}
        />
      ))}
    </View>
  );
});
LoadingSkeleton.displayName = "LoadingSkeleton";

/* ───────────────────────── review card ───────────────────────── */

const ReviewCard = React.memo(({ review, width, surface, colors, onOpen }) => {
  const content = useMemo(() => cleanContent(review.content), [review.content]);
  const truncated = content.length > PREVIEW_CHAR_LIMIT;
  const rating = getRating(review);
  const author =
    review.author || review.author_details?.username || "Anonymous";

  return (
    <Pressable
      onPress={() => onOpen(review)}
      android_ripple={{ color: "rgba(128,128,128,0.15)" }}
      style={({ pressed }) => [
        styles.card,
        { width, backgroundColor: surface.bg, borderColor: surface.border },
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Review by ${author}${rating ? `, rated ${rating} out of 10` : ""}. Tap to read.`}
    >
      <View style={styles.cardHeader}>
        <Avatar name={author} />
        <View style={styles.authorBlock}>
          <Text
            style={[styles.authorName, { color: colors.text }]}
            numberOfLines={1}
          >
            {author}
          </Text>
          <Text style={[styles.metaText, { color: colors.text }]}>
            {formatDate(review.created_at)}
          </Text>
        </View>
        <RatingPill rating={rating} />
      </View>

      <Text
        style={[styles.cardContent, { color: colors.text }]}
        numberOfLines={PREVIEW_LINES}
      >
        {content}
      </Text>

      {truncated && (
        <Text style={[styles.readMore, { color: colors.primary }]}>
          Read full review
        </Text>
      )}
    </Pressable>
  );
});
ReviewCard.displayName = "ReviewCard";

/* ───────────────────────── full review sheet ───────────────────────── */

const ReviewSheet = React.memo(({ review, onClose, colors, theme }) => {
  const insets = useSafeAreaInsets();
  const content = useMemo(() => cleanContent(review?.content), [review]);
  const author =
    review?.author || review?.author_details?.username || "Anonymous";
  const rating = getRating(review);

  return (
    <Modal
      visible={!!review}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close review"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme === "dark" ? "#161616" : "#ffffff",
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.text }]} />

          <View style={styles.sheetHeader}>
            <Avatar name={author} size={44} />
            <View style={styles.authorBlock}>
              <Text
                style={[styles.sheetAuthor, { color: colors.text }]}
                numberOfLines={1}
              >
                {author}
              </Text>
              <Text style={[styles.metaText, { color: colors.text }]}>
                {review?.created_at ? formatDate(review.created_at) : ""}
              </Text>
            </View>
            <RatingPill rating={rating} large />
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator
          >
            <Text style={[styles.sheetBody, { color: colors.text }]} selectable>
              {content}
            </Text>
          </ScrollView>

          {!!review?.url && (
            <Pressable
              onPress={() => openUrl(review.url)}
              style={[styles.tmdbButton, { backgroundColor: colors.primary }]}
              accessibilityRole="link"
            >
              <Text style={styles.tmdbButtonText}>View on TMDB</Text>
              <Ionicons name="open-outline" size={16} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
});
ReviewSheet.displayName = "ReviewSheet";

/* ───────────────────────── rating summary ───────────────────────── */

const getSentiment = (avg) => {
  if (avg >= 8) return "Excellent";
  if (avg >= 6.5) return "Mostly positive";
  if (avg >= 5) return "Mixed";
  if (avg >= 3.5) return "Mostly negative";
  return "Negative";
};

const BUCKET_ROWS = [
  { key: "positive", label: "Positive", color: "#10b981" },
  { key: "mixed", label: "Mixed", color: "#f59e0b" },
  { key: "negative", label: "Negative", color: "#ef4444" },
];

const RatingSummary = React.memo(({ stats, colors, surface }) => {
  const { avg, count, buckets } = stats;
  const tone = getRatingColor(avg);

  return (
    <View
      style={[
        styles.summary,
        { backgroundColor: tone + "1f", borderColor: tone + "55" },
      ]}
      accessible
      accessibilityLabel={`${getSentiment(avg)}. Average rating ${avg.toFixed(1)} out of 10 from ${count} rated reviews`}
    >
      <View style={styles.summaryScore}>
        <View style={styles.scoreRow}>
          <Ionicons
            name="star"
            size={26}
            color={tone}
            style={styles.scoreStar}
          />
          <Text style={[styles.scoreValue, { color: tone }]}>
            {avg.toFixed(1)}
          </Text>
          <Text style={[styles.scoreMax, { color: colors.text }]}>/10</Text>
        </View>
        <Text style={[styles.sentiment, { color: tone }]}>
          {getSentiment(avg)}
        </Text>
        <Text style={[styles.summaryMeta, { color: colors.text }]}>
          {count} rated {count === 1 ? "review" : "reviews"}
        </Text>
      </View>

      <View style={styles.summaryBars}>
        {BUCKET_ROWS.map(({ key, label, color }) => {
          const n = buckets[key];
          return (
            <View key={key} style={styles.barRow}>
              <Text style={[styles.barLabel, { color: colors.text }]}>
                {label}
              </Text>
              <View
                style={[
                  styles.barTrack,
                  { backgroundColor: "rgba(128,128,128,0.2)" },
                ]}
              >
                <View
                  style={[
                    styles.barFill,
                    { backgroundColor: color, width: `${(n / count) * 100}%` },
                  ]}
                />
              </View>
              <Text style={[styles.barCount, { color: colors.text }]}>{n}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});
RatingSummary.displayName = "RatingSummary";

/* ───────────────────────── section ───────────────────────── */

const ReviewsSection = ({
  reviews,
  total,
  status,
  loadingMore,
  loadMoreError,
  hasMore,
  onLoadMore,
  onRetry,
  colors,
  theme,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const [selected, setSelected] = useState(null);

  const cardWidth = Math.min(Math.round(screenWidth * 0.82), 360);
  const snapInterval = cardWidth + CARD_GAP;

  const surface = useMemo(
    () => ({
      bg: theme === "dark" ? "rgba(255,255,255,0.06)" : "#ffffff",
      border: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
    }),
    [theme],
  );

  // Stats from the ratings we actually have (not every review includes one)
  const stats = useMemo(() => {
    let sum = 0;
    let count = 0;
    const buckets = { positive: 0, mixed: 0, negative: 0 };
    for (const r of reviews) {
      const v = getRating(r);
      if (v == null) continue;
      sum += v;
      count += 1;
      if (v >= 7) buckets.positive += 1;
      else if (v >= 5) buckets.mixed += 1;
      else buckets.negative += 1;
    }
    if (count === 0) return null;
    const avg = sum / count;
    return { avg, count, buckets };
  }, [reviews]);

  const handleOpen = useCallback((review) => setSelected(review), []);
  const handleClose = useCallback(() => setSelected(null), []);

  const renderItem = useCallback(
    ({ item }) => (
      <ReviewCard
        review={item}
        width={cardWidth}
        surface={surface}
        colors={colors}
        onOpen={handleOpen}
      />
    ),
    [cardWidth, surface, colors, handleOpen],
  );

  const getItemLayout = useCallback(
    (_, index) => ({
      length: snapInterval,
      offset: LIST_PADDING + snapInterval * index,
      index,
    }),
    [snapInterval],
  );

  const handleEndReached = useCallback(() => {
    if (hasMore && !loadingMore && !loadMoreError) onLoadMore?.();
  }, [hasMore, loadingMore, loadMoreError, onLoadMore]);

  const footer = useMemo(() => {
    if (loadingMore) {
      return (
        <View style={[styles.footerCard, { borderColor: surface.border }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      );
    }
    if (loadMoreError) {
      return (
        <Pressable
          onPress={onLoadMore}
          style={[styles.footerCard, { borderColor: colors.primary }]}
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={20} color={colors.primary} />
          <Text style={[styles.footerText, { color: colors.primary }]}>
            Retry
          </Text>
        </Pressable>
      );
    }
    return null;
  }, [loadingMore, loadMoreError, onLoadMore, colors.primary, surface.border]);

  // Nothing to say for idle titles
  if (status === "idle") return null;

  const isEmpty = status === "success" && reviews.length === 0;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>Reviews</Text>
          {status === "success" && total > 0 && (
            <Text style={[styles.count, { color: colors.text }]}>{total}</Text>
          )}
        </View>
      </View>

      {status === "success" && stats && (
        <RatingSummary stats={stats} colors={colors} surface={surface} />
      )}

      {status === "loading" && (
        <LoadingSkeleton cardWidth={cardWidth} surface={surface} />
      )}

      {status === "error" && (
        <View
          style={[
            styles.stateBox,
            { backgroundColor: surface.bg, borderColor: surface.border },
          ]}
        >
          <Ionicons
            name="cloud-offline-outline"
            size={28}
            color={colors.text}
            style={styles.stateIcon}
          />
          <Text style={[styles.stateTitle, { color: colors.text }]}>
            Couldn't load reviews
          </Text>
          <Text style={[styles.stateBody, { color: colors.text }]}>
            Check your connection and try again.
          </Text>
          <Pressable
            onPress={onRetry}
            style={[styles.stateButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.stateButtonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {isEmpty && (
        <View
          style={[
            styles.stateBox,
            { backgroundColor: surface.bg, borderColor: surface.border },
          ]}
        >
          <Ionicons
            name="chatbubble-outline"
            size={28}
            color={colors.text}
            style={styles.stateIcon}
          />
          <Text style={[styles.stateTitle, { color: colors.text }]}>
            No reviews yet
          </Text>
          <Text style={[styles.stateBody, { color: colors.text }]}>
            Reviews from TMDB users will appear here.
          </Text>
        </View>
      )}

      {status === "success" && reviews.length > 0 && (
        <FlatList
          horizontal
          data={reviews}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          ItemSeparatorComponent={Separator}
          ListFooterComponent={footer}
          ListFooterComponentStyle={styles.footerWrap}
          contentContainerStyle={styles.listContent}
          showsHorizontalScrollIndicator={false}
          snapToInterval={snapInterval}
          snapToAlignment="start"
          decelerationRate="fast"
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.6}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews
        />
      )}

      <ReviewSheet
        review={selected}
        onClose={handleClose}
        colors={colors}
        theme={theme}
      />
    </View>
  );
};

const keyExtractor = (item) => String(item.id);
const Separator = () => <View style={{ width: CARD_GAP }} />;

export default React.memo(ReviewsSection);

/* ───────────────────────── styles ───────────────────────── */

const styles = StyleSheet.create({
  section: { marginTop: 24, marginBottom: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: LIST_PADDING,
    marginBottom: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  title: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  count: { fontSize: 14, fontWeight: "500", opacity: 0.5 },

  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginHorizontal: LIST_PADDING,
    marginBottom: 16,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  summaryScore: { alignItems: "flex-start" },
  scoreRow: { flexDirection: "row", alignItems: "flex-end" },
  scoreStar: { marginRight: 6, marginBottom: 8 },
  scoreValue: {
    fontSize: 46,
    fontWeight: "800",
    letterSpacing: -1.5,
    lineHeight: 50,
  },
  scoreMax: {
    fontSize: 15,
    fontWeight: "600",
    opacity: 0.5,
    marginBottom: 7,
    marginLeft: 2,
  },
  sentiment: { fontSize: 15, fontWeight: "700", marginTop: 4 },
  summaryMeta: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  summaryBars: { flex: 1, gap: 8 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 58, fontSize: 12, opacity: 0.75 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  barCount: { width: 22, fontSize: 12, fontWeight: "600", textAlign: "right" },

  listContent: { paddingHorizontal: LIST_PADDING, paddingBottom: 6 },

  card: {
    height: CARD_HEIGHT,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 16,
    overflow: "hidden",
  },
  cardPressed: { opacity: 0.85 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  authorBlock: { flex: 1 },
  authorName: { fontSize: 15, fontWeight: "600" },
  metaText: { fontSize: 12, opacity: 0.55, marginTop: 1 },
  cardContent: { fontSize: 14, lineHeight: 21, opacity: 0.85, flex: 1 },
  readMore: { fontSize: 13, fontWeight: "600", marginTop: 8 },

  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700" },

  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingPillLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  ratingPillText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  ratingPillTextLarge: { fontSize: 14 },

  footerWrap: { justifyContent: "center", marginLeft: CARD_GAP },
  footerCard: {
    width: 88,
    height: CARD_HEIGHT,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  footerText: { fontSize: 13, fontWeight: "600" },

  skeletonRow: {
    flexDirection: "row",
    gap: CARD_GAP,
    paddingHorizontal: LIST_PADDING,
  },
  skelCircle: { width: 36, height: 36, borderRadius: 18 },
  skelLine: { height: 10, borderRadius: 5 },

  stateBox: {
    marginHorizontal: LIST_PADDING,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
  },
  stateIcon: { opacity: 0.5, marginBottom: 10 },
  stateTitle: { fontSize: 16, fontWeight: "700" },
  stateBody: { fontSize: 13, opacity: 0.6, marginTop: 4, textAlign: "center" },
  stateButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
  },
  stateButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.2,
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  sheetAuthor: { fontSize: 17, fontWeight: "700" },
  closeBtn: { padding: 2 },
  sheetScroll: { flexGrow: 0 },
  sheetScrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  sheetBody: { fontSize: 15, lineHeight: 24, opacity: 0.9 },
  tmdbButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  tmdbButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
