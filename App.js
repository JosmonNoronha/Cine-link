import React, { useRef } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import RootNavigator from "./src/navigation/AppNavigator";
import { ThemeProvider, useCustomTheme } from "./src/contexts/ThemeContext";
import { AnalyticsProvider, getActiveRouteName } from "./src/contexts/AnalyticsContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import analyticsService, { Sentry } from "./src/services/analytics";

const AppContent = () => {
  const { theme } = useCustomTheme();
  const navigationTheme = theme === "dark" ? DarkTheme : DefaultTheme;
  const routeNameRef = useRef();

  const handleNavigationStateChange = (state) => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = getActiveRouteName(state);

    if (previousRouteName !== currentRouteName && currentRouteName) {
      // Track screen view when route changes
      analyticsService.trackScreenView(currentRouteName);
    }

    // Save the current route name for next comparison
    routeNameRef.current = currentRouteName;
  };

  return (
    <NavigationContainer 
      theme={navigationTheme}
      onStateChange={handleNavigationStateChange}
      onReady={() => {
        // Track initial screen
        const state = navigationTheme;
        if (state) {
          routeNameRef.current = getActiveRouteName(state);
        }
      }}
    >
      <RootNavigator />
    </NavigationContainer>
  );
};

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AnalyticsProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </AnalyticsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Wrap with Sentry for error tracking
export default Sentry.wrap(App);
