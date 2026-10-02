import React from "react";
import { View, Animated, StyleSheet } from "react-native";
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
 */
const FloatingGlassHeader = ({
  scrollY,
  theme,
  colors,
  children,
  fadeRange = FADE_RANGE,
  contentStyle,
  onHeight,
}) => {
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

  return (
    <View
      style={[
        styles.header,
        {
          // Shadow so it visually "lifts" above the list on scroll
          shadowColor: theme === "dark" ? "#000" : "#1a1a2e",
          backgroundColor: "transparent",
        },
      ]}
      onLayout={(event) => onHeight?.(event.nativeEvent.layout.height)}
    >
      {/* Blur backdrop — always rendered, never animated (avoids flicker) */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={theme === "dark" ? 42 : 62}
          tint={theme === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                theme === "dark"
                  ? "rgba(10,12,18,0.30)"
                  : "rgba(255,255,255,0.40)",
            },
          ]}
        />
      </View>

      {/* Solid cover — fades out as the user scrolls, revealing the blur */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.background, opacity: coverOpacity },
        ]}
      />

      {/* Bottom border — fades in when scrolled to visually separate header */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.divider,
          {
            opacity: dividerOpacity,
            backgroundColor:
              theme === "dark"
                ? "rgba(255,255,255,0.14)"
                : "rgba(24,33,48,0.14)",
          },
        ]}
      />

      {/* Actual content */}
      <View style={[styles.content, contentStyle]}>{children}</View>
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
    // Shadow for the "lifted" feel once blur kicks in
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  divider: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
});