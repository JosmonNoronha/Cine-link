import { buildTmdbImageUrl, getTmdbPosterUrl } from "../../utils/imageHelper";

// Field readers that tolerate TMDB-raw, OMDb-style and recommendation payloads.
export const getTitle = (m) => m?.Title || m?.title || m?.name || "Untitled";

export const getYear = (m) =>
  String(
    m?.Year ||
      m?.release_year ||
      (m?.release_date || m?.first_air_date || "").slice(0, 4) ||
      "",
  );

export const getRating = (m) => {
  const n = parseFloat(m?.imdbRating ?? m?.vote_average);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const getOverview = (m) => {
  const t = m?.Plot || m?.overview || "";
  return t === "N/A" ? "" : t;
};

export const getKind = (m) =>
  m?.Type === "series" || m?.media_type === "tv" ? "Series" : "Movie";

export const getGenres = (m) =>
  Array.isArray(m?.genres) ? m.genres.join(", ") : m?.genres || "";

// Sharper than the w185 "card" preset, which looks soft on 3x screens.
export const posterUri = (m, size = "w342") => {
  if (m?.poster_path) return buildTmdbImageUrl(m.poster_path, size);
  if (m?.Poster && m.Poster !== "N/A") return getTmdbPosterUrl(m.Poster, size);
  return null;
};

export const backdropUri = (m, size = "w500") =>
  m?.backdrop_path
    ? buildTmdbImageUrl(m.backdrop_path, size)
    : posterUri(m, "w500");