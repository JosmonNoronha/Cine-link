import React from "react";
import { renderHook } from "@testing-library/react-native";
import analyticsService from "../../services/analytics";
import {
  useAnalytics,
  usePerformanceMonitor,
  useComponentTracking,
  useApiTracking,
} from "../../hooks/useAnalytics";

jest.mock("../../services/analytics", () => ({
  __esModule: true,
  default: {
    trackAction: jest.fn(),
    trackSearch: jest.fn(),
    trackContentView: jest.fn(),
    trackWatchlistAction: jest.fn(),
    trackFavoriteAction: jest.fn(),
    trackError: jest.fn(),
    trackPerformance: jest.fn(),
    trackApiCall: jest.fn(),
  },
}));

describe("useAnalytics hook helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forwards track calls to analytics service", () => {
    const { result } = renderHook(() => useAnalytics());

    result.current.trackAction("clicked", { source: "button" });
    result.current.trackSearch("batman", 12);
    result.current.trackContentView("movie", "tt001", "Batman");
    result.current.trackWatchlistAction("add", "tt002", "Movie");
    result.current.trackFavoriteAction("remove", "tt003", "Title");
    const error = new Error("boom");
    result.current.trackError(error, { screen: "home" });

    expect(analyticsService.trackAction).toHaveBeenCalledWith("clicked", {
      source: "button",
    });
    expect(analyticsService.trackSearch).toHaveBeenCalledWith("batman", 12);
    expect(analyticsService.trackContentView).toHaveBeenCalledWith(
      "movie",
      "tt001",
      "Batman",
    );
    expect(analyticsService.trackWatchlistAction).toHaveBeenCalledWith(
      "add",
      "tt002",
      "Movie",
    );
    expect(analyticsService.trackFavoriteAction).toHaveBeenCalledWith(
      "remove",
      "tt003",
      "Title",
    );
    expect(analyticsService.trackError).toHaveBeenCalledWith(error, {
      screen: "home",
    });
  });

  it("records performance and component lifecycle events", () => {
    const { unmount } = renderHook(() => usePerformanceMonitor("search"));
    unmount();

    expect(analyticsService.trackPerformance).toHaveBeenCalledWith(
      "search_load_time",
      expect.any(Number),
    );

    const tracker = renderHook(() => useComponentTracking("SearchScreen"));
    tracker.unmount();

    expect(analyticsService.trackAction).toHaveBeenCalledWith(
      "component_mounted",
      { component: "SearchScreen" },
    );
    expect(analyticsService.trackAction).toHaveBeenCalledWith(
      "component_unmounted",
      { component: "SearchScreen" },
    );
  });

  it("tracks api calls through the adapter hook", () => {
    const { result } = renderHook(() => useApiTracking());

    result.current.trackApiCall("/movies", "GET", 200, 123);

    expect(analyticsService.trackApiCall).toHaveBeenCalledWith(
      "/movies",
      "GET",
      200,
      123,
    );
  });
});
