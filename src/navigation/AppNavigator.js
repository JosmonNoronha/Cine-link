import React, { useState, useEffect, useRef } from "react";
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
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";

import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import DetailsScreen from "../screens/DetailsScreen";
import FavoritesScreen from "../screens/FavoritesScreen";
import {
  WatchlistsScreen,
  WatchlistContentScreen,
} from "../screens/WatchlistScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ManageSubscriptionsScreen from "../screens/ManageSubscriptionsScreen";
import AuthScreen from "../screens/AuthScreen";
import { useCustomTheme } from "../contexts/ThemeContext";
import { FavoritesProvider } from "../contexts/FavoritesContext";
import { auth } from "../../firebaseConfig";
import SplashLoader from "../components/SplashLoader";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Add a version key to track app installations
const APP_VERSION_KEY = "@app_version";
const CURRENT_APP_VERSION = "1.0.0"; // Update this when you want to force logout

/* ---------- STACKS FOR EACH TAB ---------- */
const HomeStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: "transparent" },
      animation: "slide_from_right",
    }}
  >
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen
      name="Details"
      component={DetailsScreen}
      options={{
        presentation: "card",
        gestureEnabled: true,
      }}
    />
  </Stack.Navigator>
);

const SearchStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: "transparent" },
      animation: "slide_from_right",
    }}
  >
    <Stack.Screen name="Search" component={SearchScreen} />
    <Stack.Screen
      name="Details"
      component={DetailsScreen}
      options={{
        presentation: "card",
        gestureEnabled: true,
      }}
    />
  </Stack.Navigator>
);

const FavoritesStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: "transparent" },
      animation: "slide_from_right",
    }}
  >
    <Stack.Screen name="Favorites" component={FavoritesScreen} />
    <Stack.Screen
      name="Details"
      component={DetailsScreen}
      options={{
        presentation: "card",
        gestureEnabled: true,
      }}
    />
  </Stack.Navigator>
);

const WatchlistStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: "transparent" },
      animation: "slide_from_right",
    }}
  >
    <Stack.Screen name="Watchlists" component={WatchlistsScreen} />
    <Stack.Screen name="WatchlistContent" component={WatchlistContentScreen} />
    <Stack.Screen
      name="Details"
      component={DetailsScreen}
      options={{
        presentation: "card",
        gestureEnabled: true,
      }}
    />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: "transparent" },
    }}
  >
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="ManageSubscriptions" component={ManageSubscriptionsScreen} />
  </Stack.Navigator>
);

/* ---------- AUTH STACK ---------- */
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: "transparent" },
    }}
  >
    <Stack.Screen name="Auth" component={AuthScreen} />
  </Stack.Navigator>
);

/* ---------- CUSTOM TAB BAR ---------- */
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { colors } = useTheme();
  const { theme } = useCustomTheme();

  const scalesRef = useRef(state.routes.map(() => useSharedValue(1)));
  const animatedStylesRef = useRef(
    scalesRef.current.map((scale) =>
      useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] })),
    ),
  );

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff",
          borderTopColor: theme === "dark" ? "#333" : "#ddd",
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const iconName = {
          Home: isFocused ? "home" : "home-outline",
          Search: isFocused ? "search-sharp" : "search-outline",
          Favorites: isFocused ? "heart" : "heart-outline",
          Watchlist: isFocused ? "bookmark" : "bookmark-outline",
          Settings: isFocused ? "settings" : "settings-outline",
        }[route.name];

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            onPressIn={() =>
              (scalesRef.current[index].value = withSpring(0.95))
            }
            onPressOut={() => (scalesRef.current[index].value = withSpring(1))}
            style={styles.tabItem}
            activeOpacity={0.7}
          >
            <Animated.View
              style={[styles.tabContent, animatedStylesRef.current[index]]}
            >
              <Ionicons
                name={iconName}
                size={28}
                color={isFocused ? colors.primary : colors.text}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? colors.primary : colors.text,
                    fontWeight: isFocused ? "bold" : "normal",
                  },
                ]}
              >
                {route.name}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/* ---------- AUTHENTICATED TABS ---------- */
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
          tabBar={(props) => <CustomTabBar {...props} />}
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

/* ---------- ROOT NAVIGATOR ---------- */
const RootNavigator = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const { theme } = useCustomTheme();

  // Check if this is a fresh installation
  const checkAppVersion = async () => {
    try {
      const savedVersion = await AsyncStorage.getItem(APP_VERSION_KEY);

      if (!savedVersion || savedVersion !== CURRENT_APP_VERSION) {
        // This is either first install or a version change
        console.log("Fresh installation detected, clearing auth state");

        // Sign out any existing user
        if (auth.currentUser) {
          await auth.signOut();
        }

        // Clear AsyncStorage
        await AsyncStorage.clear();

        // Set current version
        await AsyncStorage.setItem(APP_VERSION_KEY, CURRENT_APP_VERSION);
      }
    } catch (error) {
      console.error("Error checking app version:", error);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      await checkAppVersion();

      const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
        console.log(
          "Auth state changed:",
          firebaseUser ? "User logged in" : "No user",
        );

        // Only set user if they are verified (for login) or null (for logout)
        if (firebaseUser) {
          if (firebaseUser.emailVerified) {
            setUser(firebaseUser);
          } else {
            // For unverified users, don't automatically sign them out
            // This allows account creation flow to complete properly
            setUser(null);
            // Note: We don't call auth.signOut() here anymore to avoid interfering
            // with account creation. The AuthScreen handles signing out after
            // account creation is complete.
          }
        } else {
          setUser(null);
        }

        // Set auth as initialized and stop loading
        if (!authInitialized) {
          setAuthInitialized(true);
        }
        setLoading(false);
      });

      return unsubscribe;
    };

    const cleanup = initializeAuth();

    return () => {
      cleanup.then((unsubscribe) => unsubscribe && unsubscribe());
    };
  }, [authInitialized]);

  // Show loading screen until auth is properly initialized
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

  // Render based on verified user state
  return user && user.emailVerified ? (
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

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    height: 60,
    borderTopWidth: 1,
    elevation: 10,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1000,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});
