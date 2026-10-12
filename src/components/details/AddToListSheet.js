import React from "react";
import { Modal, View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KIND_META } from "../watchlist/LibraryListCard";

const Row = ({ icon, color, label, isIn, busy, disabled, onPress, colors }) => (
  <Pressable
    onPress={onPress}
    disabled={busy || disabled}
    style={({ pressed }) => [
      styles.row,
      { borderBottomColor: colors.border, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      isIn && { backgroundColor: `${color}14` },
    ]}
    accessibilityRole="button"
    accessibilityState={{ checked: isIn }}
  >
    <Ionicons name={icon} size={16} color={color} />
    <Text style={[styles.rowText, { color: colors.text }]} numberOfLines={1}>
      {label}
    </Text>
    {busy ? (
      <ActivityIndicator size="small" color={color} />
    ) : (
      <Ionicons
        name={isIn ? "checkmark-circle" : "add-circle-outline"}
        size={22}
        color={isIn ? color : colors.text}
        style={isIn ? null : styles.dim}
      />
    )}
  </Pressable>
);

const Section = ({ kind, hint, children, colors }) => {
  const meta = KIND_META[kind];
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons name={meta.icon} size={13} color={meta.color} />
        <Text style={[styles.sectionTitle, { color: meta.color }]}>{meta.label}</Text>
      </View>
      {children}
      {hint ? <Text style={[styles.hint, { color: colors.text }]}>{hint}</Text> : null}
    </View>
  );
};

const AddToListSheet = ({
  visible,
  loading,
  busyKey,
  privateNames,
  privateIn,
  publicLists,
  publicIn,
  publicSupported,
  onToggle,
  onClose,
  colors,
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>Add to list</Text>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
          <Section
            kind="private"
            colors={colors}
            hint={privateNames.length === 0 ? "No private lists yet. Create one in the Watchlists tab." : null}
          >
            {privateNames.map((name) => (
              <Row
                key={name}
                icon={KIND_META.private.icon}
                color={KIND_META.private.color}
                label={name}
                isIn={Boolean(privateIn[name])}
                busy={busyKey === `private:${name}`}
                onPress={() => onToggle("private", name, name)}
                colors={colors}
              />
            ))}
          </Section>

          <Section
            kind="public"
            colors={colors}
            hint={
              !publicSupported
                ? "This title can't be added to public lists."
                : publicLists.length === 0 && !loading
                  ? "You haven't made a public list yet."
                  : null
            }
          >
            {publicLists.map((l) => (
              <Row
                key={l.id}
                icon={KIND_META.public.icon}
                color={KIND_META.public.color}
                label={l.name}
                isIn={publicIn.has(l.id)}
                busy={busyKey === `public:${l.id}`}
                disabled={!publicSupported}
                onPress={() => onToggle("public", l.id, l.name)}
                colors={colors}
              />
            ))}
          </Section>
        </ScrollView>

        <Pressable style={styles.close} onPress={onClose}>
          <Text style={[styles.closeText, { color: colors.primary }]}>Done</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

export default React.memo(AddToListSheet);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 12, maxHeight: "75%" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  title: { fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  scroll: { flexGrow: 0 },
  section: { marginTop: 10 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  sectionTitle: { fontSize: 11.5, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 13, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  rowText: { flex: 1, fontSize: 15.5, fontWeight: "600" },
  dim: { opacity: 0.45 },
  hint: { fontSize: 12.5, opacity: 0.55, paddingVertical: 10, paddingHorizontal: 8 },
  close: { alignItems: "center", paddingVertical: 14 },
  closeText: { fontSize: 16, fontWeight: "700" },
});