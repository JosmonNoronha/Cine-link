import React from 'react';
  import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
  import { SafeAreaProvider } from 'react-native-safe-area-context';
  import AppNavigator from './navigation/AppNavigator';
  import { ThemeProvider } from './contexts/ThemeContext';
  import { useCustomTheme } from './contexts/ThemeContext';

  const AppContent = () => {
    const { theme } = useCustomTheme();
    const navigationTheme = theme === 'dark' ? DarkTheme : DefaultTheme;

    return (
      <NavigationContainer theme={navigationTheme}>
        <AppNavigator />
      </NavigationContainer>
    );
  };

  export default function App() {
    return (
      <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
    );
  }