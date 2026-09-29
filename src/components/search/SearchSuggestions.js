// components/SearchSuggestions.js
import React from 'react';
import { View, FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SearchSuggestionItem = ({ 
  item, 
  onPress, 
  onDelete, 
  getSuggestionIcon, 
  colors, 
  theme, 
  isHistoryItem 
}) => {
  const iconInfo = getSuggestionIcon(item);
  
  return (
    <View style={[styles.suggestionItem, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        style={styles.suggestionContent}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={iconInfo.name}
          size={18}
          color={iconInfo.color}
          style={styles.suggestionIcon}
        />
        <Text
          style={[styles.suggestionText, { color: colors.text }]}
          numberOfLines={1}
        >
          {item}
        </Text>
        <Ionicons
          name="chevron-forward-outline"
          size={16}
          color={theme === "dark" ? "#666" : "#999"}
          style={styles.suggestionArrow}
        />
      </TouchableOpacity>

      {isHistoryItem && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(item)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="close-outline"
            size={16}
            color={theme === "dark" ? "#ff6b6b" : "#d32f2f"}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const SearchSuggestions = ({
  suggestions,
  onSuggestionPress,
  onDeleteHistory,
  onClearAllHistory,
  getSuggestionIcon,
  searchHistory,
  query,
  colors,
  theme,
  isHistoryItem,
}) => {
  const renderSuggestion = ({ item }) => (
    <SearchSuggestionItem
      item={item}
      onPress={onSuggestionPress}
      onDelete={onDeleteHistory}
      getSuggestionIcon={getSuggestionIcon}
      colors={colors}
      theme={theme}
      isHistoryItem={searchHistory.includes(item)}
    />
  );

  return (
    <View style={[styles.suggestionsContainer, { backgroundColor: colors.card }]}>
      {searchHistory.length > 0 && query.length === 0 && (
        <TouchableOpacity
          style={[
            styles.clearAllSuggestion,
            { borderBottomColor: theme === "dark" ? "#333" : "#eee" },
          ]}
          onPress={onClearAllHistory}
          activeOpacity={0.7}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={theme === "dark" ? "#ff6b6b" : "#d32f2f"}
            style={styles.suggestionIcon}
          />
          <Text
            style={[
              styles.clearAllText,
              { color: theme === "dark" ? "#ff6b6b" : "#d32f2f" },
            ]}
          >
            Clear All History
          </Text>
        </TouchableOpacity>
      )}
      
      <FlatList
        data={suggestions}
        keyExtractor={(item, index) => `suggestion-${index}-${item}`}
        renderItem={renderSuggestion}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        maxToRenderPerBatch={8}
        initialNumToRender={8}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  suggestionsContainer: {
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 280,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  clearAllSuggestion: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  suggestionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 14,
    flex: 1,
  },
  suggestionArrow: {
    opacity: 0.6,
    marginLeft: 8,
  },
  deleteButton: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SearchSuggestions;
