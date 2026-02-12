import React, { useState, useEffect, useMemo } from "react";
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
import { useFavorites } from "../contexts/FavoritesContext";

const MovieCard = ({ movie, onPress, style }) => {
  const { colors } = useTheme();
  const [scale] = useState(new Animated.Value(1));
  const [fadeAnim] = useState(new Animated.Value(0));
  const { isFavorite, addToFavorites, removeFromFavorites } = useFavorites();

  const movieId = movie?.imdbID;

  // Compute favorite status instantly from context (no async calls!)
  const isFav = useMemo(() => {
    if (!movieId) return false;
    return isFavorite(movieId);
  }, [movieId, isFavorite]);

  // Fade-in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const toggleFavorite = async () => {
    if (!movieId) return;

    try {
      if (isFav) {
        await removeFromFavorites(movieId);
      } else {
        await addToFavorites({ ...movie, imdbID: movieId });
      }
    } catch (e) {
      console.warn("Failed to toggle favorite:", e?.message || e);
    }
  };

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 4,
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
        <LinearGradient
          colors={[colors.card, colors.background]}
          style={styles.cardGradient}
        />
        <View style={styles.content}>
          <View style={styles.posterContainer}>
            {movie.Poster !== "N/A" ? (
              <Image source={{ uri: movie.Poster }} style={styles.poster} />
            ) : (
              <View
                style={[
                  styles.posterPlaceholder,
                  { backgroundColor: colors.background },
                ]}
              >
                <Ionicons name="film-outline" size={30} color={colors.text} />
                <Text style={[styles.placeholderText, { color: colors.text }]}>
                  No Image
                </Text>
              </View>
            )}
          </View>
          <View style={styles.info}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {movie.Title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              {movie.Year} •{" "}
              {movie.Type.charAt(0).toUpperCase() + movie.Type.slice(1)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={toggleFavorite}
            style={[styles.favButton, { backgroundColor: colors.background }]}
          >
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={24}
              color={isFav ? "#e91e63" : colors.text}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginVertical: 8,
    marginHorizontal: 12,
  },
  card: {
    borderRadius: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
  },
  cardGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  posterContainer: {
    position: "relative",
    marginRight: 12,
  },
  poster: {
    width: 70,
    height: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  posterPlaceholder: {
    width: 70,
    height: 100,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.9,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
  },
  info: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontWeight: "700",
    fontSize: 17,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 6,
  },
  favButton: {
    padding: 8,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
});

export default MovieCard;
