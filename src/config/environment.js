/**
 * Frontend Environment Configuration & Validation
 * Ensures all required environment variables are present at app startup
 */

const logger = require("../services/logger").default;

const requiredVars = [
  "FIREBASE_API_KEY",
  "FIREBASE_PROJECT_ID",
  "TMDB_API_KEY",
];

const defaults = {
  NODE_ENV: "development",
  FIREBASE_EMULATOR_HOST: undefined,
  ANALYTICS_ENABLED: true,
  DEBUG_MODE: false,
};

/**
 * Validate that all required environment variables are present
 */
function validateEnvironment() {
  const missing = [];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    const error = new Error(
      `❌ Missing required environment variables:\n` +
        `   ${missing.join("\n   ")}\n\n` +
        `Create a .env file in the project root with these variables.`,
    );
    error.name = "EnvironmentValidationError";
    error.missingVariables = missing;
    throw error;
  }
}

/**
 * Warn about non-production issues
 */
function validateProductionSettings() {
  if (process.env.NODE_ENV === "production") {
    const warnings = [];

    // Check Firebase emulator is not enabled in production
    if (process.env.FIREBASE_EMULATOR_HOST) {
      warnings.push("⚠️  Firebase emulator is enabled in production");
    }

    // Check debug mode is not enabled in production
    if (process.env.DEBUG_MODE === "true") {
      warnings.push("⚠️  Debug mode is enabled in production");
    }

    // Check analytics is enabled
    if (process.env.ANALYTICS_ENABLED === "false") {
      warnings.push("⚠️  Analytics is disabled in production");
    }

    if (warnings.length > 0) {
      logger.warn("Production environment warnings", warnings.join("\n"));
    }
  }
}

/**
 * Get environment configuration with validation
 */
function getEnvironmentConfig() {
  try {
    validateEnvironment();
    validateProductionSettings();

    return {
      nodeEnv: process.env.NODE_ENV || defaults.NODE_ENV,
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID || undefined,
      firebaseMessagingSenderId:
        process.env.FIREBASE_MESSAGING_SENDER_ID || undefined,
      firebaseEmulatorHost:
        process.env.FIREBASE_EMULATOR_HOST || defaults.FIREBASE_EMULATOR_HOST,
      tmdbApiKey: process.env.TMDB_API_KEY,
      analyticsEnabled: process.env.ANALYTICS_ENABLED !== "false",
      debugMode: process.env.DEBUG_MODE === "true",
      sentryDsn: process.env.SENTRY_DSN || undefined,
    };
  } catch (error) {
    if (error.name === "EnvironmentValidationError") {
      throw error;
    }
    throw new Error(`Failed to validate environment: ${error.message}`);
  }
}

module.exports = {
  getEnvironmentConfig,
  validateEnvironment,
  validateProductionSettings,
};
