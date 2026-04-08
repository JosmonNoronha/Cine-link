import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";
import { createShimmerPlaceholder } from "react-native-shimmer-placeholder";
import { LinearGradient } from "expo-linear-gradient";

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

const shimmerPalette = (dark) =>
  dark ? ["#232323", "#353535", "#232323"] : ["#e2e2e2", "#f4f4f4", "#e2e2e2"];

const SkeletonBlock = ({ style, shimmerColors }) => (
  <ShimmerPlaceholder style={style} shimmerColors={shimmerColors} autoRun />
);

const SectionSkeleton = ({ shimmerColors }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <SkeletonBlock
        style={styles.sectionTitle}
        shimmerColors={shimmerColors}
      />
      <SkeletonBlock
        style={styles.sectionSubtitle}
        shimmerColors={shimmerColors}
      />
    </View>

    <View style={styles.cardRow}>
      {[0, 1, 2].map((index) => (
        <View key={index} style={styles.cardShell}>
          <SkeletonBlock style={styles.poster} shimmerColors={shimmerColors} />
          <SkeletonBlock
            style={styles.cardLine}
            shimmerColors={shimmerColors}
          />
          <SkeletonBlock
            style={styles.cardLineSmall}
            shimmerColors={shimmerColors}
          />
        </View>
      ))}
    </View>
  </View>
);

const HomeScreenSkeleton = () => {
  const { colors, dark } = useTheme();
  const shimmerColors = shimmerPalette(dark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <SkeletonBlock style={styles.appName} shimmerColors={shimmerColors} />
          <SkeletonBlock
            style={styles.appTagline}
            shimmerColors={shimmerColors}
          />
        </View>

        <SkeletonBlock
          style={styles.headerChip}
          shimmerColors={shimmerColors}
        />
      </View>

      <View style={styles.hero}>
        <SkeletonBlock
          style={styles.heroPoster}
          shimmerColors={shimmerColors}
        />
        <View style={styles.heroMeta}>
          <SkeletonBlock
            style={styles.heroBadge}
            shimmerColors={shimmerColors}
          />
          <SkeletonBlock
            style={styles.heroTitle}
            shimmerColors={shimmerColors}
          />
          <SkeletonBlock
            style={styles.heroSubtitle}
            shimmerColors={shimmerColors}
          />
        </View>
      </View>

      <SectionSkeleton shimmerColors={shimmerColors} />
      <SectionSkeleton shimmerColors={shimmerColors} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
    marginRight: 16,
  },
  appName: {
    width: 120,
    height: 28,
    borderRadius: 8,
    marginBottom: 10,
  },
  appTagline: {
    width: 180,
    height: 14,
    borderRadius: 999,
  },
  headerChip: {
    width: 68,
    height: 28,
    borderRadius: 999,
    marginTop: 2,
  },
  hero: {
    marginHorizontal: 20,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(128,128,128,0.08)",
    padding: 14,
  },
  heroPoster: {
    width: "100%",
    height: 240,
    borderRadius: 14,
    marginBottom: 14,
  },
  heroMeta: {
    gap: 10,
  },
  heroBadge: {
    width: 92,
    height: 22,
    borderRadius: 999,
  },
  heroTitle: {
    width: "78%",
    height: 24,
    borderRadius: 8,
  },
  heroSubtitle: {
    width: "56%",
    height: 14,
    borderRadius: 999,
  },
  section: {
    marginTop: 26,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    width: 150,
    height: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  sectionSubtitle: {
    width: 130,
    height: 12,
    borderRadius: 999,
  },
  cardRow: {
    flexDirection: "row",
    paddingLeft: 20,
    paddingRight: 4,
    gap: 12,
  },
  cardShell: {
    width: 112,
  },
  poster: {
    width: 112,
    height: 168,
    borderRadius: 14,
    marginBottom: 10,
  },
  cardLine: {
    width: "88%",
    height: 14,
    borderRadius: 999,
    marginBottom: 8,
  },
  cardLineSmall: {
    width: "58%",
    height: 12,
    borderRadius: 999,
  },
});

export default HomeScreenSkeleton;
