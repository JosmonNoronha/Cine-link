import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import LoadingButton from "../shared/LoadingButton";
import { KIND_META } from "./LibraryListCard";

const parseTags = (raw) =>
  [...new Set(raw.split(/[,\s]+/).map((t) => t.replace(/^#/, "").toLowerCase().trim()).filter(Boolean))].slice(0, 10);

const OPTIONS = [
  { key: "private", title: "Private", sub: "Only you can see it", icon: KIND_META.private.icon, color: KIND_META.private.color },
  { key: "public", title: "Public", sub: "Anyone can discover it", icon: KIND_META.public.icon, color: KIND_META.public.color },
];

/**
 * onSubmit({ name, visibility: "private" | "public", description, tags })
 */
const CreateWatchlistModal = ({ visible, onClose, onSubmit, isLoading }) => {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!visible) {
      setName("");
      setVisibility("private");
      setDescription("");
      setTags("");
    }
  }, [visible]);

  const isPublic = visibility === "public";
  const canSubmit = name.trim().length > 0 && !isLoading;
  const inputStyle = [styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }];
  const close = () => !isLoading && onClose();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>New watchlist</Text>

          <View style={styles.options}>
            {OPTIONS.map((o) => {
              const active = visibility === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => setVisibility(o.key)}
                  disabled={isLoading}
                  style={[
                    styles.option,
                    {
                      borderColor: active ? o.color : colors.border,
                      backgroundColor: active ? `${o.color}1f` : "transparent",
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons name={o.icon} size={18} color={active ? o.color : colors.text} style={active ? null : styles.dim} />
                  <Text style={[styles.optionTitle, { color: colors.text }]}>{o.title}</Text>
                  <Text style={[styles.optionSub, { color: colors.text }]}>{o.sub}</Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={styles.fields} contentContainerStyle={styles.fieldsContent}>
            <TextInput
              placeholder="Watchlist name"
              placeholderTextColor={`${colors.text}66`}
              value={name}
              onChangeText={setName}
              maxLength={100}
              style={inputStyle}
              editable={!isLoading}
              autoFocus
            />
            {isPublic ? (
              <>
                <TextInput
                  placeholder="Description (optional)"
                  placeholderTextColor={`${colors.text}66`}
                  value={description}
                  onChangeText={setDescription}
                  maxLength={500}
                  multiline
                  style={[...inputStyle, styles.multiline]}
                  editable={!isLoading}
                />
                <TextInput
                  placeholder="Tags, e.g. horror thriller"
                  placeholderTextColor={`${colors.text}66`}
                  value={tags}
                  onChangeText={setTags}
                  autoCapitalize="none"
                  style={inputStyle}
                  editable={!isLoading}
                />
              </>
            ) : null}
          </ScrollView>

          <View style={styles.buttons}>
            <Pressable style={styles.cancel} onPress={close} disabled={isLoading}>
              <Text style={[styles.cancelText, { color: colors.text, opacity: isLoading ? 0.5 : 1 }]}>Cancel</Text>
            </Pressable>
            <LoadingButton
              loading={isLoading}
              onPress={() =>
                onSubmit({ name: name.trim(), visibility, description: description.trim(), tags: parseTags(tags) })
              }
              style={[styles.create, { opacity: canSubmit ? 1 : 0.6 }]}
              disabled={!canSubmit}
              loadingText="Creating..."
            >
              <Text style={styles.createText}>Create</Text>
            </LoadingButton>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CreateWatchlistModal;

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: 20 },
  sheet: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 14, maxHeight: "88%" },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  options: { flexDirection: "row", gap: 10 },
  option: { flex: 1, borderWidth: 1.5, borderRadius: 14, padding: 12, gap: 3 },
  optionTitle: { fontSize: 15, fontWeight: "700", marginTop: 4 },
  optionSub: { fontSize: 11.5, opacity: 0.6 },
  dim: { opacity: 0.55 },
  fields: { flexGrow: 0 },
  fieldsContent: { gap: 10 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  buttons: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10 },
  cancel: { paddingHorizontal: 18, paddingVertical: 12 },
  cancelText: { fontSize: 15, fontWeight: "600" },
  create: {
    minWidth: 112,
    minHeight: 48,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#667eea",
  },
  createText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});