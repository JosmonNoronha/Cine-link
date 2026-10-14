import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const hueOf = (s = "") => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
};

/** Stable per-id gradient so lists / people without art still look distinct. */
export const gradientFor = (id = "") => {
  const h = hueOf(id);
  return [`hsl(${h}, 58%, 40%)`, `hsl(${(h + 45) % 360}, 62%, 24%)`];
};

export const compact = (n = 0) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

/** "3d", "5h", "2w" … from an ISO string; empty if unknown. */
export const timeAgo = (iso) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "now";
  const steps = [[60, "m"], [3600, "h"], [86400, "d"], [604800, "w"], [2629800, "mo"], [31557600, "y"]];
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    if (s >= steps[i][0]) return `${Math.floor(s / steps[i][0])}${steps[i][1]}`;
  }
  return "now";
};

/** Posters to show for a list; older payloads only have coverPoster. */
export const postersOf = (list) =>
  list.previewPosters?.length ? list.previewPosters : list.coverPoster ? [list.coverPoster] : [];

export const FallbackArt = ({ id, size = 34 }) => (
  <LinearGradient colors={gradientFor(id)} style={StyleSheet.absoluteFill}>
    <View style={styles.center}>
      <Ionicons name="film-outline" size={size} color="rgba(255,255,255,0.6)" />
    </View>
  </LinearGradient>
);

export const Avatar = ({ name = "?", seed, size = 34 }) => (
  <LinearGradient
    colors={gradientFor(seed || name)}
    style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}
  >
    <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.42 }}>
      {(name.trim()[0] || "?").toUpperCase()}
    </Text>
  </LinearGradient>
);

const styles = StyleSheet.create({ center: { flex: 1, alignItems: "center", justifyContent: "center" } });