import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { auth } from "../../firebaseConfig";
import {
  getTrending,
  getPopular,
  getNewReleases,
  getTopRated,
  searchByGenre,
  getRecommendations,
} from "../services/api";
import logger from "../services/logger";

/* ───────── module-level cache for the non-personalized feed ───────── */

const CACHE_TTL = 5 * 60 * 1000;
let publicCache = { data: null, at: 0 };

/* ───────── helpers ───────── */

const normalizeMovie = (item) => {
  if (!item) return null;
  if (item.imdbID && (item.imdbID.startsWith("tt") || item.imdbID.startsWith("tmdb:"))) {
    return item;
  }
  if (item.id) {
    const mediaType = item.media_type || (item.first_air_date ? "tv" : "movie");
    return {
      ...item,
      imdbID: `tmdb:${mediaType}:${item.id}`,
      Title: item.Title || item.title || item.name,
      Year: item.Year || item.release_date?.split("-")[0] || item.first_air_date?.split("-")[0],
      Type: item.Type || (mediaType === "tv" ? "series" : "movie"),
      Poster:
        item.Poster ||
        (item.poster_path ? `https://image.tmdb.org/t/p/w185${item.poster_path}` : "N/A"),
    };
  }
  return item;
};

const normList = (list) =>
  Array.isArray(list) ? list.map(normalizeMovie).filter((m) => m?.imdbID) : [];

const safe = (promise, label) =>
  promise.catch((err) => {
    logger.warn(`${label} failed`, err);
    return [];
  });

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

const fetchPublic = async () => {
  const [trending, popular, releases, topRated] = await Promise.all([
    safe(getTrending("all", "week"), "Trending"),
    safe(getPopular(), "Popular"),
    safe(getNewReleases("movie"), "New releases"),
    safe(getTopRated(), "Top rated"),
  ]);
  return {
    trending: normList(trending),
    popular: normList(popular),
    releases: normList(releases),
    topRated: normList(topRated),
  };
};

const EMPTY_PERSONAL = { recs: [], genre1: [], genre2: [], series: [], seedTitle: null };

const fetchPersonal = async ({ seedTitle, topGenre, secondGenre, wantSeries }) => {
  const [recs, genre1, genre2, series] = await Promise.all([
    seedTitle
      ? safe(getRecommendations(seedTitle, { personalize: Boolean(auth.currentUser) }), "Recommendations")
      : [],
    topGenre ? safe(searchByGenre(topGenre, "movie"), `Genre ${topGenre}`) : [],
    secondGenre ? safe(searchByGenre(secondGenre, "all"), `Genre ${secondGenre}`) : [],
    wantSeries ? safe(getTrending("tv", "week"), "Series") : [],
  ]);
  return {
    recs: normList(recs),
    genre1: normList(genre1),
    genre2: normList(genre2),
    series: normList(series),
    seedTitle,
  };
};

/* ───────── pure feed composition (no network, no state) ───────── */

const buildFeed = ({ pub, personal, watchlists, topGenre, secondGenre }) => {
  const seen = new Set();
  const featured = (pub?.trending || []).slice(0, 6);
  featured.forEach((m) => seen.add(m.imdbID));

  // Pull up to n items, skipping anything already shown higher up the page
  const take = (list, n, { fresh = true } = {}) => {
    const out = [];
    const local = new Set();
    for (const m of list || []) {
      if (!m?.imdbID || local.has(m.imdbID)) continue;
      if (fresh && seen.has(m.imdbID)) continue;
      local.add(m.imdbID);
      seen.add(m.imdbID);
      out.push(m);
      if (out.length >= n) break;
    }
    return out;
  };

  const sections = [];
  const push = (id, title, subtitle, type, data, min = 3) => {
    if (data.length >= min) sections.push({ id, title, subtitle, type, data });
  };

  // 1. Continue watching (derived from local data, costs nothing)
  const unwatched = new Map();
  for (const list of Object.values(watchlists || {})) {
    for (const it of Array.isArray(list) ? list : []) {
      if (it?.imdbID && !it.watched && !unwatched.has(it.imdbID)) unwatched.set(it.imdbID, it);
    }
  }
  push(
    "continue-watching",
    "Continue Watching",
    `${unwatched.size} unwatched`,
    "continue",
    [...unwatched.values()].slice(0, 10),
    1,
  );

  // 2. Top 10 (ranked)
  push("top10", "Top 10 Right Now", "Most popular today", "ranked", take(pub?.popular, 10, { fresh: false }), 5);

  // 3. Buzzing (wide backdrops)
  push("buzzing", "Buzzing This Week", "Movies people are watching", "wide", take(pub?.releases, 10));

  // 4. Spotlight (because you liked)
  if (personal.seedTitle) {
    push(
      "because-you-liked",
      `Because You Liked "${personal.seedTitle}"`,
      "Picked for you",
      "spotlight",
      take(personal.recs, 9),
      1,
    );
  }

  // 5. Top genre (posters)
  if (topGenre) {
    push(
      `genre-${topGenre}`,
      `Popular ${capitalize(topGenre)}`,
      `Because you love ${topGenre}`,
      "poster",
      take(personal.genre1, 12),
      4,
    );
  }

  // 6. Series (wide) when the user leans toward series
  push("series", "Series To Start", "Based on your taste", "wide", take(personal.series, 10));

  // 7. Keep exploring (stacked list)
  push("explore", "Keep Exploring", "More popular picks", "stacked", take(pub?.popular, 9), 3);

  // 8. Second genre (posters)
  if (secondGenre) {
    push(
      `genre-${secondGenre}`,
      `Explore ${capitalize(secondGenre)}`,
      "Expand your horizons",
      "poster",
      take(personal.genre2, 12),
      4,
    );
  }

  // 9. Critically acclaimed (wide)
  push("top-rated", "Critically Acclaimed", "Highest rated of all time", "wide", take(pub?.topRated, 10));

  return { featured, sections };
};

/* ───────── hook ───────── */

export default function useHomeFeed({ favorites, watchlists, profile, isNewUser, ready }) {
  const [pub, setPub] = useState(publicCache.data);
  const [status, setStatus] = useState(publicCache.data ? "ready" : "loading");
  const [personal, setPersonal] = useState(EMPTY_PERSONAL);
  const requestRef = useRef(0);

  const topGenre = profile?.topGenres?.[0] || null;
  const secondGenre = profile?.topGenres?.[1] || null;
  const wantSeries = profile?.contentPreference === "series";

  /* Public feed: fetched once, cached, revalidated after TTL */
  const loadPublic = useCallback(async ({ force = false } = {}) => {
    const fresh = publicCache.data && Date.now() - publicCache.at < CACHE_TTL;
    if (!force && fresh) {
      setPub(publicCache.data);
      setStatus("ready");
      return;
    }

    const id = ++requestRef.current;
    const data = await fetchPublic();
    if (id !== requestRef.current) return;

    const empty =
      !data.trending.length && !data.popular.length && !data.releases.length && !data.topRated.length;
    if (empty) {
      setStatus(publicCache.data ? "ready" : "error");
      return;
    }
    publicCache = { data, at: Date.now() };
    setPub(data);
    setStatus("ready");
  }, []);

  useEffect(() => {
    loadPublic();
  }, [loadPublic]);

  const retry = useCallback(() => {
    setStatus("loading");
    return loadPublic({ force: true });
  }, [loadPublic]);

  const reload = useCallback(() => loadPublic({ force: true }), [loadPublic]);

  /* Stable "because you liked" seed: only re-picked if the favorite is removed */
  const seedRef = useRef(null);
  const seedId = useMemo(() => {
    if (!ready || isNewUser || !favorites.length) {
      seedRef.current = null;
      return null;
    }
    const keep = seedRef.current && favorites.some((f) => f.imdbID === seedRef.current);
    if (!keep) {
      seedRef.current = favorites[Math.floor(Math.random() * favorites.length)].imdbID;
    }
    return seedRef.current;
  }, [favorites, ready, isNewUser]);

  const seedTitle = useMemo(
    () => favorites.find((f) => f.imdbID === seedId)?.Title ?? null,
    [favorites, seedId],
  );

  /* Personalized feed: refetched ONLY when its inputs change, never on watchlist edits */
  useEffect(() => {
    if (!ready || isNewUser) {
      setPersonal(EMPTY_PERSONAL);
      return undefined;
    }
    let cancelled = false;
    fetchPersonal({ seedTitle, topGenre, secondGenre, wantSeries }).then((result) => {
      if (!cancelled) setPersonal(result);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, isNewUser, seedTitle, topGenre, secondGenre, wantSeries]);

  /* Cheap recompute when watchlists change */
  const { featured, sections } = useMemo(
    () => buildFeed({ pub, personal, watchlists, topGenre, secondGenre }),
    [pub, personal, watchlists, topGenre, secondGenre],
  );

  return { featured, sections, status, retry, reload };
}