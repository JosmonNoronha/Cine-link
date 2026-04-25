module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native|@react-navigation|expo(nent)?|@expo(nent)?/.*|expo-.*|@expo-google-fonts/.*|react-native-reanimated|react-native-gesture-handler|@react-native-async-storage/async-storage))",
  ],
  collectCoverageFrom: [
    "src/config/**/*.{js,jsx}",
    "src/contexts/**/*.{js,jsx}",
    "src/hooks/**/*.{js,jsx}",
    "src/services/**/*.{js,jsx}",
    "!src/**/*.d.ts",
    "!src/**/index.js",
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
};
