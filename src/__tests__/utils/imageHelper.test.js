import {
  buildTmdbImageUrl,
  getTmdbPosterUrl,
  getTmdbBackdropUrl,
  getCardImageUri,
  getFeaturedImageUri,
  getProviderLogoUrl,
  resolveMediaImageUrl,
  IMAGE_SIZES,
} from "../../utils/imageHelper";

describe("Image Helper Utility", () => {
  describe("buildTmdbImageUrl", () => {
    it("builds a TMDB URL with card size for a path", () => {
      const url = buildTmdbImageUrl("/abc123", "card");
      expect(url).toBe("https://image.tmdb.org/t/p/w185/abc123");
    });

    it("builds a TMDB URL with hero size for a path", () => {
      const url = buildTmdbImageUrl("/abc123", "hero");
      expect(url).toBe("https://image.tmdb.org/t/p/w780/abc123");
    });

    it("builds a TMDB URL with backdrop size for a path", () => {
      const url = buildTmdbImageUrl("/abc123", "backdrop");
      expect(url).toBe("https://image.tmdb.org/t/p/w1280/abc123");
    });

    it("returns placeholder for empty path", () => {
      const url = buildTmdbImageUrl("", "card");
      expect(url).toContain("placeholder");
    });
  });

  describe("getTmdbPosterUrl", () => {
    it("normalizes a raw TMDB path", () => {
      const url = getTmdbPosterUrl("/poster123", "card");
      expect(url).toBe("https://image.tmdb.org/t/p/w185/poster123");
    });

    it("resizes an existing full TMDB URL from w185 to hero size", () => {
      const url = getTmdbPosterUrl(
        "https://image.tmdb.org/t/p/w185/poster123",
        "hero",
      );
      expect(url).toBe("https://image.tmdb.org/t/p/w780/poster123");
    });

    it("passes through IMDB URLs unchanged", () => {
      const imdbUrl = "https://m.media-amazon.com/images/poster.jpg";
      const url = getTmdbPosterUrl(imdbUrl, "card");
      expect(url).toBe(imdbUrl);
    });

    it("returns placeholder for N/A", () => {
      const url = getTmdbPosterUrl("N/A", "card");
      expect(url).toContain("placeholder");
    });

    it("returns placeholder for null/undefined", () => {
      expect(getTmdbPosterUrl(null, "card")).toContain("placeholder");
      expect(getTmdbPosterUrl(undefined, "hero")).toContain("placeholder");
    });
  });

  describe("getTmdbBackdropUrl", () => {
    it("prefers backdrop_path over poster_path", () => {
      const media = {
        backdrop_path: "/backdrop123",
        poster_path: "/poster123",
      };
      const url = getTmdbBackdropUrl(media, "backdrop");
      expect(url).toBe("https://image.tmdb.org/t/p/w1280/backdrop123");
    });

    it("falls back to poster_path if no backdrop", () => {
      const media = {
        poster_path: "/poster123",
      };
      const url = getTmdbBackdropUrl(media, "backdrop");
      expect(url).toBe("https://image.tmdb.org/t/p/w780/poster123");
    });

    it("falls back to external Poster URL if no TMDB paths", () => {
      const media = {
        Poster: "https://m.media-amazon.com/poster.jpg",
      };
      const url = getTmdbBackdropUrl(media, "hero");
      expect(url).toBe("https://m.media-amazon.com/poster.jpg");
    });

    it("returns placeholder for media with no images", () => {
      const url = getTmdbBackdropUrl({}, "backdrop");
      expect(url).toContain("placeholder");
    });
  });

  describe("getCardImageUri", () => {
    it("returns card-sized poster for TMDB path", () => {
      const media = { poster_path: "/poster123" };
      const url = getCardImageUri(media);
      expect(url).toBe("https://image.tmdb.org/t/p/w185/poster123");
    });

    it("falls back to external Poster", () => {
      const media = { Poster: "https://example.com/poster.jpg" };
      const url = getCardImageUri(media);
      expect(url).toBe("https://example.com/poster.jpg");
    });

    it("returns placeholder for empty media", () => {
      const url = getCardImageUri(null);
      expect(url).toContain("placeholder");
    });
  });

  describe("getFeaturedImageUri", () => {
    it("returns backdrop for featured section", () => {
      const media = { backdrop_path: "/backdrop123" };
      const url = getFeaturedImageUri(media);
      expect(url).toBe("https://image.tmdb.org/t/p/w1280/backdrop123");
    });

    it("delegates to getTmdbBackdropUrl", () => {
      const media = {
        backdrop_path: "/backdrop123",
        poster_path: "/poster123",
      };
      const url = getFeaturedImageUri(media);
      // getTmdbBackdropUrl prefers backdrop_path
      expect(url).toBe("https://image.tmdb.org/t/p/w1280/backdrop123");
    });
  });

  describe("getProviderLogoUrl", () => {
    it("builds original-size URL for provider logos", () => {
      const url = getProviderLogoUrl("/logo123");
      expect(url).toBe("https://image.tmdb.org/t/p/original/logo123");
    });

    it("passes through full TMDB URLs", () => {
      const fullUrl = "https://image.tmdb.org/t/p/original/logo123";
      const url = getProviderLogoUrl(fullUrl);
      expect(url).toBe(fullUrl);
    });

    it("returns empty string for null/empty path", () => {
      expect(getProviderLogoUrl(null)).toBe("");
      expect(getProviderLogoUrl("")).toBe("");
    });
  });

  describe("resolveMediaImageUrl", () => {
    const media = {
      backdrop_path: "/backdrop123",
      poster_path: "/poster123",
    };

    it("resolves card context to card image", () => {
      const url = resolveMediaImageUrl(media, "card");
      expect(url).toBe("https://image.tmdb.org/t/p/w185/poster123");
    });

    it("resolves hero context to featured image", () => {
      const url = resolveMediaImageUrl(media, "hero");
      expect(url).toBe("https://image.tmdb.org/t/p/w1280/backdrop123");
    });

    it("resolves featured context to featured image", () => {
      const url = resolveMediaImageUrl(media, "featured");
      expect(url).toBe("https://image.tmdb.org/t/p/w1280/backdrop123");
    });

    it("defaults to card context when not specified", () => {
      const url = resolveMediaImageUrl(media);
      expect(url).toBe("https://image.tmdb.org/t/p/w185/poster123");
    });
  });

  describe("IMAGE_SIZES", () => {
    it("exports correct size presets", () => {
      expect(IMAGE_SIZES.card).toBe("w185");
      expect(IMAGE_SIZES.hero).toBe("w780");
      expect(IMAGE_SIZES.backdrop).toBe("w1280");
      expect(IMAGE_SIZES.provider).toBe("original");
    });
  });
});
