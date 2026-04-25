import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Animated,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as Updates from "expo-updates";
import NetInfo from "@react-native-community/netinfo";
import { useCustomTheme } from "../contexts/ThemeContext";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../firebaseConfig";
import { getBackendStatus, retestBackendConnection } from "../services/api";
import { useFavorites } from "../contexts/FavoritesContext";
import { getWatchlists } from "../utils/storage";
import { getGamificationState, getLevelInfo } from "../utils/gamification";
import BadgesModal from "../components/BadgesModal";
import logger from "../services/logger";

const SettingsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { theme, toggleTheme } = useCustomTheme();
  const insets = useSafeAreaInsets();
  const [updateOverWifi, setUpdateOverWifi] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isExpoGo, setIsExpoGo] = useState(false);
  const [user, setUser] = useState(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [backendStatus, setBackendStatus] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [badgesModalVisible, setBadgesModalVisible] = useState(false);
  const [profileInsights, setProfileInsights] = useState({
    level: 1,
    levelIcon: "🆕",
    xp: 0,
    xpProgressText: "0/50",
    favorites: 0,
    watchlists: 0,
    streak: 0,
    badges: 0,
    unlockedAchievements: [],
  });
  const { favorites } = useFavorites();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIsExpoGo(Constants.appOwnership === "expo");
    if (!isExpoGo) checkForUpdates();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, []);

  const loadProfileInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const [lists, gamificationState] = await Promise.all([
        getWatchlists(),
        getGamificationState(),
      ]);

      const watchlistsMap = lists || {};
      const watchlistCount = Object.keys(watchlistsMap).length;
      const levelInfo = getLevelInfo(gamificationState?.xp || 0);

      setProfileInsights({
        level: levelInfo.current.level,
        levelIcon: levelInfo.current.icon,
        xp: gamificationState?.xp || 0,
        xpProgressText: levelInfo.next
          ? `${levelInfo.xpInLevel}/${levelInfo.xpForNext}`
          : "MAX",
        favorites: favorites.length,
        watchlists: watchlistCount,
        streak: gamificationState?.currentStreak || 0,
        badges: gamificationState?.unlockedAchievements?.length || 0,
        unlockedAchievements: gamificationState?.unlockedAchievements || [],
      });
    } catch (error) {
      logger.error("Failed to load profile insights", error);
      setProfileInsights((prev) => ({
        ...prev,
        favorites: favorites.length,
      }));
    } finally {
      setInsightsLoading(false);
    }
  }, [favorites]);

  useEffect(() => {
    loadProfileInsights();
    const unsubscribe = navigation.addListener("focus", loadProfileInsights);
    return unsubscribe;
  }, [navigation, loadProfileInsights]);

  useEffect(() => {
    // Check backend status
    const checkBackendStatus = () => {
      const status = getBackendStatus();
      setBackendStatus(status);
    };

    checkBackendStatus();
    const statusInterval = setInterval(checkBackendStatus, 5000); // Check every 5 seconds

    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  const checkForUpdates = async () => {
    if (isExpoGo) return;

    try {
      setIsCheckingUpdate(true);
      const update = await Updates.checkForUpdateAsync();
      setUpdateAvailable(update.isAvailable);
    } catch (error) {
      logger.error("Error checking for updates", error);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleUpdate = async () => {
    if (isExpoGo) {
      Alert.alert(
        "Not Available in Expo Go",
        "Please build a development version of the app to test update functionality.",
      );
      return;
    }

    try {
      const netInfo = await NetInfo.fetch();
      if (updateOverWifi && netInfo.type !== "wifi") {
        Alert.alert(
          "WiFi Required",
          "Please connect to WiFi to update the app",
        );
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          "Update Downloaded",
          "The app will restart to apply the update",
          [{ text: "Restart Now", onPress: () => Updates.reloadAsync() }],
        );
      } else {
        Alert.alert("No Updates", "Your app is up to date");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update the app");
      logger.error("Error updating app", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      logger.error("Sign Out Error", error);
    }
  };

  const handleRetestBackend = async () => {
    try {
      setBackendStatus({ ...backendStatus, testing: true });
      await retestBackendConnection();
      const newStatus = getBackendStatus();
      setBackendStatus(newStatus);

      Alert.alert(
        "Backend Test",
        newStatus.available
          ? "Backend is available!"
          : "Backend is still unavailable",
      );
    } catch (error) {
      Alert.alert("Error", "Failed to test backend connection");
    } finally {
      // Ensure testing state is reset even if there's an error
      setTimeout(() => {
        const currentStatus = getBackendStatus();
        setBackendStatus({ ...currentStatus, testing: false });
      }, 500);
    }
  };

  const appVersion = Constants.expoConfig?.version || "1.0.0";
  const updateStatusConfig = isCheckingUpdate
    ? {
        icon: "sync",
        title: "Checking for updates",
        subtitle: "Looking for the latest release",
        color: theme === "dark" ? "#93c5fd" : "#2563eb",
      }
    : updateAvailable
      ? {
          icon: "cloud-download",
          title: "Update available",
          subtitle: "A newer version is ready to install",
          color: "#16a34a",
        }
      : {
          icon: "checkmark-circle",
          title: "Up to date",
          subtitle: "You are on the latest release",
          color: theme === "dark" ? "#93c5fd" : "#2563eb",
        };

  const SectionCard = ({ title, children }) => (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: theme === "dark" ? "#1f1f1f" : "#ffffff" },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );

  const ProfileStatTile = ({
    icon,
    label,
    value,
    subtitle,
    accent,
    onPress,
  }) => {
    const TileContainer = onPress ? TouchableOpacity : View;

    return (
      <TileContainer
        onPress={onPress}
        activeOpacity={onPress ? 0.82 : undefined}
        style={[
          styles.profileStatTile,
          {
            borderColor:
              theme === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
            backgroundColor:
              theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
          },
        ]}
      >
        <View style={styles.profileStatTopRow}>
          <Ionicons name={icon} size={14} color={accent || colors.primary} />
          <Text style={styles.profileStatLabel}>{label}</Text>
        </View>
        <Text style={[styles.profileStatValue, { color: colors.text }]}>
          {value}
        </Text>
        {subtitle ? (
          <Text style={[styles.profileStatSubtitle, { color: colors.text }]}>
            {subtitle}
          </Text>
        ) : null}
      </TileContainer>
    );
  };

  const ProfileSection = () => (
    <SectionCard title="Profile">
      {user ? (
        <View style={styles.profileContainer}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={["#4a90e2", "#9013fe"]}
                style={styles.avatarGradient}
              >
                <View style={styles.avatarInner}>
                  {user?.displayName && (
                    <Text style={styles.avatarInitial}>
                      {user.displayName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
              </LinearGradient>
              <View
                style={[
                  styles.profileStatusDot,
                  {
                    backgroundColor:
                      backendStatus?.available === true ? "#10B981" : "#EF4444",
                  },
                ]}
              />
            </View>
            <View style={styles.profileInfo}>
              <Text
                style={[styles.profileName, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {user.displayName || "No Username Set"}
              </Text>
              <Text
                style={[styles.profileEmail, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {user.email}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.signOutButton, { backgroundColor: "#ff3b30" }]}
              onPress={handleSignOut}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.buttonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.profileStatsPanel,
              {
                borderColor:
                  theme === "dark"
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.08)",
                backgroundColor:
                  theme === "dark"
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.015)",
              },
            ]}
          >
            <View style={styles.profileStatsHeader}>
              <Text style={[styles.profileStatsTitle, { color: colors.text }]}>
                Profile Insights
              </Text>
              {insightsLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : null}
            </View>
            <View style={styles.profileStatsGrid}>
              <ProfileStatTile
                icon="sparkles-outline"
                label="Level"
                value={`${profileInsights.levelIcon} L${profileInsights.level}`}
                accent="#8B5CF6"
              />
              <ProfileStatTile
                icon="flash-outline"
                label="XP"
                value={`${profileInsights.xp}`}
                subtitle={
                  profileInsights.xpProgressText === "MAX"
                    ? "Max level"
                    : `${profileInsights.xpProgressText} in level`
                }
                accent="#F59E0B"
              />
              <ProfileStatTile
                icon="heart-outline"
                label="Favorites"
                value={`${profileInsights.favorites}`}
                accent="#E11D48"
              />
              <ProfileStatTile
                icon="list-outline"
                label="Watchlists"
                value={`${profileInsights.watchlists}`}
                accent="#06B6D4"
              />
              <ProfileStatTile
                icon="flame-outline"
                label="Streak"
                value={`${profileInsights.streak}`}
                subtitle="Current"
                accent="#EF4444"
              />
              <ProfileStatTile
                icon="trophy-outline"
                label="Badges"
                value={`${profileInsights.badges}`}
                subtitle="Tap to view"
                accent="#10B981"
                onPress={() => setBadgesModalVisible(true)}
              />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.notLoggedIn}>
          <Text
            style={[
              styles.settingDescription,
              { color: colors.text, textAlign: "center" },
            ]}
          >
            Not logged in. Please log in from the Auth screen.
          </Text>
        </View>
      )}
    </SectionCard>
  );

  const StreamingSubscriptionsSection = () => {
    return (
      <SectionCard title="Streaming Services">
        <TouchableOpacity
          style={[
            styles.manageSubscriptionsButton,
            {
              borderColor:
                theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
            },
          ]}
          onPress={() => navigation.navigate("ManageSubscriptions")}
          activeOpacity={0.6}
        >
          <View style={styles.buttonContent}>
            <View style={styles.buttonLeft}>
              <Ionicons
                name="tv-outline"
                size={20}
                color={colors.text}
                style={{ opacity: 0.6, marginRight: 12 }}
              />
              <View>
                <Text style={[styles.buttonTitle, { color: colors.text }]}>
                  Manage Subscriptions
                </Text>
                <Text style={[styles.buttonSubtitle, { color: colors.text }]}>
                  Customize your streaming services
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.text}
              style={{ opacity: 0.3 }}
            />
          </View>
        </TouchableOpacity>
      </SectionCard>
    );
  };

  const AboutSection = () => (
    <SectionCard title="About">
      <View style={styles.aboutContainer}>
        <View style={styles.aboutDetails}>
          <Text style={[styles.appName, { color: colors.text }]}>CineLink</Text>
          <Text style={[styles.appVersion, { color: colors.text }]}>
            Version {Constants.expoConfig.version || "1.0.0"}
          </Text>
          <Text style={[styles.appDescription, { color: colors.text }]}>
            Your ultimate movie companion app, designed to help you discover,
            organize, and enjoy your favorite films.
          </Text>

          <Text style={[styles.apiCredit, { color: colors.text }]}>
            Powered by TMDB API
          </Text>
        </View>
      </View>
      <View style={styles.legalContainer}>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Privacy Policy", "Respect my privacy plzzzz")
          }
          style={styles.legalLink}
        >
          <Text style={[styles.legalText, { color: colors.text }]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Terms of Service", "Feed me Shawarma and biryani")
          }
          style={styles.legalLink}
        >
          <Text style={[styles.legalText, { color: colors.text }]}>
            Terms of Service
          </Text>
        </TouchableOpacity>
      </View>
    </SectionCard>
  );

  // Add Backend Status section before App Updates
  const BackendStatusSection = () => (
    <SectionCard title="Backend Status">
      <View style={styles.backendStatusContainer}>
        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.text }]}>
            Connection Status
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  backendStatus?.available === true ? "#10B981" : "#EF4444",
              },
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {backendStatus?.available ? "Connected" : "Disconnected"}
            </Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.text }]}>
            Base URL
          </Text>
          <Text
            style={[styles.statusValue, { color: colors.text }]}
            numberOfLines={1}
          >
            {backendStatus?.baseUrl || "Unknown"}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={[styles.statusLabel, { color: colors.text }]}>
            Last Tested
          </Text>
          <Text style={[styles.statusValue, { color: colors.text }]}>
            {backendStatus?.tested ? "Yes" : "No"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.testButton, { backgroundColor: colors.primary }]}
          onPress={handleRetestBackend}
          disabled={backendStatus?.testing}
        >
          <Ionicons
            name="refresh"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.buttonText}>
            {backendStatus?.testing ? "Testing..." : "Test Connection"}
          </Text>
        </TouchableOpacity>
      </View>
    </SectionCard>
  );

  return (
    <>
      <ScrollView
        style={[
          styles.container,
          {
            backgroundColor: theme === "dark" ? "#121212" : "#f2f2f7",
            paddingTop: insets.top + 8,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileSection />

        {/* <BackendStatusSection /> */}

        {/* App Updates */}
        <SectionCard title="App Updates">
          {isExpoGo ? (
            <View style={styles.infoRow}>
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={colors.text}
              />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Updates are unavailable in Expo Go.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.settingRow}>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Update over Wi-Fi only
                  </Text>
                  <Text
                    style={[styles.settingDescription, { color: colors.text }]}
                  >
                    Download updates only when connected to Wi-Fi
                  </Text>
                </View>
                <Switch
                  value={updateOverWifi}
                  onValueChange={setUpdateOverWifi}
                  trackColor={{ false: "#ccc", true: colors.primary }}
                  thumbColor={updateOverWifi ? colors.primary : "#f4f3f4"}
                />
              </View>

              <View
                style={[
                  styles.updateStatusRow,
                  {
                    borderColor:
                      theme === "dark"
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.08)",
                    backgroundColor:
                      theme === "dark"
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(0,0,0,0.02)",
                  },
                ]}
              >
                <View style={styles.updateStatusMain}>
                  <View style={styles.updateStatusTitleRow}>
                    <Ionicons
                      name={updateStatusConfig.icon}
                      size={16}
                      color={updateStatusConfig.color}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.updateStatusTitle,
                        { color: updateStatusConfig.color },
                      ]}
                    >
                      {updateStatusConfig.title}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.updateStatusSubtitle,
                      {
                        color:
                          theme === "dark"
                            ? "rgba(255,255,255,0.72)"
                            : "rgba(0,0,0,0.58)",
                      },
                    ]}
                  >
                    {updateStatusConfig.subtitle}
                  </Text>
                </View>
                <View
                  style={[
                    styles.versionPill,
                    {
                      backgroundColor:
                        theme === "dark"
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(0,0,0,0.06)",
                      borderColor:
                        theme === "dark"
                          ? "rgba(255,255,255,0.12)"
                          : "rgba(0,0,0,0.1)",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.versionPillText,
                      {
                        color:
                          theme === "dark"
                            ? "rgba(255,255,255,0.9)"
                            : "rgba(0,0,0,0.72)",
                      },
                    ]}
                  >
                    v{appVersion}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary, marginTop: 12 },
                ]}
                onPress={updateAvailable ? handleUpdate : checkForUpdates}
                disabled={isCheckingUpdate}
              >
                <Ionicons
                  name={
                    isCheckingUpdate
                      ? "sync"
                      : updateAvailable
                        ? "download"
                        : "cloud-download-outline"
                  }
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.buttonText}>
                  {isCheckingUpdate
                    ? "Checking..."
                    : updateAvailable
                      ? "Download Update"
                      : "Check for Updates"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </SectionCard>

        {/* Appearance */}
        <SectionCard title="Appearance">
          <Animated.View
            style={[
              styles.themeCard,
              {
                backgroundColor: theme === "dark" ? "#2c2c2c" : "#f9f9f9",
              },
            ]}
          >
            <LinearGradient
              colors={
                theme === "dark"
                  ? ["#1e88e5", "#1976d2"]
                  : ["#1976d2", "#1e88e5"]
              }
              style={styles.gradientOverlay}
            />
            <View style={styles.themeRow}>
              <Ionicons
                name={theme === "dark" ? "moon" : "sunny"}
                size={28}
                color={theme === "dark" ? "#fff" : "#333"}
                style={styles.themeIcon}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  {theme === "dark" ? "Dark Mode" : "Light Mode"}
                </Text>
                <Text
                  style={[styles.settingDescription, { color: colors.text }]}
                >
                  Switch between light and dark themes
                </Text>
              </View>
              <Switch
                value={theme === "dark"}
                onValueChange={toggleTheme}
                trackColor={{
                  false: "#ccc",
                  true: theme === "dark" ? "#1e88e5" : "#1976d2",
                }}
                thumbColor={theme === "dark" ? "#fff" : "#333"}
              />
            </View>
          </Animated.View>
        </SectionCard>

        {/* Streaming Subscriptions */}
        <StreamingSubscriptionsSection />

        {/* About */}
        <AboutSection />
      </ScrollView>

      <BadgesModal
        visible={badgesModalVisible}
        onClose={() => setBadgesModalVisible(false)}
        unlockedAchievements={profileInsights.unlockedAchievements}
        colors={colors}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  sectionCard: {
    borderRadius: 14,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 15 },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  settingLabel: { fontSize: 15, fontWeight: "500" },
  settingDescription: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  manageSubscriptionsButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  buttonTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  buttonSubtitle: {
    fontSize: 12,
    opacity: 0.5,
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoText: { fontSize: 14, marginLeft: 8, flex: 1 },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  themeCard: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 5,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
  },
  themeIcon: {
    padding: 8,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginRight: 15,
  },
  profileContainer: {
    gap: 14,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  avatarContainer: {
    marginRight: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileStatusDot: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
    zIndex: 2,
  },
  avatarGradient: {
    width: 54,
    height: 54,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarInner: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  avatarInitial: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 2,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginLeft: 10,
  },
  profileStatsPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  profileStatsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  profileStatsTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  profileStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  profileStatTile: {
    flexBasis: "48%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  profileStatTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  profileStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.45,
    textTransform: "uppercase",
  },
  profileStatValue: {
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 20,
  },
  profileStatSubtitle: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 3,
  },
  notLoggedIn: {
    paddingVertical: 20,
    alignItems: "center",
  },
  aboutContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  aboutDetails: {
    flex: 1,
  },
  appName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 12,
  },
  legalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
  },
  legalLink: {
    padding: 5,
  },
  legalText: {
    fontSize: 13,
    opacity: 0.6,
  },
  apiCredit: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 18,
    fontStyle: "italic",
  },
  updateStatusRow: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  updateStatusMain: {
    flex: 1,
    marginRight: 12,
  },
  updateStatusTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  updateStatusTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  updateStatusSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  versionPill: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  versionPillText: {
    fontSize: 12,
    fontWeight: "500",
  },
  backendStatusContainer: {
    paddingVertical: 10,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  statusValue: {
    fontSize: 12,
    opacity: 0.7,
    flex: 1,
    textAlign: "right",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  testButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
});

export default SettingsScreen;
