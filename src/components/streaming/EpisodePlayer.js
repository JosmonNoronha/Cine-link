import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Platform, Linking, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import YoutubePlayer from "react-native-youtube-iframe";
import { youtubeWatchUrl } from "../../utils/streamingHelpers";

const { width: SCREEN_W } = Dimensions.get("window");
const PLAYER_W = SCREEN_W - 32;
const PLAYER_H = Math.round(PLAYER_W * (9 / 16));

// Keep the WebView isolated from the theme-dependent episode controls.
const PlayerFrame = React.memo(({ videoId, playing, onState, onError }) => (
  <View style={styles.player}>
    <YoutubePlayer
      height={PLAYER_H}
      width={PLAYER_W}
      play={playing}
      videoId={videoId}
      onChangeState={onState}
      onError={onError}
    />
  </View>
));
PlayerFrame.displayName = "PlayerFrame";

/**
 * Plays one episode with the official YouTube player. If the video cannot be embedded here,
 * the fallback video is tried once, then the viewer is offered "Open on YouTube".
 * Never autoplays the next episode; shows a button instead.
 */
const EpisodePlayer = ({ episode, title, nextEpisode, hasPrev, onPrev, onNext, onEnded, onClose, colors, isDark }) => {
  const [playing, setPlaying] = useState(true);
  const [useAlt, setUseAlt] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    setPlaying(true);
    setUseAlt(false);
    setFailed(false);
    setEnded(false);
  }, [episode.n]);

  const videoId = useAlt && episode.altVideoId ? episode.altVideoId : episode.videoId;

  // Latest values in refs so the two handlers below keep one identity for the whole session
  const latest = useRef({});
  latest.current = { n: episode.n, alt: episode.altVideoId, useAlt, onEnded };

  const handleError = useCallback(() => {
    const { alt, useAlt: usingAlt } = latest.current;
    if (!usingAlt && alt) setUseAlt(true);
    else setFailed(true);
  }, []);

  const handleState = useCallback((state) => {
    if (state === "ended") {
      setPlaying(false);
      setEnded(true);
      latest.current.onEnded?.(latest.current.n);
    }
  }, []);

  const openYouTube = useCallback(() => Linking.openURL(youtubeWatchUrl(videoId)), [videoId]);
  const soft = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const inApp = Platform.OS !== "web" && !failed;

  return (
    <View style={styles.wrap}>
      {inApp ? (
        <PlayerFrame
          videoId={videoId}
          playing={playing}
          onState={handleState}
          onError={handleError}
        />
      ) : (
        <View style={[styles.fallback, { backgroundColor: soft }]}>
          <Ionicons name="logo-youtube" size={34} color="#ff0033" />
          <Text style={[styles.fallbackText, { color: colors.text }]}>
            {failed ? "This video can't be played inside the app here." : "Watch this episode on YouTube."}
          </Text>
          <Pressable onPress={openYouTube} style={[styles.openBtn, { backgroundColor: colors.primary }]} accessibilityRole="button">
            <Text style={styles.openText}>Open on YouTube</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.controls}>
        <Pressable onPress={onPrev} disabled={!hasPrev} hitSlop={8} style={[styles.iconBtn, { backgroundColor: soft }, !hasPrev && styles.disabled]} accessibilityLabel="Previous episode">
          <Ionicons name="play-skip-back" size={18} color={colors.text} />
        </Pressable>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            Episode {episode.n}
          </Text>
          {title ? (
            <Text style={[styles.sub, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={onNext} disabled={!nextEpisode} hitSlop={8} style={[styles.iconBtn, { backgroundColor: soft }, !nextEpisode && styles.disabled]} accessibilityLabel="Next episode">
          <Ionicons name="play-skip-forward" size={18} color={colors.text} />
        </Pressable>
        <Pressable onPress={onClose} hitSlop={8} style={[styles.iconBtn, { backgroundColor: soft }]} accessibilityLabel="Close player">
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
      </View>

      {ended && nextEpisode ? (
        <Pressable onPress={onNext} style={[styles.nextBtn, { backgroundColor: colors.primary }]} accessibilityRole="button">
          <Ionicons name="play" size={16} color="#fff" />
          <Text style={styles.nextText}>Play episode {nextEpisode.n}</Text>
        </Pressable>
      ) : null}

      {inApp ? (
        <Pressable onPress={openYouTube} hitSlop={8} style={styles.linkRow} accessibilityRole="link">
          <Ionicons name="logo-youtube" size={14} color={colors.text} style={{ opacity: 0.55 }} />
          <Text style={[styles.linkText, { color: colors.text }]}>Not playing? Open on YouTube</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

export default React.memo(EpisodePlayer);

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 8 },
  player: { backgroundColor: "#000" },
  fallback: { height: PLAYER_H, borderRadius: 14, alignItems: "center", justifyContent: "center", gap: 10, padding: 16 },
  fallbackText: { fontSize: 14, textAlign: "center", opacity: 0.8 },
  openBtn: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: 20 },
  openText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  controls: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.3 },
  titleBox: { flex: 1 },
  title: { fontSize: 15, fontWeight: "800" },
  sub: { fontSize: 12, opacity: 0.6, marginTop: 1 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, paddingVertical: 12, borderRadius: 14 },
  nextText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center", marginTop: 10 },
  linkText: { fontSize: 12, opacity: 0.55 },
});
