import React from "react";
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { REGIONS } from "../../utils/region";

const RegionSheet = ({ visible, selected, onSelect, onClose, colors }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>Region</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          {REGIONS.map((r) => {
            const on = r.code === selected;
            return (
              <Pressable
                key={r.code}
                onPress={() => onSelect(r.code)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  on && { backgroundColor: `${colors.primary}14` },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.code, { color: colors.text }]}>{r.code}</Text>
                <Text style={[styles.name, { color: colors.text }]}>{r.name}</Text>
                {on ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
        <Pressable style={styles.close} onPress={onClose}>
          <Text style={[styles.closeText, { color: colors.primary }]}>Done</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

export default React.memo(RegionSheet);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 12, maxHeight: "75%" },
  title: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3, marginBottom: 6 },
  scroll: { flexGrow: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  code: { width: 34, fontSize: 14, fontWeight: "800", opacity: 0.55 },
  name: { flex: 1, fontSize: 15.5, fontWeight: "600" },
  close: { alignItems: "center", paddingVertical: 14 },
  closeText: { fontSize: 16, fontWeight: "700" },
});
