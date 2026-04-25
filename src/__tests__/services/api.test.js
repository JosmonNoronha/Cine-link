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

describe("api searchMovies", () => {
  let axios;
  let mockClient;
  let auth;

  const loadApi = () => {
    jest.resetModules();
    axios = require("axios");
    auth = require("../../../firebaseConfig").auth;

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

    return require("../../services/api");
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty OMDb-like response for blank query", async () => {
    const { searchMovies } = loadApi();

    const result = await searchMovies("   ");

    expect(result).toEqual({
      Search: [],
      totalResults: "0",
      Response: "False",
    });
    expect(mockClient.post).not.toHaveBeenCalled();
  });

  it("uses unified backend search when available", async () => {
    const { searchMovies } = loadApi();

    mockClient.post.mockResolvedValue({
      Search: [{ imdbID: "tt001", Title: "Movie 1" }],
      totalResults: "1",
      Response: "True",
    });

    const result = await searchMovies("movie", "all", 1);

    expect(mockClient.post).toHaveBeenCalledWith(
      "/search",
      {
        query: "movie",
        type: "all",
        page: 1,
        filters: {},
      },
      { signal: null },
    );
    expect(result.Search).toHaveLength(1);
    expect(result.Response).toBe("True");
  });

  it("falls back to legacy search if unified search fails", async () => {
    const { searchMovies } = loadApi();

    mockClient.post.mockRejectedValue(new Error("unified failed"));
    mockClient.get.mockResolvedValue({
      Search: [{ imdbID: "tt002", Title: "Fallback" }],
      totalResults: "1",
      Response: "True",
    });

    const result = await searchMovies("fallback", "movie", 2);

    expect(mockClient.get).toHaveBeenCalledWith("/movies/search", {
      params: { q: "fallback", type: "movie", page: 2 },
      signal: null,
    });
    expect(result.Search[0].Title).toBe("Fallback");
  });

  it("throws a user-facing error when both search paths fail", async () => {
    const { searchMovies } = loadApi();

    mockClient.post.mockRejectedValue(new Error("unified failed"));
    mockClient.get.mockRejectedValue(new Error("legacy failed"));

    await expect(searchMovies("broken")).rejects.toThrow(
      "Backend search unavailable. Please try again.",
    );
  });

  it("rethrows aborted requests without fallback", async () => {
    const { searchMovies } = loadApi();

    const abortError = new Error("aborted");
    abortError.name = "AbortError";

    mockClient.post.mockRejectedValue(abortError);

    await expect(searchMovies("query")).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(mockClient.get).not.toHaveBeenCalled();
  });

  it("returns normalized defaults when unified response has no Search", async () => {
    const { searchMovies } = loadApi();
    mockClient.post.mockResolvedValue({ foo: "bar" });

    const result = await searchMovies("query");

    expect(result).toEqual({
      Search: [],
      totalResults: "0",
      Response: "False",
    });
  });

  it("passes cursor to unified search when provided", async () => {
    const { searchMovies } = loadApi();
    mockClient.post.mockResolvedValue({
      Search: [{ imdbID: "tt123" }],
      totalResults: "1",
      Response: "True",
    });

    await searchMovies("query", "all", 1, null, "cursor-1");

    expect(mockClient.post).toHaveBeenCalledWith(
      "/search",
      expect.objectContaining({ cursor: "cursor-1" }),
      { signal: null },
    );
  });

  it("falls back to false response when legacy fallback has no Search", async () => {
    const { searchMovies } = loadApi();
    mockClient.post.mockRejectedValue(new Error("unified failed"));
    mockClient.get.mockResolvedValue({ foo: "bar" });

    await expect(searchMovies("query")).rejects.toThrow(
      "Backend search unavailable. Please try again.",
    );
  });

  it("returns recommendations on success and empty list on failure", async () => {
    const { getRecommendations } = loadApi();
    mockClient.post.mockResolvedValueOnce({
      recommendations: ["Movie A", "Movie B"],
    });
    mockClient.post.mockRejectedValueOnce(new Error("boom"));

    await expect(getRecommendations("inception")).resolves.toEqual([
      "Movie A",
      "Movie B",
    ]);
    await expect(getRecommendations("inception")).resolves.toEqual([]);
  });

  it("maps popular searches and filters empty values", async () => {
    const { getPopularSearches } = loadApi();
    mockClient.get.mockResolvedValue({
      searches: [{ query: "inception" }, { query: "" }, {}, { query: "dune" }],
    });

    const result = await getPopularSearches(5);

    expect(mockClient.get).toHaveBeenCalledWith("/analytics/popular-searches", {
      params: { limit: 5 },
    });
    expect(result).toEqual(["inception", "dune"]);
  });

  it("returns empty popular searches list on failure", async () => {
    const { getPopularSearches } = loadApi();
    mockClient.get.mockRejectedValue(new Error("analytics down"));

    await expect(getPopularSearches()).resolves.toEqual([]);
  });

  it("returns search suggestions and defaults to empty list", async () => {
    const { getSearchSuggestions } = loadApi();
    mockClient.get.mockResolvedValueOnce({ suggestions: ["interstellar"] });
    mockClient.get.mockResolvedValueOnce({});

    await expect(getSearchSuggestions("in", 3)).resolves.toEqual([
      "interstellar",
    ]);
    await expect(getSearchSuggestions("in", 3)).resolves.toEqual([]);
  });

  it("returns top rated/trending/popular arrays across payload shapes", async () => {
    const {
      getTopRated,
      getTrending,
      getPopular,
      getNewReleases,
      getTrendingMovies,
    } = loadApi();

    mockClient.get
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce({ results: [{ id: 2 }] })
      .mockResolvedValueOnce({ results: [{ id: 3 }] })
      .mockResolvedValueOnce([{ id: 4 }])
      .mockResolvedValueOnce({ results: [{ id: 5 }] });

    await expect(getTopRated()).resolves.toEqual([{ id: 1 }]);
    await expect(getTrending("movie", "week")).resolves.toEqual([{ id: 2 }]);
    await expect(getPopular(2)).resolves.toEqual([{ id: 3 }]);
    await expect(getNewReleases("tv")).resolves.toEqual([{ id: 4 }]);
    await expect(getTrendingMovies()).resolves.toEqual([{ id: 5 }]);
  });

  it("searches by genre and omits explicit type for 'all'", async () => {
    const { searchByGenre } = loadApi();
    mockClient.get.mockResolvedValue({ Search: [{ imdbID: "tt001" }] });

    const result = await searchByGenre("action", "all");

    expect(mockClient.get).toHaveBeenCalledWith("/search/by-genre", {
      params: { genre: "action", type: undefined, page: 1 },
    });
    expect(result).toEqual([{ imdbID: "tt001" }]);
  });

  it("extracts trailer with priority and returns null for invalid payload", () => {
    const { extractYouTubeTrailer } = loadApi();

    expect(extractYouTubeTrailer(null)).toBeNull();

    const key = extractYouTubeTrailer({
      results: [
        { site: "YouTube", type: "Clip", official: true, key: "clip-key" },
        {
          site: "YouTube",
          type: "Trailer",
          official: true,
          key: "trailer-key",
        },
      ],
    });
    expect(key).toBe("trailer-key");
  });

  it("gets watch providers via tmdb typed id and legacy imdb flow", async () => {
    const { getWatchProviders } = loadApi();

    mockClient.get
      .mockResolvedValueOnce({ results: { US: {} } })
      .mockResolvedValueOnce({ Type: "series", imdbID: "tmdb:tv:99" })
      .mockResolvedValueOnce({ results: { US: { flatrate: [] } } });

    const tmdbResult = await getWatchProviders("tmdb:movie:321");
    const legacyResult = await getWatchProviders("tt9999999");

    expect(mockClient.get).toHaveBeenCalledWith("/movies/321/watch-providers");
    expect(mockClient.get).toHaveBeenCalledWith("/movies/details/tt9999999");
    expect(mockClient.get).toHaveBeenCalledWith("/tv/99/watch-providers");
    expect(tmdbResult).toEqual({ results: { US: {} } });
    expect(legacyResult).toEqual({ results: { US: { flatrate: [] } } });
  });

  it("returns empty watch providers on parse failures", async () => {
    const { getWatchProviders } = loadApi();
    mockClient.get.mockResolvedValue({ Type: "movie", imdbID: "tt1234567" });

    await expect(getWatchProviders("tt1234567")).resolves.toEqual({
      results: {},
    });
  });

  it("uses auth token for subscription fetch and handles unauthenticated user", async () => {
    const { getUserSubscriptions } = loadApi();

    auth.currentUser = {
      getIdToken: jest.fn().mockResolvedValue("token-1"),
    };
    mockClient.get.mockResolvedValueOnce({ subscriptions: ["netflix"] });

    await expect(getUserSubscriptions()).resolves.toEqual(["netflix"]);

    auth.currentUser = null;
    await expect(getUserSubscriptions()).resolves.toEqual([]);
  });

  it("updates subscriptions and throws when not authenticated", async () => {
    const { updateUserSubscriptions } = loadApi();

    auth.currentUser = {
      getIdToken: jest.fn().mockResolvedValue("token-1"),
    };
    mockClient.put.mockResolvedValue({ ok: true });

    await expect(updateUserSubscriptions(["prime"])).resolves.toEqual({
      ok: true,
    });
    expect(mockClient.put).toHaveBeenCalledWith(
      "/user/subscriptions",
      { subscriptions: ["prime"] },
      { headers: { Authorization: "Bearer token-1" } },
    );

    auth.currentUser = null;
    await expect(updateUserSubscriptions(["prime"])).rejects.toThrow(
      "Not authenticated",
    );
  });

  it("returns null gamification state when unauthenticated or failing", async () => {
    const { getGamificationData } = loadApi();

    auth.currentUser = null;
    await expect(getGamificationData()).resolves.toBeNull();

    auth.currentUser = {
      getIdToken: jest.fn().mockResolvedValue("token-2"),
    };
    mockClient.get.mockRejectedValue(new Error("down"));
    await expect(getGamificationData()).resolves.toBeNull();
  });

  it("posts gamification actions with idempotency headers", async () => {
    const {
      recordGamificationWatch,
      recordGamificationListCreated,
      recordGamificationListCompleted,
    } = loadApi();

    mockClient.post
      .mockResolvedValueOnce({ ok: "watch" })
      .mockResolvedValueOnce({ ok: "create" })
      .mockResolvedValueOnce({ ok: "complete" });

    await expect(recordGamificationWatch("tt1", "My List")).resolves.toEqual({
      ok: "watch",
    });
    await expect(recordGamificationListCreated("My List")).resolves.toEqual({
      ok: "create",
    });
    await expect(recordGamificationListCompleted("My List")).resolves.toEqual({
      ok: "complete",
    });

    expect(mockClient.post).toHaveBeenNthCalledWith(
      1,
      "/user/gamification/actions/watch",
      { movieId: "tt1", listName: "My List" },
      {
        headers: {
          "X-Idempotency-Key": expect.stringMatching(/^watch-/),
        },
      },
    );
    expect(mockClient.post).toHaveBeenNthCalledWith(
      2,
      "/user/gamification/actions/list-created",
      { listName: "My List" },
      {
        headers: {
          "X-Idempotency-Key": expect.stringMatching(/^list-created-/),
        },
      },
    );
    expect(mockClient.post).toHaveBeenNthCalledWith(
      3,
      "/user/gamification/actions/list-completed",
      { listName: "My List" },
      {
        headers: {
          "X-Idempotency-Key": expect.stringMatching(/^list-completed-/),
        },
      },
    );
  });

  it("returns watched episodes and defaults safely", async () => {
    const { getWatchedEpisodes, setEpisodeWatched } = loadApi();

    mockClient.get.mockResolvedValueOnce({ episodes: { 1: { 1: true } } });
    mockClient.get.mockRejectedValueOnce(new Error("down"));
    mockClient.patch.mockResolvedValueOnce({ episodes: { 2: { 3: true } } });

    await expect(getWatchedEpisodes("tmdb:tv:77")).resolves.toEqual({
      1: { 1: true },
    });
    await expect(getWatchedEpisodes("tmdb:tv:77")).resolves.toEqual({});
    await expect(setEpisodeWatched("tmdb:tv:77", 2, 3, true)).resolves.toEqual({
      2: { 3: true },
    });
  });

  it("normalizes ApiService.searchMovies and wraps trending movies", async () => {
    const api = loadApi();

    mockClient.post.mockResolvedValueOnce({
      Search: [{ imdbID: "tt10" }],
      totalResults: "1",
      Response: "True",
      meta: { cursor: "a" },
    });
    mockClient.get.mockResolvedValueOnce({ results: [{ id: 9 }] });

    await expect(api.default.searchMovies("x")).resolves.toEqual({
      results: [{ imdbID: "tt10" }],
      totalResults: 1,
      meta: { cursor: "a" },
    });
    await expect(api.default.getTrendingMovies()).resolves.toEqual({
      results: [{ id: 9 }],
    });
  });

  it("handles favorites CRUD success paths", async () => {
    const { addToFavorites, getFavorites, removeFromFavorites } = loadApi();
    const movie = { imdbID: "tt007", Title: "Bond" };

    mockClient.post.mockResolvedValueOnce({ ok: true });
    mockClient.get.mockResolvedValueOnce([movie]);
    mockClient.delete.mockResolvedValueOnce({ removed: true });

    await expect(addToFavorites(movie)).resolves.toEqual({ ok: true });
    await expect(getFavorites()).resolves.toEqual([movie]);
    await expect(removeFromFavorites("tt007")).resolves.toEqual({
      removed: true,
    });

    expect(mockClient.post).toHaveBeenCalledWith("/user/favorites", { movie });
    expect(mockClient.get).toHaveBeenCalledWith("/user/favorites");
    expect(mockClient.delete).toHaveBeenCalledWith("/user/favorites/tt007");
  });

  it("rethrows favorites errors", async () => {
    const { addToFavorites, getFavorites, removeFromFavorites } = loadApi();

    mockClient.post.mockRejectedValueOnce(new Error("add fail"));
    mockClient.get.mockRejectedValueOnce(new Error("list fail"));
    mockClient.delete.mockRejectedValueOnce(new Error("remove fail"));

    await expect(addToFavorites({ imdbID: "tt1" })).rejects.toThrow("add fail");
    await expect(getFavorites()).rejects.toThrow("list fail");
    await expect(removeFromFavorites("tt1")).rejects.toThrow("remove fail");
  });

  it("handles watchlist CRUD success paths with encoding", async () => {
    const {
      getWatchlists,
      createWatchlist,
      deleteWatchlist,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatchedStatus,
    } = loadApi();

    mockClient.get.mockResolvedValueOnce([{ name: "Sci Fi" }]);
    mockClient.post
      .mockResolvedValueOnce({ created: true })
      .mockResolvedValueOnce({ added: true });
    mockClient.delete
      .mockResolvedValueOnce({ removed: true })
      .mockResolvedValueOnce({ deleted: true });
    mockClient.patch.mockResolvedValueOnce({ toggled: true });

    await expect(getWatchlists()).resolves.toEqual([{ name: "Sci Fi" }]);
    await expect(createWatchlist("Sci Fi")).resolves.toEqual({ created: true });
    await expect(addToWatchlist("Sci Fi", { imdbID: "tt10" })).resolves.toEqual(
      {
        added: true,
      },
    );
    await expect(removeFromWatchlist("Sci Fi", "tt10")).resolves.toEqual({
      removed: true,
    });
    await expect(toggleWatchedStatus("Sci Fi", "tt10")).resolves.toEqual({
      toggled: true,
    });
    await expect(deleteWatchlist("Sci Fi")).resolves.toEqual({ deleted: true });

    expect(mockClient.post).toHaveBeenCalledWith("/user/watchlists", {
      name: "Sci Fi",
    });
    expect(mockClient.post).toHaveBeenCalledWith(
      "/user/watchlists/Sci%20Fi/movies",
      { movie: { imdbID: "tt10" } },
    );
    expect(mockClient.patch).toHaveBeenCalledWith(
      "/user/watchlists/Sci%20Fi/movies/tt10/watched",
    );
    expect(mockClient.delete).toHaveBeenCalledWith(
      "/user/watchlists/Sci%20Fi/movies/tt10",
    );
    expect(mockClient.delete).toHaveBeenCalledWith("/user/watchlists/Sci%20Fi");
  });

  it("rethrows watchlist errors", async () => {
    const {
      getWatchlists,
      createWatchlist,
      deleteWatchlist,
      addToWatchlist,
      removeFromWatchlist,
      toggleWatchedStatus,
    } = loadApi();

    mockClient.get.mockRejectedValueOnce(new Error("watchlists fail"));
    mockClient.post
      .mockRejectedValueOnce(new Error("create fail"))
      .mockRejectedValueOnce(new Error("add fail"));
    mockClient.delete
      .mockRejectedValueOnce(new Error("delete fail"))
      .mockRejectedValueOnce(new Error("remove fail"));
    mockClient.patch.mockRejectedValueOnce(new Error("toggle fail"));

    await expect(getWatchlists()).rejects.toThrow("watchlists fail");
    await expect(createWatchlist("A")).rejects.toThrow("create fail");
    await expect(addToWatchlist("A", { imdbID: "tt1" })).rejects.toThrow(
      "add fail",
    );
    await expect(deleteWatchlist("A")).rejects.toThrow("delete fail");
    await expect(removeFromWatchlist("A", "tt1")).rejects.toThrow(
      "remove fail",
    );
    await expect(toggleWatchedStatus("A", "tt1")).rejects.toThrow(
      "toggle fail",
    );
  });

  it("returns trending keywords and handles failures", async () => {
    const { getTrendingKeywords } = loadApi();
    mockClient.get.mockResolvedValueOnce({ keywords: ["dune", "silo"] });
    mockClient.get.mockRejectedValueOnce(new Error("keywords fail"));

    await expect(getTrendingKeywords()).resolves.toEqual(["dune", "silo"]);
    await expect(getTrendingKeywords()).resolves.toEqual([]);
  });

  it("handles video endpoints success and rethrows on errors", async () => {
    const { getMovieVideos, getTVVideos, getSeasonVideos } = loadApi();

    mockClient.get
      .mockResolvedValueOnce({ results: [{ key: "mv" }] })
      .mockResolvedValueOnce({ results: [{ key: "tv" }] })
      .mockResolvedValueOnce({ results: [{ key: "s1" }] })
      .mockRejectedValueOnce(new Error("movie videos fail"))
      .mockRejectedValueOnce(new Error("tv videos fail"))
      .mockRejectedValueOnce(new Error("season videos fail"));

    await expect(getMovieVideos(10)).resolves.toEqual({
      results: [{ key: "mv" }],
    });
    await expect(getTVVideos(20)).resolves.toEqual({
      results: [{ key: "tv" }],
    });
    await expect(getSeasonVideos(20, 1)).resolves.toEqual({
      results: [{ key: "s1" }],
    });
    await expect(getMovieVideos(10)).rejects.toThrow("movie videos fail");
    await expect(getTVVideos(20)).rejects.toThrow("tv videos fail");
    await expect(getSeasonVideos(20, 1)).rejects.toThrow("season videos fail");
  });

  it("handles watch providers and reviews fallback shapes", async () => {
    const {
      getMovieWatchProviders,
      getTVWatchProviders,
      getMovieReviews,
      getTVReviews,
    } = loadApi();

    mockClient.get
      .mockResolvedValueOnce({ results: { US: { flatrate: [] } } })
      .mockResolvedValueOnce({ results: { US: { ads: [] } } })
      .mockResolvedValueOnce({ results: [{ id: "r1" }], total_results: 1 })
      .mockResolvedValueOnce({ results: [{ id: "r2" }], total_results: 1 })
      .mockRejectedValueOnce(new Error("movie providers fail"))
      .mockRejectedValueOnce(new Error("tv providers fail"))
      .mockRejectedValueOnce(new Error("movie reviews fail"))
      .mockRejectedValueOnce(new Error("tv reviews fail"));

    await expect(getMovieWatchProviders(1)).resolves.toEqual({
      results: { US: { flatrate: [] } },
    });
    await expect(getTVWatchProviders(2)).resolves.toEqual({
      results: { US: { ads: [] } },
    });
    await expect(getMovieReviews(3)).resolves.toEqual({
      results: [{ id: "r1" }],
      total_results: 1,
    });
    await expect(getTVReviews(4)).resolves.toEqual({
      results: [{ id: "r2" }],
      total_results: 1,
    });

    await expect(getMovieWatchProviders(1)).resolves.toEqual({ results: {} });
    await expect(getTVWatchProviders(2)).resolves.toEqual({ results: {} });
    await expect(getMovieReviews(3)).resolves.toEqual({
      results: [],
      total_results: 0,
    });
    await expect(getTVReviews(4)).resolves.toEqual({
      results: [],
      total_results: 0,
    });
  });

  it("handles backend status helpers and user profile wrapper", async () => {
    const { getBackendStatus, retestBackendConnection, getUserProfile } =
      loadApi();
    mockClient.get
      .mockResolvedValueOnce({ uid: "u1" })
      .mockRejectedValueOnce(new Error("profile fail"));

    await expect(getUserProfile()).resolves.toEqual({ uid: "u1" });
    await expect(getUserProfile()).rejects.toThrow("profile fail");

    const before = getBackendStatus();
    expect(before).toEqual(
      expect.objectContaining({
        tested: true,
        available: expect.any(Boolean),
      }),
    );

    await expect(retestBackendConnection()).resolves.toBe(true);
    const after = getBackendStatus();
    expect(after).toEqual(
      expect.objectContaining({
        tested: true,
        available: true,
      }),
    );
  });
});
