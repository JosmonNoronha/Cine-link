import React, { useState, useEffect, useRef } from "react";
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
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as Updates from "expo-updates";
import NetInfo from "@react-native-community/netinfo";
import { useCustomTheme } from "../contexts/ThemeContext";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from "../firebaseConfig";

const SettingsScreen = () => {
  const { colors } = useTheme();
  const { theme, toggleTheme } = useCustomTheme();
  const [updateOverWifi, setUpdateOverWifi] = useState(false);
  const [isExpoGo, setIsExpoGo] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [changelog, setChangelog] = useState('');
  const [isFetchingChangelog, setIsFetchingChangelog] = useState(false);
  const [user, setUser] = useState(null);
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

  const checkForUpdates = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      setUpdateAvailable(update.isAvailable);
    } catch (error) {
      console.error("Error checking for updates:", error);
    }
  };

  const fetchChangelog = async () => {
    try {
      // Replace with your actual GitHub repo (e.g., 'username/cinelink')
      const response = await fetch('https://api.github.com/repos/username/cinelink/releases/latest');
      if (!response.ok) {
        throw new Error('Failed to fetch release info');
      }
      const data = await response.json();
      setChangelog(data.body || 'No detailed changes available.');
    } catch (error) {
      console.error('Error fetching changelog:', error);
      setChangelog('Failed to load update details. Proceed anyway?');
    }
  };

  const handleUpdate = async () => {
    if (isExpoGo) {
      Alert.alert(
        "Not Available in Expo Go",
        "Please build a development version of the app to test update functionality."
      );
      return;
    }

    try {
      const netInfo = await NetInfo.fetch();
      if (updateOverWifi && netInfo.type !== "wifi") {
        Alert.alert(
          "WiFi Required",
          "Please connect to WiFi to update the app"
        );
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setIsFetchingChangelog(true);
        await fetchChangelog();
        setShowUpdateModal(true);
        setIsFetchingChangelog(false);
      } else {
        Alert.alert("No Updates", "Your app is up to date");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to check for updates");
      console.error("Error updating app:", error);
    }
  };

  const applyUpdate = async () => {
    setShowUpdateModal(false);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      Alert.alert("Error", "Failed to apply update");
      console.error("Error applying update:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.log("Sign Out Error", error.message);
    }
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

  const ProfileSection = () => (
    <SectionCard title="Profile">
      {user ? (
        <View style={styles.profileContainer}>
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
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {user.displayName || "No Username Set"}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.text }]}>
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

  const AboutSection = () => (
    <SectionCard title="About">
      <View style={styles.aboutContainer}>
        
        <View style={styles.aboutDetails}>
          <Text style={[styles.appName, { color: colors.text }]}>
            CineLink
          </Text>
          <Text style={[styles.appVersion, { color: colors.text }]}>
            Version {Constants.expoConfig.version || "1.0.0"}
          </Text>
          <Text style={[styles.appDescription, { color: colors.text }]}>
            Your ultimate movie companion app, designed to help you discover,
            organize, and enjoy your favorite films.
          </Text>
          
          <Text style={[styles.apiCredit, { color: colors.text }]}>
            Powered by OMDB API
          </Text>
        </View>
      </View>
      <View style={styles.legalContainer}>
        <TouchableOpacity
          onPress={() => Alert.alert("Privacy Policy", "Respect my privacy plzzz")}
          style={styles.legalLink}
        >
          <Text style={[styles.legalText, { color: colors.text }]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Alert.alert("Terms of Service", "Feed me Shawarma and biryani")}
          style={styles.legalLink}
        >
          <Text style={[styles.legalText, { color: colors.text }]}>
            Terms of Service
          </Text>
        </TouchableOpacity>
      </View>
    </SectionCard>
  );

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: theme === "dark" ? "#121212" : "#f2f2f7" },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ProfileSection />

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
              Updates are unavailable in Expo Go. Please use a development build
              to test.
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
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleUpdate}
            >
              <Ionicons
                name="cloud-download-outline"
                size={20}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.buttonText}>
                {updateAvailable ? "Update Available" : "Check for Updates"}
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
              theme === "dark" ? ["#1e88e5", "#1976d2"] : ["#1976d2", "#1e88e5"]
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
              <Text style={[styles.settingDescription, { color: colors.text }]}>
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

      {/* About */}
      <AboutSection />

      {/* Update Details Modal */}
      <Modal
        visible={showUpdateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {isFetchingChangelog ? (
              <Text style={[styles.modalBody, { color: colors.text }]}>Loading details...</Text>
            ) : (
              <>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Update Available</Text>
                <Text style={[styles.modalBody, { color: colors.text }]}>What's new:</Text>
                <ScrollView style={styles.changelogScroll}>
                  <Text style={[styles.changelogText, { color: colors.text }]}>{changelog}</Text>
                </ScrollView>
              </>
            )}
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: colors.primary }]}
              onPress={applyUpdate}
            >
              <Text style={styles.buttonText}>Update Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.laterButton}
              onPress={() => setShowUpdateModal(false)}
            >
              <Text style={[styles.buttonText, { color: colors.primary }]}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
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
  avatarIcon: {
    position: "absolute",
    opacity: 0.5,
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
  profileId: {
    fontSize: 12,
    opacity: 0.5,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
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
  appLogoContainer: {
    marginRight: 15,
  },
  appLogoGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  appLogoText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
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
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "500",
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 16,
    marginBottom: 10,
  },
  changelogScroll: {
    maxHeight: 200,
    marginBottom: 20,
  },
  changelogText: {
    fontSize: 14,
    textAlign: 'left',
  },
  updateButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 10,
  },
  laterButton: {
    paddingVertical: 10,
  },
});

export default SettingsScreen;