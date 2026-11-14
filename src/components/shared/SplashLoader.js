import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSequence,
  withSpring,
  FadeOut,
} from "react-native-reanimated";

/* ───────────────────────── one popping kernel ───────────────────────── */
const Kernel = ({ x, y, delay, scale = 1 }) => {
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withDelay(
      delay,
      withSequence(
        withSpring(1.15, { damping: 7, stiffness: 260, mass: 0.5 }),
        withSpring(1, { damping: 9, stiffness: 220 })
      )
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
      <View
        style={[
          styles.kernelLobe,
          { width: s, height: s, left: -s * 0.25, top: s * 0.1 },
        ]}
      />
      <View
        style={[
          styles.kernelLobe,
          { width: s, height: s, left: s * 0.25, top: s * 0.15 },
        ]}
      />
      <View
        style={[
          styles.kernelLobe,
          { width: s * 1.15, height: s * 1.15, top: -s * 0.2, left: -s * 0.05 },
        ]}
      />
    </Animated.View>
  );
};

// Tuned to the updated splash-box.png rim
const KERNEL_LAYOUT = [
  { x: 0.12, y: 0.06, delay: 0, scale: 0.68 },
  { x: 0.24, y: -0.02, delay: 60, scale: 0.88 },
  { x: 0.38, y: -0.05, delay: 110, scale: 0.98 },
  { x: 0.52, y: -0.02, delay: 60, scale: 0.88 },
  { x: 0.65, y: 0.05, delay: 0, scale: 0.68 },
];

const BOX_SIZE = 120;

/* ───────────────────────── splash loader ───────────────────────── */
const SplashLoader = () => {
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withSpring(1, { damping: 9, stiffness: 220, mass: 0.7 });
  }, [pop]);

  const boxStyle = useAnimatedStyle(() => ({
    opacity: Math.min(pop.value * 1.6, 1),
    transform: [
      { scale: pop.value },
      { rotate: `${(1 - pop.value) * -6}deg` },
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
    width: 44,
    height: 44,
  },
  kernelLobe: {
    position: "absolute",
    backgroundColor: "#FAD054",
    borderColor: "#0C182B",
    borderWidth: 2.5,
    borderRadius: 999,
  },
});