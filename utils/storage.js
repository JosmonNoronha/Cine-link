import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'FAVORITE_MOVIES';
const SERIES_KEY_PREFIX = 'SERIES_';

export const getFavorites = async () => {
  const json = await AsyncStorage.getItem(FAVORITES_KEY);
  return json != null ? JSON.parse(json) : [];
};

export const saveFavorite = async (movie) => {
  const favorites = await getFavorites();
  const exists = favorites.find((m) => m.imdbID === movie.imdbID);
  if (!exists) {
    favorites.push(movie);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
};

export const removeFavorite = async (imdbID) => {
  const favorites = await getFavorites();
  const updated = favorites.filter((m) => m.imdbID !== imdbID);
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
};

export const isFavorite = async (imdbID) => {
  const favorites = await getFavorites();
  return favorites.some((m) => m.imdbID === imdbID);
};

export const saveSeriesDetails = async (imdbID, seriesDetails) => {
  try {
    await AsyncStorage.setItem(
      `${SERIES_KEY_PREFIX}${imdbID}`,
      JSON.stringify(seriesDetails)
    );
  } catch (error) {
    console.error("Error saving series details:", error);
  }
};

export const getSeriesDetails = async (imdbID) => {
  try {
    const json = await AsyncStorage.getItem(`${SERIES_KEY_PREFIX}${imdbID}`);
    return json != null ? JSON.parse(json) : null;
  } catch (error) {
    console.error("Error getting series details:", error);
    return null;
  }
};