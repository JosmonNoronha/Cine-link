import React, { useState, useEffect } from "react";
import "../firebaseConfig"; // Ensure initialization
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
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import HomeScreen from "../screens/HomeScreen";
import SearchScreen from "../screens/SearchScreen";
import DetailsScreen from "../screens/DetailsScreen";
import FavoritesScreen from "../screens/FavoritesScreen";
import {
  WatchlistsScreen,
  WatchlistContentScreen,
} from "../screens/WatchlistScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AuthScreen from "../screens/AuthScreen";
import { useCustomTheme } from "../contexts/ThemeContext";
import { auth } from "../firebaseConfig"; // Import auth

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const HomeStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Home"
      component={HomeScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen name="Details" component={DetailsScreen} />
  </Stack.Navigator>
);

const SearchStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Search"
      component={SearchScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen name="Details" component={DetailsScreen} />
  </Stack.Navigator>
);

const FavoritesStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Favorites"
      component={FavoritesScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen name="Details" component={DetailsScreen} />
  </Stack.Navigator>
);

const WatchlistStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Watchlists"
      component={WatchlistsScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="WatchlistContent"
      component={WatchlistContentScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen name="Details" component={DetailsScreen} />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Settings"
      component={SettingsScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="AuthScreen" // Changed from "Auth" to "Login" to fix warning
      component={AuthScreen}
      options={{ headerShown: false }}
    />
  </Stack.Navigator>
);

const TAB_COUNT = 5; // Home, Search, Favorites, Watchlist, Settings
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { colors } = useTheme();
  const { theme } = useCustomTheme();

  const scalesRef = React.useRef([
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
  ]);
  const animatedStylesRef = React.useRef([
    useAnimatedStyle(() => ({
      transform: [{ scale: scalesRef.current[0].value }],
    })),
    useAnimatedStyle(() => ({
      transform: [{ scale: scalesRef.current[1].value }],
    })),
    useAnimatedStyle(() => ({
      transform: [{ scale: scalesRef.current[2].value }],
    })),
    useAnimatedStyle(() => ({
      transform: [{ scale: scalesRef.current[3].value }],
    })),
    useAnimatedStyle(() => ({
      transform: [{ scale: scalesRef.current[4].value }],
    })),
  ]);

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
        const { options } = descriptors[route.key];
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
          Login: isFocused ? "lock-closed" : "lock-closed-outline", // Updated for "Login"
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

const AppNavigator = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true initially

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user); // Will be null if signed out
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#6b48ff" />
      </View>
    );
  }

  // If user is not authenticated, show only the auth screen without tab bar
  if (!user) {
    return <AuthScreen />;
  }

  // If user is authenticated, show the full tab navigation
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Search" component={SearchStack} />
      <Tab.Screen name="Favorites" component={FavoritesStack} />
      <Tab.Screen name="Watchlist" component={WatchlistStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
};

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

export default AppNavigator;
