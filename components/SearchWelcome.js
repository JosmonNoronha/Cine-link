// components/SearchWelcome.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchChip = ({ item, onPress, onDelete, icon, iconColor, showDelete, colors, theme }) => {
  return (
    <View style={styles.chipWrapper}>
      <TouchableOpacity
        style={[styles.chip, { backgroundColor: colors.card }]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={14} color={iconColor} />
        <Text style={[styles.chipText, { color: colors.text }]}>
          {item}
        </Text>
      </TouchableOpacity>
      {showDelete && (
        <TouchableOpacity
          style={styles.chipDelete}
          onPress={() => onDelete(item)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="close-outline"
            size={14}
            color={theme === "dark" ? "#ff6b6b" : "#d32f2f"}
          />
        </TouchableOpacity>
      )}
    </View>
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
    <View style={styles.welcomeContainer}>
      {searchHistory.length > 0 && (
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Searches
            </Text>
            <TouchableOpacity
              onPress={onClearAllHistory}
              style={styles.smallClearButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name="trash-outline"
                size={14}
                color={theme === "dark" ? "#ff6b6b" : "#d32f2f"}
              />
              <Text
                style={[
                  styles.smallClearText,
                  { color: theme === "dark" ? "#ff6b6b" : "#d32f2f" },
                ]}
              >
                Clear
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipContainer}>
            {searchHistory.slice(0, 4).map((item, index) => (
              <SearchChip
                key={index}
                item={item}
                onPress={onSuggestionPress}
                onDelete={onDeleteHistory}
                icon="time-outline"
                iconColor={theme === "dark" ? "#4CAF50" : "#2E7D32"}
                showDelete={true}
                colors={colors}
                theme={theme}
              />
            ))}
          </View>
        </View>
      )}

      <View style={styles.popularSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Popular Searches
        </Text>
        <View style={styles.chipContainer}>
          {popularKeywords.slice(0, 6).map((item, index) => (
            <SearchChip
              key={index}
              item={item}
              onPress={onSuggestionPress}
              onDelete={() => {}}
              icon="trending-up-outline"
              iconColor={theme === "dark" ? "#FF9800" : "#F57C00"}
              showDelete={false}
              colors={colors}
              theme={theme}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  welcomeContainer: {
    alignItems: "center",
    marginTop: 32,
    width: "100%",
  },
  historySection: {
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
  },
  popularSection: {
    width: "100%",
    alignItems: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "left",
  },
  smallClearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  smallClearText: {
    fontSize: 12,
    fontWeight: "500",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 8,
    width: "100%",
  },
  chipWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chipText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
  },
  chipDelete: {
    marginLeft: -8,
    marginRight: 4,
    padding: 4,
    backgroundColor: "transparent",
    borderRadius: 12,
  },
});

export default SearchWelcome;