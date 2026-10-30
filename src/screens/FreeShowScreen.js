import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { View, Text, FlatList, ScrollView, Pressable, TextInput, ActivityIndicator, Keyboard, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
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

const SIDE = 20;

// ─── Episode row ──────────────────────────────────────────────────────────────
// Flat row: number · title/date · watched mark. No card backgrounds.

const EpisodeRow = React.memo(({ row, title, airDate, isWatched, isPlaying, onPlay, onToggleWatched, colors }) => {
  const date = formatAirDate(airDate);
  const accent = colors.primary;

  return (
    <Pressable
      onPress={() => onPlay(row)}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`Play episode ${row.n}${title ? `, ${title}` : ""}`}
    >
      <View style={styles.rowNum}>
        {isPlaying ? (
          <Ionicons name="volume-high" size={16} color={accent} />
        ) : (
          <Text style={[styles.rowNumText, { color: colors.text, opacity: isWatched ? 0.3 : 0.5 }]}>{row.n}</Text>
        )}
      </View>
      <View style={styles.rowBody}>
        <Text
          style={[styles.rowTitle, { color: isPlaying ? accent : colors.text, opacity: isWatched && !isPlaying ? 0.5 : 1 }]}
          numberOfLines={1}
        >
          {title || `Episode ${row.n}`}
        </Text>
        {date ? <Text style={[styles.rowMeta, { color: colors.text }]}>{date}</Text> : null}
      </View>
      <Pressable
        onPress={() => onToggleWatched(row.n, !isWatched)}
        hitSlop={12}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isWatched }}
        accessibilityLabel={`Episode ${row.n} watched`}
      >
        <Ionicons
          name={isWatched ? "checkmark-circle" : "ellipse-outline"}
          size={22}
          color={isWatched ? accent : colors.text}
          style={{ opacity: isWatched ? 0.9 : 0.2 }}
        />
      </Pressable>
    </Pressable>
  );
});
EpisodeRow.displayName = "EpisodeRow";

// ─── Screen ───────────────────────────────────────────────────────────────────

const FreeShowScreen = ({ route, navigation }) => {
  const { tmdbId, title, season = 1, poster = null } = route.params;
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const tabBarHeight = useTabBarHeight();
  const isDark = theme === "dark";
  const { status, rows, latest, names, watched, setEpisodeWatched, reload } = useFreeShow({ tmdbId, season });

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
  const firstRow = useMemo(() => (rows.length ? rows[0] : null), [rows]);
  const hasHistory = lastWatchedEpisode(watched, season) > 0;

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

  const soft = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const hairline = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";

  const renderItem = useCallback(
    ({ item }) => (
      <EpisodeRow
        row={item}
        title={usefulTitle(names[item.n]?.title, item.n)}
        airDate={names[item.n]?.airDate}
        isWatched={!!watched[`s${season}e${item.n}`]}
        isPlaying={playing?.n === item.n}
        onPlay={play}
        onToggleWatched={setEpisodeWatched}
        colors={colors}
      />
    ),
    [names, watched, season, playing, play, setEpisodeWatched, colors],
  );

  const header = (
    <View>
      {/* Show summary + actions. Hidden while an episode is playing. */}
      {!playing ? (
      <View style={styles.hero}>
        <View style={[styles.heroPoster, { backgroundColor: soft }]}>
          {poster ? (
            <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <Ionicons name="tv-outline" size={24} color={colors.text} style={{ opacity: 0.3 }} />
          )}
        </View>
        <View style={styles.heroBody}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={3}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>
            {formatCount(rows.length)} episodes{latest ? ` · up to #${formatCount(latest)}` : ""}
          </Text>
          {continueRow ? (
            <Pressable
              onPress={() => play(continueRow)}
              style={({ pressed }) => [styles.primary, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              accessibilityRole="button"
            >
              <Ionicons name="play" size={15} color="#fff" />
              <Text style={styles.primaryText}>{hasHistory ? "Continue" : "Start"} · Ep {continueRow.n}</Text>
            </Pressable>
          ) : null}
          {firstRow && firstRow.n !== continueRow?.n ? (
            <Pressable
              onPress={() => play(firstRow)}
              hitSlop={8}
              style={styles.secondary}
              accessibilityRole="button"
              accessibilityLabel={`Play from the first episode, episode ${firstRow.n}`}
            >
              <Ionicons name="refresh" size={14} color={colors.text} style={{ opacity: 0.6 }} />
              <Text style={[styles.secondaryText, { color: colors.text }]}>Play from first episode</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      ) : null}

      {/* Section bar: current range + quiet tools */}
      <View style={[styles.sectionBar, { borderTopColor: hairline }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {activeRange ? `Episodes ${activeRange.from}–${activeRange.to}` : "Episodes"}
        </Text>
        <View style={styles.tools}>
          {latestRow && latestRow.n !== continueRow?.n ? (
            <Pressable onPress={() => play(latestRow)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Play latest, episode ${latestRow.n}`}>
              <Text style={[styles.toolText, { color: colors.primary }]}>Latest</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={toggleSearch} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go to episode number">
            <Ionicons name={searchOpen ? "close" : "search"} size={19} color={colors.text} style={{ opacity: 0.6 }} />
          </Pressable>
        </View>
      </View>

      {searchOpen ? (
        <View style={styles.searchWrap}>
          <View style={[styles.jump, { backgroundColor: soft }]}>
            <TextInput
              value={jumpText}
              onChangeText={(t) => {
                setJumpText(t.replace(/[^0-9]/g, ""));
                setJumpMsg(null);
              }}
              placeholder="Episode number"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={submitJump}
              style={[styles.jumpInput, { color: colors.text }]}
              maxLength={6}
              autoFocus
            />
          </View>
          {jumpMsg ? <Text style={[styles.jumpMsg, { color: colors.text }]}>{jumpMsg}</Text> : null}
        </View>
      ) : null}

      {/* Range selector, only when there is more than one */}
      {ranges.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          {ranges.map((r) => {
            const selected = r.index === rangeIndex;
            return (
              <Pressable
                key={r.index}
                onPress={() => selectRange(r.index)}
                style={[styles.chip, { backgroundColor: selected ? colors.text : "transparent", borderColor: selected ? colors.text : hairline }]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Episodes ${r.from} to ${r.to}, ${r.count} available`}
              >
                <Text style={[styles.chipText, { color: selected ? colors.background : colors.text, opacity: selected ? 1 : 0.65 }]}>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        {playing ? (
          <Text style={[styles.topTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>

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

      {status === "loading" ? (
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
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.stateText, { color: colors.text }]}>No episodes are available in your region yet.</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={visible}
          keyExtractor={(r) => String(r.n)}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
          ItemSeparatorComponent={() => <View style={[styles.divider, { backgroundColor: hairline }]} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          initialNumToRender={14}
          windowSize={7}
          removeClippedSubviews
        />
      )}
    </SafeAreaView>
  );
};

export default FreeShowScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: SIDE - 6, paddingTop: 4, height: 44 },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "700", letterSpacing: -0.2, paddingRight: SIDE },
  back: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  stateText: { fontSize: 14, opacity: 0.65, textAlign: "center", lineHeight: 20 },
  retry: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 20, marginTop: 4 },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  hero: { flexDirection: "row", gap: 16, paddingHorizontal: SIDE, paddingTop: 8, paddingBottom: 24 },
  heroPoster: {
    width: 104,
    height: 156,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,128,128,0.35)",
  },
  heroBody: { flex: 1, justifyContent: "flex-end", gap: 4 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { fontSize: 13, opacity: 0.55 },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 42, borderRadius: 21, marginTop: 14 },
  secondary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 32, marginTop: 4 },
  secondaryText: { fontSize: 13, fontWeight: "600", opacity: 0.65 },
  primaryText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  sectionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SIDE,
    paddingTop: 16,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2 },
  tools: { flexDirection: "row", alignItems: "center", gap: 18 },
  toolText: { fontSize: 14, fontWeight: "600" },

  searchWrap: { paddingHorizontal: SIDE, paddingBottom: 12, gap: 6 },
  jump: { height: 40, borderRadius: 10, paddingHorizontal: 14, justifyContent: "center" },
  jumpInput: { fontSize: 15, paddingVertical: 0 },
  jumpMsg: { fontSize: 12.5, opacity: 0.6 },

  chips: { gap: 8, paddingHorizontal: SIDE, paddingBottom: 12 },
  chip: { height: 32, borderRadius: 16, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  chipText: { fontSize: 13, fontWeight: "600" },

  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 60, paddingHorizontal: SIDE },
  rowNum: { width: 32, alignItems: "center" },
  rowNumText: { fontSize: 14, fontWeight: "600", fontVariant: ["tabular-nums"] },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowMeta: { fontSize: 12, opacity: 0.45 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: SIDE + 32 + 14 },
  note: { fontSize: 12, opacity: 0.4, textAlign: "center", marginTop: 28, paddingHorizontal: 32, lineHeight: 17 },
});