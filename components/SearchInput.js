// components/SearchInput.js
import React from 'react';
import { View, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchInput = ({
  query,
  onChangeText,
  onFocus,
  onBlur,
  onSubmit,
  onClear,
  isLoading,
  isFocused,
  theme,
  colors,
}) => {
  return (
    <View
      style={[
        styles.inputContainer,
        {
          backgroundColor: theme === "dark" ? "#2a2a2a" : "#ffffff",
          borderColor: isFocused
            ? (theme === "dark" ? "#1e88e5" : "#1976d2")
            : (theme === "dark" ? "#444" : "#ddd"),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isFocused ? 0.25 : 0.1,
          shadowRadius: 4,
          elevation: isFocused ? 6 : 2,
        },
      ]}
    >
      <Ionicons
        name="search"
        size={20}
        color={theme === "dark" ? "#888" : "#666"}
        style={styles.searchIcon}
      />
      <TextInput
        placeholder="Type to see suggestions, then select or hit search..."
        value={query}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        placeholderTextColor={theme === "dark" ? "#888" : "#999"}
        style={[styles.input, { color: colors.text }]}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <Ionicons
            name="close-circle"
            size={20}
            color={theme === "dark" ? "#888" : "#757575"}
          />
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        onPress={onSubmit}
        style={[
          styles.searchButton,
          { backgroundColor: theme === "dark" ? "#1e88e5" : "#1976d2" }
        ]}
        disabled={!query.trim()}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="search" size={18} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SearchInput;