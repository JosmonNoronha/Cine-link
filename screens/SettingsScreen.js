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
  const [isExpoGo, setIsExpoGo] = useState(false);
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
        Alert.alert("WiFi Required", "Please connect to WiFi to update the app");
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

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: theme === "dark" ? "#121212" : "#f2f2f7" },
      ]}
      showsVerticalScrollIndicator={false}
    >
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
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
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
              name="moon-outline"
              size={28}
              color={theme === "dark" ? "#fff" : "#333"}
              style={styles.themeIcon}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Dark Mode
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

      {/* Account */}
      <SectionCard title="Account">
        {user ? (
          <>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                Email
              </Text>
              <Text
                style={[styles.settingDescription, { color: colors.text }]}
              >
                {user.email}
              </Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                User ID
              </Text>
              <Text
                style={[styles.settingDescription, { color: colors.text }]}
              >
                {user.uid}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: "#ff3b30" }]}
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
      </SectionCard>
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
});

export default SettingsScreen;
