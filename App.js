import React, { useRef, Component } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import RootNavigator from "./src/navigation/AppNavigator";
import { ThemeProvider, useCustomTheme } from "./src/contexts/ThemeContext";
import {
  AnalyticsProvider,
  getActiveRouteName,
} from "./src/contexts/AnalyticsContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import analyticsService, { Sentry } from "./src/services/analytics";
import Constants from "expo-constants";
import * as Updates from "expo-updates";

// Error Boundary Component
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("❌ App Error:", error);
    console.error("Error Info:", errorInfo);

    // Log environment status for debugging
    const extra = Constants?.expoConfig?.extra || {};
    console.log("🔍 Environment Debug:");
    console.log("  Constants available:", !!Constants);
    console.log("  expoConfig available:", !!Constants?.expoConfig);
    console.log("  extra available:", !!extra);
    console.log(
      "  Firebase API Key:",
      extra.FIREBASE_API_KEY ? "✅ Set" : "❌ Missing",
    );
    console.log(
      "  OMDB API Key:",
      extra.OMDB_API_KEY ? "✅ Set" : "❌ Missing",
    );

    this.setState({ errorInfo });
  }

  async handleReload() {
    try {
      // Try to reload the app
      if (Updates.isEnabled) {
        await Updates.reloadAsync();
      } else {
        // For development, just reset the error state
        this.setState({ hasError: false, error: null, errorInfo: null });
      }
    } catch (e) {
      console.error("Reload failed:", e);
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  render() {
    if (this.state.hasError) {
      const extra = Constants?.expoConfig?.extra || {};
      const envStatus = {
        firebase: extra.FIREBASE_API_KEY ? "✅" : "❌",
        omdb: extra.OMDB_API_KEY ? "✅" : "❌",
        api: extra.PRODUCTION_API_URL ? "✅" : "❌",
      };

      return (
        <ScrollView contentContainerStyle={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ App Error</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || "Unknown error occurred"}
          </Text>

          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>Environment Status:</Text>
            <Text style={styles.debugText}>
              Firebase Config: {envStatus.firebase}
            </Text>
            <Text style={styles.debugText}>OMDB API Key: {envStatus.omdb}</Text>
            <Text style={styles.debugText}>API URL: {envStatus.api}</Text>
          </View>

          <TouchableOpacity
            style={styles.reloadButton}
            onPress={this.handleReload}
          >
            <Text style={styles.reloadButtonText}>🔄 Reload App</Text>
          </TouchableOpacity>

          <Text style={styles.errorHint}>
            If the error persists, please check your environment configuration.
          </Text>

          {__DEV__ && this.state.errorInfo && (
            <View style={styles.stackContainer}>
              <Text style={styles.stackTitle}>Stack Trace (Dev Only):</Text>
              <Text style={styles.stackText}>
                {this.state.errorInfo.componentStack}
              </Text>
            </View>
          )}
        </ScrollView>
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
    flexGrow: 1,
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
    marginTop: 20,
  },
  debugContainer: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 8,
    marginVertical: 15,
    width: "100%",
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  debugText: {
    fontSize: 12,
    color: "#555",
    marginVertical: 2,
  },
  reloadButton: {
    backgroundColor: "#3498db",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 10,
  },
  reloadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  stackContainer: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    marginTop: 20,
    width: "100%",
  },
  stackTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  stackText: {
    fontSize: 10,
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
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
