import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// Three wisps of steam, each rising and fading on its own offset so they never move in lockstep.
const WISPS = [
  { x: 0.2, delay: 0, d: "M3 9 C1 6.5 5 5 3 2.5" },
  { x: 0.46, delay: 450, d: "M3 9 C1 6.5 5 5 3 2.5" },
  { x: 0.72, delay: 900, d: "M3 9 C1 6.5 5 5 3 2.5" },
];
const DURATION = 1800;

const Wisp = ({ x, delay, d, size, color, still }) => {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) {
      t.value = 0.5;
      return undefined;
    }
    t.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: DURATION, easing: Easing.inOut(Easing.quad) }), -1, false),
    );
    return () => cancelAnimation(t);
  }, [still, delay, t]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.5 ? t.value * 1.8 : (1 - t.value) * 1.8,
    transform: [{ translateY: -t.value * size * 0.28 }, { scaleY: 0.85 + t.value * 0.3 }],
  }));
  return (
    <Animated.View style={[styles.wisp, { left: size * x - size * 0.125, width: size * 0.25, height: size * 0.4 }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 6 11">
        <Path d={d} stroke={color} strokeWidth={1.3} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
};

/**
 * A little tea cup on a saucer with steam drifting up. Pure vector, no assets.
 * Steam stops when the phone has "reduce motion" turned on.
 */
const TeaCupIcon = ({ size = 24, color = "#fff", steamColor }) => {
  const still = useReducedMotion();
  return (
    <View style={{ width: size, height: size }}>
      {WISPS.map((w) => (
        <Wisp key={w.x} {...w} size={size} color={steamColor || color} still={still} />
      ))}
      <Svg width={size} height={size} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
        {/* cup */}
        <Path
          d="M4.5 11.5h12v3.2a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"
          stroke={color}
          strokeWidth={1.6}
          strokeLinejoin="round"
          fill={color}
          fillOpacity={0.16}
        />
        {/* handle */}
        <Path d="M16.5 12.6h1.2a2.4 2.4 0 0 1 0 4.8h-1.8" stroke={color} strokeWidth={1.6} strokeLinecap="round" fill="none" />
        {/* saucer */}
        <Path d="M3 21.6h15" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    </View>
  );
};

export default React.memo(TeaCupIcon);

const styles = StyleSheet.create({
  wisp: { position: "absolute", top: 0 },
});
