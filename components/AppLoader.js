// components/AppLoader.js
import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";

export default function AppLoader({
  message = "Loading...",
  size = "large",
  color,
  backgroundColor,
  textColor,
  fullscreen = true,
}) {
  const { colors } = useTheme();
  const loaderColor = color || colors.primary;
  const bgColor = backgroundColor || (fullscreen ? colors.background : "transparent");
  const msgColor = textColor || colors.text;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }, fullscreen && styles.fullscreen]}>
      <ActivityIndicator size={size} color={loaderColor} />
      {message ? <Text style={[styles.message, { color: msgColor }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 12,
  },
  fullscreen: {
    flex: 1,
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "500",
    opacity: 0.8,
  },
});
