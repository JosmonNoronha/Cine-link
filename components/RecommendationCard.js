import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useCustomTheme } from "../contexts/ThemeContext";

const RecommendationCard = ({ item }) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { theme } = useCustomTheme();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          shadowColor: colors.text,
        },
      ]}
      onPress={() =>
        item.imdbID && navigation.navigate("Details", { imdbID: item.imdbID })
      }
    >
      <Image
        source={{
          uri:
            item.Poster && item.Poster !== "N/A"
              ? item.Poster
              : "https://via.placeholder.com/300x450",
        }}
        style={styles.poster}
      />
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.year, { color: colors.text + "99" }]}>
          {item.release_year}
        </Text>
        {item.imdbRating && (
          <Text style={styles.rating}>⭐ {item.imdbRating}</Text>
        )}
        <Text
          style={[styles.genre, { color: colors.text + "80" }]}
          numberOfLines={1}
        >
          {item.genres}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 160,
    marginRight: 12,
    borderRadius: 8,
    elevation: 3,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  poster: {
    width: "100%",
    height: 240,
    resizeMode: "cover",
  },
  info: {
    padding: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  year: {
    fontSize: 12,
    marginBottom: 2,
  },
  genre: {
    fontSize: 12,
  },
  rating: {
    fontSize: 12,
    color: "#f39c12",
    marginBottom: 2,
  },
});

export default RecommendationCard;
