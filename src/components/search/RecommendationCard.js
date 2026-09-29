import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { useNavigation, useTheme } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const RecommendationCard = ({ item }) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [scale] = useState(new Animated.Value(1));
  const [overlayOpacity] = useState(new Animated.Value(0));

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

  const imdbRating =
    item.imdbRating && item.imdbRating !== "N/A"
      ? parseFloat(item.imdbRating)
      : null;

  return (
    <Animated.View style={[styles.cardContainer, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={() =>
          item.imdbID && navigation.navigate("Details", { imdbID: item.imdbID })
        }
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
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri:
                item.Poster && item.Poster !== "N/A"
                  ? item.Poster
                  : item.poster_path
                    ? `https://image.tmdb.org/t/p/w185${item.poster_path}`
                    : "https://via.placeholder.com/300x450",
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
              "rgba(0,0,0,0.3)",
              "rgba(0,0,0,0.88)",
            ]}
            locations={[0, 0.35, 0.65, 1]}
            style={styles.gradient}
          />
          {imdbRating && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={11} color="#FFC107" />
              <Text style={styles.ratingText}>{imdbRating.toFixed(1)}</Text>
            </View>
          )}
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
              {item.title || item.Title}
            </Text>
            {item.release_year && (
              <Text style={styles.year}>{item.release_year}</Text>
            )}
            {item.genres && (
              <Text style={styles.genre} numberOfLines={1}>
                {item.genres}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginRight: 12,
  },
  card: {
    width: 160,
    borderRadius: 18,
    elevation: 8,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  imageContainer: {
    width: "100%",
    height: 235,
    position: "relative",
  },
  poster: {
    width: "100%",
    height: "100%",
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "100%",
  },
  pressOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "white",
  },
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    color: "#FFC107",
    fontSize: 11,
    fontWeight: "700",
  },
  content: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  year: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  genre: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "400",
    lineHeight: 14,
  },
});

export default RecommendationCard;
