import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useCustomTheme } from "../contexts/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth } from "../../firebaseConfig";
import { getUserSubscriptions, updateUserSubscriptions } from "../services/api";
import { getProviderOptions } from "../config/streamingProviders";

const ManageSubscriptionsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const [user, setUser] = useState(null);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [savingSubscriptions, setSavingSubscriptions] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialSubscriptions, setInitialSubscriptions] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        loadUserSubscriptions();
      }
    });
    return unsubscribe;
  }, []);

  const loadUserSubscriptions = async () => {
    setLoadingSubscriptions(true);
    try {
      const subscriptions = await getUserSubscriptions();
      setUserSubscriptions(subscriptions);
      setInitialSubscriptions(subscriptions);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const toggleSubscription = (providerId) => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to save your subscriptions");
      return;
    }

    setUserSubscriptions((prev) => {
      const newSubs = prev.includes(providerId)
        ? prev.filter((id) => id !== providerId)
        : [...prev, providerId];
      
      // Check if there are changes
      const changed = JSON.stringify(newSubs.sort()) !== JSON.stringify(initialSubscriptions.sort());
      setHasChanges(changed);
      
      return newSubs;
    });
  };

  const saveSubscriptions = async () => {
    if (!user) return;
    
    setSavingSubscriptions(true);
    try {
      await updateUserSubscriptions(userSubscriptions);
      setInitialSubscriptions(userSubscriptions);
      setHasChanges(false);
      Alert.alert("Success", "Your streaming subscriptions have been saved!");
    } catch (error) {
      console.error("Failed to save subscriptions:", error);
      Alert.alert("Error", "Failed to save your subscriptions. Please try again.");
    } finally {
      setSavingSubscriptions(false);
    }
  };

  const cancelChanges = () => {
    setUserSubscriptions(initialSubscriptions);
    setHasChanges(false);
  };

  const providers = getProviderOptions();
  const selectedCount = userSubscriptions.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Manage Subscriptions
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Info Card */}
        <LinearGradient
          colors={theme === "dark" ? ["#1e3a8a", "#1e40af"] : ["#3b82f6", "#2563eb"]}
          style={styles.infoCard}
        >
          <Ionicons name="information-circle" size={32} color="#fff" />
          <Text style={styles.infoTitle}>Why Add Your Subscriptions?</Text>
          <Text style={styles.infoText}>
            • See which movies/shows are available on your services{"\n"}
            • Get personalized recommendations{"\n"}
            • Filter content by your streaming platforms{"\n"}
            • Discover what's trending on services you have
          </Text>
        </LinearGradient>

        {/* Stats Card */}
        {user && (
          <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{selectedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>Active Services</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>{providers.length}</Text>
              <Text style={[styles.statLabel, { color: colors.text }]}>Available Services</Text>
            </View>
          </View>
        )}

        {/* Sign In Prompt */}
        {!user && (
          <View style={[styles.signInPrompt, { backgroundColor: colors.card }]}>
            <Ionicons name="lock-closed-outline" size={40} color={colors.text} />
            <Text style={[styles.signInTitle, { color: colors.text }]}>
              Sign In to Save Your Preferences
            </Text>
            <Text style={[styles.signInText, { color: colors.text }]}>
              Create an account or sign in to save your streaming subscriptions across all your devices
            </Text>
          </View>
        )}

        {/* Subscriptions Grid */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Select Your Services
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.text }]}>
            Tap on the services you're subscribed to
          </Text>

          {loadingSubscriptions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Loading your subscriptions...
              </Text>
            </View>
          ) : (
            <View style={styles.subscriptionsGrid}>
              {providers.map((provider) => {
                const isSelected = userSubscriptions.includes(provider.id);
                return (
                  <TouchableOpacity
                    key={provider.id}
                    style={[
                      styles.subscriptionItem,
                      {
                        backgroundColor: theme === "dark"
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)",
                        borderWidth: isSelected ? 3 : 1,
                        borderColor: isSelected
                          ? "#10b981"
                          : theme === "dark"
                          ? "#333"
                          : "#ddd",
                      },
                    ]}
                    onPress={() => toggleSubscription(provider.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.subscriptionIconContainer,
                        { backgroundColor: provider.color },
                      ]}
                    >
                      <Ionicons name={provider.icon} size={28} color="#fff" />
                    </View>
                    <Text
                      style={[styles.subscriptionName, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {provider.name}
                    </Text>
                    {isSelected && (
                      <View style={styles.subscriptionCheckmark}>
                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button (Fixed at bottom when changes are made) */}
      {hasChanges && user && (
        <View style={[styles.actionBar, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: "transparent", borderColor: colors.border, borderWidth: 1 }]}
            onPress={cancelChanges}
            disabled={savingSubscriptions}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: "#10b981" }]}
            onPress={saveSubscriptions}
            disabled={savingSubscriptions}
          >
            {savingSubscriptions ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#fff",
    lineHeight: 22,
    opacity: 0.95,
  },
  statsCard: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  statDivider: {
    width: 1,
    marginHorizontal: 20,
  },
  signInPrompt: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  signInTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  signInText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    opacity: 0.7,
  },
  subscriptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  subscriptionItem: {
    width: "30%",
    aspectRatio: 1,
    padding: 12,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  subscriptionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  subscriptionName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  subscriptionCheckmark: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  actionBar: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ManageSubscriptionsScreen;
