import { renderHook } from "@testing-library/react-native";
import { useUserProfile } from "../../hooks/useUserProfile";

jest.mock("../../contexts/FavoritesContext", () => ({
  useFavorites: jest.fn(),
}));

import { useFavorites } from "../../contexts/FavoritesContext";

describe("useUserProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns new-user profile when favorites are empty", () => {
    useFavorites.mockReturnValue({ favorites: [] });

    const { result } = renderHook(() => useUserProfile({}));

    expect(result.current.isNewUser).toBe(true);
    expect(result.current.engagementLevel).toBe("new");
    expect(result.current.watchProgress).toEqual({
      total: 0,
      watched: 0,
      unwatched: 0,
      completionRate: 0,
    });
  });

  it("derives content preference, engagement, genres and progress", () => {
    const favorites = [
      {
        imdbID: "tt1",
        Title: "Action Hero",
        Genre: "Action, Adventure",
        Type: "movie",
        Year: String(new Date().getFullYear()),
        imdbRating: "8.3",
      },
      {
        imdbID: "tt2",
        Title: "Comedy Night",
        Genre: "Comedy",
        Type: "movie",
        Year: String(new Date().getFullYear() - 1),
        imdbRating: "7.8",
      },
      {
        imdbID: "tt3",
        Title: "Crime Files",
        Genre: "Crime, Mystery",
        Type: "series",
        Year: String(new Date().getFullYear() - 2),
        imdbRating: "8.1",
      },
      {
        imdbID: "tt4",
        Title: "Drama Classic",
        Genre: "Drama",
        Type: "movie",
        Year: String(new Date().getFullYear() - 10),
        imdbRating: "6.8",
      },
      {
        imdbID: "tt5",
        Title: "Sci-Fi Saga",
        Genre: "Science Fiction",
        Type: "movie",
        Year: String(new Date().getFullYear()),
        imdbRating: "7.9",
      },
    ];

    const watchlists = {
      Main: [
        { imdbID: "ttA", watched: true },
        { imdbID: "ttB", watched: false },
      ],
      Weekend: [{ imdbID: "ttC", watched: false }],
    };

    useFavorites.mockReturnValue({ favorites });
    jest.spyOn(Math, "random").mockReturnValue(0);

    const { result } = renderHook(() => useUserProfile(watchlists));

    expect(result.current.isNewUser).toBe(false);
    expect(result.current.hasWatchlists).toBe(true);
    expect(result.current.contentPreference).toBe("movies");
    expect(result.current.preferHighRated).toBe(true);
    expect(result.current.likesNewReleases).toBe(true);
    expect(result.current.engagementLevel).toBe("medium");
    expect(result.current.topGenres.length).toBeGreaterThan(0);
    expect(result.current.randomFavorite).toEqual(favorites[0]);
    expect(result.current.watchProgress).toEqual({
      total: 3,
      watched: 1,
      unwatched: 2,
      completionRate: 33,
    });

    Math.random.mockRestore();
  });
});
