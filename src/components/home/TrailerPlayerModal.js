import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  Linking,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCustomTheme } from "../../contexts/ThemeContext";

/**
 * Full-screen trailer player for a home-screen trailer.
 * trailer = { id, mediaType, title, overview, trailer: { key } } or null (closed).
 */
const TrailerPlayerModal = ({ trailer, onClose, onViewDetails, colors }) => {
  const { width } = useWindowDimensions();
  const { theme } = useCustomTheme();
  const isDark = theme === "dark";
  const bg = colors?.background || (isDark ? "#000" : "#fff");
  const text = colors?.text || (isDark ? "#fff" : "#111");
  const [playing, setPlaying] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setPlaying(true);
    setFailed(false);
  }, [trailer?.trailer?.key]);

  const onState = useCallback((s) => {
    if (s === "ended") setPlaying(false);
  }, []);
  const onError = useCallback(() => setFailed(true), []);
  const openYouTube = useCallback(() => {
    if (trailer?.trailer?.key)
      Linking.openURL(`https://www.youtube.com/watch?v=${trailer.trailer.key}`).catch(() => {});
  }, [trailer]);

  const key = trailer?.trailer?.key;
  const useWebLink = Platform.OS === "web" || failed;

  return (
    <Modal
      visible={Boolean(trailer)}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <SafeAreaView style={[styles.screen, { backgroundColor: bg }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close trailer"
            style={[
              styles.close,
              { backgroundColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)" },
            ]}
          >
            <Ionicons name="close" size={26} color={text} />
          </Pressable>
        </View>

        {trailer && (
          <View style={styles.body}>
            {useWebLink ? (
              <View style={[styles.fallback, { width, height: Math.round((width * 9) / 16) }]}>
                <Text style={styles.fallbackText}>
                  {failed ? "This trailer can't be played here." : "Open the trailer on YouTube."}
                </Text>
                <Pressable onPress={openYouTube} style={[styles.button, { backgroundColor: "#e53935" }]}>
                  <Ionicons name="logo-youtube" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Open on YouTube</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.playerBox}>
                <YoutubePlayer
                  height={Math.round((width * 9) / 16)}
                  width={width}
                  play={playing}
                  videoId={key}
                  onChangeState={onState}
                  onError={onError}
                />
              </View>
            )}

            <View style={styles.info}>
              <Text style={[styles.title, { color: text }]}>{trailer.title}</Text>
              {!!trailer.overview && (
                <Text style={[styles.overview, { color: text }]} numberOfLines={5}>
                  {trailer.overview}
                </Text>
              )}
              <Pressable
                onPress={() => onViewDetails(trailer)}
                accessibilityRole="button"
                style={[styles.button, { backgroundColor: colors?.primary || "#1e88e5" }]}
              >
                <Text style={styles.buttonText}>View details</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default React.memo(TrailerPlayerModal);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  playerBox: { backgroundColor: "#000" },
  topBar: { paddingHorizontal: 16, paddingVertical: 8, alignItems: "flex-end" },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  body: { flex: 1, justifyContent: "flex-start" },
  info: { padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: "800", lineHeight: 27 },
  overview: { opacity: 0.78, fontSize: 14, lineHeight: 20 },
  button: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 22,
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  fallback: { alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: "#12151c" },
  fallbackText: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
});