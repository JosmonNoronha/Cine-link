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
  const [overlayOpacity] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade-in animation on mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 0.95,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0.12,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const mediaType = movie.Type || movie.media_type || "movie";
  const releaseYear =
    movie.Year ||
    movie.release_date?.split("-")[0] ||
    movie.first_air_date?.split("-")[0] ||
    "N/A";
  const imdbRating =
    movie.imdbRating && movie.imdbRating !== "N/A"
      ? parseFloat(movie.imdbRating)
      : null;

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
        activeOpacity={0.8}
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
              <Animated.View
                style={[styles.pressOverlay, { opacity: overlayOpacity }]}
              />
              <LinearGradient
                colors={[
                  "transparent",
                  "transparent",
                  "rgba(0,0,0,0.4)",
                  "rgba(0,0,0,0.92)",
                ]}
                locations={[0, 0.4, 0.7, 1]}
                style={styles.posterGradient}
              />
              {imdbRating && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={11} color="#FFC107" />
                  <Text style={styles.ratingText}>{imdbRating.toFixed(1)}</Text>
                </View>
              )}
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
              style={[styles.title, { color: "#fff" }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {movie.Title || movie.title || movie.name}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.year}>{releaseYear}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.type}>
                {String(mediaType).charAt(0).toUpperCase() +
                  String(mediaType).slice(1)}
              </Text>
            </View>
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
    borderRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  posterContainer: {
    position: "relative",
    alignItems: "center",
  },
  poster: {
    width: 160,
    height: 235,
    borderRadius: 18,
  },
  pressOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
  },
  posterGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    borderRadius: 18,
  },
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,193,7,0.3)",
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFC107",
    letterSpacing: 0.3,
  },
  posterPlaceholder: {
    width: 160,
    height: 235,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.9,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  info: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    gap: 4,
  },
  title: {
    fontWeight: "800",
    fontSize: 15,
    lineHeight: 18,
    color: "#fff",
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  year: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.2,
  },
  metaDot: {
    fontSize: 10,
    color: "rgba(255,255,255,0.5)",
  },
  type: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.2,
  },
});

export default HomeMovieCard;
