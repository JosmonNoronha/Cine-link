import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getShowAvailability, clearStreamingCache } from "../services/api/streaming";
import { getSeasonDetails } from "../services/api";
import { markEpisodeWatched, getWatchedEpisodes } from "../utils/storage";
import { deviceRegion, toRows } from "../utils/streamingHelpers";
import logger from "../services/logger";

const EMPTY = [];
const namesCache = new Map(); // "tmdb:tv:8630:1" (id + season) -> { [episode]: { title, airDate } }

/**
 * Everything the show page needs: playable episodes for this viewer, TMDB names/dates,
 * and watched state (shared with the normal details screen through the same storage key).
 */
export default function useFreeShow({ tmdbId, season = 1 }) {
  const effId = `tmdb:tv:${tmdbId}`;
  const namesKey = `${effId}:${season}`;
  const region = useMemo(() => deviceRegion(), []);
  const [state, setState] = useState({ season, status: "loading", rows: EMPTY, latest: null, seasons: EMPTY });
  const [names, setNames] = useState(() => namesCache.get(namesKey) || {});
  const [watched, setWatched] = useState({});
  const watchedRef = useRef({});
  const loadId = useRef(0);

  const load = useCallback(async () => {
    const id = ++loadId.current; // a slower answer for a season we already left must not win
    // `seasons` is kept, so the season switcher survives a season change; the old season's rows are dropped
    setState((s) =>
      s.season === season ? { ...s, status: "loading" } : { ...s, season, status: "loading", rows: EMPTY, latest: null },
    );
    try {
      const data = await getShowAvailability(tmdbId, region, season);
      if (id !== loadId.current) return;
      setState({
        season,
        status: "ready",
        rows: toRows(data?.episodes),
        latest: data?.latest ?? null,
        seasons: Array.isArray(data?.seasons) ? data.seasons : [], // [{ season, count, latest }] this viewer can watch
      });
    } catch (err) {
      if (id !== loadId.current) return;
      logger.error("Failed to load free episodes", err);
      setState((s) => ({ season, status: "error", rows: EMPTY, latest: null, seasons: s.seasons }));
    }
  }, [tmdbId, region, season]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setNames(namesCache.get(namesKey) || {}); // never show another season's episode names

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
        let map = namesCache.get(namesKey);
        if (!map) {
          const data = await getSeasonDetails(effId, season);
          map = {};
          for (const ep of data?.Episodes || []) {
            map[Number(ep.Episode)] = {
              title: ep.Title,
              airDate: ep.Released && ep.Released !== "N/A" ? ep.Released : null,
            };
          }
          namesCache.set(namesKey, map);
        }
        if (!cancelled) setNames(map);
      } catch (err) {
        logger.error("Failed to load episode names", err); // the list still works with "Episode N"
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [effId, namesKey, season]);

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

  // Right after a season change, until its episodes arrive, show "loading" instead of the previous season's rows.
  const current = state.season === season;
  return {
    status: current ? state.status : "loading",
    rows: current ? state.rows : EMPTY,
    latest: current ? state.latest : null,
    seasons: state.seasons,
    names,
    watched,
    setEpisodeWatched,
    reload,
    region,
    effId,
  };
}
