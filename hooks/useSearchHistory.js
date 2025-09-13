import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState([]);
  const searchHistoryRef = useRef([]);

  // Initialize search history
  useEffect(() => {
    const initializeHistory = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem("searchHistory");
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
    if (!searchTerm || searchTerm.length < 2) return;
    
    const currentHistory = searchHistoryRef.current;
    if (currentHistory[0] === searchTerm) return;
    
    const newHistory = [
      searchTerm,
      ...currentHistory.filter(item => item !== searchTerm)
    ].slice(0, 20);
    
    searchHistoryRef.current = newHistory;
    setSearchHistory(newHistory);
    await AsyncStorage.setItem("searchHistory", JSON.stringify(newHistory));
  }, []);

  // Delete history item
  const deleteHistoryItem = useCallback(async (itemToDelete) => {
    const newHistory = searchHistoryRef.current.filter(
      item => item !== itemToDelete
    );
    searchHistoryRef.current = newHistory;
    setSearchHistory(newHistory);
    await AsyncStorage.setItem("searchHistory", JSON.stringify(newHistory));
  }, []);

  // Clear all history
  const clearAllHistory = useCallback(async () => {
    searchHistoryRef.current = [];
    setSearchHistory([]);
    await AsyncStorage.removeItem("searchHistory");
  }, []);

  return {
    searchHistory,
    saveToHistory,
    deleteHistoryItem,
    clearAllHistory,
  };
};

export default useSearchHistory;