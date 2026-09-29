import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";

/* ───────────────────────── icon tile ─────────────────────────
 * A quick, punchy pop — spring overshoot past 1, settle, done.
 * No idle loop: the splash isn't on screen long enough to earn one.
 */
const IconTile = ({ size = 116 }) => {
  const pop = useSharedValue(0);
  const sweep = useSharedValue(-1);

  useEffect(() => {
    pop.value = withSpring(1, { damping: 9, stiffness: 220, mass: 0.7 });
    sweep.value = withDelay(
      150,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }),
    );
  }, [pop, sweep]);

  const tileStyle = useAnimatedStyle(() => ({
    opacity: Math.min(pop.value * 1.6, 1),
    transform: [{ scale: pop.value }, { rotate: `${(1 - pop.value) * -6}deg` }],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweep.value * size * 1.4 }, { rotate: "20deg" }],
    opacity: sweep.value > 0.85 ? 0 : 1,
  }));

  return (
    <Animated.View style={[styles.iconShadowWrap, tileStyle]}>
      <View style={[styles.iconTile, { width: size, height: size, borderRadius: size * 0.24 }]}>
        <Image
          source={require("../../../assets/logo.png")}
          style={styles.iconImage}
          contentFit="contain"
        />
        <Animated.View style={[styles.sweep, sweepStyle]} pointerEvents="none" />
      </View>
    </Animated.View>
  );
};

/* ───────────────────── loading dots (fast, staggered) ───────────────────── */
const Dot = ({ delay, color }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 260, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [t, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + t.value * 0.65,
    transform: [{ scale: 0.7 + t.value * 0.3 }],
  }));

  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
};

/* ───────────────────────── splash loader ───────────────────────── */

const SplashLoader = ({ appName = "CineLink" }) => {
  const accent = "#74b7ff";

  return (
    <Animated.View style={styles.container} exiting={FadeOut.duration(280)}>
      <LinearGradient
        colors={["#0c1220", "#05070d", "#000000"]}
        style={StyleSheet.absoluteFill}
      />

      <IconTile />

      <Animated.Text
        entering={FadeIn.delay(120).duration(280)}
        style={styles.appName}
      >
        {appName}
      </Animated.Text>

      <Animated.View
        entering={FadeIn.delay(260).duration(240)}
        style={styles.dotsRow}
      >
        <Dot delay={0} color={accent} />
        <Dot delay={120} color={accent} />
        <Dot delay={240} color={accent} />
      </Animated.View>
    </Animated.View>
  );
};

export default SplashLoader;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  iconShadowWrap: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 18,
    marginBottom: 18,
  },
  iconTile: {
    backgroundColor: "#12151c",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconImage: {
    width: "68%",
    height: "68%",
  },
  sweep: {
    position: "absolute",
    top: -40,
    bottom: -40,
    width: 32,
    backgroundColor: "rgba(255,255,255,0.22)",
  },

  appName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.6,
    textAlign: "center",
  },

  dotsRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 22,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});