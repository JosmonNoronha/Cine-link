import React from "react";
import { Modal, Pressable, Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useCustomTheme } from "../../contexts/ThemeContext";

const ActionMenu = ({ visible, title, items = [], onClose }) => {
  const { colors } = useTheme();
  const { theme } = useCustomTheme();
  const isDark = theme === "dark";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.32)" },
          ]}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: isDark ? "rgba(28,31,39,0.96)" : "rgba(250,250,252,0.96)",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.13)" }]} />
          {title ? (
            <Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>
              {title}
            </Text>
          ) : null}
          {items.map((item, index) => (
            <Pressable
              key={`${item.label}-${index}`}
              onPress={() => {
                onClose();
                item.onPress?.();
              }}
              accessibilityRole="menuitem"
              style={({ pressed }) => [
                styles.item,
                {
                  backgroundColor: pressed
                    ? isDark
                      ? "rgba(255,255,255,0.07)"
                      : "rgba(0,0,0,0.05)"
                    : "transparent",
                  borderTopColor: index > 0
                    ? isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.05)"
                    : "transparent",
                },
              ]}
            >
              {item.icon ? (
                <Ionicons
                  name={item.icon}
                  size={19}
                  color={item.destructive ? "#ff5a6e" : colors.text}
                  style={{ opacity: item.destructive ? 1 : 0.72, marginRight: 12 }}
                />
              ) : null}
              <Text
                style={[
                  styles.label,
                  { color: item.destructive ? "#ff5a6e" : colors.text, fontWeight: item.destructive ? "700" : "600" },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.cancel,
              { backgroundColor: pressed ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)") : "transparent" },
            ]}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default React.memo(ActionMenu);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  handle: { alignSelf: "center", width: 34, height: 4, borderRadius: 2, marginTop: 4, marginBottom: 4 },
  title: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 12,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
    opacity: 0.58,
  },
  item: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  label: { flex: 1, fontSize: 15 },
  cancel: {
    height: 46,
    marginTop: 4,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 16, fontWeight: "800" },
});
