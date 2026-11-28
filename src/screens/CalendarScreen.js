// screens/CalendarScreen.js
//
// Release calendar from the Home "Discover" menu. Every day on the month grid is a poster tile
// (several releases = stacked posters with a count), and the titles for the tapped day sit underneath.
//   Movies    - cinema releases in the chosen region
//   Series    - new series premiering
//   My shows  - episodes of series in your watchlists or that you are part-way through
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Modal, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCustomTheme } from "../contexts/ThemeContext";
import { useTabBarHeight } from "../hooks/useTabBarHeight";
import useRegion from "../hooks/useRegion";
import useCalendarData from "../hooks/useCalendarData";
import RetryState from "../components/shared/RetryState";
import RegionSheet from "../components/discover/RegionSheet";
import { regionName } from "../utils/region";
import { getWatchlists, getWatchedTitles } from "../utils/storage";

const PAD = 16; // page padding
const GRID_PAD = 8; // the calendar goes nearly edge to edge
const GAP = 3;
const MODES = [
  { key: "movie", label: "Movies", color: "#42a5f5" },
  { key: "tv", label: "Series", color: "#ab47bc" },
  { key: "my-shows", label: "My shows", color: "#26a69a" },
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MIN_OFFSET = -12; // months back / ahead you can browse
const MAX_OFFSET = 24;

const pad = (n) => String(n).padStart(2, "0");
const dayKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`; // m is 0-based
const todayKey = () => {
  const n = new Date();
  return dayKey(n.getFullYear(), n.getMonth(), n.getDate());
};
const parseKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const monthLabel = (y, m) => new Date(y, m, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
const dayLabel = (key) =>
  parseKey(key).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
const hasImg = (p) => !!p && p !== "N/A";

// tmdb tv ids of series in the user's watchlists or part-way through watching
async function loadMyShowIds() {
  const ids = new Set();
  const add = (id) => {
    const m = /^tmdb:tv:(\d+)$/.exec(String(id || ""));
    if (m) ids.add(Number(m[1]));
  };
  try {
    const lists = await getWatchlists();
    Object.values(lists || {}).forEach((items) =>
      (Array.isArray(items) ? items : []).forEach((i) => add(i.imdbID)),
    );
  } catch (_e) {
    // lists unavailable: fall through to watched
  }
  try {
    const d = await getWatchedTitles();
    (d?.items || []).filter((i) => i.type === "series" && i.status !== "completed").forEach((i) => add(i.contentId));
  } catch (_e) {
    // fine
  }
  return [...ids].sort((a, b) => a - b);
}

// ─── Day tile ─────────────────────────────────────────────────────────────────
// Poster-filled tile. Memoized (it only gets primitives) so tapping a day re-renders two tiles, not 35.

const DayTile = React.memo(
  ({ dkey, day, w, h, poster, poster2, count, selected, isToday, isPast, accent, textColor, ringColor, soft, onSelect }) => {
    const withPoster = count > 0 && hasImg(poster);
    const stacked = withPoster && count > 1 && hasImg(poster2);

    return (
      <Pressable
        onPress={() => onSelect(dkey)}
        style={[
          styles.tile,
          { width: w, height: h, backgroundColor: soft },
          isToday && !selected && { borderWidth: 1.5, borderColor: accent },
          selected && { borderWidth: 2, borderColor: ringColor },
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${dayLabel(dkey)}${count ? `, ${count} release${count > 1 ? "s" : ""}` : ""}`}
      >
        {stacked ? (
          <>
            <Image
              source={{ uri: poster2 }}
              style={[styles.stackBack, { width: w * 0.72, height: h * 0.8 }]}
              contentFit="cover"
              recyclingKey={poster2}
            />
            <Image
              source={{ uri: poster }}
              style={[styles.stackFront, { width: w * 0.78, height: h * 0.84 }]}
              contentFit="cover"
              recyclingKey={poster}
            />
          </>
        ) : withPoster ? (
          <>
            <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} recyclingKey={poster} />
            <LinearGradient
              colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0)"]}
              style={styles.tileScrim}
              pointerEvents="none"
            />
          </>
        ) : count > 0 ? (
          <Ionicons name="film-outline" size={18} color={textColor} style={styles.tileIcon} />
        ) : null}

        <Text
          style={[
            styles.tileDay,
            withPoster
              ? styles.tileDayOnImage
              : { color: isToday ? accent : textColor, opacity: isToday ? 1 : isPast ? 0.4 : 0.6 },
          ]}
        >
          {day}
        </Text>

        {count > 1 ? (
          <View style={[styles.countBadge, { backgroundColor: accent }]}>
            <Text style={styles.countBadgeText}>{count}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  },
);
DayTile.displayName = "DayTile";

// ─── Release row ──────────────────────────────────────────────────────────────

const ReleaseRow = React.memo(({ item, mode, accent, colors, line, onPress }) => {
  const hasRating = item.imdbRating && item.imdbRating !== "N/A";
  // episodes keep their label (S2 · E5); movies and premieres only show rating
  const meta = [item.episodeLabel || null, item.episodeName || null, hasRating ? `★ ${item.imdbRating}` : null].filter(Boolean).join("  ·  ");

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.row, { borderBottomColor: line, opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={item.Title}
    >
      <View style={[styles.thumb, { backgroundColor: colors.card }]}>
        {hasImg(item.Poster) ? (
          <Image source={{ uri: item.Poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <Ionicons name="film-outline" size={20} color={colors.text} style={{ opacity: 0.3 }} />
        )}
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>
          {item.Title}
        </Text>
        {meta ? (
          <Text style={[styles.rowSub, { color: item.episodeLabel ? accent : colors.text, opacity: item.episodeLabel ? 1 : 0.55 }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text} style={{ opacity: 0.4 }} />
    </Pressable>
  );
});
ReleaseRow.displayName = "ReleaseRow";

// ─── Month picker ─────────────────────────────────────────────────────────────

const MonthPicker = ({ visible, onClose, onPick, year, month, nowYear, nowMonth, colors, accent, line }) => {
  const [y, setY] = useState(year);
  useEffect(() => {
    if (visible) setY(year);
  }, [visible, year]);

  const offsetFor = (yy, mm) => (yy - nowYear) * 12 + (mm - nowMonth);
  const canPrev = offsetFor(y - 1, 11) >= MIN_OFFSET;
  const canNext = offsetFor(y + 1, 0) <= MAX_OFFSET;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={[styles.pickerCard, { backgroundColor: colors.card, borderColor: line }]} onPress={() => {}}>
          <View style={styles.pickerHead}>
            <Pressable disabled={!canPrev} onPress={() => setY((v) => v - 1)} hitSlop={10} style={[styles.circleBtn, { borderColor: line, opacity: canPrev ? 1 : 0.3 }]} accessibilityLabel="Previous year">
              <Ionicons name="chevron-back" size={16} color={colors.text} />
            </Pressable>
            <Text style={[styles.pickerYear, { color: colors.text }]}>{y}</Text>
            <Pressable disabled={!canNext} onPress={() => setY((v) => v + 1)} hitSlop={10} style={[styles.circleBtn, { borderColor: line, opacity: canNext ? 1 : 0.3 }]} accessibilityLabel="Next year">
              <Ionicons name="chevron-forward" size={16} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.pickerGrid}>
            {MONTHS_SHORT.map((label, mm) => {
              const off = offsetFor(y, mm);
              const disabled = off < MIN_OFFSET || off > MAX_OFFSET;
              const on = y === year && mm === month;
              return (
                <Pressable
                  key={label}
                  disabled={disabled}
                  onPress={() => onPick(off)}
                  style={[styles.pickerMonth, { borderColor: on ? accent : line, backgroundColor: on ? accent + "26" : "transparent", opacity: disabled ? 0.25 : 1 }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.pickerMonthText, { color: on ? accent : colors.text }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CalendarScreen({ navigation }) {
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const isDark = theme === "dark";
  const { width } = useWindowDimensions();
  const tabBarHeight = useTabBarHeight();

  const now = new Date();
  const [offset, setOffset] = useState(0);
  const [mode, setMode] = useState("movie");
  const [selected, setSelected] = useState(todayKey());
  const [regionOpen, setRegionOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [region, setRegion] = useRegion();
  const [showIds, setShowIds] = useState(null);

  const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const monthKey = `${year}-${pad(month + 1)}`;

  useEffect(() => {
    if (mode !== "my-shows") return undefined;
    const load = () => loadMyShowIds().then(setShowIds);
    load();
    return navigation.addListener("focus", load);
  }, [mode, navigation]);

  const data = useCalendarData({
    month: monthKey,
    mode,
    region,
    showIds,
    enabled: mode === "my-shows" ? showIds !== null : !!region,
  });

  // keep a sensible day selected when the month changes: today, else the 1st
  useEffect(() => {
    setSelected((cur) => {
      if (cur.startsWith(monthKey)) return cur;
      const t = todayKey();
      return t.startsWith(monthKey) ? t : `${monthKey}-01`;
    });
  }, [monthKey]);

  const tileW = Math.floor((width - GRID_PAD * 2 - GAP * 6) / 7);
  const tileH = Math.round(tileW * 1.5);
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = useMemo(
    () => [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)],
    [firstWeekday, daysInMonth],
  );
  const today = todayKey();
  const modeInfo = MODES.find((m) => m.key === mode);
  const accent = modeInfo.color;
  const soft = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const line = isDark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)";
  const dayItems = data.byDate[selected] || [];
  const openDetails = useCallback(
    (item) => item?.imdbID && navigation.navigate("Details", { imdbID: item.imdbID }),
    [navigation],
  );
  const goToday = useCallback(() => {
    setOffset(0);
    setSelected(todayKey());
  }, []);
  const prevMonth = useCallback(() => setOffset((o) => Math.max(o - 1, MIN_OFFSET)), []);
  const nextMonth = useCallback(() => setOffset((o) => Math.min(o + 1, MAX_OFFSET)), []);
  const pickMonth = useCallback((off) => {
    setOffset(off);
    setPickerOpen(false);
  }, []);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={[styles.circleBtn, { borderColor: line }]} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.headTitle, { color: colors.text }]}>Calendar</Text>
          <View style={{ flex: 1 }} />
          {mode === "movie" && region ? (
            <Pressable onPress={() => setRegionOpen(true)} style={[styles.pill, { borderColor: line }]} accessibilityRole="button" accessibilityLabel={`Region ${regionName(region)}. Change`}>
              <Ionicons name="location-outline" size={14} color={colors.text} />
              <Text style={[styles.pillText, { color: colors.text }]}>{region}</Text>
              <Ionicons name="chevron-down" size={12} color={colors.text} style={{ opacity: 0.6 }} />
            </Pressable>
          ) : null}
        </View>

        {/* Mode switcher */}
        <View style={[styles.segment, { borderColor: line }]}>
          {MODES.map((m) => {
            const on = m.key === mode;
            return (
              <Pressable
                key={m.key}
                onPress={() => setMode(m.key)}
                style={[styles.segItem, on && { backgroundColor: m.color + "26", borderColor: m.color }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.segText, { color: on ? m.color : colors.text, opacity: on ? 1 : 0.6 }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Month bar */}
        <View style={styles.monthBar}>
          <Pressable onPress={() => setPickerOpen(true)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel="Choose month">
            <Text style={[styles.monthText, { color: colors.text }]} numberOfLines={1}>
              {monthLabel(year, month)} <Text style={styles.caret}>▾</Text>
            </Text>
          </Pressable>
          <Pressable onPress={goToday} style={[styles.pill, { borderColor: accent }]} accessibilityRole="button" accessibilityLabel="Jump to today">
            <Text style={[styles.pillText, { color: accent }]}>Today</Text>
          </Pressable>
          <Pressable disabled={offset <= MIN_OFFSET} onPress={prevMonth} hitSlop={8} style={[styles.circleBtn, { borderColor: line, opacity: offset <= MIN_OFFSET ? 0.3 : 1 }]} accessibilityLabel="Previous month">
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>
          <Pressable disabled={offset >= MAX_OFFSET} onPress={nextMonth} hitSlop={8} style={[styles.circleBtn, { borderColor: line, opacity: offset >= MAX_OFFSET ? 0.3 : 1 }]} accessibilityLabel="Next month">
            <Ionicons name="chevron-forward" size={18} color={colors.text} />
          </Pressable>
        </View>

        {/* Poster grid */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} style={[styles.weekday, { width: tileW, color: colors.text }]}>{w}</Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((d, i) => {
            if (!d) return <View key={`b${i}`} style={{ width: tileW, height: tileH }} />;
            const key = dayKey(year, month, d);
            const items = data.byDate[key] || [];
            return (
              <DayTile
                key={key}
                dkey={key}
                day={d}
                w={tileW}
                h={tileH}
                poster={items[0]?.Poster}
                poster2={items[1]?.Poster}
                count={items.length}
                selected={key === selected}
                isToday={key === today}
                isPast={key < today}
                accent={accent}
                textColor={colors.text}
                ringColor={colors.text}
                soft={soft}
                onSelect={setSelected}
              />
            );
          })}
        </View>

        {/* Selected day */}
        <View style={styles.listWrap}>
          <View style={styles.dayHead}>
            <Text style={[styles.dayTitle, { color: colors.text }]} numberOfLines={1}>
              {dayLabel(selected)}
            </Text>
          </View>

          {data.status === "error" ? (
            <RetryState title="Couldn't load this month" message="Check your connection and try again." onRetry={data.retry} />
          ) : data.status === "loading" && !dayItems.length ? (
            <ActivityIndicator style={{ marginTop: 28 }} color={colors.primary} />
          ) : dayItems.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-outline" size={32} color={colors.text} style={{ opacity: 0.25 }} />
              <Text style={[styles.empty, { color: colors.text }]}>
                {mode === "my-shows" && showIds && !showIds.length
                  ? "Add series to a watchlist and their episodes will show up here."
                  : "Nothing on this day."}
              </Text>
            </View>
          ) : (
            <View>
              {dayItems.map((item) => (
                <ReleaseRow
                  key={`${item.imdbID}-${item.episodeLabel || ""}`}
                  item={item}
                  mode={mode}
                  accent={accent}
                  colors={colors}
                  line={line}
                  onPress={openDetails}
                />
              ))}
            </View>
          )}

        </View>
      </ScrollView>

      <MonthPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={pickMonth}
        year={year}
        month={month}
        nowYear={now.getFullYear()}
        nowMonth={now.getMonth()}
        colors={colors}
        accent={accent}
        line={line}
      />
      <RegionSheet visible={regionOpen} selected={region} onSelect={(c) => { setRegion(c); setRegionOpen(false); }} onClose={() => setRegionOpen(false)} colors={colors} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: PAD, paddingTop: 8 },
  headTitle: { fontSize: 25, fontWeight: "800", letterSpacing: -0.3 },
  circleBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1.2 },
  pillText: { fontSize: 13.5, fontWeight: "800" },


  segment: { flexDirection: "row", marginHorizontal: PAD, marginTop: 14, padding: 3, borderRadius: 16, borderWidth: 1, gap: 3 },
  segItem: { flex: 1, height: 34, borderRadius: 13, borderWidth: 1, borderColor: "transparent", alignItems: "center", justifyContent: "center" },
  segText: { fontSize: 13.5, fontWeight: "800" },

  monthBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: PAD, marginTop: 16, marginBottom: 14 },
  monthText: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  caret: { fontSize: 16, opacity: 0.55 },

  weekRow: { flexDirection: "row", gap: GAP, paddingHorizontal: GRID_PAD, marginBottom: 6 },
  weekday: { textAlign: "center", fontSize: 12, fontWeight: "700", opacity: 0.45 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP, paddingHorizontal: GRID_PAD },

  tile: { borderRadius: 9, overflow: "hidden" },
  tileScrim: { position: "absolute", top: 0, left: 0, right: 0, height: "48%" },
  tileIcon: { position: "absolute", bottom: 6, right: 6, opacity: 0.35 },
  tileDay: { position: "absolute", top: 5, left: 6, fontSize: 13.5, fontWeight: "800" },
  tileDayOnImage: { color: "#fff", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  stackBack: { position: "absolute", left: 2, top: 6, borderRadius: 6, transform: [{ rotate: "-9deg" }] },
  stackFront: { position: "absolute", right: 3, bottom: 3, borderRadius: 6 },
  countBadge: { position: "absolute", right: 4, bottom: 4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: "center", justifyContent: "center" },
  countBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },

  listWrap: { paddingHorizontal: PAD, marginTop: 24 },
  dayHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 },
  dayTitle: { flex: 1, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },

  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  thumb: { width: 50, height: 75, borderRadius: 8, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  rowSub: { fontSize: 13.5 },

  emptyBox: { alignItems: "center", gap: 10, paddingVertical: 34, paddingHorizontal: 24 },
  empty: { fontSize: 14, opacity: 0.55, lineHeight: 20, textAlign: "center" },

  pickerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 28 },
  pickerCard: { width: "100%", maxWidth: 360, borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 18 },
  pickerHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  pickerYear: { fontSize: 20, fontWeight: "800" },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pickerMonth: { width: "22%", height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pickerMonthText: { fontSize: 14, fontWeight: "700" },
});