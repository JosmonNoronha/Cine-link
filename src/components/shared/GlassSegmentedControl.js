import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

// Same spring feel as the floating tab bar's sliding pill (AppNavigator.js),
// so this reads as part of the same design system wherever it's used.
const SP_SNAPPY = { damping: 20, stiffness: 300, mass: 0.6 };
const INSET = 4;

/**
 * A glass, sliding-pill segmented control.
 *
 * options: [{ key, label?, icon? }]  — icon is an Ionicons "-outline" name;
 *   the filled variant is used automatically for the selected segment.
 * value / onChange: controlled selection.
 * theme: "dark" | "light".
 * compact: icon-only, fixed-width segments (e.g. a list/grid toggle).
 *   Non-compact stretches to fill its container and shows labels.
 */
const GlassSegmentedControl = ({
  options,
  value,
  onChange,
  theme = "light",
  compact = false,
  segmentWidth = 38,
}) => {
  const isDark = theme === "dark";
  const accent = isDark ? "#74b7ff" : "#2f6bff";
  const inactiveFg = isDark ? "rgba(255,255,255,0.62)" : "rgba(24,33,48,0.72)";
  const barBg = isDark ? "rgba(18, 18, 22, 0.9)" : "rgba(216, 224, 238, 0.86)";
  const barBorder = isDark ? "rgba(255,255,255,0.15)" : "rgba(37,56,94,0.28)";
  const pillColor = isDark ? "rgba(116,183,255,0.20)" : "rgba(47,107,255,0.18)";
  const pillBorderColor = isDark
    ? "rgba(116,183,255,0.42)"
    : "rgba(47,107,255,0.42)";
  const topSheen = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.54)";

  const [measuredWidth, setMeasuredWidth] = useState(0);
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.key === value),
  );

  const contentWidth = compact
    ? segmentWidth * options.length
    : Math.max(0, measuredWidth - INSET * 2);
  const segW = options.length ? contentWidth / options.length : 0;

  const translateX = useSharedValue(activeIndex * segW);
  useEffect(() => {
    translateX.value = withSpring(activeIndex * segW, SP_SNAPPY);
  }, [activeIndex, segW, translateX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleLayout = useCallback(
    (e) => {
      if (!compact) setMeasuredWidth(e.nativeEvent.layout.width);
    },
    [compact],
  );

  const ready = compact || measuredWidth > 0;

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.container,
        { backgroundColor: barBg, borderColor: barBorder },
        compact && { width: contentWidth + INSET * 2, alignSelf: "flex-start" },
      ]}
    >
      <View style={[styles.topSheen, { backgroundColor: topSheen }]} />

      {ready && (
        <Animated.View
          style={[
            styles.pill,
            pillStyle,
            { width: segW, backgroundColor: pillColor, borderColor: pillBorderColor },
          ]}
        />
      )}

      <View style={styles.row}>
        {options.map((opt) => {
          const selected = opt.key === value;
          const iconName = opt.icon
            ? selected
              ? opt.icon.replace("-outline", "")
              : opt.icon
            : null;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onChange(opt.key)}
              style={[styles.segment, compact && { width: segmentWidth, flex: 0 }]}
              hitSlop={6}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={opt.label || opt.key}
            >
              {iconName && (
                <Ionicons
                  name={iconName}
                  size={compact ? 17 : 15}
                  color={selected ? accent : inactiveFg}
                />
              )}
              {opt.label && !compact && (
                <Text
                  style={[
                    styles.label,
                    { color: selected ? accent : inactiveFg, fontWeight: selected ? "700" : "600" },
                  ]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export default React.memo(GlassSegmentedControl);

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  topSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 5,
  },
  pill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: INSET,
    borderRadius: 12,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: INSET,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  label: {
    fontSize: 13,
  },
});