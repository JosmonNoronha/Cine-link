import axios from "axios";
import { OMDB_API_KEY } from "@env";

export const searchMovies = async (query) => {
  try {
    const trimmedQuery = query.trim();
    let url;

    if (trimmedQuery.length < 3) {
      url = `https://www.omdbapi.com/?t=${encodeURIComponent(
        trimmedQuery
      )}&apikey=${OMDB_API_KEY}`;
    } else {
      url = `https://www.omdbapi.com/?s=${encodeURIComponent(
        trimmedQuery
      )}&apikey=${OMDB_API_KEY}`;
    }

    console.log("Raw query:", query);
    console.log("Trimmed query:", trimmedQuery);
    console.log("Fetching:", url);

    const response = await fetch(url);
    const data = await response.json();

    console.log("API Response:", data);

    if (data.Response === "False") {
      console.warn("OMDb API Warning:", data.Error);
      return [];
    }

    if (trimmedQuery.length < 3) {
      return [data];
    } else {
      return data.Search || [];
    }
  } catch (error) {
    console.error("Error fetching movies:", error.message);
    throw new Error(`Network Error: ${error.message}`);
  }
};

export const getMovieDetails = async (imdbID) => {
  try {
    const response = await axios.get(`https://www.omdbapi.com/`, {
      params: {
        i: imdbID,
        apikey: OMDB_API_KEY,
        plot: "full",
      },
    });
    if (response.data.Response === "False") {
      throw new Error(response.data.Error || "Failed to fetch movie details");
    }
    return response.data;
  } catch (error) {
    console.error("Error fetching movie details:", error);
    throw error;
  }
};

export const getSeasonDetails = async (imdbID, season) => {
  try {
    const response = await axios.get(`https://www.omdbapi.com/`, {
      params: {
        i: imdbID,
        Season: season,
        apikey: OMDB_API_KEY,
      },
    });
    if (response.data.Response === "False") {
      throw new Error(response.data.Error || "Failed to fetch season details");
    }
    return response.data;
  } catch (error) {
    console.error(`Error fetching season ${season} details:`, error);
    return null;
  }
};

export const getEpisodeDetails = async (imdbID, season, episode) => {
  try {
    const response = await axios.get(`https://www.omdbapi.com/`, {
      params: {
        i: imdbID,
        Season: season,
        Episode: episode,
        apikey: OMDB_API_KEY,
      },
    });
    if (response.data.Response === "False") {
      throw new Error(response.data.Error || "Failed to fetch episode details");
    }
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching episode ${episode} of season ${season}:`,
      error
    );
    return null;
  }
};
