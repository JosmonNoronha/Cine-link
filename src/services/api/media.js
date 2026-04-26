import logger from "../logger";
import { apiClient } from "./core";

export const getMovieVideos = async (tmdbId) => {
  try {
    logger.info(`🎬 Fetching movie videos for TMDB ID: ${tmdbId}`);
    const response = await apiClient.get(`/movies/${tmdbId}/videos`);
    logger.info("🎬 Movie videos response:", response);
    return response;
  } catch (error) {
    logger.error("❌ Error fetching movie videos:", error);
    throw error;
  }
};

export const getTVVideos = async (tmdbId) => {
  try {
    logger.info(`🎬 Fetching TV videos for TMDB ID: ${tmdbId}`);
    const response = await apiClient.get(`/tv/${tmdbId}/videos`);
    logger.info("🎬 TV videos response:", response);
    return response;
  } catch (error) {
    logger.error("❌ Error fetching TV videos:", error);
    throw error;
  }
};

export const getSeasonVideos = async (tmdbId, seasonNumber) => {
  try {
    logger.info(
      `🎬 Fetching season ${seasonNumber} videos for TMDB ID: ${tmdbId}`,
    );
    const response = await apiClient.get(
      `/tv/${tmdbId}/season/${seasonNumber}/videos`,
    );
    logger.info("🎬 Season videos response:", response);
    return response;
  } catch (error) {
    logger.error("❌ Error fetching season videos:", error);
    throw error;
  }
};

export const extractYouTubeTrailer = (videosData) => {
  logger.info("🎬 Extracting trailer from:", videosData);

  if (!videosData?.results || !Array.isArray(videosData.results)) {
    logger.warn("⚠️ No results array in videos data");
    return null;
  }

  logger.info(`🎬 Found ${videosData.results.length} videos`);

  const priorities = ["Trailer", "Teaser", "Clip", "Featurette"];

  for (const type of priorities) {
    const video = videosData.results.find(
      (v) => v.site === "YouTube" && v.type === type && v.official === true,
    );
    if (video) {
      logger.info(`✅ Found official ${type}: ${video.key}`);
      return video.key;
    }
  }

  for (const type of priorities) {
    const video = videosData.results.find(
      (v) => v.site === "YouTube" && v.type === type,
    );
    if (video) {
      logger.info(`✅ Found ${type}: ${video.key}`);
      return video.key;
    }
  }

  const anyYoutubeVideo = videosData.results.find((v) => v.site === "YouTube");

  if (anyYoutubeVideo) {
    logger.info(`✅ Found YouTube video: ${anyYoutubeVideo.key}`);
    return anyYoutubeVideo.key;
  }

  logger.warn("❌ No YouTube trailers found");
  return null;
};

export const getMovieWatchProviders = async (tmdbId) => {
  try {
    logger.info("🎬 Fetching watch providers for movie:", tmdbId);
    const data = await apiClient.get(`/movies/${tmdbId}/watch-providers`);
    logger.info("✅ Watch providers fetched:", data);
    return data || {};
  } catch (error) {
    logger.error("❌ Error fetching movie watch providers:", error);
    return { results: {} };
  }
};

export const getTVWatchProviders = async (tmdbId) => {
  try {
    logger.info("📺 Fetching watch providers for TV:", tmdbId);
    const data = await apiClient.get(`/tv/${tmdbId}/watch-providers`);
    logger.info("✅ Watch providers fetched:", data);
    return data || {};
  } catch (error) {
    logger.error("❌ Error fetching TV watch providers:", error);
    return { results: {} };
  }
};

const extractTmdbId = (id) => {
  if (!id) return null;
  if (id.startsWith("tmdb:")) {
    const parts = id.split(":");
    return parseInt(parts[2], 10);
  }
  return null;
};

export const getWatchProviders = async (imdbID) => {
  try {
    logger.info("🔍 getWatchProviders called with:", imdbID);

    if (imdbID.startsWith("tmdb:")) {
      const parts = imdbID.split(":");
      const mediaType = parts[1];
      const tmdbId = parseInt(parts[2], 10);

      logger.info("📊 Parsed TMDB format:", { mediaType, tmdbId });

      if (mediaType === "tv") {
        return await getTVWatchProviders(tmdbId);
      }
      return await getMovieWatchProviders(tmdbId);
    }

    logger.info("🔄 Legacy IMDb ID, fetching details first...");
    const details = await apiClient.get(`/movies/details/${imdbID}`);
    logger.info("📄 Movie details:", {
      Type: details.Type,
      imdbID: details.imdbID,
    });

    if (details.Type === "series") {
      const tmdbId = extractTmdbId(details.imdbID);
      logger.info("📺 Series TMDB ID:", tmdbId);
      if (tmdbId) {
        return await getTVWatchProviders(tmdbId);
      }
    } else {
      const tmdbId = extractTmdbId(details.imdbID);
      logger.info("🎬 Movie TMDB ID:", tmdbId);
      if (tmdbId) {
        return await getMovieWatchProviders(tmdbId);
      }
    }

    logger.warn("⚠️ Could not extract TMDB ID, returning empty results");
    return { results: {} };
  } catch (error) {
    logger.error("❌ Error in getWatchProviders:", error);
    return { results: {} };
  }
};

export const getMovieReviews = async (tmdbId, page = 1) => {
  try {
    logger.info(`🎬 Fetching reviews for movie ${tmdbId}, page ${page}`);
    const data = await apiClient.get(`/movies/${tmdbId}/reviews`, {
      params: { page },
    });
    logger.info(
      "✅ Movie reviews fetched:",
      data?.results?.length || 0,
      "reviews",
    );
    return data || { results: [], total_results: 0 };
  } catch (error) {
    logger.error("❌ Error fetching movie reviews:", error);
    return { results: [], total_results: 0 };
  }
};

export const getTVReviews = async (tmdbId, page = 1) => {
  try {
    logger.info(`📺 Fetching reviews for TV ${tmdbId}, page ${page}`);
    const data = await apiClient.get(`/tv/${tmdbId}/reviews`, {
      params: { page },
    });
    logger.info(
      "✅ TV reviews fetched:",
      data?.results?.length || 0,
      "reviews",
    );
    return data || { results: [], total_results: 0 };
  } catch (error) {
    logger.error("❌ Error fetching TV reviews:", error);
    return { results: [], total_results: 0 };
  }
};
