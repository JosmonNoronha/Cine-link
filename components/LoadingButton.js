// components/LoadingButton.js
import React from "react";
import { Pressable, Text, View, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const LoadingButton = ({
  loading,
  onPress,
  children,
  style,
  disabled,
  loadingText = "Loading...",
  loadingIcon = "sync-outline",
}) => {
  const spinValue = new Animated.Value(0);

  React.useEffect(() => {
    if (loading) {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      );
      spinAnimation.start();
      return () => spinAnimation.stop();
    }
  }, [loading, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Pressable
      style={[style, { opacity: disabled || loading ? 0.8 : 1 }]}
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
    >
      <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.gradient}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name={loadingIcon} size={16} color="#fff" />
            </Animated.View>
            <Text style={[styles.text, { marginLeft: 8 }]}>{loadingText}</Text>
          </View>
        ) : (
          children
        )}
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: "row",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default LoadingButton;
