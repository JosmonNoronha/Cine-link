/**
 * ProfileSection.js  —  compact, information-dense
 *
 * Props:
 *   user                 – Firebase user | null
 *   backendStatus        – { available: bool }
 *   profileInsights      – { level, levelIcon, xp, xpProgressText,
 *                            favorites, watchlists, streak, badges,
 *                            unlockedAchievements }
 *   insightsLoading      – bool
 *   onSignOut            – () => void
 *   onBadgesPress        – () => void
 *   theme                – "dark" | "light"
 *   colors               – react-navigation colors object
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import LevelSymbol, { LEVEL_META } from "./LevelSymbol";

// ─── Palette ──────────────────────────────────────────────────────────────────
const pal = (dark) => ({
  card: dark ? "#18181b" : "#ffffff",
  line: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
  text: dark ? "#e4e4e7" : "#18181b",
  sub: dark ? "rgba(228,228,231,0.42)" : "rgba(24,24,27,0.42)",
  muted: dark ? "rgba(228,228,231,0.22)" : "rgba(24,24,27,0.22)",
  chip: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
  chipBorder: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
  avatarBg: dark ? "#27272a" : "#f4f4f5",
  online: "#22c55e",
  offline: "#f87171",
  xpA: dark ? "#a1a1aa" : "#52525b",
  xpB: dark ? "#71717a" : "#a1a1aa",
  xpTrack: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
  danger: "#ef4444",
  shadow: dark ? "#000000" : "#64748b",
});

// ─── XP bar ───────────────────────────────────────────────────────────────────
const XPBar = ({ xpProgressText, dark }) => {
  const P = pal(dark);
  const isMax = xpProgressText === "MAX";
  const parts = isMax ? ["1", "1"] : xpProgressText.split("/");
  const ratio = Math.min(parseInt(parts[0]) / parseInt(parts[1]), 1);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: ratio,
      damping: 24,
      stiffness: 160,
      mass: 0.7,
      useNativeDriver: false,
    }).start();
  }, [ratio]);

  return (
    <View style={{ flex: 1, gap: 4 }}>
      <View style={[xpb.track, { backgroundColor: P.xpTrack }]}>
        <Animated.View
          style={[
            xpb.fill,
            {
              width: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={[P.xpA, P.xpB]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <Text
        style={[
          xpb.label,
          {
            color: P.muted,
            fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
          },
        ]}
      >
        {isMax ? "MAX" : `${parts[0]} / ${parts[1]} XP`}
      </Text>
    </View>
  );
};

const xpb = StyleSheet.create({
  track: { height: 2, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2, overflow: "hidden" },
  label: { fontSize: 9, fontWeight: "600", letterSpacing: 0.6 },
});

// ─── Stat tile  (icon top, value, label — all stacked vertically) ─────────────
const StatTile = ({ icon, value, label, onPress, dark, delay = 0 }) => {
  const P = pal(dark);
  const mount = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(mount, {
      toValue: 1,
      damping: 18,
      stiffness: 200,
      mass: 0.6,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  const pressIn = () => {
    if (!onPress) return;
    Animated.spring(press, {
      toValue: 0.94,
      damping: 14,
      stiffness: 400,
      useNativeDriver: true,
    }).start();
  };
  const pressOut = () => {
    if (!onPress) return;
    Animated.spring(press, {
      toValue: 1,
      damping: 14,
      stiffness: 400,
      useNativeDriver: true,
    }).start();
  };

  const Inner = (
    <Animated.View
      style={[
        tile.root,
        {
          backgroundColor: P.chip,
          borderColor: P.chipBorder,
          opacity: mount,
          transform: [
            {
              scale: mount.interpolate({
                inputRange: [0, 1],
                outputRange: [0.88, 1],
              }),
            },
            { scale: press },
          ],
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={P.sub}
        style={{ marginBottom: 5 }}
      />
      <Text style={[tile.value, { color: P.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[tile.label, { color: P.muted }]} numberOfLines={1}>
        {label}
      </Text>
      {onPress && (
        <View style={[tile.chevronDot, { backgroundColor: P.chipBorder }]}>
          <Ionicons name="chevron-forward" size={8} color={P.sub} />
        </View>
      )}
    </Animated.View>
  );

  if (!onPress) return Inner;
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
      style={{ flex: 1 }}
    >
      {Inner}
    </TouchableOpacity>
  );
};

const tile = StyleSheet.create({
  root: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: 18,
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: "uppercase",
  },
  chevronDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 13,
    height: 13,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── ProfileSection ───────────────────────────────────────────────────────────
const ProfileSection = ({
  user,
  backendStatus,
  profileInsights,
  insightsLoading,
  onSignOut,
  onBadgesPress,
  theme,
}) => {
  const dark = theme === "dark";
  const P = pal(dark);
  const isOnline = backendStatus?.available === true;
  const [levelModalVisible, setLevelModalVisible] = React.useState(false);

  const mount = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(mount, {
      toValue: 1,
      damping: 22,
      stiffness: 200,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!user) {
    return (
      <View
        style={[
          s.card,
          {
            backgroundColor: P.card,
            borderColor: P.line,
            shadowColor: P.shadow,
          },
        ]}
      >
        <Text style={[s.empty, { color: P.sub }]}>Not signed in</Text>
      </View>
    );
  }

  const { level, xpProgressText, favorites, watchlists, streak, badges } =
    profileInsights;

  const initial = user.displayName?.charAt(0)?.toUpperCase() || "?";
  const levelMeta = LEVEL_META[level] || LEVEL_META[1];
  const levelXpNeeded =
    [
      { level: 1, xpNeeded: 0 },
      { level: 2, xpNeeded: 50 },
      { level: 3, xpNeeded: 150 },
      { level: 4, xpNeeded: 350 },
      { level: 5, xpNeeded: 600 },
      { level: 6, xpNeeded: 1000 },
      { level: 7, xpNeeded: 1500 },
      { level: 8, xpNeeded: 2500 },
    ].find((entry) => entry.level === level)?.xpNeeded ?? 0;

  return (
    <>
      <Animated.View
        style={[
          s.card,
          {
            backgroundColor: P.card,
            borderColor: P.line,
            shadowColor: P.shadow,
            opacity: mount,
            transform: [
              {
                translateY: mount.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* ── Row 1: Identity ─────────────────────────────────────── */}
        <View style={s.identityRow}>
          {/* Avatar */}
          <View style={[s.avatar, { backgroundColor: P.avatarBg }]}>
            <Text style={[s.avatarInitial, { color: P.text }]}>{initial}</Text>
            <View
              style={[
                s.onlineDot,
                {
                  backgroundColor:
                    // If backend baseUrl points to localhost, show orange
                    backendStatus?.baseUrl &&
                    (backendStatus.baseUrl.includes("localhost") ||
                      backendStatus.baseUrl.includes("127.0.0.1"))
                      ? "#fb923c"
                      : isOnline
                        ? P.online
                        : P.offline,
                  borderColor: P.card,
                },
              ]}
            />
          </View>

          {/* Name + email */}
          <View style={s.nameBlock}>
            <Text style={[s.name, { color: P.text }]} numberOfLines={1}>
              {user.displayName || "No Username"}
            </Text>
            <Text style={[s.email, { color: P.sub }]} numberOfLines={1}>
              {user.email}
            </Text>
          </View>

          {/* Level badge */}
          <TouchableOpacity
            style={[
              s.levelBadge,
              { backgroundColor: P.chip, borderColor: P.chipBorder },
            ]}
            activeOpacity={0.75}
            onPress={() => setLevelModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`Show details for level ${level}`}
          >
            <LevelSymbol level={level} size={20} />
            <Text style={[s.levelNum, { color: P.sub }]}>L{level}</Text>
            <Ionicons
              name="information-circle-outline"
              size={11}
              color={P.sub}
            />
          </TouchableOpacity>

          {/* Sign out */}
          <TouchableOpacity
            onPress={onSignOut}
            style={[s.signOutBtn, { borderColor: P.chipBorder }]}
            activeOpacity={0.6}
          >
            <Ionicons name="log-out-outline" size={15} color={P.danger} />
          </TouchableOpacity>
        </View>

        {/* ── Row 2: XP bar ───────────────────────────────────────── */}
        <View
          style={[
            s.xpRow,
            { borderTopColor: P.line, borderBottomColor: P.line },
          ]}
        >
          <Text style={[s.xpLabel, { color: P.muted }]}>XP</Text>
          <XPBar xpProgressText={xpProgressText} dark={dark} />
          {insightsLoading && (
            <ActivityIndicator
              size="small"
              color={P.muted}
              style={{ marginLeft: 6 }}
            />
          )}
        </View>

        {/* ── Row 3: Stat tiles ────────────────────────────────────── */}
        <View style={s.tilesRow}>
          <StatTile
            icon="heart-outline"
            value={String(favorites)}
            label="Favs"
            dark={dark}
            delay={0}
          />
          <StatTile
            icon="bookmark-outline"
            value={String(watchlists)}
            label="Lists"
            dark={dark}
            delay={50}
          />
          <StatTile
            icon="flame-outline"
            value={`${streak}d`}
            label="Streak"
            dark={dark}
            delay={100}
          />
          <StatTile
            icon="trophy-outline"
            value={String(badges)}
            label="Badges"
            dark={dark}
            delay={150}
            onPress={onBadgesPress}
          />
        </View>
      </Animated.View>

      <Modal
        visible={levelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLevelModalVisible(false)}
      >
        <View
          style={[
            s.levelModalOverlay,
            { backgroundColor: dark ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.58)" },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setLevelModalVisible(false)}
          />
          <View
            style={[
              s.levelModalCard,
              {
                backgroundColor: dark ? "#101114" : P.card,
                borderColor: P.line,
              },
            ]}
          >
            <View style={s.levelModalHeader}>
              <View>
                <Text style={[s.levelModalKicker, { color: P.sub }]}>
                  CURRENT LEVEL
                </Text>
                <Text style={[s.levelModalTitle, { color: P.text }]}>
                  L{level} · {levelMeta.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setLevelModalVisible(false)}
                style={[s.levelModalClose, { borderColor: P.chipBorder }]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color={P.text} />
              </TouchableOpacity>
            </View>

            <View style={s.levelModalSymbolRow}>
              <LevelSymbol level={level} size={72} />
              <View style={s.levelModalMeta}>
                <Text style={[s.levelModalLabel, { color: P.sub }]}>
                  BADGE NAME
                </Text>
                <Text style={[s.levelModalValue, { color: P.text }]}>
                  {levelMeta.name}
                </Text>
                <Text
                  style={[s.levelModalLabel, { color: P.sub, marginTop: 10 }]}
                >
                  XP REQUIREMENT
                </Text>
                <Text style={[s.levelModalValue, { color: P.text }]}>
                  {levelXpNeeded === 0
                    ? "Starts at 0 XP"
                    : `${levelXpNeeded} XP`}
                </Text>
              </View>
            </View>

            <Text style={[s.levelModalDescription, { color: P.sub }]}>
              This badge reflects your current progress tier. As you earn XP,
              the app promotes you through the cinematic ranks.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    gap: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },

  // identity
  identityRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInitial: { fontSize: 17, fontWeight: "700", letterSpacing: -0.5 },
  onlineDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  nameBlock: { flex: 1, minWidth: 0 }, // minWidth:0 lets it shrink properly
  name: { fontSize: 14, fontWeight: "700", letterSpacing: -0.2 },
  email: { fontSize: 11, letterSpacing: 0.1, marginTop: 1 },

  // level badge
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexShrink: 0,
  },
  levelText: { fontSize: 13 },
  levelNum: { fontSize: 11, fontWeight: "600" },

  // sign out
  signOutBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // xp
  xpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  xpLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 1, width: 18 },

  // tiles
  tilesRow: { flexDirection: "row", gap: 6 },

  empty: { fontSize: 13, textAlign: "center", paddingVertical: 16 },
  levelModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 18,
  },
  levelModalCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  levelModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  levelModalKicker: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  levelModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  levelModalClose: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  levelModalSymbolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  levelModalMeta: {
    flex: 1,
    gap: 2,
  },
  levelModalLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  levelModalValue: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  levelModalDescription: {
    fontSize: 13,
    lineHeight: 20,
  },
  levelModalButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  levelModalButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});

export default ProfileSection;
