import React from "react";
import { View, Animated, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

const FADE_RANGE = 50;

/**
 * A floating header panel that crossfades from "solid, blends with the
 * page" to a blurred glass bar as the list beneath it scrolls.
 *
 * The blur layer is always mounted at constant opacity — only the plain
 * solid cover on top of it animates. (Animating BlurView's own opacity
 * causes some platforms to flash a flat fallback tint before the real
 * blur catches up, which reads as flickering between two looks.)
 */
const FloatingGlassHeader = ({
  scrollY,
  onHeight,
  theme,
  colors,
  children,
  fadeRange = FADE_RANGE,
  contentStyle,
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
      style={styles.header}
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
    >
      {/* Blur backdrop: always rendered, never animated */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={theme === "dark" ? 42 : 62}
          tint={theme === "dark" ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme === "dark" ? "rgba(10,12,18,0.30)" : "rgba(255,255,255,0.40)" },
          ]}
        />
      </View>

      {/* Solid cover: what you see at rest, fades away to reveal the blur */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, opacity: coverOpacity }]}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.divider,
          {
            opacity: dividerOpacity,
            backgroundColor: theme === "dark" ? "rgba(255,255,255,0.14)" : "rgba(24,33,48,0.14)",
          },
        ]}
      />

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
    overflow: "hidden",
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