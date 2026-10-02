import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Platform } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { BlurView } from "expo-blur";

// Scroll distance (px) over which the header crosses from "solid, blends
// with the page background" to "floating translucent glass bar".
const FADE_RANGE = 50;

const HomeHeader = ({ tagline, theme, colors, scrollY, onHeight }) => {
  const isFocused = useIsFocused();
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameY = useRef(new Animated.Value(10)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagY = useRef(new Animated.Value(6)).current;
  const sheen = useRef(new Animated.Value(0)).current;

  // Entrance: once
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.spring(nameY, { toValue: 0, friction: 8, tension: 65, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(tagOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.spring(tagY, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [nameOpacity, nameY, tagOpacity, tagY]);

  // Sheen: only while the screen is visible
  useEffect(() => {
    if (!isFocused) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        Animated.timing(sheen, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(sheen, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isFocused, sheen]);

  const sheenX = sheen.interpolate({ inputRange: [0, 1], outputRange: [-140, 180] });

  // Cover fades out on scroll to reveal the blur beneath it. The blur layer
  // itself is never animated/toggled — some BlurView implementations briefly
  // flash a flat fallback tint each time their own opacity crosses a
  // visibility threshold, which is the "shuffling" between glass and frost.
  // Keeping it permanently mounted at full opacity avoids that entirely.
  const coverOpacity = scrollY.interpolate({
    inputRange: [0, FADE_RANGE],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const dividerOpacity = scrollY.interpolate({
    inputRange: [0, FADE_RANGE],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View
      style={styles.header}
      onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
    >
      {/* Blur backdrop: always rendered, never animated — this is the fix */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <BlurView
          intensity={theme === "dark" ? 42 : 62}
          tint={theme === "dark" ? "dark" : "light"}
          experimentalBlurMethod={
            Platform.OS === "android" ? "dimezisBlurView" : undefined
          }
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

      {/* Content, always on top of both backdrop layers */}
      <View style={styles.content}>
        <Animated.View
          style={[styles.badge, { opacity: nameOpacity, transform: [{ translateY: nameY }] }]}
        >
          <Text style={[styles.name, { color: theme === "dark" ? "#42a5f5" : "#1976d2" }]}>
            CineLink
          </Text>
          <Animated.View
            pointerEvents="none"
            style={[styles.sheen, { transform: [{ translateX: sheenX }, { skewX: "-18deg" }] }]}
          />
        </Animated.View>
        <Animated.Text
          style={[
            styles.tagline,
            { color: colors.text, opacity: tagOpacity, transform: [{ translateY: tagY }] },
          ]}
        >
          {tagline}
        </Animated.Text>
      </View>
    </View>
  );
};

export default React.memo(HomeHeader);

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
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  badge: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 10, paddingRight: 8 },
  name: { fontSize: 30, fontWeight: "800", letterSpacing: 0.55 },
  sheen: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 36,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  tagline: { fontSize: 13, opacity: 0.7, marginTop: 2 },
});