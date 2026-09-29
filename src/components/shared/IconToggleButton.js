import React, { useCallback } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

// A single small glass icon button — same palette/press-spring as the
// Details screen back button, but no sliding pill. For simple one-tap
// toggles (like list/grid) where a segmented control is overkill.
const IconToggleButton = ({ icon, onPress, theme = "light", size = 38 }) => {
  const isDark = theme === "dark";
  const accent = isDark ? "#74b7ff" : "#2f6bff";
  const barBg = isDark ? "rgba(18, 18, 22, 0.86)" : "rgba(216, 224, 238, 0.86)";
  const barBorder = isDark ? "rgba(255,255,255,0.15)" : "rgba(37,56,94,0.28)";
  const topSheen = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.54)";

  const scale = useSharedValue(1);
  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.88, { damping: 14, stiffness: 380 });
  }, [scale]);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 11, stiffness: 260, mass: 0.65 });
  }, [scale]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={wrapStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: barBg,
            borderColor: barBorder,
          },
        ]}
        accessibilityRole="button"
      >
        <View style={[styles.sheen, { backgroundColor: topSheen }]} />
        <Ionicons name={icon} size={Math.round(size * 0.46)} color={accent} />
      </Pressable>
    </Animated.View>
  );
};

export default React.memo(IconToggleButton);

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});