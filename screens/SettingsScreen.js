import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import * as Updates from "expo-updates";
import NetInfo from "@react-native-community/netinfo";
import { useCustomTheme } from "../contexts/ThemeContext";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from "../firebaseConfig";
// Removed modular import: import { signOut } from "firebase/auth";

const SettingsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { theme, toggleTheme } = useCustomTheme();
  const [updateOverWifi, setUpdateOverWifi] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isExpoGo, setIsExpoGo] = useState(false);
  const [user, setUser] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIsExpoGo(Constants.appOwnership === "expo");
    if (!isExpoGo) {
      checkForUpdates();
    }
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

  const handleUpdate = async () => {
    if (isExpoGo) {
      Alert.alert(
        "Not Available in Expo Go",
        "Please build a development version of the app to test update functionality.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const netInfo = await NetInfo.fetch();
      if (updateOverWifi && netInfo.type !== "wifi") {
        Alert.alert(
          "WiFi Required",
          "Please connect to WiFi to update the app",
          [{ text: "OK" }]
        );
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        Alert.alert(
          "Update Downloaded",
          "The app will restart to apply the update",
          [
            {
              text: "Restart Now",
              onPress: () => Updates.reloadAsync(),
            },
          ]
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
      await auth.signOut(); // Namespace-based signOut
      navigation.replace("Auth");
    } catch (error) {
      console.log("Sign Out Error", error.message);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme === "dark" ? "#1a1a1a" : "#ffffff" },
      ]}
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          App Updates
        </Text>
        {isExpoGo ? (
          <View style={styles.expoGoMessage}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={colors.text}
            />
            <Text style={[styles.expoGoText, { color: colors.text }]}>
              Update functionality is not available in Expo Go. Please build a
              development version of the app to test updates.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Update over WiFi only
                </Text>
                <Text
                  style={[styles.settingDescription, { color: colors.text }]}
                >
                  Only download updates when connected to WiFi
                </Text>
              </View>
              <Switch
                value={updateOverWifi}
                onValueChange={setUpdateOverWifi}
                trackColor={{ false: "#767577", true: colors.primary }}
                thumbColor={updateOverWifi ? colors.primary : "#f4f3f4"}
              />
            </View>
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: colors.primary }]}
              onPress={handleUpdate}
            >
              <Ionicons name="cloud-download-outline" size={24} color="white" />
              <Text style={styles.updateButtonText}>
                {updateAvailable ? "Update Available" : "Check for Updates"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Appearance
        </Text>
        <Animated.View
          style={[
            styles.themeCard,
            {
              backgroundColor: theme === "dark" ? "#2c2c2c" : "#f9f9f9",
              opacity: fadeAnim,
            },
          ]}
        >
          <LinearGradient
            colors={
              theme === "dark" ? ["#1e88e5", "#1976d2"] : ["#1976d2", "#1e88e5"]
            }
            style={styles.gradientOverlay}
          />
          <View style={styles.themeContent}>
            <View style={styles.themeIconContainer}>
              <Ionicons
                name="moon-outline"
                size={28}
                color={theme === "dark" ? "#fff" : "#333"}
              />
            </View>
            <View style={styles.themeTextContainer}>
              <Text style={[styles.themeLabel, { color: colors.text }]}>
                Dark Theme
              </Text>
              <Text style={[styles.themeDescription, { color: colors.text }]}>
                Switch between light and dark modes
              </Text>
            </View>
            <Switch
              value={theme === "dark"}
              onValueChange={toggleTheme}
              trackColor={{
                false: "#d3d3d3",
                true: theme === "dark" ? "#1e88e5" : "#1976d2",
              }}
              thumbColor={theme === "dark" ? "#fff" : "#333"}
              style={styles.themeSwitch}
            />
          </View>
        </Animated.View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Account
        </Text>
        {user ? (
          <>
            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Email
                </Text>
                <Text
                  style={[styles.settingDescription, { color: colors.text }]}
                >
                  {user.email}
                </Text>
              </View>
            </View>
            <View style={styles.settingItem}>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  User ID
                </Text>
                <Text
                  style={[styles.settingDescription, { color: colors.text }]}
                >
                  {user.uid}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: "#ff4444" }]}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={24} color="white" />
              <Text style={styles.updateButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text
            style={[
              styles.settingDescription,
              { color: colors.text, textAlign: "center" },
            ]}
          >
            Not logged in. Please log in from the Auth screen.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    opacity: 0.7,
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  updateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  expoGoMessage: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
    marginTop: 20,
  },
  expoGoText: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
  },
  themeCard: {
    borderRadius: 15,
    padding: 15,
    marginTop: 10,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
    borderRadius: 15,
  },
  themeContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  themeIconContainer: {
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 50,
  },
  themeTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  themeLabel: {
    fontSize: 18,
    fontWeight: "600",
  },
  themeDescription: {
    fontSize: 12,
    opacity: 0.7,
  },
  themeSwitch: {
    transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
  },
});

export default SettingsScreen;
