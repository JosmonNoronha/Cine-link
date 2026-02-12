import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const WatchProvidersSection = React.memo(
  ({ providers, userSubscriptions, loading, colors, theme }) => {
    console.log("🎬 WatchProvidersSection render:", {
      loading,
      providers,
      userSubscriptions,
    });

    if (loading) {
      return (
        <View
          style={[
            styles.watchProvidersSection,
            { backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Where to Watch
          </Text>
          <ActivityIndicator size="small" color={colors.text} />
        </View>
      );
    }

    // Debug: Show section even with no data
    const hasData =
      providers &&
      (providers.streaming?.length ||
        providers.rent?.length ||
        providers.buy?.length);

    if (!hasData) {
      console.log("⚠️ No providers data:", providers);
      return (
        <View
          style={[
            styles.watchProvidersSection,
            { backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Where to Watch
          </Text>
          <Text style={[styles.cast, { color: colors.text, opacity: 0.6 }]}>
            No streaming information available for this title
          </Text>
        </View>
      );
    }

    const hasUserSubs = userSubscriptions && userSubscriptions.length > 0;
    const availableOnSubs =
      hasUserSubs &&
      providers.streaming?.some((p) => userSubscriptions.includes(p.id));

    return (
      <View
        style={[styles.watchProvidersSection, { backgroundColor: colors.card }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Where to Watch
        </Text>

        {availableOnSubs && (
          <View style={[styles.availableBadge, { backgroundColor: "#10b981" }]}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.availableBadgeText}>
              Available on your services
            </Text>
          </View>
        )}

        {/* Streaming Providers */}
        {providers.streaming && providers.streaming.length > 0 && (
          <View style={styles.providerCategory}>
            <Text
              style={[styles.providerCategoryTitle, { color: colors.text }]}
            >
              Stream
            </Text>
            <View style={styles.providersList}>
              {providers.streaming.map((provider) => {
                const isUserSubscribed =
                  hasUserSubs && userSubscriptions.includes(provider.id);
                return (
                  <View
                    key={provider.id}
                    style={[
                      styles.providerItem,
                      {
                        backgroundColor:
                          theme === "dark"
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(0,0,0,0.03)",
                        borderWidth: isUserSubscribed ? 2 : 0,
                        borderColor: isUserSubscribed
                          ? "#10b981"
                          : "transparent",
                      },
                    ]}
                  >
                    {provider.logo ? (
                      <Image
                        source={{ uri: provider.logo }}
                        style={styles.providerLogo}
                        contentFit="contain"
                      />
                    ) : (
                      <View
                        style={[
                          styles.providerLogoPlaceholder,
                          { backgroundColor: provider.color },
                        ]}
                      >
                        <Ionicons name={provider.icon} size={20} color="#fff" />
                      </View>
                    )}
                    <Text
                      style={[styles.providerName, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {provider.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Rent Providers */}
        {providers.rent && providers.rent.length > 0 && (
          <View style={styles.providerCategory}>
            <Text
              style={[styles.providerCategoryTitle, { color: colors.text }]}
            >
              Rent
            </Text>
            <View style={styles.providersList}>
              {providers.rent.slice(0, 4).map((provider) => (
                <View
                  key={provider.id}
                  style={[
                    styles.providerItem,
                    {
                      backgroundColor:
                        theme === "dark"
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.03)",
                    },
                  ]}
                >
                  {provider.logo ? (
                    <Image
                      source={{ uri: provider.logo }}
                      style={styles.providerLogo}
                      contentFit="contain"
                    />
                  ) : (
                    <View
                      style={[
                        styles.providerLogoPlaceholder,
                        { backgroundColor: provider.color },
                      ]}
                    >
                      <Ionicons name={provider.icon} size={20} color="#fff" />
                    </View>
                  )}
                  <Text
                    style={[styles.providerName, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {provider.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {providers.link && (
          <TouchableOpacity
            style={[
              styles.justWatchLink,
              {
                backgroundColor:
                  theme === "dark"
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={() => Linking.openURL(providers.link)}
          >
            <Text style={[styles.justWatchText, { color: colors.text }]}>
              View all options on JustWatch
            </Text>
            <Ionicons name="open-outline" size={16} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

WatchProvidersSection.displayName = "WatchProvidersSection";

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  cast: {
    fontSize: 14,
    lineHeight: 20,
  },
  watchProvidersSection: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  availableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  availableBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  providerCategory: {
    marginBottom: 16,
  },
  providerCategoryTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
    opacity: 0.8,
  },
  providersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  providerItem: {
    width: 70,
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
  },
  providerLogo: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginBottom: 6,
  },
  providerLogoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginBottom: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  providerName: {
    fontSize: 11,
    textAlign: "center",
    fontWeight: "500",
  },
  justWatchLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
  },
  justWatchText: {
    fontSize: 13,
    fontWeight: "500",
  },
});

export default WatchProvidersSection;
