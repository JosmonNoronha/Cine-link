// hooks/useSuggestions.js
import { useState, useCallback, useMemo, useRef } from 'react';
import debounce from 'lodash.debounce';
import Fuse from 'fuse.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useSuggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const suggestionFuseRef = useRef(null);
  const cacheRef = useRef([]);

  const popularKeywords = useMemo(() => [
    "action movies", "comedy series", "drama films", "thriller movies",
    "horror films", "romantic comedies", "sci-fi series", "adventure movies",
    "fantasy films", "crime series", "mystery movies", "war films",
    "western movies", "animated movies", "documentaries", "superhero movies",
    "marvel movies", "dc comics", "netflix series", "amazon prime",
    "breaking bad", "stranger things", "the office", "game of thrones",
    "friends", "avengers", "batman", "spider-man", "harry potter",
    "star wars", "lord of the rings",
  ], []);

  // Initialize suggestion cache
  const initializeSuggestions = useCallback(async () => {
    try {
      const storedCache = await AsyncStorage.getItem("movieCache");
      if (storedCache) {
        const cache = JSON.parse(storedCache);
        cacheRef.current = cache;
        
        suggestionFuseRef.current = new Fuse(cache, {
          keys: ["Title"],
          includeScore: true,
          threshold: 0.6,
          ignoreLocation: true,
          minMatchCharLength: 1,
        });
      }
    } catch (error) {
      console.warn("Failed to initialize suggestions:", error);
    }
  }, []);

  const generateSuggestions = useMemo(
    () => debounce((input, searchHistory = []) => {
      if (!input || input.length < 1) {
        const recentSearches = searchHistory.slice(0, 3);
        const popularSuggestions = popularKeywords.slice(0, 5);
        const combined = [...recentSearches, ...popularSuggestions];
        const uniqueSuggestions = combined.filter(
          (item, index, self) => self.indexOf(item) === index
        );
        setSuggestions(uniqueSuggestions.slice(0, 8));
        return;
      }

      const inputLower = input.toLowerCase();
      const newSuggestions = [];

      // History matches
      const exactHistoryMatches = searchHistory
        .filter(item => item.toLowerCase().startsWith(inputLower))
        .slice(0, 2);
      newSuggestions.push(...exactHistoryMatches);

      const partialHistoryMatches = searchHistory
        .filter(item => 
          item.toLowerCase().includes(inputLower) && 
          !item.toLowerCase().startsWith(inputLower)
        )
        .slice(0, 2);
      newSuggestions.push(...partialHistoryMatches);

      // Cache suggestions
      if (suggestionFuseRef.current) {
        const titleSuggestions = suggestionFuseRef.current
          .search(input, { limit: 4 })
          .map(({ item }) => item.Title)
          .filter(title => !newSuggestions.includes(title));
        newSuggestions.push(...titleSuggestions);
      }

      // Popular keyword matches
      const keywordMatches = popularKeywords
        .filter(keyword => keyword.toLowerCase().includes(inputLower))
        .slice(0, 3)
        .filter(keyword => !newSuggestions.includes(keyword));
      newSuggestions.push(...keywordMatches);

      const uniqueSuggestions = newSuggestions.filter(
        (suggestion, index, self) => self.indexOf(suggestion) === index
      );
      setSuggestions(uniqueSuggestions.slice(0, 8));
    }, 200),
    [popularKeywords]
  );

  return {
    suggestions,
    generateSuggestions,
    initializeSuggestions,
  };
};

export default useSuggestions;