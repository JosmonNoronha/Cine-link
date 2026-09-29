import React, {
  memo,
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildTmdbImageUrl } from "../../utils/imageHelper";

const { width: W, height: H } = Dimensions.get("window");

// ─── Layout constants ─────────────────────────────────────────────────────────
const CARD_H = Math.round(W * 0.58);
const THUMB_W = 72;
const THUMB_H = 46;
const GRID_GAP = 8;
const GRID_COL = 2;
const GRID_ITEM_W = (W - 32 - GRID_GAP) / GRID_COL;
const GRID_ITEM_H = Math.round(GRID_ITEM_W * 0.62);

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const tok = (isDark) => ({
  // card & surfaces
  card: isDark ? "#18181b" : "#ffffff",
  surface: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
  surfaceStrong: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)",
  border: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)",

  // text
  textPrimary: isDark ? "#e4e4e7" : "#18181b",
  textSub: isDark ? "rgba(228,228,231,0.42)" : "rgba(24,24,27,0.42)",
  textMuted: isDark ? "rgba(228,228,231,0.24)" : "rgba(24,24,27,0.24)",

  // grid / modals always dark (images look better on dark bg)
  gridBg: "#0d0d0f",
  gridBorder: "rgba(255,255,255,0.07)",
  gridTitle: "#f0f0f2",
  gridSub: "rgba(255,255,255,0.35)",
  gridCloseBtn: "rgba(255,255,255,0.08)",
  gridCloseFg: "rgba(255,255,255,0.85)",

  // pill overlays on images — always dark
  pillBg: "rgba(0,0,0,0.52)",
  pillText: "#ffffff",

  // dots
  dotInactive: isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)",
  dotActive: isDark ? "#ffffff" : "#18181b",
  dotMore: isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.35)",

  // thumb
  thumbBorderActive: isDark ? "#ffffff" : "#18181b",
  thumbOverlay: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.18)",

  // browse-all pill
  browseBg: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)",
  browseFg: isDark ? "rgba(255,255,255,0.75)" : "rgba(24,24,27,0.65)",

  // expand icon on hero
  expandBg: "rgba(0,0,0,0.45)",
  expandFg: "rgba(255,255,255,0.75)",

  // state / shimmer
  shimmer: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
  stateIcon: isDark ? "rgba(228,228,231,0.25)" : "rgba(24,24,27,0.22)",
  stateText: isDark ? "rgba(228,228,231,0.42)" : "rgba(24,24,27,0.40)",

  // count text
  countFg: isDark ? "rgba(228,228,231,0.38)" : "rgba(24,24,27,0.38)",

  // progress count in preview
  previewTopBg: "rgba(0,0,0,0.55)",
  previewBotBg: "rgba(0,0,0,0.40)",
  previewPillBg: "rgba(255,255,255,0.12)",
  previewPillFg: "#ffffff",
  previewTypeBg: "rgba(255,255,255,0.08)",
  previewTypeFg: "rgba(255,255,255,0.65)",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const dedupeImages = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = item?.file_path || item?.filePath;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeImages = (images) => {
  const backdrops = (images?.backdrops || []).map((i) => ({
    ...i,
    _type: "backdrop",
  }));
  const posters = (images?.posters || []).map((i) => ({
    ...i,
    _type: "poster",
  }));
  return dedupeImages([...backdrops, ...posters]);
};

const filePath = (item) => item?.file_path || item?.filePath;
const typeLabel = (item) => (item?._type === "poster" ? "POSTER" : "STILL");

// ─── Dot indicator ────────────────────────────────────────────────────────────
const Dots = memo(({ total, active, T }) => (
  <View style={dot.row}>
    {Array.from({ length: Math.min(total, 8) }, (_, i) => (
      <View
        key={i}
        style={[
          dot.dot,
          { backgroundColor: i === active ? T.dotActive : T.dotInactive },
          i === active && dot.wide,
        ]}
      />
    ))}
    {total > 8 && (
      <Text style={[dot.more, { color: T.dotMore }]}>+{total - 8}</Text>
    )}
  </View>
));

const dot = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  wide: { width: 16 },
  more: { fontSize: 10, marginLeft: 2 },
});

// ─── Thumb strip ──────────────────────────────────────────────────────────────
const ThumbStrip = memo(({ items, activeIndex, onPress, T }) => {
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollToIndex?.({
      index: activeIndex,
      animated: true,
      viewPosition: 0.5,
    });
  }, [activeIndex]);

  const renderItem = useCallback(
    ({ item, index }) => (
      <TouchableOpacity
        onPress={() => onPress(index)}
        activeOpacity={0.8}
        style={[
          th.wrap,
          {
            borderColor:
              index === activeIndex ? T.thumbBorderActive : "transparent",
          },
        ]}
      >
        <ExpoImage
          source={{ uri: buildTmdbImageUrl(filePath(item), "backdrop_sm") }}
          style={th.img}
          contentFit="cover"
          transition={120}
        />
        {index === activeIndex && (
          <View style={[th.overlay, { backgroundColor: T.thumbOverlay }]} />
        )}
      </TouchableOpacity>
    ),
    [activeIndex, onPress, T],
  );

  return (
    <FlatList
      ref={listRef}
      data={items}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item, i) => filePath(item) || String(i)}
      renderItem={renderItem}
      contentContainerStyle={th.strip}
      getItemLayout={(_, i) => ({
        length: THUMB_W + 8,
        offset: (THUMB_W + 8) * i,
        index: i,
      })}
      onScrollToIndexFailed={() => {}}
    />
  );
});

const th = StyleSheet.create({
  strip: { paddingHorizontal: 16, paddingVertical: 2, gap: 8 },
  wrap: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 7,
    overflow: "hidden",
    borderWidth: 1.5,
  },
  img: { width: "100%", height: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject },
});

// ─── Full-screen preview modal ─────────────────────────────────────────────────
const PreviewModal = memo(({ visible, images, startIndex, onClose }) => {
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const [idx, setIdx] = useState(startIndex);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // preview is always dark
  const T = tok(true);

  useEffect(() => {
    if (visible) {
      setIdx(startIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex?.({
          index: startIndex,
          animated: false,
        });
      });
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, startIndex]);

  const onViewRef = useRef(({ viewableItems }) => {
    const next = viewableItems?.[0]?.index;
    if (typeof next === "number") setIdx(next);
  });
  const viewCfg = useRef({ viewAreaCoveragePercentThreshold: 55 });
  const item = images[idx];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <Animated.View style={[pv.root, { opacity: fadeAnim }]}>
        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(it, i) => filePath(it) || String(i)}
          onViewableItemsChanged={onViewRef.current}
          viewabilityConfig={viewCfg.current}
          initialScrollIndex={startIndex}
          getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item }) => (
            <View style={pv.slide}>
              <ExpoImage
                source={{ uri: buildTmdbImageUrl(filePath(item), "backdrop") }}
                style={pv.img}
                contentFit="contain"
                transition={160}
              />
            </View>
          )}
        />

        {/* top bar */}
        <View
          style={[
            pv.topBar,
            { paddingTop: insets.top + 8, backgroundColor: T.previewTopBg },
          ]}
        >
          <View style={[pv.countPill, { backgroundColor: T.previewPillBg }]}>
            <Text style={[pv.countText, { color: T.previewPillFg }]}>
              {idx + 1} / {images.length}
            </Text>
          </View>
          <View style={[pv.typePill, { backgroundColor: T.previewTypeBg }]}>
            <Text style={[pv.typeText, { color: T.previewTypeFg }]}>
              {item ? typeLabel(item) : ""}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[pv.closeBtn, { backgroundColor: T.previewPillBg }]}
            activeOpacity={0.75}
          >
            <Ionicons name="close" size={20} color={T.previewPillFg} />
          </TouchableOpacity>
        </View>

        {/* bottom dots */}
        <View
          style={[
            pv.bottomBar,
            {
              paddingBottom: insets.bottom + 12,
              backgroundColor: T.previewBotBg,
            },
          ]}
        >
          <Dots total={images.length} active={idx} T={T} />
        </View>
      </Animated.View>
    </Modal>
  );
});

const pv = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  slide: {
    width: W,
    height: H,
    justifyContent: "center",
    alignItems: "center",
  },
  img: { width: W, height: H * 0.78 },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 12,
  },
  countPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  countText: { fontSize: 12, fontWeight: "600" },
  typePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  typeText: { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  closeBtn: {
    marginLeft: "auto",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 12,
  },
});

// ─── Grid modal ───────────────────────────────────────────────────────────────
// Grid is always dark — images look best on dark background
const GridModal = memo(({ visible, images, onClose, onSelect }) => {
  const insets = useSafeAreaInsets();
  const T = tok(true); // grid always dark

  const renderItem = useCallback(
    ({ item, index }) => (
      <TouchableOpacity
        onPress={() => onSelect(index)}
        activeOpacity={0.82}
        style={gr.cell}
      >
        <ExpoImage
          source={{ uri: buildTmdbImageUrl(filePath(item), "backdrop") }}
          style={gr.img}
          contentFit="cover"
          transition={140}
        />
        <View style={gr.cellOverlay} />
        <View style={[gr.labelWrap, { backgroundColor: T.pillBg }]}>
          <Text style={[gr.label, { color: T.pillText }]}>
            {typeLabel(item)}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [onSelect],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          gr.root,
          { backgroundColor: T.gridBg, paddingTop: insets.top + 16 },
        ]}
      >
        <View style={[gr.header, { borderBottomColor: T.gridBorder }]}>
          <View>
            <Text style={[gr.title, { color: T.gridTitle }]}>All images</Text>
            <Text style={[gr.sub, { color: T.gridSub }]}>
              {images.length} assets
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[gr.closeBtn, { backgroundColor: T.gridCloseBtn }]}
            activeOpacity={0.75}
          >
            <Ionicons name="close" size={20} color={T.gridCloseFg} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={images}
          numColumns={GRID_COL}
          keyExtractor={(it, i) => filePath(it) || String(i)}
          renderItem={renderItem}
          contentContainerStyle={[
            gr.list,
            { paddingBottom: insets.bottom + 20 },
          ]}
          columnWrapperStyle={gr.row}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
});

const gr = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  sub: { fontSize: 12, marginTop: 3, letterSpacing: 0.2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingHorizontal: 12, paddingTop: 8 },
  row: { gap: GRID_GAP, marginBottom: GRID_GAP },
  cell: {
    width: GRID_ITEM_W,
    height: GRID_ITEM_H,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  img: { width: "100%", height: "100%" },
  cellOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.10)",
  },
  labelWrap: {
    position: "absolute",
    left: 8,
    bottom: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  label: { fontSize: 9, fontWeight: "800", letterSpacing: 0.9 },
});

// ─── Main ImageGallery ────────────────────────────────────────────────────────
const ImageGallery = memo(({ images, loading, error, colors, theme }) => {
  const isDark = theme === "dark";
  const T = useMemo(() => tok(isDark), [isDark]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [gridVisible, setGridVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewStart, setPreviewStart] = useState(0);

  const heroRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const allImages = useMemo(() => normalizeImages(images), [images]);
  const heroImages = useMemo(() => {
    const bds = allImages.filter((i) => i._type === "backdrop");
    return (bds.length ? bds : allImages).slice(0, 12);
  }, [allImages]);

  useEffect(() => {
    if (allImages.length) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }).start();
    }
  }, [allImages.length]);

  const onViewRef = useRef(({ viewableItems }) => {
    const next = viewableItems?.[0]?.index;
    if (typeof next === "number") setActiveIdx(next);
  });
  const viewCfg = useRef({ viewAreaCoveragePercentThreshold: 60 });

  const openPreview = useCallback((index) => {
    setPreviewStart(index);
    setPreviewVisible(true);
  }, []);

  const handleThumbPress = useCallback((index) => {
    heroRef.current?.scrollToIndex?.({ index, animated: true });
    setActiveIdx(index);
  }, []);

  const handleGridSelect = useCallback((index) => {
    setGridVisible(false);
    setTimeout(() => {
      setPreviewStart(index);
      setPreviewVisible(true);
    }, 300);
  }, []);

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.card, { backgroundColor: T.card }]}>
        <View style={s.sectionHeader}>
          <Text style={[s.sectionLabel, { color: T.textSub }]}>IMAGES</Text>
        </View>
        <View style={s.shimmerWrap}>
          <View
            style={[s.shimmer, { backgroundColor: T.shimmer, height: CARD_H }]}
          />
          <View
            style={[
              s.shimmer,
              {
                backgroundColor: T.shimmer,
                height: THUMB_H,
                width: "55%",
                marginTop: 10,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  // ── Error / empty state ──────────────────────────────────────────────────
  if (error || allImages.length === 0) {
    return (
      <View style={[s.card, { backgroundColor: T.card }]}>
        <View style={s.sectionHeader}>
          <Text style={[s.sectionLabel, { color: T.textSub }]}>IMAGES</Text>
        </View>
        <View style={s.stateBox}>
          <Ionicons name="images-outline" size={28} color={T.stateIcon} />
          <Text style={[s.stateText, { color: T.stateText }]}>
            {error || "No images available"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[s.card, { backgroundColor: T.card, opacity: fadeAnim }]}
    >
      {/* ── Section header ───────────────────────────────────────── */}
      <View style={s.sectionHeader}>
        <View>
          <Text style={[s.sectionLabel, { color: T.textSub }]}>IMAGES</Text>
          <Text style={[s.sectionCount, { color: T.textPrimary }]}>
            {allImages.length} assets
          </Text>
        </View>
        <TouchableOpacity
          style={[s.gridBtn, { backgroundColor: T.browseBg }]}
          onPress={() => setGridVisible(true)}
          activeOpacity={0.78}
        >
          <Ionicons name="grid" size={13} color={T.browseFg} />
          <Text style={[s.gridBtnText, { color: T.browseFg }]}>Browse all</Text>
        </TouchableOpacity>
      </View>

      {/* ── Hero pager ───────────────────────────────────────────── */}
      <View style={s.heroWrap}>
        <FlatList
          ref={heroRef}
          data={heroImages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(it, i) => filePath(it) || String(i)}
          onViewableItemsChanged={onViewRef.current}
          viewabilityConfig={viewCfg.current}
          decelerationRate="fast"
          snapToInterval={W - 40}
          snapToAlignment="start"
          contentContainerStyle={{ paddingRight: 16 }}
          getItemLayout={(_, i) => ({
            length: W - 40,
            offset: (W - 40) * i,
            index: i,
          })}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => openPreview(index)}
              activeOpacity={0.94}
              style={s.heroCard}
            >
              <ExpoImage
                source={{ uri: buildTmdbImageUrl(filePath(item), "hero") }}
                style={s.heroImg}
                contentFit="cover"
                transition={200}
              />
              {/* type label */}
              <View style={[s.heroTypePill, { backgroundColor: T.pillBg }]}>
                <Text style={[s.heroTypeText, { color: T.pillText }]}>
                  {typeLabel(item)}
                </Text>
              </View>
              {/* expand icon */}
              <View style={[s.expandIcon, { backgroundColor: T.expandBg }]}>
                <Ionicons name="expand-outline" size={14} color={T.expandFg} />
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ── Progress row ─────────────────────────────────────────── */}
      <View style={s.progressRow}>
        <Dots total={heroImages.length} active={activeIdx} T={T} />
        <Text style={[s.progressCount, { color: T.countFg }]}>
          {activeIdx + 1} / {heroImages.length}
        </Text>
      </View>

      {/* ── Thumb strip ──────────────────────────────────────────── */}
      <View style={s.thumbSection}>
        <ThumbStrip
          items={heroImages}
          activeIndex={activeIdx}
          onPress={handleThumbPress}
          T={T}
        />
      </View>

      {/* ── Modals ───────────────────────────────────────────────── */}
      <GridModal
        visible={gridVisible}
        images={allImages}
        onClose={() => setGridVisible(false)}
        onSelect={handleGridSelect}
      />
      <PreviewModal
        visible={previewVisible}
        images={heroImages}
        startIndex={previewStart}
        onClose={() => setPreviewVisible(false)}
      />
    </Animated.View>
  );
});

ImageGallery.displayName = "ImageGallery";

// ─── Card styles (layout only — colors come from T tokens) ───────────────────
const s = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: "hidden",
    paddingTop: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 5,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.4 },
  sectionCount: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  gridBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  gridBtnText: { fontSize: 12, fontWeight: "600" },

  heroWrap: { paddingLeft: 16 },
  heroCard: {
    width: W - 40,
    height: CARD_H,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  heroImg: { width: "100%", height: "100%" },
  heroTypePill: {
    position: "absolute",
    left: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroTypeText: { fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  expandIcon: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
  },
  progressCount: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },

  thumbSection: { marginBottom: 16 },

  // states
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 10,
  },
  stateText: { fontSize: 13, fontWeight: "500" },
  shimmerWrap: { paddingHorizontal: 16, paddingBottom: 24, gap: 0 },
  shimmer: { borderRadius: 14, width: "100%" },
});

export default ImageGallery;
