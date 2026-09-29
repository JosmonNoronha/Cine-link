import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { useIsFocused } from "@react-navigation/native";

const HomeHeader = ({ tagline, theme, colors }) => {
  const isFocused = useIsFocused();
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameY = useRef(new Animated.Value(10)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  const tagY = useRef(new Animated.Value(6)).current;
  const sheen = useRef(new Animated.Value(0)).current;

  // Entrance: once
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.spring(nameY, { toValue: 0, friction: 8, tension: 65, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(tagOpacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.spring(tagY, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [nameOpacity, nameY, tagOpacity, tagY]);

  // Sheen: only while the screen is visible
  useEffect(() => {
    if (!isFocused) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        Animated.timing(sheen, { toValue: 1, duration: 1300, useNativeDriver: true }),
        Animated.timing(sheen, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isFocused, sheen]);

  const sheenX = sheen.interpolate({ inputRange: [0, 1], outputRange: [-140, 180] });

  return (
    <View style={styles.header}>
      <Animated.View
        style={[styles.badge, { opacity: nameOpacity, transform: [{ translateY: nameY }] }]}
      >
        <Text style={[styles.name, { color: theme === "dark" ? "#42a5f5" : "#1976d2" }]}>
          CineLink
        </Text>
        <Animated.View
          pointerEvents="none"
          style={[styles.sheen, { transform: [{ translateX: sheenX }, { skewX: "-18deg" }] }]}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.tagline,
          { color: colors.text, opacity: tagOpacity, transform: [{ translateY: tagY }] },
        ]}
      >
        {tagline}
      </Animated.Text>
    </View>
  );
};

export default React.memo(HomeHeader);

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128,128,128,0.2)",
  },
  badge: { alignSelf: "flex-start", overflow: "hidden", borderRadius: 10, paddingRight: 8 },
  name: { fontSize: 30, fontWeight: "800", letterSpacing: 0.55 },
  sheen: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 36,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  tagline: { fontSize: 13, opacity: 0.7, marginTop: 2 },
});