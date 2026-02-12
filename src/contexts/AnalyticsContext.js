import React, { createContext, useContext, useEffect } from 'react';
import analyticsService from '../services/analytics';
import { API_BASE_URL } from '../services/api';

const AnalyticsContext = createContext(null);

export const AnalyticsProvider = ({ children }) => {
  // Initialize analytics service
  useEffect(() => {
    analyticsService.initialize(API_BASE_URL);
  }, []);

  return (
    <AnalyticsContext.Provider value={analyticsService}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within AnalyticsProvider');
  }
  return context;
};

/**
 * Helper function to get current route name from navigation state
 * Use this with NavigationContainer's onStateChange prop
 */
export const getActiveRouteName = (state) => {
  if (!state || !state.routes || state.routes.length === 0) {
    return null;
  }

  const route = state.routes[state.index];

  if (route.state) {
    // Dive into nested navigators
    return getActiveRouteName(route.state);
  }

  return route.name;
};
