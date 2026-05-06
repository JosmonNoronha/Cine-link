import React, { useState, useEffect, useRef, useCallback } from "react";
import "../../firebaseConfig";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";

import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import DetailsScreen from "../screens/DetailsScreen";

import { useCustomTheme } from "../contexts/ThemeContext";
import { FavoritesProvider } from "../contexts/FavoritesContext";
import { auth } from "../../firebaseConfig";
import SplashLoader from "../components/SplashLoader";
import logger from "../services/logger";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Constants ────────────────────────────────────────────────────────────────
const APP_VERSION_KEY = "@app_version";
const CURRENT_APP_VERSION = "1.0.0";

const TAB_CONFIG = [
  { name: "Home", icon: "home-outline", iconFocused: "home" },
  { name: "Search", icon: "search-outline", iconFocused: "search-sharp" },
  { name: "Favorites", icon: "heart-outline", iconFocused: "heart" },
  { name: "Watchlist", icon: "bookmark-outline", iconFocused: "bookmark" },
  { name: "Settings", icon: "settings-outline", iconFocused: "settings" },
];

const NUM_TABS = TAB_CONFIG.length;
const BAR_H_MARGIN = 20;
const BAR_WIDTH = SCREEN_WIDTH - BAR_H_MARGIN * 2;
const BAR_INNER_INSET = 6;
const PILL_WIDTH = (BAR_WIDTH - BAR_INNER_INSET * 2) / NUM_TABS;

// ─── Spring / timing presets ───────────────────────────────────────────────────
const SP_SNAPPY = { damping: 20, stiffness: 300, mass: 0.6 };
const SP_BOUNCY = { damping: 11, stiffness: 260, mass: 0.65 };
const SP_GENTLE = { damping: 24, stiffness: 200, mass: 0.8 };

// ─── Deferred screen imports ───────────────────────────────────────────────────
const getFavoritesScreen = () => require("../screens/FavoritesScreen").default;
const getWatchlistsScreen = () =>
  require("../screens/WatchlistScreen").WatchlistsScreen;
const getWatchlistContentScreen = () =>
  require("../screens/WatchlistScreen").WatchlistContentScreen;
const getSettingsScreen = () => require("../screens/SettingsScreen").default;
const getManageSubscriptionsScreen = () =>
  require("../screens/ManageSubscriptionsScreen").default;
const getAuthScreen = () => require("../screens/AuthScreen").default;

// ─── Shared stack screen options ───────────────────────────────────────────────
const stackOpts = {
  headerShown: false,
  contentStyle: { backgroundColor: "transparent" },
  animation: "slide_from_right",
};
const detailOpts = { presentation: "card", gestureEnabled: true };

// ─── Stacks ────────────────────────────────────────────────────────────────────
const HomeStack = () => (
  <Stack.Navigator screenOptions={stackOpts}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen
      name="Details"
      component={DetailsScreen}
      options={detailOpts}
    />
  </Stack.Navigator>
);
const SearchStack = () => (
  <Stack.Navigator screenOptions={stackOpts}>
    <Stack.Screen name="Search" component={SearchScreen} />
    <Stack.Screen
      name="Details"
      component={DetailsScreen}
      options={detailOpts}
    />
  </Stack.Navigator>
);
const FavoritesStack = () => (
  <Stack.Navigator screenOptions={stackOpts}>
    <Stack.Screen name="Favorites" getComponent={getFavoritesScreen} />
    <Stack.Screen
      name="Details"
      component={DetailsScreen}
      options={detailOpts}
    />
  </Stack.Navigator>
);
const WatchlistStack = () => (
  <Stack.Navigator screenOptions={stackOpts}>
    <Stack.Screen name="Watchlists" getComponent={getWatchlistsScreen} />
    <Stack.Screen
      name="WatchlistContent"
      getComponent={getWatchlistContentScreen}
    />
    <Stack.Screen
      name="Details"
      component={DetailsScreen}
      options={detailOpts}
    />
  </Stack.Navigator>
);
const SettingsStack = () => (
  <Stack.Navigator screenOptions={{ ...stackOpts, animation: undefined }}>
    <Stack.Screen name="Settings" getComponent={getSettingsScreen} />
    <Stack.Screen
      name="ManageSubscriptions"
      getComponent={getManageSubscriptionsScreen}
    />
  </Stack.Navigator>
);
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ ...stackOpts, animation: undefined }}>
    <Stack.Screen name="Auth" getComponent={getAuthScreen} />
  </Stack.Navigator>
);

// ─── Sliding pill background indicator ────────────────────────────────────────
const PillIndicator = ({ activeIndex, pillColor, pillBorderColor }) => {
  const translateX = useSharedValue(activeIndex * PILL_WIDTH);

  useEffect(() => {
    translateX.value = withSpring(activeIndex * PILL_WIDTH, SP_SNAPPY);
  }, [activeIndex]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.pill,
        style,
        {
          width: PILL_WIDTH,
          backgroundColor: pillColor,
          borderColor: pillBorderColor,
          borderWidth: 1,
        },
      ]}
    />
  );
};

// ─── Single tab button ─────────────────────────────────────────────────────────
const TabItem = ({
  route,
  isFocused,
  onPress,
  focusedColor,
  inactiveColor,
}) => {
  const pressScale = useSharedValue(1);
  const iconScale = useSharedValue(isFocused ? 1 : 0.88);
  const iconTransY = useSharedValue(0);

  const cfg = TAB_CONFIG.find((t) => t.name === route.name) ?? TAB_CONFIG[0];
  const iconName = isFocused ? cfg.iconFocused : cfg.icon;
  const fgColor = isFocused ? focusedColor : inactiveColor;

  // Drive animations on focus change
  useEffect(() => {
    if (isFocused) {
      // bounce-up on icon
      iconTransY.value = withSequence(
        withTiming(-5, { duration: 110, easing: Easing.out(Easing.quad) }),
        withSpring(0, SP_BOUNCY),
      );
      iconScale.value = withSequence(
        withTiming(1.2, { duration: 120, easing: Easing.out(Easing.quad) }),
        withSpring(1, SP_GENTLE),
      );
    } else {
      iconScale.value = withSpring(0.88, SP_GENTLE);
      iconTransY.value = withTiming(0, { duration: 130 });
    }
  }, [isFocused]);

  const handlePressIn = useCallback(() => {
    pressScale.value = withSpring(0.87, { damping: 14, stiffness: 380 });
  }, []);
  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, SP_BOUNCY);
  }, []);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }, { translateY: iconTransY.value }],
  }));

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabTouchable}
      activeOpacity={1}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={route.name}
    >
      <Animated.View style={[styles.tabInner, wrapStyle]}>
        <Animated.View style={iconStyle}>
          <Ionicons name={iconName} size={24} color={fgColor} />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Floating tab bar ──────────────────────────────────────────────────────────
const FloatingTabBar = ({ state, navigation }) => {
  const { theme } = useCustomTheme();
  const insets = useSafeAreaInsets();
  const isDark = theme === "dark";

  // Entrance slide-up
  const barTransY = useSharedValue(120);
  const barOpacity = useSharedValue(0);

  useEffect(() => {
    barTransY.value = withSpring(0, { damping: 22, stiffness: 190, mass: 1.1 });
    barOpacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const barAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: barTransY.value }],
    opacity: barOpacity.value,
  }));

  const accent = isDark ? "#74b7ff" : "#2f6bff"; // app blue accent
  const inactiveFg = isDark ? "rgba(255,255,255,0.62)" : "rgba(24,33,48,0.72)";
  const barBg = isDark ? "rgba(18, 18, 22, 0.96)" : "rgba(216, 224, 238, 0.86)";
  const barBorder = isDark ? "rgba(255,255,255,0.15)" : "rgba(37,56,94,0.28)";
  const pillColor = isDark ? "rgba(116,183,255,0.20)" : "rgba(47,107,255,0.18)";
  const pillBorderColor = isDark
    ? "rgba(116,183,255,0.42)"
    : "rgba(47,107,255,0.42)";
  const topSheen = isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.54)";
  const bottom = Math.max(insets.bottom, 10) + 8;

  return (
    <Animated.View
      style={[styles.floatingWrapper, barAnimStyle, { bottom }]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.floatingBar,
          {
            backgroundColor: barBg,
            borderColor: barBorder,
            shadowColor: isDark ? "#000" : "#162035",
          },
        ]}
      >
        <View style={[styles.barTopSheen, { backgroundColor: topSheen }]} />

        {/* sliding pill */}
        <PillIndicator
          activeIndex={state.index}
          pillColor={pillColor}
          pillBorderColor={pillBorderColor}
        />

        {/* tabs */}
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented)
                navigation.navigate(route.name);
            };
            return (
              <TabItem
                key={route.key}
                route={route}
                isFocused={isFocused}
                onPress={onPress}
                focusedColor={accent}
                inactiveColor={inactiveFg}
              />
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
};

// ─── App tabs ──────────────────────────────────────────────────────────────────
const AppTabs = () => {
  const { theme } = useCustomTheme();
  return (
    <FavoritesProvider>
      <SafeAreaProvider>
        <StatusBar
          style={theme === "dark" ? "light" : "dark"}
          translucent={false}
        />
        <Tab.Navigator
          tabBar={(props) => <FloatingTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneContainerStyle: { backgroundColor: "transparent" },
          }}
        >
          <Tab.Screen name="Home" component={HomeStack} />
          <Tab.Screen name="Search" component={SearchStack} />
          <Tab.Screen name="Favorites" component={FavoritesStack} />
          <Tab.Screen name="Watchlist" component={WatchlistStack} />
          <Tab.Screen name="Settings" component={SettingsStack} />
        </Tab.Navigator>
      </SafeAreaProvider>
    </FavoritesProvider>
  );
};

// ─── Root navigator ────────────────────────────────────────────────────────────
const RootNavigator = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const { theme } = useCustomTheme();

  const checkAppVersion = async () => {
    try {
      const saved = await AsyncStorage.getItem(APP_VERSION_KEY);
      if (!saved || saved !== CURRENT_APP_VERSION) {
        logger.info("Fresh installation detected, clearing auth state");
        if (auth?.currentUser) await auth.signOut();
        await AsyncStorage.clear();
        await AsyncStorage.setItem(APP_VERSION_KEY, CURRENT_APP_VERSION);
      }
    } catch (err) {
      logger.error("Error checking app version", err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      await checkAppVersion();
      const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
        logger.info(
          "Auth state changed:",
          firebaseUser ? "logged in" : "no user",
        );
        setUser(firebaseUser?.emailVerified ? firebaseUser : null);
        if (!authInitialized) setAuthInitialized(true);
        setLoading(false);
      });
      return unsubscribe;
    };
    const cleanup = initializeAuth();
    return () => {
      cleanup.then((unsub) => unsub?.());
    };
  }, [authInitialized]);

  if (loading || !authInitialized) {
    return (
      <SafeAreaProvider>
        <StatusBar
          style={theme === "dark" ? "light" : "dark"}
          translucent={false}
        />
        <SplashLoader />
      </SafeAreaProvider>
    );
  }

  return user?.emailVerified ? (
    <AppTabs />
  ) : (
    <SafeAreaProvider>
      <StatusBar
        style={theme === "dark" ? "light" : "dark"}
        translucent={false}
      />
      <AuthStack />
    </SafeAreaProvider>
  );
};

export default RootNavigator;

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Floating bar container — sits above content
  floatingWrapper: {
    position: "absolute",
    left: BAR_H_MARGIN,
    right: BAR_H_MARGIN,
    zIndex: 999,
  },
  floatingBar: {
    borderRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
    // iOS shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    // Android
    elevation: 18,
  },
  barTopSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 5,
  },

  // Pill slides behind the tab row
  pill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: BAR_INNER_INSET,
    borderRadius: 22,
  },

  tabsRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: BAR_INNER_INSET,
  },

  tabTouchable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  tabInner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
});
