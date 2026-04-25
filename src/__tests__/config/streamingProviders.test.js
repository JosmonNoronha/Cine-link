jest.mock("../../services/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
  },
}));

import {
  STREAMING_PROVIDERS,
  getProviderById,
  getSubscriptionProviders,
  getProviderOptions,
  formatWatchProviders,
  isAvailableOnSubscriptions,
} from "../../config/streamingProviders";

describe("streamingProviders config utilities", () => {
  it("returns known provider and fallback for unknown id", () => {
    expect(getProviderById(8)).toEqual(
      expect.objectContaining({ id: 8, name: "Netflix" }),
    );

    expect(getProviderById(999999)).toEqual(
      expect.objectContaining({
        id: 999999,
        name: "Unknown Provider",
        icon: "film-outline",
        color: "#666",
      }),
    );
  });

  it("returns only subscription providers and option shape", () => {
    const subscriptions = getSubscriptionProviders();
    expect(subscriptions.length).toBeGreaterThan(0);
    expect(subscriptions.every((p) => p.type === "subscription")).toBe(true);

    const options = getProviderOptions();
    expect(options.length).toBe(subscriptions.length);
    expect(options[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
        icon: expect.any(String),
        color: expect.any(String),
      }),
    );
    expect(options[0].type).toBeUndefined();
  });

  it("formats watch providers and maps unknown ids safely", () => {
    const payload = {
      results: {
        US: {
          flatrate: [{ provider_id: 8 }, { provider_id: 999999 }],
          rent: [{ provider_id: 3 }],
          buy: [{ provider_id: 2 }],
          link: "https://example.com/watch",
        },
      },
    };

    const formatted = formatWatchProviders(payload, "US");

    expect(formatted.link).toBe("https://example.com/watch");
    expect(formatted.streaming[0]).toEqual(
      expect.objectContaining({ name: "Netflix" }),
    );
    expect(formatted.streaming[1]).toEqual(
      expect.objectContaining({ name: "Unknown Provider" }),
    );
    expect(formatted.rent[0]).toEqual(
      expect.objectContaining({ name: "Google Play Movies" }),
    );
    expect(formatted.buy[0]).toEqual(
      expect.objectContaining({ name: "Apple iTunes" }),
    );
  });

  it("returns empty sections when provider payload is missing/invalid", () => {
    expect(formatWatchProviders(null)).toEqual({
      streaming: [],
      rent: [],
      buy: [],
    });

    expect(formatWatchProviders({})).toEqual({
      streaming: [],
      rent: [],
      buy: [],
    });

    expect(
      formatWatchProviders({
        results: {
          UK: { flatrate: [{ provider_id: 8 }] },
        },
      }),
    ).toEqual({
      streaming: [],
      rent: [],
      buy: [],
    });
  });

  it("detects availability against user subscriptions", () => {
    const providers = {
      results: {
        US: {
          flatrate: [{ provider_id: 8 }, { provider_id: 337 }],
        },
      },
    };

    expect(isAvailableOnSubscriptions(providers, [8, 15], "US")).toBe(true);
    expect(isAvailableOnSubscriptions(providers, [15, 29], "US")).toBe(false);
    expect(isAvailableOnSubscriptions(null, [8], "US")).toBe(false);
    expect(isAvailableOnSubscriptions(providers, [], "US")).toBe(false);
  });

  it("keeps provider map stable for known keys", () => {
    expect(STREAMING_PROVIDERS[8].name).toBe("Netflix");
    expect(STREAMING_PROVIDERS[337].name).toBe("Disney Plus");
  });
});
