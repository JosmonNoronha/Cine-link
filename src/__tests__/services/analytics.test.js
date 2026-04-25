jest.mock("expo-device", () => ({
  brand: "Google",
  manufacturer: "Google",
  modelName: "Pixel",
  osName: "Android",
  osVersion: "14",
  isDevice: true,
}));

jest.mock("expo-application", () => ({
  nativeApplicationVersion: "1.0.0",
  nativeBuildVersion: "100",
  applicationId: "com.cinelink.app",
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("axios", () => ({
  post: jest.fn(),
}));

jest.mock("../../services/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe("analytics service", () => {
  let analyticsService;
  let axios;
  let logger;

  const loadService = async () => {
    jest.resetModules();
    axios = require("axios");
    logger = require("../../services/logger").default;
    analyticsService = require("../../services/analytics").default;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await loadService();
  });

  it("initializes once and logs startup", async () => {
    await analyticsService.initialize("https://api.example.com");
    await analyticsService.initialize("https://other.example.com");

    expect(analyticsService.isInitialized).toBe(true);
    expect(analyticsService.apiBaseUrl).toBe("https://api.example.com");
    expect(analyticsService.sessionId).toBeTruthy();
    expect(logger.info).toHaveBeenCalledWith(
      "📊 Analytics service initialized",
    );
  });

  it("warns when tracking before initialize", () => {
    analyticsService.trackEvent("search", { query: "inception" });

    expect(logger.warn).toHaveBeenCalledWith("Analytics not initialized");
    expect(analyticsService.eventQueue).toHaveLength(0);
  });

  it("queues tracked events after initialize", async () => {
    await analyticsService.initialize("https://api.example.com");

    analyticsService.trackSearch("inception", 3);

    expect(analyticsService.eventQueue).toHaveLength(1);
    expect(analyticsService.eventQueue[0]).toEqual(
      expect.objectContaining({
        type: "search",
        platform: "ios",
        data: { query: "inception", results_count: 3 },
      }),
    );
    expect(logger.info).toHaveBeenCalledWith("📊 Event tracked:", "search", {
      query: "inception",
      results_count: 3,
    });
  });

  it("flushes queued events to backend", async () => {
    axios.post.mockResolvedValue({ status: 202 });
    await analyticsService.initialize("https://api.example.com");
    analyticsService.trackAction("open_details", { id: "tt0133093" });

    await analyticsService.flushEvents();

    expect(axios.post).toHaveBeenCalledWith(
      "https://api.example.com/analytics/events",
      expect.objectContaining({
        events: expect.arrayContaining([
          expect.objectContaining({
            type: "user_action",
          }),
        ]),
      }),
    );
    expect(analyticsService.eventQueue).toHaveLength(0);
  });

  it("logs warning when backend rejects flushed events", async () => {
    axios.post.mockReturnValue(Promise.reject(new Error("network down")));
    await analyticsService.initialize("https://api.example.com");
    analyticsService.trackContentView("movie", "tt1375666", "Inception");

    await analyticsService.flushEvents();
    await Promise.resolve();

    expect(logger.warn).toHaveBeenCalledWith(
      "Failed to send analytics events:",
      "network down",
    );
  });
});
