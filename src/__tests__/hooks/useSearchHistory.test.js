import { renderHook, act, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useSearchHistory from "../../hooks/useSearchHistory";
import { HISTORY_CONFIG, SEARCH_CONFIG } from "../../config/searchConstants";

describe("useSearchHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue(undefined);
    AsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  it("loads stored history on mount", async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(["batman", "dune"]));

    const { result } = renderHook(() => useSearchHistory());

    await waitFor(() => {
      expect(result.current.searchHistory).toEqual(["batman", "dune"]);
    });
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(
      HISTORY_CONFIG.STORAGE_KEY,
    );
  });

  it("saves unique recent terms and persists them", async () => {
    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      await result.current.saveToHistory("interstellar");
      await result.current.saveToHistory("dune");
      await result.current.saveToHistory("interstellar");
    });

    expect(result.current.searchHistory).toEqual(["interstellar", "dune"]);
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
      HISTORY_CONFIG.STORAGE_KEY,
      JSON.stringify(["interstellar", "dune"]),
    );
  });

  it("ignores searches shorter than the minimum length", async () => {
    const { result } = renderHook(() => useSearchHistory());

    await act(async () => {
      await result.current.saveToHistory("a");
    });

    expect(result.current.searchHistory).toEqual([]);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(SEARCH_CONFIG.MIN_QUERY_LENGTH).toBeGreaterThan(1);
  });

  it("deletes and clears stored history", async () => {
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(["batman", "dune"]));

    const { result } = renderHook(() => useSearchHistory());

    await waitFor(() => {
      expect(result.current.searchHistory).toEqual(["batman", "dune"]);
    });

    await act(async () => {
      await result.current.deleteHistoryItem("batman");
      await result.current.clearAllHistory();
    });

    expect(result.current.searchHistory).toEqual([]);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      HISTORY_CONFIG.STORAGE_KEY,
    );
  });
});
