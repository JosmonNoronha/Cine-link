import Constants from "expo-constants";

// config/environment.js
export const config = {
  OMDB_API_KEY:
    Constants.expoConfig?.extra?.OMDB_API_KEY ||
    process.env.EXPO_PUBLIC_OMDB_API_KEY,
  YOUTUBE_API_KEY:
    Constants.expoConfig?.extra?.YOUTUBE_API_KEY ||
    process.env.EXPO_PUBLIC_YOUTUBE_API_KEY,

  // Validate required keys
  validate() {
    if (!this.OMDB_API_KEY) {
      throw new Error("OMDB_API_KEY is required");
    }
  },
};
