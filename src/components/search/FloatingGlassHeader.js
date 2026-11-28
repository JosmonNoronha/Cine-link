import React, { useState, useMemo } from "react";
import { View, Animated, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";

const FADE_RANGE = 50;

/**
 * A header that overlays the scrolling content so the BlurView can sample and
 * blur the content behind it.
 *
 * At rest the header looks identical to the page background (solid cover
 * at full opacity). As the list scrolls up the solid cover fades out,
 * revealing the BlurView behind it — giving the frosted-glass effect.
 *
 * `collapsible` (optional): a node, e.g. the filter chips, shown under `children`.
 * Scrolling down slides it up under the search bar and the glass shrinks with it;
 * scrolling up at any point brings it back.
 *
 * There is ONE glass layer behind everything (so the title/search area and the
 * filters are the same surface, with no seam). When collapsing, that layer slides up
 * and its bottom edge rises, the title/search stay still on top of it, and the
 * filters slide up inside a clip box and disappear under the search bar.
 */
const FloatingGlassHeader = ({
  scrollY,
  theme,
  colors,
  children,
  collapsible = null,
  fadeRange = FADE_RANGE,
  contentStyle,
  onHeight,
}) => {
  const isDark = theme === "dark";
  const [footerH, setFooterH] = useState(0);
  const footerHeight = collapsible ? footerH : 0;

  const coverOpacity = scrollY.interpolate({
    inputRange: [0, fadeRange],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const dividerOpacity = scrollY.interpolate({
    inputRange: [0, fadeRange],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // 0 → footerHeight. Grows while scrolling down, shrinks on any upward scroll.
  // The scroll value is clamped at 0 first so iOS bounce can't make it jump.
  const collapse = useMemo(() => {
    if (!footerHeight) return new Animated.Value(0);
    const clamped = scrollY.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolateLeft: "clamp",
    });
    return Animated.diffClamp(clamped, 0, footerHeight);
  }, [scrollY, footerHeight]);

  // Same animated node drives every moving piece, so they update in the same frame.
  const up = useMemo(() => Animated.multiply(collapse, -1), [collapse]);

  return (
    <View
      style={[styles.header, { shadowColor: isDark ? "#000" : "#1a1a2e" }]}
      onLayout={(event) => onHeight?.(event.nativeEvent.layout.height)}
    >
      {/* The single glass surface. Its bottom edge rises as the filters collapse. */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateY: up }] }]}>
        <BlurView
          intensity={isDark ? 42 : 62}
          tint={isDark ? "dark" : "light"}
          experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? "rgba(10,12,18,0.30)" : "rgba(255,255,255,0.40)" },
          ]}
        />
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, opacity: coverOpacity }]}
        />
        {/* Bottom border, rides on the glass's bottom edge */}
        <Animated.View
          style={[
            styles.divider,
            {
              opacity: dividerOpacity,
              backgroundColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(24,33,48,0.14)",
            },
          ]}
        />
      </Animated.View>

      {/* Pinned content: title, search, dropdown. Never moves. */}
      <View style={[styles.content, contentStyle, styles.pinned]}>{children}</View>

      {/* Collapsible content: slides up inside a clip box and tucks under the pinned part. */}
      {collapsible ? (
        <View style={styles.clip}>
          <Animated.View
            style={[styles.content, { transform: [{ translateY: up }] }]}
            onLayout={(e) => setFooterH(Math.round(e.nativeEvent.layout.height))}
          >
            {collapsible}
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
};

export default React.memo(FloatingGlassHeader);

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20, // Android: renders above the list
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  pinned: { zIndex: 2 },
  clip: { overflow: "hidden", zIndex: 1 },
  divider: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
  },
  content: { paddingHorizontal: 16 },
});