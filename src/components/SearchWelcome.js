// components/SearchWelcome.js
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const SearchChip = ({ item, onPress, onDelete, showDelete, colors, theme }) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor:
            theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
        },
      ]}
      onPress={() => onPress(item)}
      onLongPress={showDelete ? () => onDelete(item) : undefined}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
        {item}
      </Text>
    </TouchableOpacity>
  );
};

const SearchWelcome = ({
  searchHistory,
  popularKeywords,
  onSuggestionPress,
  onDeleteHistory,
  onClearAllHistory,
  colors,
  theme,
}) => {
  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Recent Searches */}
      {searchHistory.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.text, opacity: 0.6 },
              ]}
            >
              Recent
            </Text>
            <TouchableOpacity onPress={onClearAllHistory} activeOpacity={0.7}>
              <Text
                style={[styles.clearText, { color: colors.text, opacity: 0.5 }]}
              >
                Clear
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipContainer}>
            {searchHistory.slice(0, 6).map((item, index) => (
              <SearchChip
                key={`history-${index}`}
                item={item}
                onPress={onSuggestionPress}
                onDelete={onDeleteHistory}
                showDelete={true}
                colors={colors}
                theme={theme}
              />
            ))}
          </View>
        </View>
      )}

      {/* Trending */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text
            style={[styles.sectionTitle, { color: colors.text, opacity: 0.6 }]}
          >
            Trending
          </Text>
        </View>
        <View style={styles.chipContainer}>
          {popularKeywords.slice(0, 12).map((item, index) => (
            <SearchChip
              key={`trending-${index}`}
              item={item}
              onPress={onSuggestionPress}
              onDelete={() => {}}
              showDelete={false}
              colors={colors}
              theme={theme}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clearText: {
    fontSize: 12,
    fontWeight: "500",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "400",
    maxWidth: 160,
  },
});

export default SearchWelcome;
