import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { View, Text, FlatList, ScrollView, Pressable, TextInput, ActivityIndicator, Keyboard, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient"; // npx expo install expo-linear-gradient
import { Ionicons } from "@expo/vector-icons";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import { useCustomTheme } from "../contexts/ThemeContext";
import useFreeShow from "../hooks/useFreeShow";
import EpisodePlayer from "../components/streaming/EpisodePlayer";
import {
  buildRanges,
  rowsInRange,
  rangeIndexOf,
  nextPlayable,
  prevPlayable,
  continueTarget,
  lastWatchedEpisode,
  usefulTitle,
  formatAirDate,
  formatCount,
} from "../utils/streamingHelpers";

const SIDE = 16;
const BACKDROP_H = 400;

// "#1a1a1a" / "rgb(26,26,26)" -> "rgba(26,26,26,a)" so gradients fade without a grey halo
const withAlpha = (color, a) => {
  if (!color) return `rgba(0,0,0,${a})`;
  if (color.startsWith("#")) {
    let h = color.slice(1);
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h.slice(0, 6), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const m = color.match(/\d+(\.\d+)?/g);
  return m ? `rgba(${m[0]},${m[1]},${m[2]},${a})` : color;
};

// ─── Episode card ─────────────────────────────────────────────────────────────

const EpisodeRow = React.memo(({ row, title, airDate, isWatched, isPlaying, isNext, onPlay, onToggleWatched, colors, soft }) => {
  const date = formatAirDate(airDate);
  const accent = colors.primary;
  const highlighted = isPlaying || isNext;

  const status = isPlaying ? "Now playing" : isNext ? "Up next" : isWatched ? "Watched" : null;
  const meta = [status, date].filter(Boolean);

  return (
    <Pressable
      onPress={() => onPlay(row)}
      style={({ pressed }) => [styles.card, { backgroundColor: soft, opacity: pressed ? 0.75 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`Play episode ${row.n}${title ? `, ${title}` : ""}`}
    >
      {highlighted ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: accent, opacity: isPlaying ? 0.16 : 0.09 }]} /> : null}
      {isPlaying ? <View style={[styles.cardAccent, { backgroundColor: accent }]} /> : null}

      <View style={[styles.numTile, isPlaying ? { backgroundColor: accent } : { backgroundColor: colors.background }]}>
        {isPlaying ? (
          <Ionicons name="stats-chart" size={18} color="#fff" />
        ) : (
          <Text style={[styles.numText, { color: colors.text, opacity: isWatched ? 0.35 : 0.9 }]}>{row.n}</Text>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text
          style={[styles.cardTitle, { color: colors.text, opacity: isWatched && !isPlaying ? 0.5 : 1 }]}
          numberOfLines={2}
        >
          {title || `Episode ${row.n}`}
        </Text>
        {meta.length ? (
          <Text style={[styles.cardMeta, { color: colors.text }]} numberOfLines={1}>
            {meta.map((m, i) => (
              <Text key={m} style={m === status && (isPlaying || isNext) ? { color: accent, fontWeight: "700", opacity: 1 } : null}>
                {i > 0 ? "  ·  " : ""}
                {m}
              </Text>
            ))}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={() => onToggleWatched(row.n, !isWatched)}
        hitSlop={10}
        style={styles.checkBtn}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isWatched }}
        accessibilityLabel={`Episode ${row.n} watched`}
      >
        <Ionicons
          name={isWatched ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={isWatched ? accent : colors.text}
          style={{ opacity: isWatched ? 1 : 0.22 }}
        />
      </Pressable>
    </Pressable>
  );
});
EpisodeRow.displayName = "EpisodeRow";

// ─── Screen ───────────────────────────────────────────────────────────────────

const FreeShowScreen = ({ route, navigation }) => {
  const { tmdbId, title, season: initialSeason = 1, poster = null } = route.params;
  const [season, setSeason] = useState(initialSeason);
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";
  const { status, rows, latest, seasons, names, watched, setEpisodeWatched, reload } = useFreeShow({ tmdbId, season });

  // If the season we opened on has nothing to watch here (region), jump to one that does.
  useEffect(() => {
    if (status === "ready" && seasons.length && !seasons.some((s) => s.season === season)) setSeason(seasons[0].season);
  }, [status, seasons, season]);

  const [playing, setPlaying] = useState(null);
  const [rangeIndex, setRangeIndex] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [jumpText, setJumpText] = useState("");
  const [jumpMsg, setJumpMsg] = useState(null);
  const listRef = useRef(null);

  const ranges = useMemo(() => buildRanges(rows), [rows]);
  const visible = useMemo(() => (rangeIndex === null ? [] : rowsInRange(rows, rangeIndex)), [rows, rangeIndex]);
  const activeRange = useMemo(() => ranges.find((r) => r.index === rangeIndex), [ranges, rangeIndex]);

  const continueRow = useMemo(() => continueTarget(rows, watched, season), [rows, watched, season]);
  const latestRow = useMemo(() => (rows.length ? rows[rows.length - 1] : null), [rows]);
  const hasHistory = lastWatchedEpisode(watched, season) > 0;

  const watchedCount = useMemo(() => rows.reduce((n, r) => (watched[`s${season}e${r.n}`] ? n + 1 : n), 0), [rows, watched, season]);
  const progress = rows.length ? watchedCount / rows.length : 0;

  // First view: where you left off, or the newest episodes if you have not watched any.
  useEffect(() => {
    if (status !== "ready" || rangeIndex !== null || !ranges.length) return;
    const target = hasHistory ? continueRow || latestRow : latestRow;
    setRangeIndex(target ? rangeIndexOf(target.n) : ranges[ranges.length - 1].index);
  }, [status, ranges, rangeIndex, hasHistory, continueRow, latestRow]);

  const play = useCallback((row) => {
    if (!row) return;
    setPlaying(row);
    setRangeIndex(rangeIndexOf(row.n));
    setJumpMsg(null);
  }, []);

  const handleNext = useCallback(() => play(nextPlayable(rows, playing?.n)), [rows, playing, play]);
  const handlePrev = useCallback(() => play(prevPlayable(rows, playing?.n)), [rows, playing, play]);
  const handleEnded = useCallback((n) => setEpisodeWatched(n, true), [setEpisodeWatched]);

  const submitJump = useCallback(() => {
    const n = parseInt(jumpText, 10);
    Keyboard.dismiss();
    if (!(n > 0)) return;
    const row = rows.find((r) => r.n === n);
    if (row) {
      setJumpText("");
      setSearchOpen(false);
      play(row);
    } else {
      setJumpMsg(`Episode ${n} isn't available on YouTube here.`);
    }
  }, [jumpText, rows, play]);

  const toggleSearch = useCallback(() => {
    setSearchOpen((o) => !o);
    setJumpText("");
    setJumpMsg(null);
  }, []);

  const selectRange = useCallback((i) => {
    setRangeIndex(i);
    listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
  }, []);

  const selectSeason = useCallback(
    (next) => {
      if (next === season) return;
      setSeason(next);
      setPlaying(null);
      setRangeIndex(null); // picks the right starting range again once the new season has loaded
      setSearchOpen(false);
      setJumpText("");
      setJumpMsg(null);
    },
    [season],
  );

  const soft = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.045)";
  const hairline = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)";
  const mutedText = { color: colors.text, opacity: 0.55 };

  const renderItem = useCallback(
    ({ item }) => (
      <EpisodeRow
        row={item}
        title={usefulTitle(names[item.n]?.title, item.n)}
        airDate={names[item.n]?.airDate}
        isWatched={!!watched[`s${season}e${item.n}`]}
        isPlaying={playing?.n === item.n}
        isNext={!playing && continueRow?.n === item.n}
        onPlay={play}
        onToggleWatched={setEpisodeWatched}
        colors={colors}
        soft={soft}
      />
    ),
    [names, watched, season, playing, continueRow, play, setEpisodeWatched, colors, soft],
  );

  const seasonBar =
    seasons.length > 1 ? (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
        {seasons.map((s) => {
          const selected = s.season === season;
          return (
            <Pressable
              key={s.season}
              onPress={() => selectSeason(s.season)}
              style={[styles.chip, { backgroundColor: selected ? colors.text : soft }]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Season ${s.season}, ${s.count} episodes`}
            >
              <Text style={[styles.chipText, { color: selected ? colors.background : colors.text, opacity: selected ? 1 : 0.7 }]}>
                Season {s.season}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    ) : null;

  const header = (
    <View>
      {/* Hero: blurred poster backdrop fading into the page (hidden while playing) */}
      {!playing ? (
        <View style={[styles.hero, { paddingTop: insets.top + 64 }]}>
          <View style={styles.backdrop} pointerEvents="none">
            {poster ? (
              <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={35} transition={300} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: soft }]} />
            )}
            {/* even out the image so text and poster stay readable */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, opacity: isDark ? 0.35 : 0.45 }]} />
            {/* top scrim keeps the status bar and back button legible */}
            <LinearGradient
              colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"]}
              style={[styles.topScrim, { height: insets.top + 90 }]}
            />
            {/* smooth, eased fade into the page */}
            <LinearGradient
              colors={[
                withAlpha(colors.background, 0),
                withAlpha(colors.background, 0.2),
                withAlpha(colors.background, 0.55),
                withAlpha(colors.background, 0.85),
                withAlpha(colors.background, 1),
              ]}
              locations={[0, 0.3, 0.6, 0.85, 1]}
              style={styles.fade}
            />
          </View>

          <View style={styles.heroRow}>
            <View style={[styles.heroPoster, { backgroundColor: soft }]}>
              {poster ? (
                <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
              ) : (
                <Ionicons name="tv-outline" size={26} color={colors.text} style={{ opacity: 0.3 }} />
              )}
            </View>

            <View style={styles.heroBody}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
                {title}
              </Text>
              <Text style={[styles.subtitle, mutedText]}>
                {seasons.length > 1 ? `Season ${season}  ·  ` : ""}
                {status === "ready" ? `${formatCount(rows.length)} episodes${latest ? `  ·  up to #${formatCount(latest)}` : ""}` : "Loading…"}
              </Text>

              {watchedCount > 0 ? (
                <View style={styles.progressWrap}>
                  <View style={[styles.progressTrack, { backgroundColor: hairline }]}>
                    <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 3)}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={[styles.progressText, mutedText]}>
                    {formatCount(watchedCount)} of {formatCount(rows.length)} watched
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {continueRow ? (
            <Pressable
              onPress={() => play(continueRow)}
              style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              accessibilityRole="button"
            >
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={styles.primaryText}>
                {hasHistory ? "Continue" : "Start watching"} · Episode {continueRow.n}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Section header */}
      <View style={styles.sectionBar}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Episodes</Text>
          {activeRange ? (
            <Text style={[styles.sectionSub, mutedText]}>
              {activeRange.from}–{activeRange.to}
            </Text>
          ) : null}
        </View>
        <View style={styles.tools}>
          {latestRow && latestRow.n !== continueRow?.n ? (
            <Pressable
              onPress={() => play(latestRow)}
              style={[styles.toolPill, { backgroundColor: soft }]}
              accessibilityRole="button"
              accessibilityLabel={`Play latest, episode ${latestRow.n}`}
            >
              <Ionicons name="flash" size={13} color={colors.primary} />
              <Text style={[styles.toolPillText, { color: colors.text }]}>Latest</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={toggleSearch}
            style={[styles.toolCircle, { backgroundColor: searchOpen ? colors.text : soft }]}
            accessibilityRole="button"
            accessibilityLabel="Go to episode number"
          >
            <Ionicons name={searchOpen ? "close" : "search"} size={17} color={searchOpen ? colors.background : colors.text} />
          </Pressable>
        </View>
      </View>

      {searchOpen ? (
        <View style={styles.searchWrap}>
          <View style={[styles.jump, { backgroundColor: soft }]}>
            <Text style={[styles.jumpHash, mutedText]}>#</Text>
            <TextInput
              value={jumpText}
              onChangeText={(t) => {
                setJumpText(t.replace(/[^0-9]/g, ""));
                setJumpMsg(null);
              }}
              placeholder="Go to episode"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={submitJump}
              style={[styles.jumpInput, { color: colors.text }]}
              maxLength={6}
              autoFocus
            />
          </View>
          {jumpMsg ? <Text style={[styles.jumpMsg, mutedText]}>{jumpMsg}</Text> : null}
        </View>
      ) : null}

      {seasonBar}

      {ranges.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          {ranges.map((r) => {
            const selected = r.index === rangeIndex;
            return (
              <Pressable
                key={r.index}
                onPress={() => selectRange(r.index)}
                style={[styles.chip, { backgroundColor: selected ? colors.primary : soft }]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Episodes ${r.from} to ${r.to}, ${r.count} available`}
              >
                <Text style={[styles.chipText, { color: selected ? "#fff" : colors.text, opacity: selected ? 1 : 0.7 }]}>
                  {r.from}–{r.to}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );

  const footer = (
    <Text style={[styles.note, { color: colors.text }]}>
      Videos play from the original channels on YouTube. CineLink doesn't host them.
    </Text>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["left", "right"]}>
      {playing ? (
        <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={[styles.back, { backgroundColor: soft }]} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={[styles.back, styles.backFloating, { top: insets.top + 6 }, poster ? styles.backOnImage : { backgroundColor: soft }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={poster ? "#fff" : colors.text} />
        </Pressable>
      )}

      {playing ? (
        <EpisodePlayer
          episode={playing}
          title={usefulTitle(names[playing.n]?.title, playing.n)}
          nextEpisode={nextPlayable(rows, playing.n)}
          hasPrev={!!prevPlayable(rows, playing.n)}
          onPrev={handlePrev}
          onNext={handleNext}
          onEnded={handleEnded}
          onClose={() => setPlaying(null)}
          colors={colors}
          isDark={isDark}
        />
      ) : null}

      {status === "loading" && seasons.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : status === "error" ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={34} color={colors.text} style={{ opacity: 0.4 }} />
          <Text style={[styles.stateText, { color: colors.text }]}>Couldn't load episodes. Check your connection and try again.</Text>
          <Pressable onPress={reload} style={[styles.retry, { backgroundColor: colors.primary }]} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : rows.length === 0 && status !== "loading" ? (
        <View style={styles.center}>
          <Text style={[styles.stateText, { color: colors.text }]}>No episodes are available in your region yet.</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={status === "loading" ? [] : visible}
          keyExtractor={(r) => String(r.n)}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={
            status === "loading" ? <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 48 }} /> : null
          }
          ListFooterComponent={footer}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
          ItemSeparatorComponent={Separator}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          windowSize={5}
          removeClippedSubviews
        />
      )}
    </SafeAreaView>
  );
};

const Separator = () => <View style={{ height: 8 }} />;

export default FreeShowScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: SIDE, paddingTop: 6, paddingBottom: 8 },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  backFloating: { position: "absolute", left: SIDE, zIndex: 10 },
  backOnImage: { backgroundColor: "rgba(0,0,0,0.35)" },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  stateText: { fontSize: 14, opacity: 0.65, textAlign: "center", lineHeight: 20 },
  retry: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, marginTop: 4 },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Hero
  hero: { paddingHorizontal: SIDE, paddingBottom: 22, paddingTop: 8 },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, height: BACKDROP_H, overflow: "hidden" },
  topScrim: { position: "absolute", top: 0, left: 0, right: 0 },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 220 },
  heroRow: { flexDirection: "row", gap: 16 },
  heroPoster: {
    width: 112,
    height: 168,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  heroBody: { flex: 1, justifyContent: "flex-end", gap: 6, paddingBottom: 2 },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.7, lineHeight: 30 },
  subtitle: { fontSize: 13 },
  progressWrap: { gap: 6, marginTop: 6 },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  progressText: { fontSize: 12 },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 50, borderRadius: 25, marginTop: 20 },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: -0.1 },

  // Section header
  sectionBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: SIDE, paddingTop: 6, paddingBottom: 14 },
  sectionTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  sectionSub: { fontSize: 12.5, marginTop: 1 },
  tools: { flexDirection: "row", alignItems: "center", gap: 8 },
  toolPill: { flexDirection: "row", alignItems: "center", gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 17 },
  toolPillText: { fontSize: 13, fontWeight: "700" },
  toolCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },

  searchWrap: { paddingHorizontal: SIDE, paddingBottom: 12, gap: 6 },
  jump: { flexDirection: "row", alignItems: "center", gap: 6, height: 44, borderRadius: 14, paddingHorizontal: 14 },
  jumpHash: { fontSize: 16, fontWeight: "700" },
  jumpInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  jumpMsg: { fontSize: 12.5, paddingHorizontal: 4 },

  chips: { gap: 8, paddingHorizontal: SIDE, paddingBottom: 14 },
  chip: { height: 34, borderRadius: 17, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "700" },

  // Episode card
  card: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 68, padding: 10, paddingRight: 14, borderRadius: 16, marginHorizontal: SIDE, overflow: "hidden" },
  cardAccent: { position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: 2 },
  numTile: { width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  numText: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3, fontVariant: ["tabular-nums"] },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 15, fontWeight: "700", letterSpacing: -0.2, lineHeight: 20 },
  cardMeta: { fontSize: 12.5, opacity: 0.55 },
  checkBtn: { padding: 2 },

  note: { fontSize: 12, opacity: 0.4, textAlign: "center", marginTop: 28, paddingHorizontal: 32, lineHeight: 17 },
});
