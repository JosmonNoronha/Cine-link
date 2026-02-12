import { useState, useEffect } from 'react';
import analyticsService from '../services/analytics';

/**
 * Hook for tracking user actions
 */
export const useAnalytics = () => {
  return {
    trackAction: (action, data) => analyticsService.trackAction(action, data),
    trackSearch: (query, resultsCount) => analyticsService.trackSearch(query, resultsCount),
    trackContentView: (type, id, title) => analyticsService.trackContentView(type, id, title),
    trackWatchlistAction: (action, itemId, itemTitle) =>
      analyticsService.trackWatchlistAction(action, itemId, itemTitle),
    trackFavoriteAction: (action, itemId, itemTitle) =>
      analyticsService.trackFavoriteAction(action, itemId, itemTitle),
    trackError: (error, context) => analyticsService.trackError(error, context),
  };
};

/**
 * Hook for tracking screen performance
 */
export const usePerformanceMonitor = (screenName) => {
  const [loadTime, setLoadTime] = useState(null);

  useEffect(() => {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      setLoadTime(duration);
      analyticsService.trackPerformance(`${screenName}_load_time`, duration);
    };
  }, [screenName]);

  return loadTime;
};

/**
 * Hook for tracking component mount/unmount
 */
export const useComponentTracking = (componentName) => {
  useEffect(() => {
    analyticsService.trackAction('component_mounted', { component: componentName });

    return () => {
      analyticsService.trackAction('component_unmounted', { component: componentName });
    };
  }, [componentName]);
};

/**
 * Hook for tracking API calls
 */
export const useApiTracking = () => {
  const trackApiCall = (endpoint, method, statusCode, duration) => {
    analyticsService.trackApiCall(endpoint, method, statusCode, duration);
  };

  return { trackApiCall };
};
