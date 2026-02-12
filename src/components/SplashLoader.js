import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
  FadeInUp,
  FadeOut,
} from "react-native-reanimated";

const PulsingDot = ({ delay = 0 }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      true,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 600 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

const SplashLoader = ({
  appName = "CineLink",
  message = "Preparing your experience...",
}) => {
  return (
    <Animated.View style={styles.container} exiting={FadeOut.duration(600)}>
      <Animated.View
        entering={FadeInDown.duration(800).springify().damping(12)}
      >
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(400).duration(800).springify().damping(12)}
      >
        <Text style={styles.appName}>{appName}</Text>
      </Animated.View>

      <Animated.View
        entering={FadeInUp.delay(800).duration(800)}
        style={styles.loaderContainer}
      >
        <View style={styles.dotsContainer}>
          <PulsingDot delay={0} />
          <PulsingDot delay={200} />
          <PulsingDot delay={400} />
        </View>
        <Text style={styles.loadingText}>{message}</Text>
      </Animated.View>
      {/* OMDB Credits */}
      <Animated.View
        entering={FadeInUp.delay(1200).duration(800)}
        style={styles.creditContainer}
      >
        <Text style={styles.creditText}>Powered by OMDB API</Text>
      </Animated.View>
    </Animated.View>
  );
};

const MainApp = (
  { appName = "CineLink" }, // Pass appName as a prop
) => (
  <View style={styles.mainAppContainer}>
    <Text style={styles.mainAppText}>Welcome to {appName}</Text>
  </View>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 6000); // Increased to 6 seconds

    return () => clearTimeout(timer);
  }, []);

  return showSplash ? <SplashLoader /> : <MainApp />;
};

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 1.5,
    marginTop: 8,
  },
  loaderContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    marginHorizontal: 6,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
    opacity: 0.8,
  },
  creditContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    justifyContent: "center", // Ensure text is centered
  },
  creditText: {
    fontSize: 12,
    color: "#ffffff",
    opacity: 0.6,
    fontStyle: "italic",
  },
  mainAppContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  mainAppText: {
    fontSize: 24,
    color: "#ffffff",
    fontWeight: "600",
  },
});
