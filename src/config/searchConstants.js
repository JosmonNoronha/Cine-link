/**
 * Search Configuration Constants
 * Centralized configuration for search functionality
 */

// API Rate Limiting
export const API_RATE_LIMIT = {
  MAX_CALLS_PER_DAY: 900,
  RESET_INTERVAL_MS: 24 * 60 * 60 * 1000, // 24 hours
};

// Cache Configuration
export const CACHE_CONFIG = {
  MAX_CACHE_SIZE: 1500,
  STORAGE_KEY: "movieCache",
  API_LIMIT_KEY: "apiLimit",
};

// Search Configuration
export const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  PAGE_SIZE: 10,
  MAX_LOCAL_RESULTS: 100,
};

// Fuse.js Configuration for Main Search
export const FUSE_SEARCH_OPTIONS = {
  keys: [
    { name: "Title", weight: 0.7 },
    { name: "Year", weight: 0.15 },
    { name: "Genre", weight: 0.15 },
  ],
  includeScore: true,
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

// Fuse.js Configuration for Suggestions
export const FUSE_SUGGESTION_OPTIONS = {
  keys: [
    { name: "Title", weight: 0.85 },
    { name: "Year", weight: 0.15 },
  ],
  includeScore: true,
  threshold: 0.5, // Reduced from 0.6 for better relevance
  ignoreLocation: true,
  minMatchCharLength: 1,
};

// Suggestion Configuration
export const SUGGESTION_CONFIG = {
  DEBOUNCE_MS: 200,
  MAX_SUGGESTIONS: 8,
  MAX_RECENT_SEARCHES: 3,
  MAX_POPULAR_KEYWORDS: 5,
  MAX_EXACT_MATCHES: 2,
  MAX_PARTIAL_MATCHES: 2,
  MAX_MOVIE_MATCHES: 4,
  MAX_POPULAR_MATCHES: 3,
};

// Search History Configuration
export const HISTORY_CONFIG = {
  MAX_HISTORY_SIZE: 20,
  STORAGE_KEY: "searchHistory",
};

// Filter Types
export const FILTER_TYPES = {
  ALL: "all",
  MOVIE: "movie",
  SERIES: "series",
};

// Error Messages
export const ERROR_MESSAGES = {
  EMPTY_QUERY: "Please enter a search term",
  NETWORK_ERROR: "Network error. Please check your connection.",
  API_ERROR: "Search failed. Please try again.",
  RATE_LIMIT: "Daily search limit reached. Please try again tomorrow.",
  TIMEOUT: "Search timed out. Please try again.",
  GENERIC: "Search failed. Please check your connection and try again.",
};

// Timeout Configuration
export const TIMEOUT_CONFIG = {
  API_REQUEST_MS: 30000, // 30 seconds
  ABORT_DELAY_MS: 100, // Delay before aborting to prevent premature cancellation
};
