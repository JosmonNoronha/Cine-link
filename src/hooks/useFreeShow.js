import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getShowAvailability, clearStreamingCache } from "../services/api/streaming";
import { getSeasonDetails } from "../services/api";
import { markEpisodeWatched, getWatchedEpisodes } from "../utils/storage";
import { deviceRegion, toRows } from "../utils/streamingHelpers";
import logger from "../services/logger";

const namesCache = new Map(); // "tmdb:tv:8630" -> { [episode]: { title, airDate } }

/**
 * Everything the show page needs: playable episodes for this viewer, TMDB names/dates,
 * and watched state (shared with the normal details screen through the same storage key).
 */
export default function useFreeShow({ tmdbId, season = 1 }) {
  const effId = `tmdb:tv:${tmdbId}`;
  const region = useMemo(() => deviceRegion(), []);
  const [state, setState] = useState({ status: "loading", rows: [], latest: null });
  const [names, setNames] = useState(() => namesCache.get(effId) || {});
  const [watched, setWatched] = useState({});
  const watchedRef = useRef({});

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading" }));
    try {
      const data = await getShowAvailability(tmdbId, region);
      setState({ status: "ready", rows: toRows(data?.episodes), latest: data?.latest ?? null });
    } catch (err) {
      logger.error("Failed to load free episodes", err);
      setState({ status: "error", rows: [], latest: null });
    }
  }, [tmdbId, region]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const map = (await getWatchedEpisodes(effId)) || {};
        if (cancelled) return;
        watchedRef.current = map;
        setWatched(map);
      } catch (err) {
        logger.error("Failed to load watched episodes", err);
      }
    })();

    (async () => {
      try {
        let map = namesCache.get(effId);
        if (!map) {
          const data = await getSeasonDetails(effId, season);
          map = {};
          for (const ep of data?.Episodes || []) {
            map[Number(ep.Episode)] = {
              title: ep.Title,
              airDate: ep.Released && ep.Released !== "N/A" ? ep.Released : null,
            };
          }
          namesCache.set(effId, map);
        }
        if (!cancelled) setNames(map);
      } catch (err) {
        logger.error("Failed to load episode names", err); // the list still works with "Episode N"
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effId, season]);

  const setEpisodeWatched = useCallback(
    async (n, value) => {
      const key = `s${season}e${n}`;
      const prev = watchedRef.current;
      if (!!prev[key] === value) return;
      const next = { ...prev };
      if (value) next[key] = { watchedAt: new Date().toISOString(), season, episode: n };
      else delete next[key];
      watchedRef.current = next;
      setWatched(next);
      try {
        await markEpisodeWatched(effId, season, n, value);
      } catch (err) {
        logger.error("Failed to update watch status", err);
        watchedRef.current = prev;
        setWatched(prev);
      }
    },
    [effId, season],
  );

  const reload = useCallback(() => {
    clearStreamingCache();
    load();
  }, [load]);

  return { ...state, names, watched, setEpisodeWatched, reload, region, effId };
}
