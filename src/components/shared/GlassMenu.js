import React from "react";
import { View, Text, Pressable, Modal, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useCustomTheme } from "../../contexts/ThemeContext";
import withAlpha from "../../utils/withAlpha";

/**
 * Frosted-glass dropdown anchored under a button.
 *   anchor:   { x, y, w, h } from ref.measureInWindow, or null when closed
 *   options:  [{ value, label, icon? }]
 *   selected: the active option's value
 */
const GlassMenu = ({ anchor, options, selected, onSelect, onClose, minWidth = 160 }) => {
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const { width: screenW } = useWindowDimensions();
  const isDark = theme === "dark";

  const width = anchor ? Math.max(anchor.w, minWidth) : minWidth;
  const left = anchor ? Math.max(12, Math.min(anchor.x, screenW - width - 12)) : 0;

  return (
    <Modal visible={!!anchor} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      {anchor ? (
        <View
          style={[
            styles.menu,
            {
              top: anchor.y + anchor.h + 6,
              left,
              width,
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
            style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(18,22,32,0.62)" : "rgba(255,255,255,0.7)" }]}
          />
          {options.map((o) => {
            const sel = o.value === selected;
            return (
              <Pressable
                key={o.value}
                onPress={() => onSelect(o.value)}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: sel }}
                style={({ pressed }) => [
                  styles.item,
                  { backgroundColor: sel ? withAlpha(colors.primary, 0.14) : pressed ? withAlpha(colors.text, 0.06) : "transparent" },
                ]}
              >
                {o.icon ? <Ionicons name={o.icon} size={16} color={sel ? colors.primary : colors.text} style={{ opacity: sel ? 1 : 0.7 }} /> : null}
                <Text style={[styles.text, { color: colors.text, fontWeight: sel ? "800" : "600" }]}>{o.label}</Text>
                <View style={styles.tick}>{sel ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}</View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </Modal>
  );
};

export default React.memo(GlassMenu);

const styles = StyleSheet.create({
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
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 10, borderRadius: 11 },
  text: { flex: 1, fontSize: 14 },
  tick: { width: 18, alignItems: "center" },
});