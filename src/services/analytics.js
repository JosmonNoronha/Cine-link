import * as Sentry from '@sentry/react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import axios from 'axios';

// Initialize Sentry
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

if (SENTRY_DSN && !__DEV__) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableNative: true,
    enableNativeCrashHandling: true,
    attachStacktrace: true,
    enableAutoPerformanceTracing: true,
  });
}

/**
 * Analytics Service for tracking user behavior and app performance
 */
class AnalyticsService {
  constructor() {
    this.isInitialized = false;
    this.userId = null;
    this.sessionId = null;
    this.eventQueue = [];
    this.apiBaseUrl = null;
  }

  /**
   * Initialize the analytics service
   */
  async initialize(apiBaseUrl) {
    if (this.isInitialized) return;

    this.apiBaseUrl = apiBaseUrl;
    this.sessionId = this.generateSessionId();
    this.isInitialized = true;

    // Set device context
    this.setDeviceContext();

    console.log('📊 Analytics service initialized');
  }

  /**
   * Set device context for better debugging
   */
  setDeviceContext() {
    const context = {
      device: {
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        platform: Platform.OS,
        isDevice: Device.isDevice,
      },
      app: {
        version: Application.nativeApplicationVersion,
        buildNumber: Application.nativeBuildVersion,
        bundleId: Application.applicationId,
      },
    };

    if (SENTRY_DSN) {
      Sentry.setContext('device', context.device);
      Sentry.setContext('app', context.app);
    }
  }

  /**
   * Set user information
   */
  setUser(user) {
    this.userId = user?.uid || null;

    if (SENTRY_DSN && user) {
      Sentry.setUser({
        id: user.uid,
        email: user.email,
      });
    }
  }

  /**
   * Clear user information on logout
   */
  clearUser() {
    this.userId = null;

    if (SENTRY_DSN) {
      Sentry.setUser(null);
    }
  }

  /**
   * Generate a session ID
   */
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track screen view
   */
  trackScreenView(screenName, params = {}) {
    this.trackEvent('screen_view', {
      screen_name: screenName,
      ...params,
    });

    if (SENTRY_DSN) {
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: `Viewed screen: ${screenName}`,
        level: 'info',
        data: params,
      });
    }
  }

  /**
   * Track user action
   */
  trackAction(action, data = {}) {
    this.trackEvent('user_action', {
      action,
      ...data,
    });

    if (SENTRY_DSN) {
      Sentry.addBreadcrumb({
        category: 'action',
        message: action,
        level: 'info',
        data,
      });
    }
  }

  /**
   * Track search query
   */
  trackSearch(query, resultsCount = 0) {
    this.trackEvent('search', {
      query,
      results_count: resultsCount,
    });
  }

  /**
   * Track content view
   */
  trackContentView(type, id, title) {
    this.trackEvent('content_view', {
      content_type: type, // 'movie' or 'tv'
      content_id: id,
      content_title: title,
    });
  }

  /**
   * Track watchlist action
   */
  trackWatchlistAction(action, itemId, itemTitle) {
    this.trackEvent('watchlist_action', {
      action, // 'add' or 'remove'
      item_id: itemId,
      item_title: itemTitle,
    });
  }

  /**
   * Track favorite action
   */
  trackFavoriteAction(action, itemId, itemTitle) {
    this.trackEvent('favorite_action', {
      action, // 'add' or 'remove'
      item_id: itemId,
      item_title: itemTitle,
    });
  }

  /**
   * Track error
   */
  trackError(error, context = {}) {
    console.error('Analytics: Error tracked', error, context);

    if (SENTRY_DSN) {
      Sentry.captureException(error, {
        contexts: { custom: context },
      });
    }

    this.trackEvent('error', {
      error_message: error.message || String(error),
      error_stack: error.stack,
      ...context,
    });
  }

  /**
   * Track API call
   */
  trackApiCall(endpoint, method, statusCode, duration) {
    this.trackEvent('api_call', {
      endpoint,
      method,
      status_code: statusCode,
      duration_ms: duration,
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric, value, unit = 'ms') {
    this.trackEvent('performance', {
      metric,
      value,
      unit,
    });
  }

  /**
   * Track generic event
   */
  trackEvent(eventType, data = {}) {
    if (!this.isInitialized) {
      console.warn('Analytics not initialized');
      return;
    }

    const event = {
      type: eventType,
      timestamp: Date.now(),
      session_id: this.sessionId,
      user_id: this.userId,
      data,
      platform: Platform.OS,
    };

    // Add to queue
    this.eventQueue.push(event);

    // Flush if queue is large
    if (this.eventQueue.length >= 20) {
      this.flushEvents();
    }

    console.log('📊 Event tracked:', eventType, data);
  }

  /**
   * Flush events to backend (fire and forget)
   */
  async flushEvents() {
    if (this.eventQueue.length === 0 || !this.apiBaseUrl) {
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Fire and forget - don't wait for response
      axios
        .post(`${this.apiBaseUrl}/analytics/events`, {
          events: eventsToSend,
        })
        .catch((err) => {
          // Silently fail - analytics shouldn't break the app
          console.warn('Failed to send analytics events:', err.message);
        });
    } catch (error) {
      console.warn('Failed to flush analytics:', error.message);
    }
  }

  /**
   * Start timing an operation
   */
  startTimer(name) {
    return {
      name,
      startTime: Date.now(),
      end: () => {
        const duration = Date.now() - this.startTime;
        this.trackPerformance(name, duration);
        return duration;
      },
    };
  }
}

// Singleton instance
const analyticsService = new AnalyticsService();

export default analyticsService;

// Export Sentry for manual error reporting if needed
export { Sentry };
