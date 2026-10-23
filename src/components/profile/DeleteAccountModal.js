import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { deleteAccountWithPassword } from "../../services/accountDeletion";

const DANGER = "#ef4444";

const WHAT_GOES = [
  "Your profile, favorites, watchlists and watch progress",
  "Your XP, level and badges",
  "Your public lists, along with their likes and followers",
  "Your likes and follows on other people's lists",
];

/**
 * Asks the user to confirm, re-enter their password and type DELETE, then deletes the account.
 * All state lives here, so typing never re-renders the Settings screen.
 */
const DeleteAccountModal = ({ visible, onClose, email, theme, colors }) => {
  const dark = theme === "dark";
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  // Start clean every time it opens.
  useEffect(() => {
    if (visible) {
      setPassword("");
      setConfirmText("");
      setError("");
      setPasswordError(false);
      setBusy(false);
    }
  }, [visible]);

  const ready = password.length > 0 && confirmText.trim() === "DELETE" && !busy;

  const close = () => {
    if (!busy) onClose();
  };

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError("");
    setPasswordError(false);
    try {
      await deleteAccountWithPassword(password);
      // Signed out: the app switches to the sign-in screen and this modal goes away.
    } catch (e) {
      if (!mounted.current) return;
      setError(e?.message || "Something went wrong. Please try again.");
      setPasswordError(e?.field === "password");
      setBusy(false);
    }
  };

  const panel = dark ? "#18181b" : "#ffffff";
  const line = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const subtle = dark ? "rgba(228,228,231,0.62)" : "rgba(24,24,27,0.62)";
  const text = dark ? "#e4e4e7" : "#18181b";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: dark ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.58)" }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={[styles.card, { backgroundColor: panel, borderColor: line }]}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Ionicons name="warning" size={22} color={DANGER} />
              <Text style={[styles.title, { color: text }]}>Delete account</Text>
            </View>

            <Text style={[styles.body, { color: subtle }]}>
              This permanently deletes the account{email ? ` ${email}` : ""}. It can't be undone.
            </Text>

            <View style={styles.list}>
              {WHAT_GOES.map((line1) => (
                <View key={line1} style={styles.listRow}>
                  <Ionicons name="remove-circle-outline" size={15} color={DANGER} style={styles.bullet} />
                  <Text style={[styles.listText, { color: text }]}>{line1}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.label, { color: subtle }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (passwordError) setPasswordError(false);
                if (error) setError("");
              }}
              placeholder="Your password"
              placeholderTextColor={subtle}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              editable={!busy}
              style={[
                styles.input,
                { color: text, borderColor: passwordError ? DANGER : line },
              ]}
            />

            <Text style={[styles.label, { color: subtle }]}>
              Type <Text style={{ fontWeight: "800", color: text }}>DELETE</Text> to confirm
            </Text>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder="DELETE"
              placeholderTextColor={subtle}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!busy}
              onSubmitEditing={submit}
              returnKeyType="done"
              style={[styles.input, { color: text, borderColor: line }]}
            />

            {error ? (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={16} color={DANGER} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={submit}
              disabled={!ready}
              accessibilityRole="button"
              accessibilityState={{ disabled: !ready, busy }}
              style={({ pressed }) => [
                styles.deleteBtn,
                { opacity: !ready ? 0.4 : pressed ? 0.85 : 1 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteText}>Delete my account</Text>
              )}
            </Pressable>

            <Pressable
              onPress={close}
              disabled={busy}
              accessibilityRole="button"
              style={[styles.cancelBtn, { borderColor: line, opacity: busy ? 0.4 : 1 }]}
            >
              <Text style={[styles.cancelText, { color: text }]}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", padding: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, maxHeight: "92%" },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "800", letterSpacing: -0.2 },
  body: { fontSize: 13.5, lineHeight: 20, marginBottom: 12 },
  list: { gap: 7, marginBottom: 16 },
  listRow: { flexDirection: "row", alignItems: "flex-start" },
  bullet: { marginTop: 2, marginRight: 8 },
  listText: { flex: 1, fontSize: 13, lineHeight: 19 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    marginBottom: 10,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorText: { flex: 1, color: DANGER, fontSize: 13, lineHeight: 18 },
  deleteBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: DANGER,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  deleteText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  cancelBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  cancelText: { fontSize: 15, fontWeight: "600" },
});

export default DeleteAccountModal;
