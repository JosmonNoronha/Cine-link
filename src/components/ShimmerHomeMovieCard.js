import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

const ShimmerHomeMovieCard = ({ style }) => {
  const { colors } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Loop shimmer animation
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    shimmerLoop.start();
    return () => shimmerLoop.stop();
  }, [shimmerAnim]);

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-160, 160], // Adjusted to match card width (160px)
  });

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: colors.card,
          shadowColor: colors.text,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.card}>
        <LinearGradient
          colors={["rgba(30,136,229,0.1)", "rgba(0,0,0,0.2)"]}
          style={styles.cardGradient}
        />
        <View style={styles.posterContainer}>
          <View style={styles.posterPlaceholder}>
            <Animated.View
              style={[
                styles.shimmer,
                { transform: [{ translateX: shimmerTranslate }] },
              ]}
            >
              <LinearGradient
                colors={[
                  "rgba(200,200,200,0.3)",
                  "rgba(200,200,200,0.5)",
                  "rgba(200,200,200,0.3)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          </View>
          <View style={styles.info}>
            <View style={styles.titlePlaceholder} />
            <View style={styles.subtitlePlaceholder} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: 160,
    marginRight: 14,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    overflow: "hidden",
    borderWidth: 1,
  },
  card: {
    borderRadius: 18,
    overflow: "hidden",
  },
  cardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
  },
  posterContainer: {
    position: "relative",
    alignItems: "center",
  },
  posterPlaceholder: {
    width: 160,
    height: 240,
    borderRadius: 18,
    backgroundColor: "rgba(200,200,200,0.2)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    flex: 1,
    width: 160, // Match card width
  },
  info: {
    position: "absolute",
    bottom: 16,
    left: 12,
    right: 12,
  },
  titlePlaceholder: {
    width: "80%",
    height: 20,
    backgroundColor: "rgba(200,200,200,0.3)",
    borderRadius: 4,
    marginBottom: 8,
    alignSelf: "center",
  },
  subtitlePlaceholder: {
    width: "60%",
    height: 12,
    backgroundColor: "rgba(200,200,200,0.3)",
    borderRadius: 4,
    alignSelf: "center",
  },
});

export default ShimmerHomeMovieCard;