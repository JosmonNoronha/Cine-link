import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getWatchlists } from "../utils/storage";
import { getMyPublicLists, getFollowedPublicLists } from "../services/api/publicWatchlists";
import publicListEvents from "../utils/publicListEvents";
import logger from "../services/logger";

/**
 * The user's whole library in one place:
 *   private – their own private watchlists (name → movies map from storage)
 *   public  – public lists they own
 *   saved   – other people's public lists they added to their library
 *
 * The three sources load in parallel and fail independently, so one slow or
 * failing source never blanks the rest.
 */
export default function useLibrary() {
  const [privateLists, setPrivateLists] = useState({});
  const [publicLists, setPublicLists] = useState([]);
  const [savedLists, setSavedLists] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [partial, setPartial] = useState(false);
  const reqRef = useRef(0);
  const readyRef = useRef(false);

  const load = useCallback(async () => {
    const req = ++reqRef.current;
    if (!readyRef.current) setStatus("loading");

    const [priv, pub, saved] = await Promise.allSettled([
      getWatchlists(),
      getMyPublicLists({ limit: 50 }),
      getFollowedPublicLists({ limit: 50 }),
    ]);
    if (req !== reqRef.current) return;

    if (priv.status === "fulfilled") setPrivateLists(priv.value || {});
    if (pub.status === "fulfilled") setPublicLists(pub.value?.lists || []);
    if (saved.status === "fulfilled") setSavedLists(saved.value?.lists || []);

    const failed = [priv, pub, saved].filter((r) => r.status === "rejected");
    failed.forEach((r) => logger.warn("Library source failed", r.reason?.message));

    if (failed.length === 3 && !readyRef.current) {
      setStatus("error");
    } else {
      readyRef.current = true;
      setStatus("ready");
    }
    setPartial(failed.length > 0 && failed.length < 3);
  }, []);

  useEffect(() => {
    load();
    return () => {
      reqRef.current += 1;
    };
  }, [load]);

  useEffect(
    () =>
      publicListEvents.subscribe((e) => {
        if (e.type === "library" || e.type === "removed") load();
        else if (e.type === "patch") {
          const merge = (arr) => arr.map((l) => (l.id === e.id ? { ...l, ...e.patch } : l));
          setPublicLists(merge);
          setSavedLists(merge);
        }
      }),
    [load],
  );

  const entries = useMemo(
    () => [
      ...Object.keys(privateLists).map((name) => ({
        key: `p:${name}`,
        kind: "private",
        name,
        movies: privateLists[name] || [],
      })),
      ...publicLists.map((list) => ({ key: `u:${list.id}`, kind: "public", name: list.name, list })),
      ...savedLists.map((list) => ({ key: `s:${list.id}`, kind: "saved", name: list.name, list })),
    ],
    [privateLists, publicLists, savedLists],
  );

  const counts = useMemo(
    () => ({
      all: entries.length,
      private: Object.keys(privateLists).length,
      public: publicLists.length,
      saved: savedLists.length,
    }),
    [entries.length, privateLists, publicLists.length, savedLists.length],
  );

  return {
    entries,
    counts,
    privateLists,
    status,
    partial,
    reload: load,
    // local (optimistic) edits
    addPrivateLocal: (name) => setPrivateLists((p) => ({ ...p, [name]: [] })),
    removePrivateLocal: (name) =>
      setPrivateLists((p) => {
        const { [name]: _gone, ...rest } = p;
        return rest;
      }),
    removePublicLocal: (id) => setPublicLists((p) => p.filter((l) => l.id !== id)),
    removeSavedLocal: (id) => setSavedLists((p) => p.filter((l) => l.id !== id)),
  };
}