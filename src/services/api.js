import {
  API_BASE_URL,
  getBackendStatusSnapshot,
  resetBackendStatus,
} from "./api/core";
import {
  getBatchMovieDetails,
  getEpisodeDetails,
  getMovieDetails,
  getRecommendations,
  getSeasonDetails,
  searchMovies,
} from "./api/catalog";
import {
  addToFavorites,
  addToWatchlist,
  createWatchlist,
  deleteWatchlist,
  getFavorites,
  getUserProfile,
  getWatchlists,
  removeFromFavorites,
  removeFromWatchlist,
  toggleWatchedStatus,
} from "./api/userLibrary";
import {
  getNewReleases,
  getPopular,
  getPopularSearches,
  getSearchSuggestions,
  getTopRated,
  getTrending,
  getTrendingKeywords,
  getTrendingMovies,
  searchByGenre,
} from "./api/discovery";
import {
  extractYouTubeTrailer,
  getMovieReviews,
  getMovieVideos,
  getMovieWatchProviders,
  getSeasonVideos,
  getTVReviews,
  getTVVideos,
  getTVWatchProviders,
  getWatchProviders,
} from "./api/media";
import {
  getGamificationData,
  getUserSubscriptions,
  getWatchedEpisodes,
  recordGamificationListCompleted,
  recordGamificationListCreated,
  recordGamificationWatch,
  setEpisodeWatched,
  syncGamificationData,
  updateUserSubscriptions,
} from "./api/engagement";
export {
  getBatchMovieDetails,
  getEpisodeDetails,
  getMovieDetails,
  getRecommendations,
  getSeasonDetails,
  searchMovies,
};

export {
  addToFavorites,
  addToWatchlist,
  createWatchlist,
  deleteWatchlist,
  getFavorites,
  getUserProfile,
  getWatchlists,
  removeFromFavorites,
  removeFromWatchlist,
  toggleWatchedStatus,
};

export const getBackendStatus = () => ({
  ...getBackendStatusSnapshot(),
});

export const retestBackendConnection = async () => {
  return resetBackendStatus();
};

// Convenience API for components expecting a default service object
const normalizeResults = (payload) => {
  if (!payload) return { results: [] };
  if (Array.isArray(payload)) return { results: payload };
  if (payload.Search)
    return {
      results: payload.Search,
      totalResults:
        parseInt(payload.totalResults || "0") || payload.Search.length,
      meta: payload.meta || null,
    };
  if (payload.results)
    return {
      results: payload.results,
      totalResults: payload.totalResults,
      meta: payload.meta || null,
    };
  return { results: [] };
};

export {
  getNewReleases,
  getPopular,
  getPopularSearches,
  getSearchSuggestions,
  getTopRated,
  getTrending,
  getTrendingKeywords,
  getTrendingMovies,
  searchByGenre,
};

export {
  extractYouTubeTrailer,
  getMovieReviews,
  getMovieVideos,
  getMovieWatchProviders,
  getSeasonVideos,
  getTVReviews,
  getTVVideos,
  getTVWatchProviders,
  getWatchProviders,
};

export {
  getGamificationData,
  getUserSubscriptions,
  getWatchedEpisodes,
  recordGamificationListCompleted,
  recordGamificationListCreated,
  recordGamificationWatch,
  setEpisodeWatched,
  syncGamificationData,
  updateUserSubscriptions,
};

const ApiService = {
  async searchMovies(query, filter = "all", page = 1) {
    const resp = await searchMovies(query, filter, page);
    return normalizeResults(resp);
  },
  async getTrendingMovies() {
    const trending = await getTrending("movie", "week");
    return { results: trending };
  },
  getMovieDetails,
};

export { API_BASE_URL };
export default ApiService;
