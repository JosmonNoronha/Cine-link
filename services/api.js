import axios from "axios";
import Constants from 'expo-constants';


const OMDB_API_KEY =
  Constants.expoConfig.extra.OMDB_API_KEY ||
  process.env.EXPO_PUBLIC_OMDB_API_KEY;
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

export const getRecommendations = async (title) => {
  try {
    const response = await fetch('https://movie-reco-api.onrender.com/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titles: [title], top_n: 10 })
    });
    
    const data = await response.json();
    const recommendations = data.recommendations || [];

    // Fetch OMDB details and filter out unavailable ones
    const detailedRecommendations = (
      await Promise.all(
        recommendations.map(async (rec) => {
          try {
            const omdbResponse = await fetch(
              `https://www.omdbapi.com/?t=${encodeURIComponent(rec.title)}&y=${rec.release_year}&apikey=${OMDB_API_KEY}`
            );
            const omdbData = await omdbResponse.json();
            
            if (omdbData.Response === 'True') {
              return {
                ...rec,
                imdbID: omdbData.imdbID,
                Poster: omdbData.Poster,
                imdbRating: omdbData.imdbRating,
                Runtime: omdbData.Runtime
              };
            }
            return null; // Return null for movies not found in OMDB
          } catch (error) {
            console.error('Error fetching OMDb details:', error);
            return null;
          }
        })
      )
    ).filter(rec => rec !== null); // Filter out null entries

    return detailedRecommendations;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    throw error;
  }
};
