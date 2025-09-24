import { useState, useEffect } from "react";
import ApiService from "../services/api";

export const useMovies = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTrendingMovies();
  }, []);

  const fetchTrendingMovies = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getTrendingMovies();
      setMovies(data.results || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const searchMovies = async (query) => {
    try {
      setLoading(true);
      const data = await ApiService.searchMovies(query);
      setMovies(data.results || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMovieDetails = async (id) => {
    try {
      return await ApiService.getMovieDetails(id);
    } catch (err) {
      throw err;
    }
  };

  return {
    movies,
    loading,
    error,
    searchMovies,
    getMovieDetails,
    refreshMovies: fetchTrendingMovies,
  };
};
