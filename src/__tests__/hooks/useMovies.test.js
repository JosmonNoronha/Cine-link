import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useMovies } from "../../hooks/useMovies";

jest.mock("../../services/api", () => ({
  __esModule: true,
  default: {
    getTrendingMovies: jest.fn(),
    searchMovies: jest.fn(),
    getMovieDetails: jest.fn(),
  },
}));

import ApiService from "../../services/api";

describe("useMovies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads trending movies on mount", async () => {
    ApiService.getTrendingMovies.mockResolvedValue({
      results: [{ imdbID: "tt1", Title: "Movie 1" }],
    });

    const { result } = renderHook(() => useMovies());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.movies).toHaveLength(1);
      expect(result.current.error).toBe(null);
    });

    expect(ApiService.getTrendingMovies).toHaveBeenCalledTimes(1);
  });

  it("updates error when trending load fails", async () => {
    ApiService.getTrendingMovies.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useMovies());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("network down");
    });
  });

  it("searches movies and refreshes state", async () => {
    ApiService.getTrendingMovies.mockResolvedValue({ results: [] });
    ApiService.searchMovies.mockResolvedValue({
      results: [{ imdbID: "tt2", Title: "Searched" }],
    });

    const { result } = renderHook(() => useMovies());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.searchMovies("search");
    });

    expect(ApiService.searchMovies).toHaveBeenCalledWith("search");
    expect(result.current.movies).toEqual([
      { imdbID: "tt2", Title: "Searched" },
    ]);
    expect(result.current.error).toBe(null);
  });

  it("forwards getMovieDetails and refreshMovies", async () => {
    ApiService.getTrendingMovies.mockResolvedValue({
      results: [{ imdbID: "tt10", Title: "Trending" }],
    });
    ApiService.getMovieDetails.mockResolvedValue({ imdbID: "tt10" });

    const { result } = renderHook(() => useMovies());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      const details = await result.current.getMovieDetails("tt10");
      expect(details).toEqual({ imdbID: "tt10" });
      await result.current.refreshMovies();
    });

    expect(ApiService.getMovieDetails).toHaveBeenCalledWith("tt10");
    expect(ApiService.getTrendingMovies).toHaveBeenCalledTimes(2);
  });
});
