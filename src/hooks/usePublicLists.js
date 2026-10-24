import { useCallback, useEffect, useRef, useState } from "react";
import {
  discoverPublicLists,
  toggleLikePublicList,
  toggleFollowPublicList,
} from "../services/api/publicWatchlists";
import publicListEvents from "../utils/publicListEvents";
import logger from "../services/logger";

const PAGE = 20;
// Lists by blocked users are removed on the server, so a page can come back short or empty
// even though more exist. Keep asking (a few times) instead of looking stuck.
const MAX_EMPTY_HOPS = 5;

/**
 * Paginated discovery feed (Explore tab).
 * Stale responses are ignored; like / save are optimistic with rollback, and
 * changes made on the list screen are merged in via publicListEvents.
 */
export default function usePublicLists({ sort = "popular", tag = null } = {}) {
  const [lists, setLists] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef(null);
  const reqRef = useRef(0);
  const moreBusyRef = useRef(false);

  const fetchUsable = useCallback(
    async (startCursor) => {
      let cursor = startCursor || undefined;
      let collected = [];
      let data = null;
      for (let hop = 0; hop < MAX_EMPTY_HOPS; hop += 1) {
        data = await discoverPublicLists({ sort, tag, limit: PAGE, cursor });
        const got = Array.isArray(data?.lists) ? data.lists : [];
        collected = collected.concat(got);
        cursor = data?.nextCursor || null;
        if (got.length > 0 || !data?.hasMore || !cursor) break;
      }
      return { lists: collected, nextCursor: cursor, hasMore: Boolean(data?.hasMore && cursor) };
    },
    [sort, tag],
  );

  const reload = useCallback(
    async ({ pull = false } = {}) => {
      const req = ++reqRef.current;
      moreBusyRef.current = false;
      setLoadingMore(false);
      if (pull) setRefreshing(true);
      else setStatus("loading");
      try {
        const data = await fetchUsable(null);
        if (req !== reqRef.current) return;
        setLists(data.lists);
        cursorRef.current = data.nextCursor;
        setHasMore(data.hasMore);
        setStatus("ready");
      } catch (error) {
        if (req !== reqRef.current) return;
        logger.warn("Failed to load public lists", error?.message);
        setStatus((s) => (pull && s === "ready" ? "ready" : "error"));
      } finally {
        if (req === reqRef.current) setRefreshing(false);
      }
    },
    [fetchUsable],
  );

  useEffect(() => {
    setLists([]);
    setHasMore(false);
    cursorRef.current = null;
    reload();
    return () => {
      reqRef.current += 1;
    };
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (!hasMore || moreBusyRef.current || !cursorRef.current) return;
    const req = reqRef.current;
    moreBusyRef.current = true;
    setLoadingMore(true);
    try {
      const data = await fetchUsable(cursorRef.current);
      if (req !== reqRef.current) return;
      setLists((prev) => {
        const seen = new Set(prev.map((l) => l.id));
        return [...prev, ...data.lists.filter((l) => !seen.has(l.id))];
      });
      cursorRef.current = data.nextCursor;
      setHasMore(data.hasMore);
    } catch (error) {
      logger.warn("Failed to load more public lists", error?.message);
    } finally {
      if (req === reqRef.current) {
        moreBusyRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [hasMore, fetchUsable]);

  const patchList = useCallback((id, patch) => {
    setLists((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...(typeof patch === "function" ? patch(l) : patch) } : l)),
    );
  }, []);

  // Keep in sync with changes made elsewhere (list screen, library tab).
  useEffect(
    () =>
      publicListEvents.subscribe((e) => {
        if (e.type === "patch") patchList(e.id, e.patch);
        else if (e.type === "removed") setLists((prev) => prev.filter((l) => l.id !== e.id));
        // The viewer blocked someone: drop everything by them right away.
        else if (e.type === "blocked") setLists((prev) => prev.filter((l) => l.ownerId !== e.ownerId));
        // Unblocked: their lists may come back, so fetch the feed again.
        else if (e.type === "unblocked") reload();
      }),
    [patchList, reload],
  );

  const optimistic = useCallback(
    async (list, flag, countKey, call) => {
      const next = !list[flag];
      const delta = next ? 1 : -1;
      patchList(list.id, (l) => ({ [flag]: next, [countKey]: Math.max(0, (l[countKey] || 0) + delta) }));
      try {
        await call(list.id);
        return true;
      } catch (error) {
        logger.warn("Public list action failed", error?.message);
        patchList(list.id, (l) => ({ [flag]: !next, [countKey]: Math.max(0, (l[countKey] || 0) - delta) }));
        return false;
      }
    },
    [patchList],
  );

  const toggleLike = useCallback(
    (list) => (list.viewerIsOwner ? null : optimistic(list, "viewerHasLiked", "likeCount", toggleLikePublicList)),
    [optimistic],
  );

  const toggleSave = useCallback(
    async (list) => {
      if (list.viewerIsOwner) return null;
      const ok = await optimistic(list, "viewerIsFollowing", "followCount", toggleFollowPublicList);
      if (ok) publicListEvents.emit({ type: "library" });
      return ok;
    },
    [optimistic],
  );

  return {
    lists,
    status,
    refreshing,
    loadingMore,
    hasMore,
    reload,
    refresh: () => reload({ pull: true }),
    loadMore,
    toggleLike,
    toggleSave,
  };
}