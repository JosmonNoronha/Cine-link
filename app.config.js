module.exports = () => {
  // Load environment variables from EAS
  const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
  const FIREBASE_AUTH_DOMAIN = process.env.FIREBASE_AUTH_DOMAIN;
  const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
  const FIREBASE_STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET;
  const FIREBASE_MESSAGING_SENDER_ID = process.env.FIREBASE_MESSAGING_SENDER_ID;
  const FIREBASE_APP_ID = process.env.FIREBASE_APP_ID;
  const FIREBASE_MEASUREMENT_ID = process.env.FIREBASE_MEASUREMENT_ID;

  // API Keys (these should also be available with EXPO_PUBLIC_ prefix for runtime access)
  const OMDB_API_KEY =
    process.env.EXPO_PUBLIC_OMDB_API_KEY || process.env.OMDB_API_KEY;
  const YOUTUBE_API_KEY =
    process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
  const PRODUCTION_API_URL =
    process.env.EXPO_PUBLIC_PRODUCTION_API_URL ||
    process.env.PRODUCTION_API_URL;

  // Debug logging for build-time (only shows in build logs)
  console.log("🔧 Build-time environment check:");
  console.log(
    "  Firebase API Key:",
    FIREBASE_API_KEY ? "✅ Set" : "❌ Missing",
  );
  console.log(
    "  Firebase Project ID:",
    FIREBASE_PROJECT_ID ? "✅ Set" : "❌ Missing",
  );
  console.log("  OMDB API Key:", OMDB_API_KEY ? "✅ Set" : "❌ Missing");
  console.log(
    "  Production API URL:",
    PRODUCTION_API_URL ? "✅ Set" : "❌ Missing",
  );

  return {
    expo: {
      name: "CineLink",
      slug: "CineLink",
      version: "2.0.0",
      orientation: "portrait",
      icon: "./assets/icon.png",
      userInterfaceStyle: "automatic",
      newArchEnabled: true,
      splash: {
        image: "./assets/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
      updates: {
        enabled: true,
        fallbackToCacheTimeout: 0,
        url: "https://u.expo.dev/7892f2fc-684a-4de4-a501-6214b9fafb05",
      },
      runtimeVersion: {
        policy: "sdkVersion",
      },
      sdkVersion: "53.0.0",
      ios: {
        supportsTablet: true,
        bundleIdentifier: "com.josmon2004.CineLink",
        infoPlist: {
          ITSAppUsesNonExemptEncryption: false,
        },
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#ffffff",
        },
        package: "com.josmon2004.CineLink",
        permissions: ["android.permission.INTERNET"],
        jsEngine: "hermes",
        edgeToEdgeEnabled: true,
      },
      web: {
        favicon: "./assets/favicon.png",
      },
      extra: {
        eas: {
          projectId: "7892f2fc-684a-4de4-a501-6214b9fafb05",
        },
        // Environment variables securely loaded from EAS
        FIREBASE_API_KEY,
        FIREBASE_AUTH_DOMAIN,
        FIREBASE_PROJECT_ID,
        FIREBASE_STORAGE_BUCKET,
        FIREBASE_MESSAGING_SENDER_ID,
        FIREBASE_APP_ID,
        FIREBASE_MEASUREMENT_ID,
        OMDB_API_KEY,
        YOUTUBE_API_KEY,
        PRODUCTION_API_URL,
        updateMetadata: {
          message: "Version 2.0.0 - Major Update",
          description: "Complete app restructure with backend integration",
          changelog:
            "- Backend Caching\n- Improved Performance\n- New UI\n- Redis Integration",
          version: "2.0.0",
        },
      },
      plugins: [
        "expo-system-ui",
        "expo-updates",
        [
          "expo-build-properties",
          {
            android: {
              enableProguardInReleaseBuilds: true,
              enableShrinkResourcesInReleaseBuilds: true,
              enableMinifyInReleaseBuilds: true,
            },
          },
        ],
      ],
    },
  };
};
