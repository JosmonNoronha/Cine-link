import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  SectionList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ─── Type badge ───────────────────────────────────────────────────────────────

const TYPE_META = {
  movie:  { label: "Movie",  color: "#3b82f6" },
  series: { label: "Series", color: "#8b5cf6" },
  person: { label: "Person", color: "#f59e0b" },
};

const TypeBadge = React.memo(({ type }) => {
  const meta = TYPE_META[type?.toLowerCase()] || TYPE_META.movie;
  return (
    <View style={[badgeStyles.badge, { backgroundColor: meta.color + "22" }]}>
      <Text style={[badgeStyles.text, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
});
TypeBadge.displayName = "TypeBadge";

const badgeStyles = StyleSheet.create({
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  text:  { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
});

// ─── History row ──────────────────────────────────────────────────────────────

const HistoryRow = React.memo(({ item, onPress, onDelete, colors, theme }) => (
  <View style={[rowStyles.row, { borderBottomColor: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]}>
    <TouchableOpacity
      style={rowStyles.main}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={[rowStyles.iconWrap, { backgroundColor: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
        <Ionicons name="time-outline" size={15} color={theme === "dark" ? "#aaa" : "#666"} />
      </View>
      <Text style={[rowStyles.text, { color: colors.text }]} numberOfLines={1}>
        {item.text}
      </Text>
      <Ionicons name="arrow-up-back-outline" size={14} color={theme === "dark" ? "#555" : "#bbb"} style={rowStyles.fillIcon} />
    </TouchableOpacity>
    <TouchableOpacity
      style={rowStyles.deleteBtn}
      onPress={() => onDelete(item.text)}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="close" size={15} color={theme === "dark" ? "#666" : "#bbb"} />
    </TouchableOpacity>
  </View>
));
HistoryRow.displayName = "HistoryRow";

// ─── Trending row ─────────────────────────────────────────────────────────────

const TrendingRow = React.memo(({ item, onPress, colors, theme }) => (
  <TouchableOpacity
    style={[rowStyles.row, rowStyles.main, { borderBottomColor: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]}
    onPress={() => onPress(item)}
    activeOpacity={0.7}
  >
    <View style={[rowStyles.iconWrap, { backgroundColor: "#f59e0b18" }]}>
      <Ionicons name="trending-up" size={15} color="#f59e0b" />
    </View>
    <Text style={[rowStyles.text, { color: colors.text }]} numberOfLines={1}>
      {item.text}
    </Text>
    <Ionicons name="chevron-forward" size={14} color={theme === "dark" ? "#444" : "#ccc"} />
  </TouchableOpacity>
));
TrendingRow.displayName = "TrendingRow";

// ─── Title row ────────────────────────────────────────────────────────────────

const POSTER_W = 38;
const POSTER_H = 56;

const TitleRow = React.memo(({ item, onPress, colors, theme }) => (
  <TouchableOpacity
    style={[titleRowStyles.row, { borderBottomColor: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }]}
    onPress={() => onPress(item)}
    activeOpacity={0.7}
  >
    {/* Poster */}
    <View style={titleRowStyles.posterWrap}>
      {item.poster ? (
        <Image source={{ uri: item.poster }} style={titleRowStyles.poster} />
      ) : (
        <View style={[titleRowStyles.posterFallback, { backgroundColor: theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]}>
          <Ionicons
            name={item.type === "person" ? "person" : "film-outline"}
            size={16}
            color={theme === "dark" ? "#555" : "#bbb"}
          />
        </View>
      )}
    </View>

    {/* Text */}
    <View style={titleRowStyles.textWrap}>
      <Text style={[titleRowStyles.title, { color: colors.text }]} numberOfLines={1}>
        {item.text}
      </Text>
      <View style={titleRowStyles.meta}>
        {item.year ? (
          <Text style={[titleRowStyles.year, { color: theme === "dark" ? "#888" : "#999" }]}>
            {item.year}
          </Text>
        ) : null}
        {item.type ? <TypeBadge type={item.type} /> : null}
      </View>
    </View>

    <Ionicons name="chevron-forward" size={14} color={theme === "dark" ? "#444" : "#ccc"} />
  </TouchableOpacity>
));
TitleRow.displayName = "TitleRow";

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHeader = React.memo(({ title, colors, theme, right }) => (
  <View style={[sectionStyles.header, { backgroundColor: theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" }]}>
    <Text style={[sectionStyles.title, { color: theme === "dark" ? "#888" : "#999" }]}>{title}</Text>
    {right}
  </View>
));
SectionHeader.displayName = "SectionHeader";

// ─── Main component ───────────────────────────────────────────────────────────

const AutocompleteDropdown = React.memo(({
  items,
  titleLoading,
  query,
  onSelectText,      // (text: string) => void  — for history/trending items
  onSelectTitle,     // (item: object) => void  — for title/person items
  onDeleteHistory,   // (text: string) => void
  onClearHistory,    // () => void
  colors,
  theme,
}) => {
  // ── Build SectionList sections ──────────────────────────────────────────

  const sections = useMemo(() => {
    const history  = items.filter((i) => i.kind === "history");
    const trending = items.filter((i) => i.kind === "trending");
    const titles   = items.filter((i) => i.kind === "title" || i.kind === "person");

    const result = [];

    if (history.length > 0) {
      result.push({
        key: "history",
        title: "Recent",
        data: history,
        showClear: !query,
      });
    }

    if (trending.length > 0) {
      result.push({
        key: "trending",
        title: "Trending",
        data: trending,
      });
    }

    if (titles.length > 0 || titleLoading) {
      result.push({
        key: "titles",
        title: "Results",
        data: titles,
        loading: titleLoading,
      });
    }

    return result;
  }, [items, titleLoading, query]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handlePressText = useCallback((item) => {
    onSelectText(item.text);
  }, [onSelectText]);

  const handlePressTitle = useCallback((item) => {
    onSelectTitle(item);
  }, [onSelectTitle]);

  // ── Renderers ───────────────────────────────────────────────────────────

  const renderItem = useCallback(({ item, section }) => {
    if (section.key === "history") {
      return (
        <HistoryRow
          item={item}
          onPress={handlePressText}
          onDelete={onDeleteHistory}
          colors={colors}
          theme={theme}
        />
      );
    }
    if (section.key === "trending") {
      return (
        <TrendingRow
          item={item}
          onPress={handlePressText}
          colors={colors}
          theme={theme}
        />
      );
    }
    // titles / persons
    return (
      <TitleRow
        item={item}
        onPress={handlePressTitle}
        colors={colors}
        theme={theme}
      />
    );
  }, [handlePressText, handlePressTitle, onDeleteHistory, colors, theme]);

  const renderSectionHeader = useCallback(({ section }) => (
    <SectionHeader
      title={section.title}
      colors={colors}
      theme={theme}
      right={
        section.showClear ? (
          <TouchableOpacity onPress={onClearHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 12, color: theme === "dark" ? "#ef4444" : "#dc2626", fontWeight: "600" }}>
              Clear all
            </Text>
          </TouchableOpacity>
        ) : section.loading ? (
          <ActivityIndicator size={12} color={colors.primary} />
        ) : null
      }
    />
  ), [colors, theme, onClearHistory]);

  const keyExtractor = useCallback((item) => item.id, []);

  if (sections.length === 0 && !titleLoading) return null;

  return (
    <View style={[dropStyles.container, {
      backgroundColor: colors.card,
      shadowColor: theme === "dark" ? "#000" : "#1a1a2e",
    }]}>
      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={false}
        // Fixed small list — no virtualization overhead needed
        initialNumToRender={12}
        maxToRenderPerBatch={12}
      />
    </View>
  );
});
AutocompleteDropdown.displayName = "AutocompleteDropdown";

// ─── Styles ───────────────────────────────────────────────────────────────────

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    minHeight: 52,
  },
  main: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  text: {
    flex: 1, fontSize: 14, fontWeight: "500",
  },
  fillIcon: { flexShrink: 0 },
  deleteBtn: {
    paddingHorizontal: 14, paddingVertical: 10,
    alignItems: "center", justifyContent: "center",
  },
});

const titleRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    minHeight: 72,
  },
  posterWrap: { flexShrink: 0 },
  poster: {
    width: POSTER_W, height: POSTER_H,
    borderRadius: 6, backgroundColor: "#111",
  },
  posterFallback: {
    width: POSTER_W, height: POSTER_H,
    borderRadius: 6,
    alignItems: "center", justifyContent: "center",
  },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: "600", lineHeight: 19 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  year: { fontSize: 12, fontWeight: "500" },
});

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});

const dropStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginTop: 8,
    maxHeight: 380,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
});

export default AutocompleteDropdown;