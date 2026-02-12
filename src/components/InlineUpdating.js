import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function InlineUpdating({ text = "Updating..." }) {
  const { colors } = useTheme();

  // Spin animation for icon
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Subtle pulse for container
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Spin loop
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      spinAnim.stopAnimation();
      pulseAnim.stopAnimation();
    };
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: pulseAnim }],
          shadowColor: colors.primary,
        },
      ]}
    >
      <LinearGradient
        colors={[
          colors.card + 'CC', // Semi-transparent card color
          colors.background + 'CC',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <MaterialIcons name="autorenew" size={20} color={colors.primary} />
        </Animated.View>
        <Text style={[styles.text, { color: colors.text }]}>{text}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 12,
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
  },
  text: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});