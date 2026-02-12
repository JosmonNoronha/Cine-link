// Quick cache clearing utility
// Run this from the app to clear cached search results

import AsyncStorage from "@react-native-async-storage/async-storage";

export const clearSearchCache = async () => {
  try {
    await AsyncStorage.removeItem("movieCache");
    console.log("✅ Search cache cleared");
    return true;
  } catch (error) {
    console.error("❌ Failed to clear cache:", error);
    return false;
  }
};

// Clear all app cache
export const clearAllCache = async () => {
  try {
    await AsyncStorage.clear();
    console.log("✅ All cache cleared - restart app");
    return true;
  } catch (error) {
    console.error("❌ Failed to clear all cache:", error);
    return false;
  }
};

// Usage in debug console:
// import { clearSearchCache } from './clear-cache';
// clearSearchCache();
