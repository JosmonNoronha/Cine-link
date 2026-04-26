/**
 * Lazy-loading utility for React Navigation screens.
 * Defers component loading until needed, showing a loading state.
 * Caches loaded components to avoid re-imports.
 */

import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";

const componentCache = new Map();

/**
 * Create a lazy-loaded screen component.
 * Wraps dynamic imports to show loading state and cache the component.
 *
 * @param {Function} importFn - Dynamic import function (e.g., () => import('./Screen'))
 * @returns {React.Component} Screen component with built-in loading state
 */
export function createLazyScreen(importFn) {
  const LazyScreenWrapper = (props) => {
    const [Component, setComponent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { colors } = useTheme();

    useEffect(() => {
      let isMounted = true;

      const loadComponent = async () => {
        try {
          // Check cache first
          if (componentCache.has(importFn)) {
            if (isMounted) {
              setComponent(componentCache.get(importFn));
              setIsLoading(false);
            }
            return;
          }

          // Dynamically import the component
          const module = await importFn();
          const ComponentToCache = module.default || module;

          // Cache the component
          componentCache.set(importFn, ComponentToCache);

          if (isMounted) {
            setComponent(ComponentToCache);
            setIsLoading(false);
          }
        } catch (error) {
          console.error("Failed to load component:", error);
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      loadComponent();

      return () => {
        isMounted = false;
      };
    }, []);

    if (isLoading || !Component) {
      return (
        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return <Component {...props} />;
  };

  // Set display name for debugging
  LazyScreenWrapper.displayName = "LazyScreen";

  return LazyScreenWrapper;
}

/**
 * Lazy-load a screen using getComponent pattern for React Navigation.
 * This approach is more efficient than wrapping the entire screen.
 *
 * @param {Function} importFn - Dynamic import function
 * @returns {Object} React Navigation screen configuration with lazy-loaded component
 */
export function lazyScreen(importFn) {
  return {
    getComponent: () => createLazyScreen(importFn),
  };
}

/**
 * Get a lazy-loaded component that is cached.
 * Use this for non-critical screens that can load asynchronously.
 *
 * @param {Function} importFn - Dynamic import function
 * @returns {React.Component} Cached lazy-loaded component
 */
export function getLazyComponent(importFn) {
  return createLazyScreen(importFn);
}

/**
 * Preload a component into the cache without rendering it.
 * Useful for preloading screens the user might navigate to.
 *
 * @param {Function} importFn - Dynamic import function
 */
export async function preloadComponent(importFn) {
  if (componentCache.has(importFn)) {
    return; // Already cached
  }

  try {
    const module = await importFn();
    const Component = module.default || module;
    componentCache.set(importFn, Component);
  } catch (error) {
    console.error("Failed to preload component:", error);
  }
}

/**
 * Clear the component cache (for testing or memory cleanup).
 */
export function clearComponentCache() {
  componentCache.clear();
}

/**
 * Get cache size for monitoring.
 *
 * @returns {number} Number of cached components
 */
export function getCacheSize() {
  return componentCache.size;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default {
  createLazyScreen,
  lazyScreen,
  getLazyComponent,
  preloadComponent,
  clearComponentCache,
  getCacheSize,
};
