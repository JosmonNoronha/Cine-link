import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useCustomTheme } from "../../contexts/ThemeContext";
import withAlpha from "../../utils/withAlpha";
import { DISCOVER_FEATURES, SHOW_COMING_SOON } from "./features";

const Row = ({ feature, onPress, colors, last }) => {
  const ready = feature.ready;
  return (
    <Pressable
      onPress={() => ready && onPress(feature)}
      disabled={!ready}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed && ready ? withAlpha(colors.text, 0.06) : "transparent",
          opacity: ready ? 1 : 0.5,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: withAlpha(colors.text, 0.12),
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !ready }}
      accessibilityLabel={ready ? feature.title : `${feature.title}, coming soon`}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={feature.icon} size={18} color={colors.text} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
          {feature.title}
        </Text>
        <Text style={[styles.rowSub, { color: colors.text }]} numberOfLines={1}>
          {feature.subtitle}
        </Text>
      </View>
      {ready ? (
        <Ionicons name="chevron-forward" size={16} color={colors.text} style={styles.dim} />
      ) : (
        <View style={[styles.soon, { borderColor: colors.border }]}>
          <Text style={[styles.soonText, { color: colors.text }]}>Soon</Text>
        </View>
      )}
    </Pressable>
  );
};

const MENU_WIDTH = 270;

const DiscoverHubSheet = ({ visible, anchor, onClose, onSelect, colors }) => {
  const { theme } = useCustomTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isDark = theme === "dark";
  const features = DISCOVER_FEATURES.filter((f) => f.ready || SHOW_COMING_SOON);
  const menuWidth = Math.min(MENU_WIDTH, screenWidth - 24);
  const left = anchor
    ? Math.max(12, Math.min(anchor.x + anchor.width - menuWidth, screenWidth - menuWidth - 12))
    : 12;
  const top = anchor ? anchor.y + anchor.height + 6 : 12;
  const maxHeight = Math.max(160, Math.min(420, screenHeight - top - 12));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close discover menu"
        />
        {anchor ? (
          <View
            style={[
              styles.menu,
              {
                top,
                left,
                width: menuWidth,
                maxHeight,
                borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.08)",
              },
            ]}
          >
            <BlurView
              intensity={isDark ? 50 : 70}
              tint={isDark ? "dark" : "light"}
              experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? "rgba(18,22,32,0.72)" : "rgba(255,255,255,0.82)" },
              ]}
            />
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]}>Discover</Text>
              <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close discover menu">
                <Ionicons name="close" size={18} color={colors.text} style={styles.dim} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
              {features.map((feature, index) => (
                <Row
                  key={feature.id}
                  feature={feature}
                  onPress={onSelect}
                  colors={colors}
                  last={index === features.length - 1}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

export default React.memo(DiscoverHubSheet);

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  menu: {
    position: "absolute",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 6,
    overflow: "hidden",
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 12 },
    }),
  },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6, paddingVertical: 4 },
  title: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },
  scroll: { flexGrow: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, paddingHorizontal: 7, borderRadius: 11 },
  iconWrap: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 1 },
  rowTitle: { fontSize: 13.5, fontWeight: "700" },
  rowSub: { fontSize: 11, opacity: 0.55 },
  dim: { opacity: 0.45 },
  soon: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  soonText: { fontSize: 10, fontWeight: "700", opacity: 0.6 },
});
