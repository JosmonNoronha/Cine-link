import { useState, useCallback, useRef, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HISTORY_CONFIG, SEARCH_CONFIG } from "../config/searchConstants";

const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState([]);
  const searchHistoryRef = useRef([]);

  // Initialize search history
  useEffect(() => {
    const initializeHistory = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem(
          HISTORY_CONFIG.STORAGE_KEY,
        );
        if (storedHistory) {
          const history = JSON.parse(storedHistory);
          searchHistoryRef.current = history;
          setSearchHistory(history);
        }
      } catch (error) {
        console.warn("Failed to initialize search history:", error);
      }
    };

    initializeHistory();
  }, []);

  // Save to history
  const saveToHistory = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < SEARCH_CONFIG.MIN_QUERY_LENGTH)
      return;

    const currentHistory = searchHistoryRef.current;
    if (currentHistory[0] === searchTerm) return;

    const newHistory = [
      searchTerm,
      ...currentHistory.filter((item) => item !== searchTerm),
    ].slice(0, HISTORY_CONFIG.MAX_HISTORY_SIZE);

    searchHistoryRef.current = newHistory;
    setSearchHistory(newHistory);
    await AsyncStorage.setItem(
      HISTORY_CONFIG.STORAGE_KEY,
      JSON.stringify(newHistory),
    );
  }, []);

  // Delete history item
  const deleteHistoryItem = useCallback(async (itemToDelete) => {
    const newHistory = searchHistoryRef.current.filter(
      (item) => item !== itemToDelete,
    );
    searchHistoryRef.current = newHistory;
    setSearchHistory(newHistory);
    await AsyncStorage.setItem(
      HISTORY_CONFIG.STORAGE_KEY,
      JSON.stringify(newHistory),
    );
  }, []);

  // Clear all history
  const clearAllHistory = useCallback(async () => {
    searchHistoryRef.current = [];
    setSearchHistory([]);
    await AsyncStorage.removeItem(HISTORY_CONFIG.STORAGE_KEY);
  }, []);

  return {
    searchHistory,
    saveToHistory,
    deleteHistoryItem,
    clearAllHistory,
  };
};

export default useSearchHistory;
