import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { searchMovies } from "../../services/api/catalog";
import { addPublicListItem } from "../../services/api/publicWatchlists";

// Search results carry ids like "tmdb:movie:123" / "tmdb:tv:456".
const parseTmdb = (imdbID) => {
  const m = /^tmdb:(movie|tv):(\d+)$/.exec(String(imdbID || ""));
  return m ? { media_type: m[1], tmdb_id: Number(m[2]) } : null;
};

const AddTitlesModal = ({ visible, listId, existingKeys, onClose, onAdded }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [added, setAdded] = useState(() => new Set());
  const reqRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setResults([]);
      setAdded(new Set());
    }
  }, [visible]);

  // Debounced search; stale responses are dropped.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    const req = ++reqRef.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const data = await searchMovies(q, "all", 1);
        if (req !== reqRef.current) return;
        const rows = (data?.Search || [])
          .map((r) => ({ ...r, _tmdb: parseTmdb(r.imdbID) }))
          .filter((r) => r._tmdb);
        setResults(rows);
      } catch {
        if (req === reqRef.current) setResults([]);
      } finally {
        if (req === reqRef.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const keyOf = (t) => `${t.media_type}:${t.tmdb_id}`;

  const add = useCallback(
    async (row) => {
      const key = keyOf(row._tmdb);
      setBusyKey(key);
      try {
        const res = await addPublicListItem(listId, row._tmdb);
        setAdded((s) => new Set(s).add(key));
        if (res?.added) onAdded?.(res.item);
      } catch {
        // leave the row tappable so the user can retry
      } finally {
        setBusyKey(null);
      }
    },
    [listId, onAdded],
  );

  const renderItem = ({ item }) => {
    const key = keyOf(item._tmdb);
    const done = added.has(key) || existingKeys?.has(key);
    return (
      <View style={[styles.row, { borderColor: colors.border }]}>
        <Image
          source={item.Poster && item.Poster !== "N/A" ? { uri: item.Poster } : undefined}
          style={styles.poster}
          contentFit="cover"
        />
        <View style={styles.meta}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {item.Title}
          </Text>
          <Text style={[styles.year, { color: colors.text }]}>
            {[item.Year, item.Type === "series" ? "Series" : "Movie"].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <Pressable
          onPress={() => add(item)}
          disabled={done || busyKey === key}
          hitSlop={8}
          style={[styles.addBtn, { backgroundColor: done ? "transparent" : colors.primary, borderColor: colors.border }]}
          accessibilityLabel={done ? "Added" : "Add to list"}
        >
          {busyKey === key ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name={done ? "checkmark" : "add"} size={20} color={done ? colors.primary : "#fff"} />
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Text style={[styles.heading, { color: colors.text }]}>Add titles</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={[styles.done, { color: colors.primary }]}>Done</Text>
          </Pressable>
        </View>
        <View style={[styles.search, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Ionicons name="search" size={18} color={colors.text} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search movies & shows"
            placeholderTextColor="#8a8f9a"
            style={[styles.input, { color: colors.text }]}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
          />
          {searching ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>
        <FlatList
          data={results}
          keyExtractor={(r) => r.imdbID}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            query.trim().length >= 2 && !searching ? (
              <Text style={[styles.none, { color: colors.text }]}>No results</Text>
            ) : null
          }
        />
      </View>
    </Modal>
  );
};

export default AddTitlesModal;

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  heading: { fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  done: { fontSize: 16, fontWeight: "700" },
  search: { flexDirection: "row", alignItems: "center", borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 12, marginBottom: 10 },
  searchIcon: { opacity: 0.5, marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  poster: { width: 44, height: 64, borderRadius: 8, backgroundColor: "#1b1f2a" },
  meta: { flex: 1 },
  title: { fontSize: 15, fontWeight: "600" },
  year: { fontSize: 12, opacity: 0.55, marginTop: 2 },
  addBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
  none: { textAlign: "center", opacity: 0.55, marginTop: 40 },
});