import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();
const THEME_STORAGE_KEY = '@app_theme';

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme(); // Get system preference
  const [theme, setTheme] = useState(systemScheme); // Initial state, will be updated from storage

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setTheme(savedTheme);
        } else {
          setTheme(systemScheme); // Fallback to system if no saved theme
        }
      } catch (error) {
        console.error('Failed to load theme:', error);
        setTheme(systemScheme); // Fallback on error
      }
    };

    loadTheme();
  }, [systemScheme]); // Re-run if systemScheme changes (e.g., system theme toggle)

  useEffect(() => {
    const saveTheme = async () => {
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    };

    saveTheme();
  }, [theme]); // Save whenever theme changes

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useCustomTheme = () => useContext(ThemeContext);