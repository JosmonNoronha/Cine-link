// components/SearchFilters.js
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";

const SearchFilters = ({ filterType, onFilterChange, colors, theme }) => {
  const filters = [
    { key: "all", label: "All" },
    { key: "movie", label: "Movies" },
    { key: "series", label: "Series" },
  ];

  return (
    <View style={styles.filterContainer}>
      {filters.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.filterButton,
            {
              backgroundColor:
                filterType === key
                  ? theme === "dark"
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(0,0,0,0.08)"
                  : "transparent",
            },
          ]}
          onPress={() => onFilterChange(key)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterText,
              {
                color: colors.text,
                opacity: filterType === key ? 1 : 0.5,
              },
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 18,
    alignItems: "center",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
  },
});

export default SearchFilters;
