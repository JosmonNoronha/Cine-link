import { useMemo } from "react";
import { useFavorites } from "../contexts/FavoritesContext";

// Genre mapping - common movie genres
const GENRE_KEYWORDS = {
  action: ["action", "adventure", "thriller"],
  drama: ["drama", "biographical", "historical"],
  comedy: ["comedy", "romantic comedy", "satire"],
  scifi: ["sci-fi", "science fiction", "fantasy"],
  horror: ["horror", "thriller", "suspense"],
  romance: ["romance", "romantic"],
  crime: ["crime", "mystery", "detective"],
  animation: ["animation", "animated"],
};

// Extract genres from movie data
const extractGenres = (movies) => {
  const genreCounts = {};

  movies.forEach((movie) => {
    const text = `${movie.Genre || ""} ${movie.Title || ""}`.toLowerCase();

    Object.entries(GENRE_KEYWORDS).forEach(([genre, keywords]) => {
      if (keywords.some((keyword) => text.includes(keyword))) {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      }
    });
  });

  return Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre);
};

// Count items by type
const countByType = (items, type) => {
  return items.filter((item) => item.Type?.toLowerCase() === type.toLowerCase())
    .length;
};

// Calculate average rating
const calculateAverageRating = (items) => {
  const ratingsSum = items.reduce((sum, item) => {
    const rating = parseFloat(item.imdbRating || item.Rating || 0);
    return sum + (isNaN(rating) ? 0 : rating);
  }, 0);

  return items.length > 0 ? ratingsSum / items.length : 0;
};

// Analyze year distribution
const analyzeYearDistribution = (items) => {
  const currentYear = new Date().getFullYear();
  const recentYears = items.filter((item) => {
    const year = parseInt(item.Year);
    return year >= currentYear - 5;
  }).length;

  return {
    recentPercentage: items.length > 0 ? (recentYears / items.length) * 100 : 0,
    likesNewReleases: recentYears / items.length > 0.5,
  };
};

// Count unwatched items in watchlists
const countUnwatchedItems = (watchlists) => {
  return Object.values(watchlists)
    .flat()
    .filter((item) => !item.watched).length;
};

// Count watched items in watchlists
const countWatchedItems = (watchlists) => {
  return Object.values(watchlists)
    .flat()
    .filter((item) => item.watched).length;
};

// Calculate completion rate
const calculateCompletionRate = (watchlists) => {
  const allItems = Object.values(watchlists).flat();
  if (allItems.length === 0) return 0;

  const watched = allItems.filter((item) => item.watched).length;
  return (watched / allItems.length) * 100;
};

/**
 * Custom hook to analyze user profile from favorites and watchlists
 * Returns intelligent insights about user preferences
 */
export const useUserProfile = (watchlists = {}) => {
  const { favorites } = useFavorites();

  const profile = useMemo(() => {
    // Basic metrics
    const isNewUser = favorites.length === 0;
    const hasWatchlists = Object.keys(watchlists).length > 0;

    if (isNewUser) {
      return {
        isNewUser: true,
        hasWatchlists,
        topGenres: [],
        contentPreference: "mixed",
        preferHighRated: false,
        likesNewReleases: true,
        engagementLevel: "new",
        watchProgress: {
          total: 0,
          watched: 0,
          unwatched: 0,
          completionRate: 0,
        },
      };
    }

    // Genre analysis
    const topGenres = extractGenres(favorites).slice(0, 3);

    // Content type preference
    const movieCount = countByType(favorites, "movie");
    const seriesCount = countByType(favorites, "series");
    let contentPreference = "mixed";
    if (movieCount > seriesCount * 2) contentPreference = "movies";
    else if (seriesCount > movieCount * 2) contentPreference = "series";

    // Quality preference
    const avgRating = calculateAverageRating(favorites);
    const preferHighRated = avgRating > 7.5;

    // Recency preference
    const yearAnalysis = analyzeYearDistribution(favorites);

    // Watch progress
    const totalWatchlist = Object.values(watchlists).flat().length;
    const watched = countWatchedItems(watchlists);
    const unwatched = countUnwatchedItems(watchlists);
    const completionRate = calculateCompletionRate(watchlists);

    // Engagement level
    let engagementLevel = "low";
    if (favorites.length >= 10 && hasWatchlists) engagementLevel = "high";
    else if (favorites.length >= 5 || hasWatchlists) engagementLevel = "medium";

    return {
      isNewUser: false,
      hasWatchlists,
      topGenres,
      contentPreference,
      preferHighRated,
      likesNewReleases: yearAnalysis.likesNewReleases,
      engagementLevel,
      favoriteCount: favorites.length,
      watchProgress: {
        total: totalWatchlist,
        watched,
        unwatched,
        completionRate: Math.round(completionRate),
      },
      // Get a random favorite for "Because You Liked" section
      randomFavorite:
        favorites.length > 0
          ? favorites[Math.floor(Math.random() * favorites.length)]
          : null,
    };
  }, [favorites, watchlists]);

  return profile;
};
