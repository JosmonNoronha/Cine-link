// Pure helpers for the free-episodes screens (no React, no network): easy to test.

export const RANGE_SIZE = 100;

/** Two-letter country from the device language setting ("en-IN" -> "IN"), or undefined. */
export function deviceRegion(intl = globalThis.Intl) {
  try {
    const locale = intl?.DateTimeFormat?.().resolvedOptions?.().locale;
    if (!locale) return undefined;
    const part = String(locale)
      .split(/[-_]/)
      .slice(1)
      .find((p) => /^[A-Za-z]{2}$/.test(p));
    return part ? part.toUpperCase() : undefined;
  } catch {
    return undefined;
  }
}

/** API rows [[episode, videoId, fallbackVideoId|0], ...] -> sorted [{ n, videoId, altVideoId }]. */
export function toRows(episodes) {
  if (!Array.isArray(episodes)) return [];
  return episodes
    .filter((e) => Array.isArray(e) && Number(e[0]) > 0 && typeof e[1] === "string" && e[1])
    .map((e) => ({ n: Number(e[0]), videoId: e[1], altVideoId: typeof e[2] === "string" && e[2] ? e[2] : null }))
    .sort((a, b) => a.n - b.n);
}

export const rangeIndexOf = (n) => Math.floor((Number(n) - 1) / RANGE_SIZE);

/** Only the ranges that have at least one playable episode: [{ index, from, to, count }]. */
export function buildRanges(rows) {
  const byIndex = new Map();
  for (const r of rows) {
    const i = rangeIndexOf(r.n);
    byIndex.set(i, (byIndex.get(i) || 0) + 1);
  }
  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, count]) => ({ index, from: index * RANGE_SIZE + 1, to: (index + 1) * RANGE_SIZE, count }));
}

export const rowsInRange = (rows, index) => rows.filter((r) => rangeIndexOf(r.n) === index);

export const nextPlayable = (rows, n) => rows.find((r) => r.n > n) || null;

export function prevPlayable(rows, n) {
  for (let i = rows.length - 1; i >= 0; i -= 1) if (rows[i].n < n) return rows[i];
  return null;
}

/** Highest watched episode number of a season from a watched map like { s1e5: {...} }. */
export function lastWatchedEpisode(watched, season = 1) {
  let max = 0;
  for (const key of Object.keys(watched || {})) {
    const m = /^s(\d+)e(\d+)$/.exec(key);
    if (m && Number(m[1]) === season) max = Math.max(max, Number(m[2]));
  }
  return max;
}

/** Where "Continue" goes: the next playable episode after your furthest watched one, else the first. */
export function continueTarget(rows, watched, season = 1) {
  if (!rows.length) return null;
  const last = lastWatchedEpisode(watched, season);
  return (last > 0 ? nextPlayable(rows, last) : null) || (last > 0 ? null : rows[0]);
}

/** TMDB names like "Episode 4856" carry no information: return null for those. */
export function usefulTitle(name, n) {
  const t = String(name || "").trim();
  if (!t) return null;
  if (new RegExp(`^(episode|ep)\\.?\\s*${n}$`, "i").test(t)) return null;
  if (/^episode\s*\d+$/i.test(t)) return null;
  return t;
}

export const youtubeWatchUrl = (videoId) => `https://www.youtube.com/watch?v=${videoId}`;

export const formatCount = (n) => Number(n || 0).toLocaleString("en-US");

/** Short air date from "2026-10-26" without time-zone surprises. */
export function formatAirDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!m) return null;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}
