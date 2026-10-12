import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useTheme } from "@react-navigation/native";

const parseTags = (raw) =>
  [...new Set(raw.split(/[,\s]+/).map((t) => t.replace(/^#/, "").toLowerCase().trim()).filter(Boolean))].slice(0, 10);

const CreatePublicListModal = ({ visible, onClose, onSubmit, loading }) => {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!visible) {
      setName("");
      setDescription("");
      setTags("");
    }
  }, [visible]);

  const canSubmit = name.trim().length > 0 && !loading;
  const input = [styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>New public watchlist</Text>
          <Text style={[styles.hint, { color: colors.text }]}>
            Anyone in CineLink can find and view this list.
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor="#8a8f9a"
            maxLength={100}
            style={input}
            autoFocus
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description (optional)"
            placeholderTextColor="#8a8f9a"
            maxLength={500}
            multiline
            style={[...input, styles.multiline]}
          />
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="Tags, e.g. horror thriller"
            placeholderTextColor="#8a8f9a"
            autoCapitalize="none"
            style={input}
          />

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.btn} disabled={loading}>
              <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onSubmit({ name: name.trim(), description: description.trim(), tags: parseTags(tags) })}
              disabled={!canSubmit}
              style={[styles.btn, styles.primary, { backgroundColor: colors.primary, opacity: canSubmit ? 1 : 0.5 }]}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, styles.primaryText]}>Create</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CreatePublicListModal;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 24 },
  sheet: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  hint: { fontSize: 13, opacity: 0.6, marginTop: -6 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  multiline: { minHeight: 76, textAlignVertical: "top" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 4 },
  btn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 12, minWidth: 84, alignItems: "center" },
  primary: {},
  btnText: { fontSize: 15, fontWeight: "600" },
  primaryText: { color: "#fff" },
});