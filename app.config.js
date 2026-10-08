module.exports = () => {
  // Runtime values that are consumed through expo-constants.
  const YOUTUBE_API_KEY =
    process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
  const PRODUCTION_API_URL =
    process.env.EXPO_PUBLIC_PRODUCTION_API_URL ||
    process.env.PRODUCTION_API_URL;
  const API_BASE_URL =
    process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;

  // Debug logging for build-time (only shows in build logs)
  console.log("🔧 Build-time environment check:");
  console.log(
    "  Production API URL:",
    PRODUCTION_API_URL ? "✅ Set" : "❌ Missing",
  );
  console.log("  Development API URL:", API_BASE_URL ? "✅ Set" : "❌ Missing");
  console.log("  YouTube API Key:", YOUTUBE_API_KEY ? "✅ Set" : "❌ Missing");

  return {
    expo: {
      name: "CineLink",
      slug: "CineLink",
      version: "2.0.0",
      orientation: "portrait",
      icon: "./assets/app-icon.png",
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
        checkAutomatically: "ON_LOAD",
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
          foregroundImage: "./assets/adaptive-icon-foreground.png",
          backgroundColor: "#d8af61",
        },
        package: "com.josmon2004.CineLink",
        permissions: ["android.permission.INTERNET"],
        jsEngine: "hermes",
        edgeToEdgeEnabled: false,
      },
      web: {
        favicon: "./assets/favicon.png",
      },
      extra: {
        eas: {
          projectId: "7892f2fc-684a-4de4-a501-6214b9fafb05",
        },
        YOUTUBE_API_KEY,
        API_BASE_URL,
        PRODUCTION_API_URL,
      },
      plugins: [
        "expo-system-ui",
        "expo-updates",
        [
          "expo-build-properties",
          {
            android: {
              enableProguardInReleaseBuilds: false,
              enableShrinkResourcesInReleaseBuilds: false,
              enableMinifyInReleaseBuilds: false,
            },
          },
        ],
      ],
    },
  };
};
