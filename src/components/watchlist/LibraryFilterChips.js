import React from "react";
import { ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";

/** All / Private / Public / Saved filter for the Watchlists tab. */
const LibraryFilterChips = ({ options, value, onChange }) => {
  const { colors } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.chip,
              {
                borderColor: active ? colors.primary : colors.border,
                backgroundColor: active ? `${colors.primary}22` : "transparent",
              },
            ]}
          >
            <Text style={[styles.text, { color: active ? colors.primary : colors.text }]}>
              {o.label}
              {typeof o.count === "number" ? `  ${o.count}` : ""}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

export default React.memo(LibraryFilterChips);

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginBottom: 12 },
  row: { gap: 8, paddingHorizontal: 2 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  text: { fontSize: 13, fontWeight: "700" },
});