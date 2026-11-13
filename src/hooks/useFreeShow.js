import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getShowAvailability, clearStreamingCache } from "../services/api/streaming";
import { getSeasonDetails } from "../services/api";
import { markEpisodeWatched, getWatchedEpisodes } from "../utils/storage";
import { deviceRegion, toRows } from "../utils/streamingHelpers";
import logger from "../services/logger";

const EMPTY = [];
const NO_NAMES = {};
const namesCache = new Map(); // "tmdb:tv:8630:1" (id + season) -> { [episode]: { title, airDate } }

/** One request carries the whole show. Multi-season shows list every season's episodes; others have just one. */
function toSeasons(data) {
  const full = Array.isArray(data?.seasons) && data.seasons.some((s) => Array.isArray(s?.episodes));
  if (full) {
    return data.seasons.map((s) => ({ season: Number(s.season), rows: toRows(s.episodes), latest: s.latest ?? null }));
  }
  return [{ season: Number(data?.season) || 1, rows: toRows(data?.episodes), latest: data?.latest ?? null }];
}

/**
 * Everything the show page needs: playable episodes for this viewer, TMDB names/dates,
 * and watched state (shared with the normal details screen through the same storage key).
 *
 * The whole show loads once; picking a season is local state, so switching is instant (no request,
 * no loading screen). `season` is the season actually shown: if the one asked for has nothing to
 * watch in this region, it falls back to the first one that does.
 */
export default function useFreeShow({ tmdbId, initialSeason = 1 }) {
  const effId = `tmdb:tv:${tmdbId}`;
  const region = useMemo(() => deviceRegion(), []);
  const [state, setState] = useState({ status: "loading", all: EMPTY });
  const [wanted, setSeason] = useState(initialSeason);
  const [namesBySeason, setNamesBySeason] = useState({});
  const [watched, setWatched] = useState({});
  const watchedRef = useRef({});

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading" }));
    try {
      const data = await getShowAvailability(tmdbId, region);
      setState({ status: "ready", all: toSeasons(data) });
    } catch (err) {
      logger.error("Failed to load free episodes", err);
      setState({ status: "error", all: EMPTY });
    }
  }, [tmdbId, region]);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(
    () => state.all.find((s) => s.season === wanted) || state.all[0] || null,
    [state.all, wanted],
  );
  const season = active ? active.season : wanted;
  const rows = active ? active.rows : EMPTY;
  const latest = active ? active.latest : null;

  // What the season switcher shows. Same identity until the data changes, so it does not re-render.
  const seasons = useMemo(() => state.all.map((s) => ({ season: s.season, count: s.rows.length })), [state.all]);

  // Watched marks are for the whole show, so they load once.
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
    return () => {
      cancelled = true;
    };
  }, [effId]);

  // Episode names come per season from TMDB, fetched the first time a season is shown.
  useEffect(() => {
    if (state.status !== "ready") return undefined; // the season shown is only known once the data is in
    const key = `${effId}:${season}`;
    const hit = namesCache.get(key);
    if (hit) {
      setNamesBySeason((p) => (p[season] === hit ? p : { ...p, [season]: hit }));
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await getSeasonDetails(effId, season);
        const map = {};
        for (const ep of data?.Episodes || []) {
          map[Number(ep.Episode)] = {
            title: ep.Title,
            airDate: ep.Released && ep.Released !== "N/A" ? ep.Released : null,
          };
        }
        namesCache.set(key, map);
        if (!cancelled) setNamesBySeason((p) => ({ ...p, [season]: map }));
      } catch (err) {
        logger.error("Failed to load episode names", err); // the list still works with "Episode N"
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [effId, season, state.status]);

  const names = namesBySeason[season] || NO_NAMES;

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

  return {
    status: state.status,
    rows,
    latest,
    season,
    seasons,
    setSeason,
    names,
    watched,
    setEpisodeWatched,
    reload,
    region,
    effId,
  };
}
