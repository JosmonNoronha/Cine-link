import React, { useRef, Component } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import RootNavigator from "./src/navigation/AppNavigator";
import { ThemeProvider, useCustomTheme } from "./src/contexts/ThemeContext";
import {
  AnalyticsProvider,
  getActiveRouteName,
} from "./src/contexts/AnalyticsContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import analyticsService, { Sentry } from "./src/services/analytics";

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("App Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || "Unknown error"}
          </Text>
          <Text style={styles.errorHint}>
            Please restart the app or check your internet connection.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AnalyticsProvider>
            <ThemeProvider>
              <AppContent />
            </ThemeProvider>
          </AnalyticsProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#e74c3c",
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  errorHint: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});

// Only wrap with Sentry if it's initialized and available
let ExportedApp = App;
if (!__DEV__ && Sentry && typeof Sentry.wrap === "function") {
  try {
    ExportedApp = Sentry.wrap(App);
  } catch (e) {
    console.warn("Sentry wrap failed:", e);
  }
}

export default ExportedApp;
