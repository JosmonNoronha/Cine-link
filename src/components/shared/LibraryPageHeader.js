import React from "react";
import { View, Text, StyleSheet } from "react-native";

// One title style shared by every "library" screen (Watchlists, Favorites,
// standalone or embedded) so the header never visually jumps between them.
const LibraryPageHeader = ({ title, colors, right }) => (
  <View style={styles.row}>
    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
      {title}
    </Text>
    {right ? <View style={styles.right}>{right}</View> : null}
  </View>
);

export default React.memo(LibraryPageHeader);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 6,
    marginBottom: 14,
    minHeight: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});