import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Home header, right corner: opens the Discover menu.
const HubButton = ({ onPress, colors, active }) => {
  const buttonRef = useRef(null);
  const activeProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(activeProgress, {
      toValue: active ? 1 : 0,
      damping: 16,
      stiffness: 190,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [active, activeProgress]);

  const openMenu = useCallback(() => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      onPress({ x, y, width, height });
    });
  }, [onPress]);

  return (
    <Pressable
      ref={buttonRef}
      collapsable={false}
      onPress={openMenu}
      hitSlop={8}
      style={({ pressed }) => [
        styles.btn,
        {
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Discover menu"
    >
      <Animated.View
        style={{
          transform: [
            {
              rotate: activeProgress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "45deg"],
              }),
            },
            {
              scale: activeProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.08],
              }),
            },
          ],
        }}
      >
        <Ionicons name="grid" size={18} color={colors.text} />
      </Animated.View>
    </Pressable>
  );
};

export default React.memo(HubButton);

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
