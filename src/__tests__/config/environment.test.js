const {
  getEnvironmentConfig,
  validateEnvironment,
} = require("../../config/environment");

describe("Frontend Environment Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Set required vars for all tests
    process.env.FIREBASE_API_KEY = "test-api-key";
    process.env.FIREBASE_PROJECT_ID = "test-project-id";
    process.env.TMDB_API_KEY = "test-tmdb-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validateEnvironment", () => {
    it("passes when all required variables are present", () => {
      expect(() => validateEnvironment()).not.toThrow();
    });

    it("fails when FIREBASE_API_KEY is missing", () => {
      delete process.env.FIREBASE_API_KEY;

      expect(() => validateEnvironment()).toThrow(
        "Missing required environment variables",
      );
    });

    it("fails when FIREBASE_PROJECT_ID is missing", () => {
      delete process.env.FIREBASE_PROJECT_ID;

      expect(() => validateEnvironment()).toThrow(
        "Missing required environment variables",
      );
    });

    it("fails when TMDB_API_KEY is missing", () => {
      delete process.env.TMDB_API_KEY;

      expect(() => validateEnvironment()).toThrow(
        "Missing required environment variables",
      );
    });

    it("includes missing variables in error details", () => {
      delete process.env.FIREBASE_API_KEY;
      delete process.env.TMDB_API_KEY;

      try {
        validateEnvironment();
        fail("Should have thrown");
      } catch (error) {
        expect(error.missingVariables).toContain("FIREBASE_API_KEY");
        expect(error.missingVariables).toContain("TMDB_API_KEY");
      }
    });
  });

  describe("getEnvironmentConfig", () => {
    it("returns configuration object with required fields", () => {
      const config = getEnvironmentConfig();

      expect(config).toHaveProperty("firebaseApiKey", "test-api-key");
      expect(config).toHaveProperty("firebaseProjectId", "test-project-id");
      expect(config).toHaveProperty("tmdbApiKey", "test-tmdb-key");
    });

    it("includes optional Firebase fields when provided", () => {
      process.env.FIREBASE_APP_ID = "test-app-id";
      process.env.FIREBASE_MESSAGING_SENDER_ID = "test-sender-id";

      const config = getEnvironmentConfig();

      expect(config.firebaseAppId).toBe("test-app-id");
      expect(config.firebaseMessagingSenderId).toBe("test-sender-id");
    });

    it("sets firebaseAppId to undefined when not provided", () => {
      const config = getEnvironmentConfig();

      expect(config.firebaseAppId).toBeUndefined();
    });

    it("includes Sentry DSN when provided", () => {
      process.env.SENTRY_DSN = "https://key@sentry.io/123";

      const config = getEnvironmentConfig();

      expect(config.sentryDsn).toBe("https://key@sentry.io/123");
    });

    it("enables analytics by default", () => {
      const config = getEnvironmentConfig();

      expect(config.analyticsEnabled).toBe(true);
    });

    it("disables analytics when ANALYTICS_ENABLED=false", () => {
      process.env.ANALYTICS_ENABLED = "false";

      const config = getEnvironmentConfig();

      expect(config.analyticsEnabled).toBe(false);
    });

    it("enables debug mode when DEBUG_MODE=true", () => {
      process.env.DEBUG_MODE = "true";

      const config = getEnvironmentConfig();

      expect(config.debugMode).toBe(true);
    });

    it("disables debug mode by default", () => {
      const config = getEnvironmentConfig();

      expect(config.debugMode).toBe(false);
    });

    it("uses NODE_ENV from environment", () => {
      process.env.NODE_ENV = "production";

      const config = getEnvironmentConfig();

      expect(config.nodeEnv).toBe("production");
    });

    it("defaults NODE_ENV to development", () => {
      delete process.env.NODE_ENV;

      const config = getEnvironmentConfig();

      expect(config.nodeEnv).toBe("development");
    });

    it("includes Firebase emulator when provided", () => {
      process.env.FIREBASE_EMULATOR_HOST = "localhost:9099";

      const config = getEnvironmentConfig();

      expect(config.firebaseEmulatorHost).toBe("localhost:9099");
    });
  });

  describe("production validation", () => {
    it("warns when Firebase emulator is enabled in production", () => {
      process.env.NODE_ENV = "production";
      process.env.FIREBASE_EMULATOR_HOST = "localhost:9099";

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      try {
        getEnvironmentConfig();
        expect(consoleSpy).toHaveBeenCalled();
        expect(consoleSpy.mock.calls[0][0]).toEqual(
          expect.objectContaining({
            level: "warn",
            message: "Production environment warnings",
          }),
        );
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it("warns when debug mode is enabled in production", () => {
      process.env.NODE_ENV = "production";
      process.env.DEBUG_MODE = "true";

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      try {
        getEnvironmentConfig();
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        consoleSpy.mockRestore();
      }
    });

    it("does not warn when settings are correct in production", () => {
      process.env.NODE_ENV = "production";
      delete process.env.FIREBASE_EMULATOR_HOST;
      process.env.DEBUG_MODE = "false";

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      try {
        getEnvironmentConfig();
        // Should not warn about production settings
        const calls = consoleSpy.mock.calls.filter(
          (call) => call[0]?.message === "Production environment warnings",
        );
        expect(calls.length).toBe(0);
      } finally {
        consoleSpy.mockRestore();
      }
    });
  });

  describe("error handling", () => {
    it("throws EnvironmentValidationError for missing variables", () => {
      delete process.env.FIREBASE_API_KEY;

      try {
        getEnvironmentConfig();
        fail("Should have thrown");
      } catch (error) {
        expect(error.name).toBe("EnvironmentValidationError");
      }
    });

    it("provides helpful error message", () => {
      delete process.env.FIREBASE_API_KEY;

      try {
        getEnvironmentConfig();
        fail("Should have thrown");
      } catch (error) {
        expect(error.message).toContain(".env file");
      }
    });
  });
});
