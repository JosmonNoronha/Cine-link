// components/SearchFilters.js
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const SearchFilters = ({ filterType, onFilterChange, colors, theme }) => {
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'movie', label: 'Movies' },
    { key: 'series', label: 'Series' },
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
                  ? (theme === "dark" ? "#1e88e5" : "#1976d2")
                  : colors.card,
            },
            filterType === key && styles.activeFilter,
          ]}
          onPress={() => onFilterChange(key)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.filterText,
              { color: filterType === key ? "#fff" : colors.text },
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
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
    elevation: 2,
  },
  activeFilter: {
    elevation: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default SearchFilters;