import { renderHook, act, waitFor } from "@testing-library/react-native";
import useSearchLogic from "../../hooks/useSearchLogic";
import {
  API_RATE_LIMIT,
  CACHE_CONFIG,
  ERROR_MESSAGES,
} from "../../config/searchConstants";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("../../services/api", () => ({
  searchMovies: jest.fn(),
}));

import { searchMovies } from "../../services/api";

describe("useSearchLogic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it("returns validation error for too-short query", async () => {
    const { result } = renderHook(() => useSearchLogic());

    await act(async () => {
      await result.current.performSearch("a", "all", 1);
    });

    expect(result.current.error).toBe(ERROR_MESSAGES.EMPTY_QUERY);
    expect(searchMovies).not.toHaveBeenCalled();
  });

  it("sets search results from API response", async () => {
    searchMovies.mockResolvedValue({
      Search: [{ imdbID: "tt123", Title: "Batman", Poster: "N/A" }],
      totalResults: "1",
      Response: "True",
      meta: {},
    });

    const { result } = renderHook(() => useSearchLogic());

    await act(async () => {
      await result.current.performSearch("batman", "all", 1);
    });

    await waitFor(() => {
      expect(result.current.results).toHaveLength(1);
    });
    expect(result.current.results[0].Poster).toContain("placeholder");
    expect(result.current.totalResults).toBe(1);
    expect(result.current.error).toBe(null);
  });

  it("clears state with clearSearch", async () => {
    searchMovies.mockResolvedValue({
      Search: [{ imdbID: "tt999", Title: "Test Movie", Poster: "N/A" }],
      totalResults: "1",
      Response: "True",
      meta: {},
    });

    const { result } = renderHook(() => useSearchLogic());

    await act(async () => {
      await result.current.performSearch("test", "all", 1);
    });

    await waitFor(() => {
      expect(result.current.results.length).toBe(1);
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBe(null);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalResults).toBe(0);
  });

  it("uses local cache first and skips API when enough cached results exist", async () => {
    const cached = Array.from({ length: 24 }, (_, i) => ({
      imdbID: `ttlocal${i}`,
      Title: `Batman ${i}`,
      Type: "movie",
      Poster: "N/A",
    }));

    AsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify(cached))
      .mockResolvedValueOnce(null);

    const { result } = renderHook(() => useSearchLogic());

    await act(async () => {
      await result.current.initializeCache();
    });

    await act(async () => {
      await result.current.performSearch("batman", "all", 1);
    });

    await waitFor(() => {
      expect(result.current.results.length).toBeGreaterThan(0);
    });

    expect(result.current.totalResults).toBe(24);
    expect(result.current.hasMorePages).toBe(true);
    expect(searchMovies).not.toHaveBeenCalled();
  });

  it("sets rate-limit error when API cannot be called and no local results", async () => {
    const limitState = {
      calls: API_RATE_LIMIT.MAX_CALLS_PER_DAY,
      resetTime: Date.now() + 60_000,
    };

    AsyncStorage.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(limitState));

    const { result } = renderHook(() => useSearchLogic());

    await act(async () => {
      await result.current.initializeCache();
    });

    await act(async () => {
      await result.current.performSearch("interstellar", "all", 1);
    });

    expect(result.current.error).toBe(ERROR_MESSAGES.RATE_LIMIT);
    expect(result.current.results).toEqual([]);
    expect(searchMovies).not.toHaveBeenCalled();
  });

  it("classifies timeout and network failures", async () => {
    const { result } = renderHook(() => useSearchLogic());

    searchMovies.mockRejectedValueOnce(new Error("request timeout"));

    await act(async () => {
      await result.current.performSearch("timeout-query", "all", 1);
    });
    expect(result.current.error).toBe(ERROR_MESSAGES.TIMEOUT);

    searchMovies.mockRejectedValueOnce(new Error("Network request failed"));

    await act(async () => {
      await result.current.performSearch("network-query", "all", 1);
    });
    expect(result.current.error).toBe(ERROR_MESSAGES.NETWORK_ERROR);
  });

  it("uses API cursor metadata when loading more results", async () => {
    searchMovies
      .mockResolvedValueOnce({
        Search: [{ imdbID: "tt1", Title: "Page1", Poster: "N/A" }],
        totalResults: "30",
        Response: "True",
        meta: {
          nextCursor: "cursor-2",
          hasMore: true,
          isTotalExact: true,
          sources: { backend: { totalPages: 3 } },
        },
      })
      .mockResolvedValueOnce({
        Search: [{ imdbID: "tt2", Title: "Page2", Poster: "N/A" }],
        totalResults: "30",
        Response: "True",
        meta: {
          nextCursor: null,
          hasMore: false,
          isTotalExact: true,
          sources: { backend: { totalPages: 3 } },
        },
      });

    const { result } = renderHook(() => useSearchLogic());

    await act(async () => {
      await result.current.performSearch("dune", "all", 1);
    });

    await waitFor(() => {
      expect(result.current.hasMorePages).toBe(true);
    });

    await act(async () => {
      result.current.loadMoreResults();
    });

    await waitFor(() => {
      expect(result.current.results.map((r) => r.imdbID)).toEqual([
        "tt1",
        "tt2",
      ]);
    });

    expect(searchMovies).toHaveBeenNthCalledWith(
      1,
      "dune",
      "all",
      1,
      expect.anything(),
      null,
    );
    expect(searchMovies).toHaveBeenNthCalledWith(
      2,
      "dune",
      "all",
      2,
      expect.anything(),
      "cursor-2",
    );
  });

  it("skips local genre cache matches and calls API", async () => {
    const cached = [
      { imdbID: "tta", Title: "Action Hero", Type: "movie", Poster: "N/A" },
    ];
    AsyncStorage.getItem
      .mockResolvedValueOnce(JSON.stringify(cached))
      .mockResolvedValueOnce(null);

    searchMovies.mockResolvedValue({
      Search: [{ imdbID: "ttapi", Title: "API Action", Poster: "N/A" }],
      totalResults: "1",
      Response: "True",
      meta: {},
    });

    const { result } = renderHook(() => useSearchLogic());

    await act(async () => {
      await result.current.initializeCache();
    });

    await act(async () => {
      await result.current.performSearch("action", "all", 1);
    });

    expect(searchMovies).toHaveBeenCalled();
    expect(result.current.results[0].imdbID).toBe("ttapi");
  });

  it("loads cached API call count during cache initialization", async () => {
    const limitState = {
      calls: 42,
      resetTime: Date.now() + 60_000,
    };

    AsyncStorage.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(limitState));

    const { result } = renderHook(() => useSearchLogic());

    await act(async () => {
      await result.current.initializeCache();
    });

    expect(result.current.apiCallCount).toBe(42);
  });

  it("resets expired API limit window during initialization", async () => {
    const expired = {
      calls: 200,
      resetTime: Date.now() - 1_000,
    };

    AsyncStorage.getItem
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(expired));

    const { result } = renderHook(() => useSearchLogic());

    await act(async () => {
      await result.current.initializeCache();
    });

    expect(result.current.apiCallCount).toBe(0);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      CACHE_CONFIG.API_LIMIT_KEY,
      expect.any(String),
    );
  });
});
