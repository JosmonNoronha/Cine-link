import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const HomeMovieCard = ({ movie, onPress, style }) => {
  const { colors } = useTheme();
  const [scale] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade-in animation on mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        { transform: [{ scale }], opacity: fadeAnim },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            shadowColor: colors.text,
          },
        ]}
      >
        <View style={styles.posterContainer}>
          {(movie.Poster && movie.Poster !== "N/A") || movie.poster_path ? (
            <>
              <Image
                source={{
                  uri:
                    movie.Poster ||
                    (movie.poster_path
                      ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
                      : null),
                }}
                style={styles.poster}
              />
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.8)"]}
                style={styles.posterGradient}
              />
            </>
          ) : (
            <View
              style={[
                styles.posterPlaceholder,
                { backgroundColor: colors.background },
              ]}
            >
              <Ionicons name="film-outline" size={40} color={colors.text} />
              <Text style={[styles.placeholderText, { color: colors.text }]}>
                No Image
              </Text>
            </View>
          )}
          <View style={styles.info}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {movie.Title || movie.title || movie.name}
            </Text>
            <Text style={[styles.subtitle, { color: "#1e88e5" }]}>
              {movie.Year ||
                movie.release_date?.split("-")[0] ||
                movie.first_air_date?.split("-")[0] ||
                "N/A"}{" "}
              •{" "}
              {movie.Type
                ? movie.Type.charAt(0).toUpperCase() + movie.Type.slice(1)
                : movie.media_type === "tv"
                  ? "Series"
                  : "Movie"}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: 160,
    marginRight: 14,
  },
  card: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
  },
  posterContainer: {
    position: "relative",
    alignItems: "center",
  },
  poster: {
    width: 160,
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
  posterGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    borderRadius: 16,
  },
  posterPlaceholder: {
    width: 160,
    height: 220,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.9,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },
  info: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  title: {
    fontWeight: "800",
    fontSize: 16,
    lineHeight: 20,
    textAlign: "center",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
    opacity: 0.9,
  },
});

export default HomeMovieCard;
