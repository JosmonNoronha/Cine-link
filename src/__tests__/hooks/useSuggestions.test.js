import { renderHook, act, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useSuggestions from "../../hooks/useSuggestions";
import { CACHE_CONFIG, SUGGESTION_CONFIG } from "../../config/searchConstants";
import {
  getPopularSearches,
  getSearchSuggestions,
  getTrendingKeywords,
} from "../../services/api";

jest.mock("../../services/api", () => ({
  getPopularSearches: jest.fn(),
  getSearchSuggestions: jest.fn(),
  getTrendingKeywords: jest.fn(),
}));

describe("useSuggestions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
    getPopularSearches.mockResolvedValue([]);
    getTrendingKeywords.mockResolvedValue(["action movies", "drama films"]);
    getSearchSuggestions.mockResolvedValue(["backend suggestion"]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("loads trending keywords from cached storage when fresh", async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === "popularSearchKeywords") {
        return Promise.resolve(JSON.stringify(["cached keyword"]));
      }
      if (key === "popularSearchKeywordsTime") {
        return Promise.resolve(String(Date.now()));
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useSuggestions());

    await waitFor(() => {
      expect(result.current.trendingKeywords).toEqual(["cached keyword"]);
    });
    expect(getPopularSearches).not.toHaveBeenCalled();
    expect(getTrendingKeywords).not.toHaveBeenCalled();
  });

  it("falls back to backend popular keywords and persists them", async () => {
    getPopularSearches.mockResolvedValue(["popular one", "popular two"]);

    const { result } = renderHook(() => useSuggestions());

    await waitFor(() => {
      expect(result.current.trendingKeywords).toEqual([
        "popular one",
        "popular two",
      ]);
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "popularSearchKeywords",
      JSON.stringify(["popular one", "popular two"]),
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "popularSearchKeywordsTime",
      expect.any(String),
    );
  });

  it("initializes cached Fuse search data", async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === CACHE_CONFIG.STORAGE_KEY) {
        return Promise.resolve(JSON.stringify([{ Title: "Inception" }]));
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useSuggestions());

    await act(async () => {
      await result.current.initializeSuggestions();
    });

    expect(result.current.generateSuggestions).toBeDefined();
  });

  it("combines local history, cache, and backend results after debounce", async () => {
    AsyncStorage.getItem.mockImplementation((key) => {
      if (key === CACHE_CONFIG.STORAGE_KEY) {
        return Promise.resolve(JSON.stringify([{ Title: "Inception" }]));
      }
      return Promise.resolve(null);
    });

    const { result } = renderHook(() => useSuggestions());

    await act(async () => {
      await result.current.initializeSuggestions();
    });

    act(() => {
      result.current.generateSuggestions("in", ["interstellar"]);
      jest.advanceTimersByTime(SUGGESTION_CONFIG.DEBOUNCE_MS);
    });

    await waitFor(() => {
      expect(getSearchSuggestions).toHaveBeenCalledWith(
        "in",
        SUGGESTION_CONFIG.MAX_SUGGESTIONS,
      );
    });

    expect(result.current.suggestions).toEqual(
      expect.arrayContaining([
        "interstellar",
        "Inception",
        "backend suggestion",
      ]),
    );
  });
});
