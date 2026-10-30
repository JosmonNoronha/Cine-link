import {
  deviceRegion, toRows, buildRanges, rowsInRange, rangeIndexOf, nextPlayable, prevPlayable,
  lastWatchedEpisode, continueTarget, usefulTitle, youtubeWatchUrl, formatAirDate, formatCount,
} from "../streamingHelpers";

const fakeIntl = (locale) => ({ DateTimeFormat: () => ({ resolvedOptions: () => ({ locale }) }) });

describe("deviceRegion", () => {
  test.each([["en-IN", "IN"], ["en-US", "US"], ["hi_IN", "IN"], ["en-Latn-GB", "GB"], ["pt-br", "BR"]])("%s -> %s", (loc, r) =>
    expect(deviceRegion(fakeIntl(loc))).toBe(r));
  test("no region part, no Intl or a throwing Intl all give undefined", () => {
    expect(deviceRegion(fakeIntl("en"))).toBeUndefined();
    expect(deviceRegion(null)).toBeUndefined();
    expect(deviceRegion({ DateTimeFormat: () => { throw new Error("x"); } })).toBeUndefined();
  });
});

describe("rows and ranges", () => {
  const rows = toRows([[250, "bbbbbbbbbbb", 0], [1, "aaaaaaaaaaa", "AAAAAAAAAAA"], [100, "ccccccccccc", 0], [101, "ddddddddddd", 0], ["bad"], null, [0, "zzzzzzzzzzz", 0]]);

  test("toRows sorts, keeps fallback ids, drops garbage", () => {
    expect(rows.map((r) => r.n)).toEqual([1, 100, 101, 250]);
    expect(rows[0].altVideoId).toBe("AAAAAAAAAAA");
    expect(rows[1].altVideoId).toBeNull();
    expect(toRows(undefined)).toEqual([]);
  });

  test("ranges are blocks of 100 and only non-empty ones appear", () => {
    expect([rangeIndexOf(1), rangeIndexOf(100), rangeIndexOf(101)]).toEqual([0, 0, 1]);
    expect(buildRanges(rows)).toEqual([
      { index: 0, from: 1, to: 100, count: 2 },
      { index: 1, from: 101, to: 200, count: 1 },
      { index: 2, from: 201, to: 300, count: 1 },
    ]);
    expect(rowsInRange(rows, 0).map((r) => r.n)).toEqual([1, 100]);
  });

  test("next and previous playable skip the gaps", () => {
    expect(nextPlayable(rows, 1).n).toBe(100);
    expect(nextPlayable(rows, 100).n).toBe(101);
    expect(nextPlayable(rows, 250)).toBeNull();
    expect(prevPlayable(rows, 250).n).toBe(101);
    expect(prevPlayable(rows, 1)).toBeNull();
  });
});

describe("continue watching", () => {
  const rows = toRows([[1, "a", 0], [2, "b", 0], [10, "c", 0]]);
  test("last watched episode of the right season", () => {
    expect(lastWatchedEpisode({ s1e5: {}, s1e9: {}, s2e50: {}, junk: {} }, 1)).toBe(9);
    expect(lastWatchedEpisode(null)).toBe(0);
  });
  test("nothing watched starts at the first; otherwise the next playable one; finished gives null", () => {
    expect(continueTarget(rows, {}).n).toBe(1);
    expect(continueTarget(rows, { s1e2: {} }).n).toBe(10);
    expect(continueTarget(rows, { s1e5: {} }).n).toBe(10);
    expect(continueTarget(rows, { s1e10: {} })).toBeNull();
    expect(continueTarget([], {})).toBeNull();
  });
});

describe("text helpers", () => {
  test("generic TMDB names are dropped, real ones kept", () => {
    expect(usefulTitle("Episode 4856", 4856)).toBeNull();
    expect(usefulTitle("Episode 12", 4856)).toBeNull();
    expect(usefulTitle("", 1)).toBeNull();
    expect(usefulTitle("Taarak Mehta Introduces Himself", 1)).toBe("Taarak Mehta Introduces Himself");
  });
  test("urls and dates", () => {
    expect(youtubeWatchUrl("abc")).toBe("https://www.youtube.com/watch?v=abc");
    expect(formatAirDate("2026-10-26")).toBe("Oct 26, 2026");
    expect(formatAirDate("nope")).toBeNull();
    expect(formatCount(1941)).toBe("1,941");
  });
});
