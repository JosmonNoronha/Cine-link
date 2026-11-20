import React, { useCallback, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import GlassMenu from "../shared/GlassMenu";

export const SORT_OPTIONS = [
  { value: "trending", label: "Trending", icon: "flame-outline" },
  { value: "latest", label: "Latest", icon: "time-outline" },
  { value: "today", label: "Today", icon: "sunny-outline" },
  { value: "week", label: "This week", icon: "calendar-outline" },
];
export const REGION_OPTIONS = [
  { value: "all", label: "All", icon: "earth-outline" },
  { value: "global", label: "Global", icon: "globe-outline" },
  { value: "in", label: "India", icon: "location-outline" },
];

const labelOf = (options, value) => (options.find((o) => o.value === value) || options[0]).label;

const Dropdown = React.memo(({ label, value, anchorRef, onOpen, colors }) => (
  <TouchableOpacity
    ref={anchorRef}
    collapsable={false}
    activeOpacity={0.7}
    onPress={onOpen}
    accessibilityRole="button"
    accessibilityLabel={`${label}: ${value}`}
    style={[styles.dropdown, { backgroundColor: colors.card }]}
  >
    <View style={styles.content} pointerEvents="none">
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
    <Ionicons name="chevron-down" size={16} color={colors.text} style={{ opacity: 0.6 }} />
  </TouchableOpacity>
));
Dropdown.displayName = "Dropdown";

/** Two frosted-glass dropdowns, same look as Favorites: "Sort by" and "Region". */
const NewsFilters = ({ sort, region, onSort, onRegion }) => {
  const { colors } = useTheme();
  const sortRef = useRef(null);
  const regionRef = useRef(null);
  const [sortAnchor, setSortAnchor] = useState(null);
  const [regionAnchor, setRegionAnchor] = useState(null);

  const openSort = useCallback(() => sortRef.current?.measureInWindow((x, y, w, h) => setSortAnchor({ x, y, w, h })), []);
  const openRegion = useCallback(() => regionRef.current?.measureInWindow((x, y, w, h) => setRegionAnchor({ x, y, w, h })), []);
  const closeSort = useCallback(() => setSortAnchor(null), []);
  const closeRegion = useCallback(() => setRegionAnchor(null), []);

  return (
    <View style={styles.row}>
      <Dropdown label="Sort by" value={labelOf(SORT_OPTIONS, sort)} anchorRef={sortRef} onOpen={openSort} colors={colors} />
      <Dropdown label="Region" value={labelOf(REGION_OPTIONS, region)} anchorRef={regionRef} onOpen={openRegion} colors={colors} />
      <GlassMenu
        anchor={sortAnchor}
        options={SORT_OPTIONS}
        selected={sort}
        onSelect={(v) => {
          onSort(v);
          closeSort();
        }}
        onClose={closeSort}
      />
      <GlassMenu
        anchor={regionAnchor}
        options={REGION_OPTIONS}
        selected={region}
        onSelect={(v) => {
          onRegion(v);
          closeRegion();
        }}
        onClose={closeRegion}
      />
    </View>
  );
};
export default React.memo(NewsFilters);

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: 12 },
  dropdown: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  content: { flex: 1 },
  label: { fontSize: 10, opacity: 0.6, marginBottom: 1 },
  value: { fontSize: 14, fontWeight: "600" },
});
