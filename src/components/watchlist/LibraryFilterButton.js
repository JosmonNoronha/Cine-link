import React, { useCallback, useRef, useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useCustomTheme } from "../../contexts/ThemeContext";
import { KIND_META } from "./LibraryListCard";
import withAlpha from "../../utils/withAlpha";

const MENU_W = 220;

const ICONS = { all: { icon: "layers-outline", color: null } };

const iconFor = (key, fallback) =>
  key === "all" ? { name: ICONS.all.icon, color: fallback } : { name: KIND_META[key].icon, color: KIND_META[key].color };

/**
 * Compact filter button for the Watchlists tab. Shows the active filter and
 * opens a small popover with All / Private / Public / Saved.
 * options: [{ key, label, count }]
 */
const LibraryFilterButton = ({ options, value, onChange, resultCount }) => {
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const isDark = theme === "dark";
  const { width: screenW } = useWindowDimensions();
  const btnRef = useRef(null);
  const [anchor, setAnchor] = useState(null);

  const active = options.find((o) => o.key === value) || options[0];
  const isFiltered = value !== "all";

  const open = useCallback(() => {
    btnRef.current?.measureInWindow((x, y, w, h) => setAnchor({ x, y, w, h }));
  }, []);
  const close = useCallback(() => setAnchor(null), []);
  const pick = useCallback(
    (key) => {
      close();
      if (key !== value) onChange(key);
    },
    [close, onChange, value],
  );

  const left = anchor ? Math.max(12, Math.min(anchor.x, screenW - MENU_W - 12)) : 0;

  return (
    <View style={styles.row}>
      <Pressable
        ref={btnRef}
        collapsable={false}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`Filter: ${active.label}`}
        style={[
          styles.btn,
          {
            borderColor: isFiltered ? colors.primary : colors.border,
            backgroundColor: isFiltered ? withAlpha(colors.primary, 0.12) : "transparent",
          },
        ]}
      >
        <Ionicons name="options-outline" size={16} color={isFiltered ? colors.primary : colors.text} />
        <Text style={[styles.btnText, { color: isFiltered ? colors.primary : colors.text }]}>{active.label}</Text>
        <Ionicons name="chevron-down" size={14} color={isFiltered ? colors.primary : colors.text} style={{ opacity: 0.7 }} />
      </Pressable>

      {typeof resultCount === "number" ? (
        <Text style={[styles.count, { color: colors.text }]}>
          {resultCount} {resultCount === 1 ? "list" : "lists"}
        </Text>
      ) : null}

      <Modal visible={!!anchor} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close filter menu" />
        {anchor ? (
          <View
            style={[
              styles.menu,
              { top: anchor.y + anchor.h + 6, left, borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)" },
            ]}
          >
            <BlurView
              intensity={isDark ? 50 : 70}
              tint={isDark ? "dark" : "light"}
              experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(18,22,32,0.62)" : "rgba(255,255,255,0.7)" }]}
            />
            {options.map((o) => {
              const sel = o.key === value;
              const ic = iconFor(o.key, colors.text);
              return (
                <Pressable
                  key={o.key}
                  onPress={() => pick(o.key)}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: sel }}
                  style={({ pressed }) => [
                    styles.item,
                    { backgroundColor: sel ? withAlpha(colors.primary, 0.1) : pressed ? withAlpha(colors.text, 0.06) : "transparent" },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: withAlpha(ic.color, 0.16) }]}>
                    <Ionicons name={ic.name} size={14} color={ic.color} />
                  </View>
                  <Text style={[styles.itemText, { color: colors.text, fontWeight: sel ? "800" : "600" }]}>{o.label}</Text>
                  {typeof o.count === "number" ? (
                    <Text style={[styles.itemCount, { color: colors.text }]}>{o.count}</Text>
                  ) : null}
                  <View style={styles.tick}>
                    {sel ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </Modal>
    </View>
  );
};

export default React.memo(LibraryFilterButton);

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 2 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnText: { fontSize: 13, fontWeight: "700" },
  count: { fontSize: 12, fontWeight: "600", opacity: 0.55 },
  menu: {
    position: "absolute",
    width: MENU_W,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 12 },
    }),
  },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 8, paddingVertical: 9, borderRadius: 11 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1, fontSize: 14 },
  itemCount: { fontSize: 12, fontWeight: "700", opacity: 0.5 },
  tick: { width: 18, alignItems: "center" },
});