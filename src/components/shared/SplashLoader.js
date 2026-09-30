import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  Easing,
  FadeOut,
} from "react-native-reanimated";

/* ───────────────────────── one popping kernel ─────────────────────────
 * A tiny cluster of overlapping gold circles — the same construction as
 * the icon's own baked-in kernels, just three native Views instead of an
 * image, so each one is practically free to animate.
 */
const Kernel = ({ x, y, delay, scale = 1 }) => {
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withDelay(
      delay,
      withSequence(
        withSpring(1.15, { damping: 7, stiffness: 260, mass: 0.5 }),
        withSpring(1, { damping: 9, stiffness: 220 }),
      ),
    );
  }, [pop, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: Math.min(pop.value * 1.6, 1),
    transform: [
      { translateY: (1 - Math.min(pop.value, 1)) * 22 },
      { scale: pop.value * scale },
    ],
  }));

  const s = 26 * scale;
  return (
    <Animated.View style={[styles.kernelWrap, { left: x, top: y }, style]}>
      <View style={[styles.kernelLobe, { width: s, height: s, left: -s * 0.35 }]} />
      <View style={[styles.kernelLobe, { width: s, height: s, left: s * 0.35 }]} />
      <View style={[styles.kernelLobe, { width: s * 1.05, height: s * 1.05, top: -s * 0.35 }]} />
    </Animated.View>
  );
};

// Positions are tuned to the splash-box.png artwork's rim, in a size-independent
// (0-1) coordinate space so they scale with BOX_SIZE below.
const KERNEL_LAYOUT = [
  { x: 0.05, y: -0.03, delay: 0, scale: 0.65 },
  { x: 0.18, y: -0.12, delay: 60, scale: 0.85 },
  { x: 0.32, y: -0.17, delay: 110, scale: 0.95 },
  { x: 0.45, y: -0.13, delay: 60, scale: 0.85 },
  { x: 0.58, y: -0.04, delay: 0, scale: 0.65 },
];

const BOX_SIZE = 110;

/* ───────────────────────── splash loader ─────────────────────────
 * Per your last note: just the animation, nothing else on screen.
 */
const SplashLoader = () => {
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withSpring(1, { damping: 9, stiffness: 220, mass: 0.7 });
  }, [pop]);

  const boxStyle = useAnimatedStyle(() => ({
    opacity: Math.min(pop.value * 1.6, 1),
    transform: [
      { scale: pop.value },
      { rotate: `${(1 - pop.value) * -8}deg` },
    ],
  }));

  return (
    <Animated.View style={styles.container} exiting={FadeOut.duration(280)}>
      <View style={{ width: BOX_SIZE, height: BOX_SIZE }}>
        <Animated.View style={[StyleSheet.absoluteFill, boxStyle]}>
          <Image
            source={require("../../../assets/splash-box.png")}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
        </Animated.View>

        {KERNEL_LAYOUT.map((k, i) => (
          <Kernel
            key={i}
            x={k.x * BOX_SIZE}
            y={k.y * BOX_SIZE}
            delay={220 + k.delay}
            scale={k.scale}
          />
        ))}
      </View>
    </Animated.View>
  );
};

export default SplashLoader;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#05070d",
    justifyContent: "center",
    alignItems: "center",
  },
  kernelWrap: {
    position: "absolute",
    width: 40,
    height: 40,
  },
  kernelLobe: {
    position: "absolute",
    backgroundColor: "#FFC93C",
    borderColor: "#16202E",
    borderWidth: 3,
    borderRadius: 999,
  },
});