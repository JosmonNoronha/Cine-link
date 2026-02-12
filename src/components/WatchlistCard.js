// components/WatchlistCard.js
import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const WatchlistCard = ({
  name,
  movieCount,
  watchedCount = 0,
  index,
  onPress,
  onLongPress,
  onDelete,
}) => {
  const gradientColors = [
    `hsl(${(index * 137.5) % 360}, 70%, 85%)`,
    `hsl(${(index * 137.5) % 360}, 60%, 75%)`,
  ];

  const progressPercentage = movieCount > 0 ? (watchedCount / movieCount) * 100 : 0;
  const accentColor = `hsl(${(index * 137.5) % 360}, 50%, 40%)`;

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
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <Ionicons
                name="film-outline"
                size={24}
                color={accentColor}
              />
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
              <Ionicons name="trash-outline" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>

          <View style={styles.statsContainer}>
            <View style={styles.movieCountContainer}>
              <Ionicons name="videocam-outline" size={14} color="#666" />
              <Text style={styles.movieCount}>
                {movieCount} {movieCount === 1 ? "item" : "items"}
              </Text>
            </View>
            
            {watchedCount > 0 && (
              <View style={styles.watchedStats}>
                <Ionicons name="checkmark-circle" size={14} color="#4caf50" />
                <Text style={styles.watchedCount}>
                  {watchedCount} watched
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          {movieCount > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercentage}%`,
                      backgroundColor: progressPercentage === 100 ? '#4caf50' : accentColor,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: accentColor }]}>
                {Math.round(progressPercentage)}%
              </Text>
            </View>
          )}

          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              {progressPercentage === 100 && (
                <View style={styles.completeBadge}>
                  <Ionicons name="trophy" size={12} color="#4caf50" />
                  <Text style={styles.completeText}>Complete</Text>
                </View>
              )}
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
    marginBottom: 12,
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
  watchedStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  watchedCount: {
    fontSize: 12,
    color: "#4caf50",
    fontWeight: "600",
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 2,
    marginRight: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    minWidth: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    minWidth: 32,
    textAlign: "right",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: {
    flex: 1,
  },
  completeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  completeText: {
    fontSize: 11,
    color: "#4caf50",
    fontWeight: "600",
    marginLeft: 4,
    textTransform: "uppercase",
  },
});

export default WatchlistCard;