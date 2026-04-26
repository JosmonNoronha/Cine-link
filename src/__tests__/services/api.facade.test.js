jest.mock("axios", () => ({
  create: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("../../../firebaseConfig", () => ({
  auth: {
    currentUser: null,
  },
}));

describe("api facade contract", () => {
  let axios;
  let mockClient;

  beforeEach(() => {
    jest.resetModules();
    axios = require("axios");

    mockClient = {
      post: jest.fn(),
      get: jest.fn(),
      request: jest.fn(),
      put: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    axios.create.mockReturnValue(mockClient);
  });

  it("exposes the expected public exports", () => {
    const api = require("../../services/api");

    const expectedFunctionExports = [
      "searchMovies",
      "getMovieDetails",
      "getSeasonDetails",
      "getEpisodeDetails",
      "getRecommendations",
      "getBatchMovieDetails",
      "addToFavorites",
      "addToWatchlist",
      "createWatchlist",
      "deleteWatchlist",
      "getFavorites",
      "getUserProfile",
      "getWatchlists",
      "removeFromFavorites",
      "removeFromWatchlist",
      "toggleWatchedStatus",
      "getBackendStatus",
      "retestBackendConnection",
      "getNewReleases",
      "getPopular",
      "getPopularSearches",
      "getSearchSuggestions",
      "getTopRated",
      "getTrending",
      "getTrendingKeywords",
      "getTrendingMovies",
      "searchByGenre",
      "extractYouTubeTrailer",
      "getMovieReviews",
      "getMovieVideos",
      "getMovieWatchProviders",
      "getSeasonVideos",
      "getTVReviews",
      "getTVVideos",
      "getTVWatchProviders",
      "getWatchProviders",
      "getGamificationData",
      "getUserSubscriptions",
      "getWatchedEpisodes",
      "recordGamificationListCompleted",
      "recordGamificationListCreated",
      "recordGamificationWatch",
      "setEpisodeWatched",
      "syncGamificationData",
      "updateUserSubscriptions",
    ];

    expectedFunctionExports.forEach((name) => {
      expect(api[name]).toBeDefined();
      expect(typeof api[name]).toBe("function");
    });

    expect(typeof api.API_BASE_URL).toBe("string");
    expect(api.API_BASE_URL.length).toBeGreaterThan(0);

    expect(api.default).toBeDefined();
    expect(typeof api.default.searchMovies).toBe("function");
    expect(typeof api.default.getTrendingMovies).toBe("function");
    expect(typeof api.default.getMovieDetails).toBe("function");
  });
});
