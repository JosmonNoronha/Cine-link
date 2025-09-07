// components/WatchlistCard.js
import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const WatchlistCard = ({
  name,
  movieCount,
  index,
  onPress,
  onLongPress,
  onDelete,
}) => {
  const gradientColors = [
    `hsl(${(index * 137.5) % 360}, 70%, 85%)`,
    `hsl(${(index * 137.5) % 360}, 60%, 75%)`,
  ];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="film-outline"
                size={24}
                color={`hsl(${(index * 137.5) % 360}, 50%, 40%)`}
              />
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
              <Ionicons name="trash-outline" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>

          <View style={styles.footer}>
            <View style={styles.movieCountContainer}>
              <Ionicons name="videocam-outline" size={14} color="#666" />
              <Text style={styles.movieCount}>
                {movieCount} {movieCount === 1 ? "movie" : "movies"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  gradient: {
    padding: 20,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    padding: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    lineHeight: 24,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  movieCountContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  movieCount: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
});

export default WatchlistCard;
