// components/SearchInput.js
import React from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
          backgroundColor:
            theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
          borderColor: isFocused
            ? theme === "dark"
              ? "rgba(255,255,255,0.2)"
              : "rgba(0,0,0,0.15)"
            : "transparent",
        },
      ]}
    >
      <Ionicons
        name="search"
        size={18}
        color={theme === "dark" ? "#888" : "#666"}
        style={styles.searchIcon}
      />
      <TextInput
        placeholder="Search movies, series, actors..."
        value={query}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        placeholderTextColor={theme === "dark" ? "#666" : "#999"}
        style={[styles.input, { color: colors.text }]}
        autoCorrect={false}
        autoCapitalize="none"
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={onClear} style={styles.clearButton}>
          <Ionicons
            name="close-circle"
            size={18}
            color={theme === "dark" ? "#666" : "#999"}
          />
        </TouchableOpacity>
      )}

      {isLoading && (
        <ActivityIndicator
          size="small"
          color={theme === "dark" ? "#888" : "#666"}
          style={styles.loader}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  loader: {
    marginLeft: 8,
  },
});

export default SearchInput;
