import * as Device from "expo-device";
import * as Application from "expo-application";
import { AppState, Platform } from "react-native";
import axios from "axios";
import logger from "./logger";

// Sentry placeholder - add @sentry/react-native back + its Expo plugin when you have a DSN
let Sentry = null;
let SENTRY_INITIALIZED = false;

const FLUSH_INTERVAL_MS = 30000; // send what has been collected at least every 30 seconds
const FLUSH_AT = 20; // ...or as soon as this many events are waiting
const MAX_QUEUE = 200; // never let the queue grow without limit while offline
const MAX_DETAIL = 64;

/**
 * What is sent to the server: the kind of event plus one short label (which screen, which
 * action). Nothing personal leaves the phone through analytics: no user id, search text,
 * titles, or error stacks.
 */
const toWireEvent = (event) => {
  const d = event.data || {};
  const raw = d.action || d.screen_name || d.metric || d.content_type;
  const detail =
    typeof raw === "string" && /^[A-Za-z0-9_.:-]+$/.test(raw) ? raw.slice(0, MAX_DETAIL) : undefined;
  return { type: event.type, detail, timestamp: event.timestamp };
};

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
    this.flushTimer = null;
    this.appStateSub = null;
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

    // Without these, events only left the phone after 20 had piled up, and anything still
    // waiting was lost when the app was closed.
    this.flushTimer = setInterval(() => this.flushEvents(), FLUSH_INTERVAL_MS);
    this.appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") this.flushEvents();
    });

    logger.info("📊 Analytics service initialized");
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

    if (SENTRY_INITIALIZED) {
      Sentry.setContext("device", context.device);
      Sentry.setContext("app", context.app);
    }
  }

  /**
   * Set user information
   */
  setUser(user) {
    this.userId = user?.uid || null;

    if (SENTRY_INITIALIZED && user) {
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

    if (SENTRY_INITIALIZED) {
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
    this.trackEvent("screen_view", {
      screen_name: screenName,
      ...params,
    });

    if (SENTRY_INITIALIZED) {
      Sentry.addBreadcrumb({
        category: "navigation",
        message: `Viewed screen: ${screenName}`,
        level: "info",
        data: params,
      });
    }
  }

  /**
   * Track user action
   */
  trackAction(action, data = {}) {
    this.trackEvent("user_action", {
      action,
      ...data,
    });

    if (SENTRY_INITIALIZED) {
      Sentry.addBreadcrumb({
        category: "action",
        message: action,
        level: "info",
        data,
      });
    }
  }

  /**
   * Track search query
   */
  trackSearch(query, resultsCount = 0) {
    this.trackEvent("search", {
      query,
      results_count: resultsCount,
    });
  }

  /**
   * Track content view
   */
  trackContentView(type, id, title) {
    this.trackEvent("content_view", {
      content_type: type, // 'movie' or 'tv'
      content_id: id,
      content_title: title,
    });
  }

  /**
   * Track watchlist action
   */
  trackWatchlistAction(action, itemId, itemTitle) {
    this.trackEvent("watchlist_action", {
      action, // 'add' or 'remove'
      item_id: itemId,
      item_title: itemTitle,
    });
  }

  /**
   * Track favorite action
   */
  trackFavoriteAction(action, itemId, itemTitle) {
    this.trackEvent("favorite_action", {
      action, // 'add' or 'remove'
      item_id: itemId,
      item_title: itemTitle,
    });
  }

  /**
   * Track error
   */
  trackError(error, context = {}) {
    logger.error("Analytics: Error tracked", error, context);

    if (SENTRY_INITIALIZED) {
      Sentry.captureException(error, {
        contexts: { custom: context },
      });
    }

    this.trackEvent("error", {
      error_message: error.message || String(error),
      error_stack: error.stack,
      ...context,
    });
  }

  /**
   * Track API call
   */
  trackApiCall(endpoint, method, statusCode, duration) {
    this.trackEvent("api_call", {
      endpoint,
      method,
      status_code: statusCode,
      duration_ms: duration,
    });
  }

  /**
   * Track performance metric
   */
  trackPerformance(metric, value, unit = "ms") {
    this.trackEvent("performance", {
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
      logger.warn("Analytics not initialized");
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

    // Add to queue (oldest events are dropped if the phone has been offline for long)
    this.eventQueue.push(event);
    if (this.eventQueue.length > MAX_QUEUE) {
      this.eventQueue.splice(0, this.eventQueue.length - MAX_QUEUE);
    }

    // Flush if queue is large
    if (this.eventQueue.length >= FLUSH_AT) {
      this.flushEvents();
    }

    logger.info("📊 Event tracked:", eventType, data);
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
        .post(
          `${this.apiBaseUrl}/analytics/events`,
          { events: eventsToSend.map(toWireEvent) },
          { timeout: 10000 },
        )
        .catch((err) => {
          // Silently fail - analytics shouldn't break the app
          logger.warn("Failed to send analytics events:", err.message);
        });
    } catch (error) {
      logger.warn("Failed to flush analytics:", error.message);
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
export { Sentry, SENTRY_INITIALIZED };
