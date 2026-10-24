import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getBlockedUsers, unblockUser } from "../../services/api/publicWatchlists";
import publicListEvents from "../../utils/publicListEvents";
import logger from "../../services/logger";

/** People the user has blocked, with an Unblock button. Opened from Settings. */
const BlockedUsersModal = ({ visible, onClose, theme }) => {
  const dark = theme === "dark";
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const load = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      const data = await getBlockedUsers();
      if (!mounted.current) return;
      setUsers(data?.users || []);
      setStatus("ready");
    } catch (error) {
      logger.warn("Could not load blocked users", error?.message);
      if (mounted.current) setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const unblock = async (user) => {
    if (busyId) return;
    setBusyId(user.userId);
    setMessage("");
    try {
      await unblockUser(user.userId);
      if (!mounted.current) return;
      setUsers((prev) => prev.filter((u) => u.userId !== user.userId));
      publicListEvents.emit({ type: "unblocked" }); // Explore refetches: their lists can come back
      publicListEvents.emit({ type: "library" });
    } catch (error) {
      logger.warn("Unblock failed", error?.message);
      if (mounted.current) setMessage("Couldn't unblock. Please try again.");
    } finally {
      if (mounted.current) setBusyId(null);
    }
  };

  const panel = dark ? "#18181b" : "#ffffff";
  const line = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const subtle = dark ? "rgba(228,228,231,0.62)" : "rgba(24,24,27,0.62)";
  const text = dark ? "#e4e4e7" : "#18181b";

  const renderRow = ({ item }) => (
    <View style={[styles.row, { borderColor: line }]}>
      <Ionicons name="person-circle-outline" size={28} color={subtle} />
      <Text style={[styles.name, { color: text }]} numberOfLines={1}>
        {item.name || "Anonymous"}
      </Text>
      <Pressable
        onPress={() => unblock(item)}
        disabled={busyId === item.userId}
        accessibilityRole="button"
        accessibilityLabel={`Unblock ${item.name || "user"}`}
        style={[styles.unblock, { borderColor: line, opacity: busyId === item.userId ? 0.5 : 1 }]}
      >
        {busyId === item.userId ? (
          <ActivityIndicator size="small" color={text} />
        ) : (
          <Text style={[styles.unblockText, { color: text }]}>Unblock</Text>
        )}
      </Pressable>
    </View>
  );

  let body;
  if (status === "loading") {
    body = <ActivityIndicator style={styles.center} color={text} />;
  } else if (status === "error") {
    body = (
      <View style={styles.center}>
        <Text style={[styles.empty, { color: subtle }]}>Couldn't load blocked users.</Text>
        <Pressable onPress={load} style={[styles.unblock, { borderColor: line, marginTop: 10 }]}>
          <Text style={[styles.unblockText, { color: text }]}>Try again</Text>
        </Pressable>
      </View>
    );
  } else if (users.length === 0) {
    body = (
      <View style={styles.center}>
        <Text style={[styles.empty, { color: subtle }]}>
          You haven't blocked anyone. To block someone, open one of their public lists, tap the ⋯ menu and choose Block.
        </Text>
      </View>
    );
  } else {
    body = <FlatList data={users} keyExtractor={(u) => u.userId} renderItem={renderRow} />;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: dark ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.58)" }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: panel, borderColor: line }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: text }]}>Blocked users</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10}>
              <Ionicons name="close" size={22} color={text} />
            </Pressable>
          </View>
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <View style={styles.bodyBox}>{body}</View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", padding: 18 },
  card: { borderWidth: 1, borderRadius: 16, padding: 18, maxHeight: "80%" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "800" },
  bodyBox: { minHeight: 120 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 28 },
  empty: { fontSize: 13.5, lineHeight: 20, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { flex: 1, fontSize: 15, fontWeight: "600" },
  unblock: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, minWidth: 82, alignItems: "center" },
  unblockText: { fontSize: 13, fontWeight: "700" },
  error: { color: "#ef4444", fontSize: 13, marginBottom: 8 },
});

export default BlockedUsersModal;
