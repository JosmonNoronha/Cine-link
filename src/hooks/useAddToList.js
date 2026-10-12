import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getWatchlists, addToWatchlist, removeFromWatchlist } from "../utils/storage";
import {
  getMyPublicLists,
  getPublicMembership,
  addPublicListItem,
  removePublicListItem,
} from "../services/api/publicWatchlists";
import publicListEvents from "../utils/publicListEvents";
import logger from "../services/logger";

const parseTmdb = (id) => {
  const m = /^tmdb:(movie|tv):(\d+)$/.exec(String(id || ""));
  return m ? { media_type: m[1], tmdb_id: Number(m[2]) } : null;
};

/**
 * Details-screen logic for "add / remove this title" across BOTH private and
 * public lists.
 *
 * On mount only the cheap membership checks run (private map + one batched
 * public-membership call) so the Watchlist button can show "In List". The
 * public list names are fetched when the sheet opens.
 */
export default function useAddToList({ effectiveImdbID, candidateIds, movie, notify, track }) {
  const [visible, setVisible] = useState(false);
  const [privateNames, setPrivateNames] = useState([]);
  const [privateIn, setPrivateIn] = useState({}); // name -> imdbID stored in that list
  const [publicLists, setPublicLists] = useState([]); // [{ id, name }]
  const [publicIn, setPublicIn] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const reqRef = useRef(0);

  const tmdb = useMemo(
    () =>
      parseTmdb(effectiveImdbID) ||
      (movie?.tmdb_id && movie?.media_type
        ? { media_type: movie.media_type, tmdb_id: Number(movie.tmdb_id) }
        : null),
    [effectiveImdbID, movie?.tmdb_id, movie?.media_type],
  );
  const tmdbKey = tmdb ? `${tmdb.media_type}:${tmdb.tmdb_id}` : null;
  const idsKey = candidateIds.join("|");

  const refreshMembership = useCallback(
    async ({ withPublicNames = false } = {}) => {
      if (!effectiveImdbID) return;
      const req = ++reqRef.current;
      const [priv, pubMember, pubLists] = await Promise.allSettled([
        getWatchlists(),
        tmdbKey ? getPublicMembership(tmdbKey) : Promise.resolve({ listIds: [] }),
        withPublicNames ? getMyPublicLists({ limit: 50 }) : Promise.resolve(null),
      ]);
      if (req !== reqRef.current) return;

      if (priv.status === "fulfilled") {
        const lists = priv.value || {};
        const found = {};
        Object.keys(lists).forEach((name) => {
          const hit = (Array.isArray(lists[name]) ? lists[name] : []).find((m) =>
            candidateIds.includes(m.imdbID),
          );
          if (hit) found[name] = hit.imdbID;
        });
        setPrivateNames(Object.keys(lists));
        setPrivateIn(found);
      }
      if (pubMember.status === "fulfilled") setPublicIn(new Set(pubMember.value?.listIds || []));
      if (pubLists.status === "fulfilled" && pubLists.value) {
        setPublicLists((pubLists.value.lists || []).map((l) => ({ id: l.id, name: l.name })));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveImdbID, tmdbKey, idsKey],
  );

  useEffect(() => {
    refreshMembership();
    return () => {
      reqRef.current += 1;
    };
  }, [refreshMembership]);

  useEffect(() => {
    const unsubscribe = publicListEvents.subscribe(() => {
      refreshMembership({ withPublicNames: true });
    });
    return unsubscribe;
  }, [refreshMembership]);

  const open = useCallback(async () => {
    setVisible(true);
    setLoading(true);
    await refreshMembership({ withPublicNames: true });
    setLoading(false);
  }, [refreshMembership]);

  const close = useCallback(() => setVisible(false), []);

  const toggle = useCallback(
    async (kind, idOrName, label) => {
      const key = `${kind}:${idOrName}`;
      if (busyKey) return;
      setBusyKey(key);

      try {
        if (kind === "private") {
          const storedId = privateIn[idOrName];
          if (storedId) {
            setPrivateIn((p) => {
              const { [idOrName]: _x, ...rest } = p;
              return rest;
            });
            await removeFromWatchlist(idOrName, storedId);
            notify?.(`Removed from '${label}'`, "info");
            track?.("remove");
          } else {
            setPrivateIn((p) => ({ ...p, [idOrName]: effectiveImdbID }));
            const toStore = movie ? { ...movie, imdbID: effectiveImdbID } : { imdbID: effectiveImdbID };
            await addToWatchlist(idOrName, toStore);
            notify?.(`Added to '${label}'!`, "success");
            track?.("add");
          }
        } else {
          if (!tmdb) return;
          const isIn = publicIn.has(idOrName);
          setPublicIn((s) => {
            const next = new Set(s);
            if (isIn) next.delete(idOrName);
            else next.add(idOrName);
            return next;
          });
          if (isIn) {
            await removePublicListItem(idOrName, tmdbKey);
            notify?.(`Removed from '${label}'`, "info");
            track?.("remove");
          } else {
            await addPublicListItem(idOrName, tmdb);
            notify?.(`Added to '${label}'!`, "success");
            track?.("add");
          }
          publicListEvents.emit({ type: "library" });
        }
      } catch (error) {
        logger.error("Error updating list membership", error);
        notify?.("Failed to update list", "error");
        await refreshMembership({ withPublicNames: true }); // roll back to server truth
      } finally {
        setBusyKey(null);
      }
    },
    [busyKey, privateIn, publicIn, effectiveImdbID, movie, tmdb, tmdbKey, notify, track, refreshMembership],
  );

  const inAnyList = Object.keys(privateIn).length > 0 || publicIn.size > 0;

  return {
    inAnyList,
    sheetProps: {
      visible,
      loading,
      busyKey,
      privateNames,
      privateIn,
      publicLists,
      publicIn,
      publicSupported: Boolean(tmdb),
      onToggle: toggle,
      onClose: close,
    },
    open,
  };
}