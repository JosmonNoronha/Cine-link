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
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateDetails, setShowUpdateDetails] = useState(false);
  const [isExpoGo, setIsExpoGo] = useState(false);
  const [user, setUser] = useState(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
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
    if (isExpoGo) return;
    
    try {
      setIsCheckingUpdate(true);
      const update = await Updates.checkForUpdateAsync();
      setUpdateAvailable(update.isAvailable);
      
      if (update.isAvailable && update.manifest) {
        // Extract update information from the manifest
        const manifest = update.manifest;
        const updateDetails = {
          id: update.updateId,
          createdAt: update.createdAt,
          message: manifest.metadata?.updateMessage || manifest.extra?.expoClient?.updates?.fallbackToCacheTimeout || "No update message provided",
          version: manifest.extra?.expoClient?.version || Constants.expoConfig.version,
          runtimeVersion: manifest.runtimeVersion,
          bundleUrl: update.bundleUrl,
          // Additional details that might be available
          description: manifest.metadata?.description,
          changelog: manifest.metadata?.changelog,
        };
        setUpdateInfo(updateDetails);
      }
    } catch (error) {
      console.error("Error checking for updates:", error);
    } finally {
      setIsCheckingUpdate(false);
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
        await Updates.fetchUpdateAsync();
        Alert.alert(
          "Update Downloaded",
          "The app will restart to apply the update",
          [{ text: "Restart Now", onPress: () => Updates.reloadAsync() }]
        );
      } else {
        Alert.alert("No Updates", "Your app is up to date");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update the app");
      console.error("Error updating app:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.log("Sign Out Error", error.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString();
  };

  const UpdateDetailsModal = () => (
    <Modal
      visible={showUpdateDetails}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowUpdateDetails(false)}
    >
      <View style={[
        styles.modalContainer,
        { backgroundColor: theme === "dark" ? "#1f1f1f" : "#ffffff" }
      ]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Update Details
          </Text>
          <TouchableOpacity
            onPress={() => setShowUpdateDetails(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {updateInfo && (
            <>
              <View style={styles.updateDetailCard}>
                <View style={styles.updateDetailRow}>
                  <Ionicons name="information-circle" size={20} color={colors.primary} />
                  <View style={styles.updateDetailText}>
                    <Text style={[styles.updateDetailLabel, { color: colors.text }]}>
                      Update Message
                    </Text>
                    <Text style={[styles.updateDetailValue, { color: colors.text }]}>
                      {updateInfo.message}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.updateDetailCard}>
                <View style={styles.updateDetailRow}>
                  <Ionicons name="calendar" size={20} color={colors.primary} />
                  <View style={styles.updateDetailText}>
                    <Text style={[styles.updateDetailLabel, { color: colors.text }]}>
                      Release Date
                    </Text>
                    <Text style={[styles.updateDetailValue, { color: colors.text }]}>
                      {formatDate(updateInfo.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.updateDetailCard}>
                <View style={styles.updateDetailRow}>
                  <Ionicons name="code-working" size={20} color={colors.primary} />
                  <View style={styles.updateDetailText}>
                    <Text style={[styles.updateDetailLabel, { color: colors.text }]}>
                      Update ID
                    </Text>
                    <Text style={[styles.updateDetailValueMono, { color: colors.text }]}>
                      {updateInfo.id?.substring(0, 8)}...
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.updateDetailCard}>
                <View style={styles.updateDetailRow}>
                  <Ionicons name="apps" size={20} color={colors.primary} />
                  <View style={styles.updateDetailText}>
                    <Text style={[styles.updateDetailLabel, { color: colors.text }]}>
                      Version
                    </Text>
                    <Text style={[styles.updateDetailValue, { color: colors.text }]}>
                      {updateInfo.version}
                    </Text>
                  </View>
                </View>
              </View>

              {updateInfo.description && (
                <View style={styles.updateDetailCard}>
                  <View style={styles.updateDetailRow}>
                    <Ionicons name="document-text" size={20} color={colors.primary} />
                    <View style={styles.updateDetailText}>
                      <Text style={[styles.updateDetailLabel, { color: colors.text }]}>
                        Description
                      </Text>
                      <Text style={[styles.updateDetailValue, { color: colors.text }]}>
                        {updateInfo.description}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {updateInfo.changelog && (
                <View style={styles.updateDetailCard}>
                  <View style={styles.updateDetailRow}>
                    <Ionicons name="list" size={20} color={colors.primary} />
                    <View style={styles.updateDetailText}>
                      <Text style={[styles.updateDetailLabel, { color: colors.text }]}>
                        Changelog
                      </Text>
                      <Text style={[styles.updateDetailValue, { color: colors.text }]}>
                        {updateInfo.changelog}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setShowUpdateDetails(false);
              handleUpdate();
            }}
          >
            <Ionicons name="download" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Download Update</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
          onPress={() => Alert.alert("Privacy Policy", "Respect my privacy plzzzz")}
          style={styles.legalLink}
        >
          <Text style={[styles.legalText, { color: colors.text }]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Alert.alert("Terms of Service", "Feed me Shawarma and biryani and cake")}
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
    <>
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

              {updateAvailable && updateInfo && (
                <View style={[
                  styles.updateAvailableCard,
                  { backgroundColor: theme === "dark" ? "#2d4a2b" : "#e8f5e8" }
                ]}>
                  <View style={styles.updateAvailableHeader}>
                    <Ionicons 
                      name="cloud-download" 
                      size={24} 
                      color={theme === "dark" ? "#4ade80" : "#16a34a"} 
                    />
                    <View style={styles.updateAvailableText}>
                      <Text style={[
                        styles.updateAvailableTitle,
                        { color: theme === "dark" ? "#4ade80" : "#16a34a" }
                      ]}>
                        Update Available
                      </Text>
                      <Text style={[
                        styles.updateAvailableMessage,
                        { color: colors.text }
                      ]}>
                        {updateInfo.message}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.viewDetailsButton}
                    onPress={() => setShowUpdateDetails(true)}
                  >
                    <Text style={[
                      styles.viewDetailsText,
                      { color: theme === "dark" ? "#4ade80" : "#16a34a" }
                    ]}>
                      View Details
                    </Text>
                    <Ionicons 
                      name="chevron-forward" 
                      size={16} 
                      color={theme === "dark" ? "#4ade80" : "#16a34a"} 
                    />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={updateAvailable ? handleUpdate : checkForUpdates}
                disabled={isCheckingUpdate}
              >
                <Ionicons
                  name={isCheckingUpdate ? "sync" : updateAvailable ? "download" : "cloud-download-outline"}
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.buttonText}>
                  {isCheckingUpdate 
                    ? "Checking..." 
                    : updateAvailable 
                      ? "Download Update" 
                      : "Check for Updates"
                  }
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
      </ScrollView>
      
      <UpdateDetailsModal />
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
  // Update availability card
  updateAvailableCard: {
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
    marginBottom: 5,
  },
  updateAvailableHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  updateAvailableText: {
    flex: 1,
    marginLeft: 12,
  },
  updateAvailableTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  updateAvailableMessage: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 4,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  updateDetailCard: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  updateDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  updateDetailText: {
    flex: 1,
    marginLeft: 12,
  },
  updateDetailLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    opacity: 0.8,
  },
  updateDetailValue: {
    fontSize: 15,
    lineHeight: 22,
  },
  updateDetailValueMono: {
    fontSize: 14,
    fontFamily: "monospace",
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
  },
});

export default SettingsScreen;