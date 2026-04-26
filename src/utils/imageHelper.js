/**
 * Image URL utility for consistent TMDB image sizing across components.
 * Centralizes image sizing strategy to avoid mixed w185/w780 usage and
 * runtime URL mutation across the app.
 */

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";
const PLACEHOLDER_CARD = "https://via.placeholder.com/185x278?text=No+Poster";
const PLACEHOLDER_HERO = "https://via.placeholder.com/1280x720?text=No+Image";

/**
 * Image sizing presets:
 * - card: w185 (small card thumbnails, Home/Search/Favorites)
 * - hero: w780 (large poster for detail hero section)
 * - backdrop: w1280 (full-width backdrop banner)
 * - backdrop_sm: w780 (fallback backdrop or featured image)
 * - provider: original (provider logos, unscaled)
 */
export const IMAGE_SIZES = {
  card: "w185",
  hero: "w780",
  backdrop: "w1280",
  backdrop_sm: "w780",
  provider: "original",
};

/**
 * Build a TMDB image URL from a path and size preset.
 * @param {string} path - TMDB image path (e.g., '/poster_path', '/backdrop_path')
 * @param {string} size - Size preset from IMAGE_SIZES (default: 'card')
 * @returns {string} Complete TMDB image URL
 */
export function buildTmdbImageUrl(path, size = "card") {
  if (!path) {
    return size === "card" || size === "hero"
      ? PLACEHOLDER_CARD
      : PLACEHOLDER_HERO;
  }
  return `${TMDB_IMAGE_BASE}/${IMAGE_SIZES[size] || size}${path}`;
}

/**
 * Get a normalized TMDB poster URL. Resolves multiple input formats:
 * - TMDB path (e.g., '/abc123') → sized TMDB URL
 * - Full TMDB URL (e.g., 'https://image.tmdb.org/t/p/w185/abc123') → resized if needed
 * - IMDB poster URL (e.g., 'https://m.media-amazon.com/...') → pass-through
 * - Placeholder or unknown → return as-is
 *
 * @param {string} input - Poster URL or path
 * @param {string} size - Size preset (default: 'card')
 * @returns {string} Normalized poster URL
 */
export function getTmdbPosterUrl(input, size = "card") {
  if (!input || input === "N/A") {
    return PLACEHOLDER_CARD;
  }

  // If it's already a full TMDB URL, resize if it's a different size
  if (input.includes("image.tmdb.org/t/p/")) {
    // Extract the path component (everything after '/t/p/')
    const match = input.match(/image\.tmdb\.org\/t\/p\/[^/]+(.*)$/);
    if (match && match[1]) {
      return buildTmdbImageUrl(match[1], size);
    }
    return input;
  }

  // If it's a raw path starting with '/', build the full URL
  if (input.startsWith("/")) {
    return buildTmdbImageUrl(input, size);
  }

  // Otherwise, assume it's an external URL or placeholder (IMDB, etc.)
  return input;
}

/**
 * Get a normalized TMDB backdrop URL. Handles:
 * - TMDB path (e.g., '/abc123') → sized TMDB URL
 * - Full TMDB URL → resized if needed
 * - Fallback poster path if no backdrop
 * - Placeholder if neither available
 *
 * @param {Object} media - Media object with backdrop_path and/or poster_path
 * @param {string} size - Size preset for backdrop (default: 'backdrop')
 * @returns {string} Backdrop URL or poster fallback
 */
export function getTmdbBackdropUrl(media, size = "backdrop") {
  if (!media) {
    return PLACEHOLDER_HERO;
  }

  // Prefer backdrop if available
  if (media.backdrop_path) {
    return buildTmdbImageUrl(media.backdrop_path, size);
  }

  // Fall back to larger poster size if no backdrop
  if (media.poster_path) {
    return buildTmdbImageUrl(media.poster_path, "hero");
  }

  // Last resort: external poster URL or placeholder
  if (media.Poster && media.Poster !== "N/A") {
    return getTmdbPosterUrl(media.Poster, "hero");
  }

  return PLACEHOLDER_HERO;
}

/**
 * Get featured image URI for hero/featured sections.
 * Uses backdrop for full-width hero, falls back to sized poster.
 *
 * @param {Object} media - Media object
 * @returns {string} Featured image URI
 */
export function getFeaturedImageUri(media) {
  return getTmdbBackdropUrl(media, "backdrop");
}

/**
 * Get card thumbnail image URI with consistent sizing.
 *
 * @param {Object} media - Media object
 * @returns {string} Card image URI
 */
export function getCardImageUri(media) {
  if (!media) {
    return PLACEHOLDER_CARD;
  }

  // Prefer TMDB poster_path (card-sized)
  if (media.poster_path) {
    return buildTmdbImageUrl(media.poster_path, "card");
  }

  // Fall back to external poster
  if (media.Poster && media.Poster !== "N/A") {
    return getTmdbPosterUrl(media.Poster, "card");
  }

  return PLACEHOLDER_CARD;
}

/**
 * Get provider logo URL (unscaled 'original' size).
 *
 * @param {string} path - Provider logo path
 * @returns {string} Provider logo URL
 */
export function getProviderLogoUrl(path) {
  if (!path) {
    return "";
  }
  if (path.includes("image.tmdb.org")) {
    return path; // Already a full URL
  }
  return buildTmdbImageUrl(path, "provider");
}

/**
 * Resolve image URL from mixed media formats (TMDB API, IMDB, internal).
 * Normalizes different input formats into a consistent output size.
 *
 * @param {Object} media - Media object (may have poster_path, Poster, backdrop_path, etc.)
 * @param {string} context - Image context: 'card', 'hero', 'backdrop', or 'featured'
 * @returns {string} Resolved image URL
 */
export function resolveMediaImageUrl(media, context = "card") {
  if (!media) {
    return context === "card" ? PLACEHOLDER_CARD : PLACEHOLDER_HERO;
  }

  switch (context) {
    case "hero":
    case "featured":
      return getFeaturedImageUri(media);
    case "backdrop":
      return getTmdbBackdropUrl(media);
    case "card":
    default:
      return getCardImageUri(media);
  }
}

export default {
  IMAGE_SIZES,
  buildTmdbImageUrl,
  getTmdbPosterUrl,
  getTmdbBackdropUrl,
  getFeaturedImageUri,
  getCardImageUri,
  getProviderLogoUrl,
  resolveMediaImageUrl,
};
