// components/details/EpisodesSection.js
//
//   • Collapsible: starts minimized, tap the header to expand / minimize
//   • Season chips (S1, S2, …): one season visible at a time
//   • "Continue watching" shortcut to the episode after your last watched one
//   • Compact episode rows, paged 20 at a time (prev/next + "go to #" for big seasons)
//   • Per-season trailer button
import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Platform,
  Linking,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import YoutubePlayer from "react-native-youtube-iframe";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: screenWidth } = Dimensions.get("window");

const PAGE_SIZE = 20;
const JUMP_THRESHOLD = 60; // show "go to episode #" when a season has more than this
const CHIP_W = 52;
const CHIP_GAP = 8;
const WATCHED_GREEN = "#4caf50";
const KEY_RE = /^s(\d+)e(\d+)$/;
const EMPTY = [];

// card margin (16) + card padding (16), both sides
const PLAYER_W = screenWidth - 64;
const PLAYER_H = Math.round(PLAYER_W * (9 / 16));

// ─── Helpers ──────────────────────────────────────────────────────────────────

// One pass over the watched map: count per season + the furthest watched episode.
function useWatchStats(watchedEpisodes) {
  return useMemo(() => {
    const perSeason = {};
    let last = null;
    for (const key of Object.keys(watchedEpisodes || {})) {
      const m = KEY_RE.exec(key);
      if (!m) continue;
      const s = Number(m[1]);
      const e = Number(m[2]);
      perSeason[s] = (perSeason[s] || 0) + 1;
      if (!last || s > last.season || (s === last.season && e > last.episode)) {
        last = { season: s, episode: e };
      }
    }
    return { perSeason, last };
  }, [watchedEpisodes]);
}

// "2019-08-12" → "Aug 12, 2019" (parsed manually so time zones can't shift the day)
function formatAirDate(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function findEpisodeIndex(episodes, number) {
  const idx = episodes.findIndex((ep) => Number(ep.episodeNumber) === number);
  if (idx >= 0) return idx;
  return Math.min(Math.max(number - 1, 0), Math.max(episodes.length - 1, 0));
}

// ─── Season chips ─────────────────────────────────────────────────────────────

const SeasonChips = React.memo(
  ({
    totalSeasons,
    selectedSeason,
    onSelect,
    perSeason,
    completeSeasons,
    colors,
    isDark,
  }) => {
    const scrollRef = useRef(null);

    useEffect(() => {
      scrollRef.current?.scrollTo({
        x: Math.max(0, (selectedSeason - 1) * (CHIP_W + CHIP_GAP) - 80),
        animated: true,
      });
    }, [selectedSeason]);

    const chipBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
    const seasons = useMemo(
      () => Array.from({ length: totalSeasons }, (_, i) => i + 1),
      [totalSeasons],
    );

    return (
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        keyboardShouldPersistTaps="handled"
      >
        {seasons.map((n) => {
          const selected = n === selectedSeason;
          const complete = !!completeSeasons[n];
          const started = (perSeason[n] || 0) > 0;
          return (
            <Pressable
              key={n}
              onPress={() => onSelect(n)}
              style={[
                styles.chip,
                { backgroundColor: selected ? colors.primary : chipBg },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Season ${n}`}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? "#fff" : colors.text },
                ]}
              >
                S{n}
              </Text>
              {complete ? (
                <Ionicons
                  name="checkmark"
                  size={11}
                  color={selected ? "#fff" : WATCHED_GREEN}
                  style={styles.chipBadge}
                />
              ) : started ? (
                <View
                  style={[
                    styles.chipDot,
                    { backgroundColor: selected ? "#fff" : WATCHED_GREEN },
                  ]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    );
  },
);
SeasonChips.displayName = "SeasonChips";

// ─── Episode row ──────────────────────────────────────────────────────────────

const EpisodeRow = React.memo(
  ({ episode, season, isWatched, onToggle, colors, isDark }) => {
    const date = formatAirDate(episode.released);
    const runtime =
      episode.runtime && episode.runtime !== "N/A" ? episode.runtime : null;
    const hasRating = episode.rating && episode.rating !== "N/A";
    const metaText = [date, runtime].filter(Boolean).join("  ·  ");

    const rowBg = isWatched
      ? isDark
        ? "rgba(76,175,80,0.12)"
        : "rgba(76,175,80,0.10)"
      : isDark
        ? "rgba(255,255,255,0.05)"
        : "rgba(0,0,0,0.04)";

    return (
      <Pressable
        onPress={() => onToggle(season, episode.episodeNumber)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: rowBg, opacity: pressed ? 0.85 : 1 },
        ]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isWatched }}
        accessibilityLabel={`Episode ${episode.episodeNumber}, ${episode.title}`}
      >
        <View
          style={[
            styles.rowNum,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          <Text style={[styles.rowNumText, { color: colors.text }]}>
            {episode.episodeNumber}
          </Text>
        </View>

        <View style={styles.rowBody}>
          <Text
            style={[
              styles.rowTitle,
              { color: colors.text, opacity: isWatched ? 0.5 : 1 },
            ]}
            numberOfLines={1}
          >
            {episode.title}
          </Text>
          {metaText || hasRating ? (
            <View style={styles.rowMeta}>
              {metaText ? (
                <Text
                  style={[styles.rowMetaText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {metaText}
                </Text>
              ) : null}
              {hasRating ? (
                <View style={styles.rating}>
                  <Ionicons name="star" size={11} color="#f5c518" />
                  <Text style={[styles.rowMetaText, { color: colors.text }]}>
                    {episode.rating}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <Ionicons
          name={isWatched ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={isWatched ? WATCHED_GREEN : colors.text}
          style={{ opacity: isWatched ? 1 : 0.3 }}
        />
      </Pressable>
    );
  },
);
EpisodeRow.displayName = "EpisodeRow";

// ─── Pager ────────────────────────────────────────────────────────────────────

const PagerBar = React.memo(
  ({ page, pageCount, label, onPrev, onNext, showJump, onJump, colors, isDark }) => {
    const [text, setText] = useState("");
    const btnBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

    const submit = () => {
      const n = parseInt(text, 10);
      if (n > 0) onJump(n);
      setText("");
      Keyboard.dismiss();
    };

    return (
      <View style={styles.pagerWrap}>
        <View style={styles.pager}>
          <Pressable
            onPress={onPrev}
            disabled={page <= 0}
            hitSlop={8}
            style={[styles.pagerBtn, { backgroundColor: btnBg }, page <= 0 && styles.disabled]}
            accessibilityLabel="Previous episodes"
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>

          <Text style={[styles.pagerLabel, { color: colors.text }]}>{label}</Text>

          <Pressable
            onPress={onNext}
            disabled={page >= pageCount - 1}
            hitSlop={8}
            style={[
              styles.pagerBtn,
              { backgroundColor: btnBg },
              page >= pageCount - 1 && styles.disabled,
            ]}
            accessibilityLabel="Next episodes"
          >
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </View>

        {showJump ? (
          <View style={[styles.jump, { backgroundColor: btnBg }]}>
            <Ionicons name="search" size={14} color={colors.text} style={{ opacity: 0.5 }} />
            <TextInput
              value={text}
              onChangeText={(t) => setText(t.replace(/[^0-9]/g, ""))}
              placeholder="Go to episode #"
              placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)"}
              keyboardType="number-pad"
              returnKeyType="go"
              onSubmitEditing={submit}
              style={[styles.jumpInput, { color: colors.text }]}
              maxLength={6}
            />
          </View>
        ) : null}
      </View>
    );
  },
);
PagerBar.displayName = "PagerBar";

// ─── Main section ─────────────────────────────────────────────────────────────

const EpisodesSection = ({
  colors,
  theme,
  totalSeasons,
  seasons, // loaded seasons: [{ seasonNumber, episodeCount, airYear, episodes }]
  selectedSeason,
  onSelectSeason,
  isLoading,
  hasFailed,
  onRetry,
  watchedEpisodes,
  onToggleWatch, // (seasonNumber, episodeNumber) => void
  trailerVideoId,
  isTrailerLoading,
  isTrailerPlaying,
  onTrailerPress, // null for non-TV
  onLayout,
  onPageChange, // called after the page changes so the screen can scroll up
  defaultExpanded = false,
}) => {
  const isDark = theme === "dark";
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [pages, setPages] = useState({}); // remembered per season
  const [jump, setJump] = useState(null); // pending "continue watching" jump

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  }, []);

  const { perSeason, last } = useWatchStats(watchedEpisodes);

  const selected = useMemo(
    () => seasons.find((s) => s.seasonNumber === selectedSeason),
    [seasons, selectedSeason],
  );
  const episodes = selected?.episodes ?? EMPTY;
  const total = episodes.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pages[selectedSeason] ?? 0, pageCount - 1);
  const start = page * PAGE_SIZE;

  const pageEpisodes = useMemo(
    () => episodes.slice(start, start + PAGE_SIZE),
    [episodes, start],
  );

  const completeSeasons = useMemo(() => {
    const out = {};
    for (const s of seasons) {
      if (s.episodes?.length > 0 && (perSeason[s.seasonNumber] || 0) >= s.episodes.length) {
        out[s.seasonNumber] = true;
      }
    }
    return out;
  }, [seasons, perSeason]);

  const watchedCount = Math.min(perSeason[selectedSeason] || 0, total);
  const progress = total > 0 ? watchedCount / total : 0;

  // ── Paging ────────────────────────────────────────────────────────────────

  const goToPage = useCallback(
    (p) => {
      setPages((prev) => ({
        ...prev,
        [selectedSeason]: Math.min(Math.max(p, 0), pageCount - 1),
      }));
      onPageChange?.();
    },
    [selectedSeason, pageCount, onPageChange],
  );

  const handlePrev = useCallback(() => goToPage(page - 1), [goToPage, page]);
  const handleNext = useCallback(() => goToPage(page + 1), [goToPage, page]);
  const handleJump = useCallback(
    (n) => {
      if (!total) return;
      goToPage(Math.floor(findEpisodeIndex(episodes, n) / PAGE_SIZE));
    },
    [episodes, total, goToPage],
  );

  // ── Continue watching ─────────────────────────────────────────────────────

  const canContinue = !!last && last.season >= 1 && last.season <= totalSeasons;

  const handleContinue = useCallback(() => {
    if (!last) return;
    setJump({ season: last.season, episode: last.episode + 1, after: last.episode });
    onSelectSeason(last.season);
  }, [last, onSelectSeason]);

  // Resolves once the target season is selected AND loaded.
  useEffect(() => {
    if (!jump || jump.season !== selectedSeason || !selected) return;

    const idx = selected.episodes.findIndex(
      (ep) => Number(ep.episodeNumber) === jump.episode,
    );
    if (idx >= 0) {
      setPages((prev) => ({ ...prev, [jump.season]: Math.floor(idx / PAGE_SIZE) }));
      setJump(null);
      onPageChange?.();
      return;
    }

    // Finished this season → start the next one
    if (jump.season < totalSeasons) {
      setJump(null);
      setPages((prev) => ({ ...prev, [jump.season + 1]: 0 }));
      onSelectSeason(jump.season + 1);
      return;
    }

    // Last episode of the last season → show where you are
    const lastIdx = findEpisodeIndex(selected.episodes, jump.after);
    setPages((prev) => ({ ...prev, [jump.season]: Math.floor(lastIdx / PAGE_SIZE) }));
    setJump(null);
    onPageChange?.();
  }, [jump, selectedSeason, selected, totalSeasons, onSelectSeason, onPageChange]);

  // ── Render pieces ─────────────────────────────────────────────────────────

  const airYear =
    selected?.airYear && selected.airYear !== "N/A" ? selected.airYear : null;
  const metaParts = selected
    ? [
        `${total} ${total === 1 ? "episode" : "episodes"}`,
        airYear,
        watchedCount > 0 ? `${watchedCount} watched` : null,
      ].filter(Boolean)
    : [];

  const rangeLabel = total
    ? `${start + 1}–${Math.min(total, start + PAGE_SIZE)} of ${total}`
    : "";
  const showPager = total > PAGE_SIZE;
  const trackBg = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

  // One-line summary shown in the header (most useful while minimized)
  const summary = [
    `${totalSeasons} ${totalSeasons === 1 ? "season" : "seasons"}`,
    canContinue ? `Up to S${last.season} · E${last.episode}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]} onLayout={onLayout}>
      {/* Header — tap to minimize / maximize */}
      <Pressable
        onPress={toggleExpanded}
        style={({ pressed }) => [
          styles.headingRow,
          expanded && styles.headingRowOpen,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Episodes, ${expanded ? "minimize" : "maximize"}`}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { color: colors.text }]}>Episodes</Text>
          <Text style={[styles.headingMeta, { color: colors.text }]} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        <View
          style={[
            styles.toggleBtn,
            { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" },
          ]}
        >
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.text}
          />
        </View>
      </Pressable>

      {expanded ? (
        <>
          {totalSeasons > 1 ? (
            <SeasonChips
              totalSeasons={totalSeasons}
              selectedSeason={selectedSeason}
              onSelect={onSelectSeason}
              perSeason={perSeason}
              completeSeasons={completeSeasons}
              colors={colors}
              isDark={isDark}
            />
          ) : null}

          {canContinue ? (
            <Pressable
              onPress={handleContinue}
              style={({ pressed }) => [
                styles.continue,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue watching"
            >
              <Ionicons name="play-circle" size={26} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.continueTitle, { color: colors.text }]}>
                  Continue watching
                </Text>
                <Text style={[styles.continueSub, { color: colors.text }]}>
                  After S{last.season} · E{last.episode}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text} style={{ opacity: 0.4 }} />
            </Pressable>
          ) : null}

          {/* Season header */}
          <View style={styles.seasonHead}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.seasonTitle, { color: colors.text }]}>
                Season {selectedSeason}
              </Text>
              {metaParts.length > 0 ? (
                <Text style={[styles.seasonMeta, { color: colors.text }]}>
                  {metaParts.join("  ·  ")}
                </Text>
              ) : null}
            </View>

            {onTrailerPress ? (
              <Pressable
                onPress={onTrailerPress}
                disabled={isTrailerLoading}
                style={[styles.trailerBtn, { borderColor: colors.primary }]}
                accessibilityRole="button"
                accessibilityLabel={isTrailerPlaying ? "Close trailer" : "Play season trailer"}
              >
                {isTrailerLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons
                      name={isTrailerPlaying ? "close-circle-outline" : "play-circle-outline"}
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={[styles.trailerBtnText, { color: colors.primary }]}>
                      {isTrailerPlaying ? "Close" : "Trailer"}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>

          {total > 0 ? (
            <View style={[styles.track, { backgroundColor: trackBg }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.round(progress * 100)}%`,
                    backgroundColor: progress >= 1 ? WATCHED_GREEN : colors.primary,
                  },
                ]}
              />
            </View>
          ) : null}

          {isTrailerPlaying && trailerVideoId ? (
            Platform.OS === "web" ? (
              <Pressable
                style={[styles.webTrailer, { backgroundColor: colors.primary }]}
                onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${trailerVideoId}`)}
              >
                <Ionicons name="logo-youtube" size={22} color="#fff" />
                <Text style={styles.webTrailerText}>Watch on YouTube</Text>
              </Pressable>
            ) : (
              <View style={styles.player}>
                <YoutubePlayer height={PLAYER_H} width={PLAYER_W} play videoId={trailerVideoId} />
              </View>
            )
          ) : null}

          {/* Episodes */}
          {!selected && isLoading ? (
            <View style={styles.list}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.skeleton,
                    { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
                  ]}
                />
              ))}
            </View>
          ) : !selected && hasFailed ? (
            <View style={styles.stateBox}>
              <Ionicons name="alert-circle-outline" size={28} color={colors.text} style={{ opacity: 0.6 }} />
              <Text style={[styles.stateText, { color: colors.text }]}>
                Couldn't load this season.
              </Text>
              <Pressable
                onPress={onRetry}
                style={[styles.retryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : selected && total === 0 ? (
            <View style={styles.stateBox}>
              <Text style={[styles.stateText, { color: colors.text }]}>
                No episodes listed for this season.
              </Text>
            </View>
          ) : selected ? (
            <>
              {showPager ? (
                <PagerBar
                  page={page}
                  pageCount={pageCount}
                  label={rangeLabel}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  showJump={total > JUMP_THRESHOLD}
                  onJump={handleJump}
                  colors={colors}
                  isDark={isDark}
                />
              ) : null}

              <View style={styles.list}>
                {pageEpisodes.map((ep, i) => (
                  <EpisodeRow
                    key={`${selectedSeason}-${start + i}-${ep.episodeNumber}`}
                    episode={ep}
                    season={selectedSeason}
                    isWatched={!!watchedEpisodes[`s${selectedSeason}e${ep.episodeNumber}`]}
                    onToggle={onToggleWatch}
                    colors={colors}
                    isDark={isDark}
                  />
                ))}
              </View>

              {showPager ? (
                <PagerBar
                  page={page}
                  pageCount={pageCount}
                  label={rangeLabel}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  showJump={false}
                  onJump={handleJump}
                  colors={colors}
                  isDark={isDark}
                />
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </View>
  );
};

export default React.memo(EpisodesSection);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headingRowOpen: { marginBottom: 14 },
  heading: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    opacity: 0.45,
  },
  headingMeta: { fontSize: 14, opacity: 0.75, fontWeight: "600", marginTop: 4 },
  toggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  chipsRow: { gap: CHIP_GAP, paddingRight: 4, paddingBottom: 4 },
  chip: {
    width: CHIP_W,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontSize: 14, fontWeight: "800" },
  chipDot: { position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: 3 },
  chipBadge: { position: "absolute", top: 4, right: 4 },

  continue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
  },
  continueTitle: { fontSize: 14, fontWeight: "700" },
  continueSub: { fontSize: 12, opacity: 0.55, marginTop: 1 },

  seasonHead: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 },
  seasonTitle: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  seasonMeta: { fontSize: 12.5, opacity: 0.55, marginTop: 2 },
  trailerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 84,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1.5,
    justifyContent: "center",
  },
  trailerBtnText: { fontSize: 13, fontWeight: "700" },

  track: { height: 3, borderRadius: 2, overflow: "hidden", marginTop: 12 },
  fill: { height: "100%", borderRadius: 2 },

  player: { marginTop: 14, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" },
  webTrailer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
  },
  webTrailerText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  pagerWrap: { marginTop: 14, gap: 10 },
  pager: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pagerBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pagerLabel: { fontSize: 13, fontWeight: "700", opacity: 0.8 },
  disabled: { opacity: 0.3 },
  jump: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 38,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  jumpInput: { flex: 1, fontSize: 14, paddingVertical: 0 },

  list: { marginTop: 12, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 58,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  rowNum: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowNumText: { fontSize: 13, fontWeight: "800" },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowMetaText: { fontSize: 12, opacity: 0.55 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3 },

  skeleton: { height: 58, borderRadius: 14 },
  stateBox: { alignItems: "center", gap: 10, paddingVertical: 28 },
  stateText: { fontSize: 14, opacity: 0.65, textAlign: "center" },
  retryBtn: { paddingVertical: 9, paddingHorizontal: 22, borderRadius: 18 },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});