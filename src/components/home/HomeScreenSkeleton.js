import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";
import { createShimmerPlaceholder } from "react-native-shimmer-placeholder";
import { LinearGradient } from "expo-linear-gradient";

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

const palette = (dark) =>
  dark ? ["#232323", "#353535", "#232323"] : ["#e2e2e2", "#f4f4f4", "#e2e2e2"];

const Block = ({ style, colors }) => (
  <ShimmerPlaceholder style={style} shimmerColors={colors} autoRun />
);

const Heading = ({ colors }) => (
  <View style={styles.heading}>
    <Block style={styles.title} colors={colors} />
    <Block style={styles.subtitle} colors={colors} />
  </View>
);

// Mirrors the real page: featured banner, chips, ranked row, wide row.
const HomeScreenSkeleton = () => {
  const { colors, dark } = useTheme();
  const c = palette(dark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Block style={styles.hero} colors={c} />

      <View style={styles.chips}>
        {[0, 1, 2, 3].map((i) => (
          <Block key={i} style={styles.chip} colors={c} />
        ))}
      </View>

      <Heading colors={c} />
      <View style={styles.row}>
        {[0, 1, 2].map((i) => (
          <Block key={i} style={styles.ranked} colors={c} />
        ))}
      </View>

      <Heading colors={c} />
      <View style={styles.row}>
        {[0, 1].map((i) => (
          <Block key={i} style={styles.wide} colors={c} />
        ))}
      </View>
    </View>
  );
};

export default HomeScreenSkeleton;

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { marginHorizontal: 20, marginTop: 20, height: 210, borderRadius: 18 },
  chips: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginTop: 22 },
  chip: { width: 92, height: 38, borderRadius: 20 },
  heading: { paddingHorizontal: 20, marginTop: 28, marginBottom: 14, gap: 8 },
  title: { width: 170, height: 20, borderRadius: 8 },
  subtitle: { width: 120, height: 12, borderRadius: 6 },
  row: { flexDirection: "row", gap: 12, paddingHorizontal: 20 },
  ranked: { width: 150, height: 168, borderRadius: 14 },
  wide: { width: 264, height: 148, borderRadius: 18 },
});