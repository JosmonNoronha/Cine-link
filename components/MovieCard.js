import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { saveFavorite, removeFavorite, isFavorite } from "../utils/storage";

const MovieCard = ({ movie, onPress, style }) => {
  const { colors } = useTheme();
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    const checkFavorite = async () => {
      const favStatus = await isFavorite(movie.imdbID);
      setIsFav(favStatus);
    };
    checkFavorite();
  }, [movie.imdbID]);

  const toggleFavorite = async () => {
    if (isFav) {
      await removeFavorite(movie.imdbID);
    } else {
      await saveFavorite(movie);
    }
    setIsFav(!isFav);
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.text,
        },
        style,
      ]}
    >
      <View style={styles.posterContainer}>
        {movie.Poster !== "N/A" ? (
          <>
            <Image source={{ uri: movie.Poster }} style={styles.poster} />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.5)"]}
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
        <View style={styles.actionRow}></View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  posterContainer: {
    position: "relative",
    marginRight: 12,
  },
  poster: {
    width: 90,
    height: 135,
    borderRadius: 8,
  },
  posterGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },
  posterPlaceholder: {
    width: 90,
    height: 135,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.7,
  },
  placeholderText: {
    fontSize: 14,
    textAlign: "center",
  },
  info: {
    flex: 1,
    justifyContent: "space-between",
  },
  title: {
    fontWeight: "bold",
    fontSize: 18,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  favButton: {
    padding: 4,
  },
});

export default MovieCard;
