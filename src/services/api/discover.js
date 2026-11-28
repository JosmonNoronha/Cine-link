import { apiClient } from "./core";

// One curated list from the Home hub menu ("in-theaters", ...). Returns
// { items, page, totalPages, region, feed, type }; items open in Details like any other title.
export const getDiscoverFeed = async (
  feed,
  { type = "movie", region, page = 1 } = {},
) => {
  const query = [
    `type=${encodeURIComponent(type)}`,
    `page=${encodeURIComponent(page)}`,
    region ? `region=${encodeURIComponent(region)}` : null,
  ]
    .filter(Boolean)
    .join("&");
  return apiClient.get(`/discover/${encodeURIComponent(feed)}?${query}`);
};

// Movies (cinema releases in `region`) or series premieres for one month ("2026-12").
export const getCalendarMonth = async (month, { type = "movie", region } = {}) => {
  const query = [
    `month=${encodeURIComponent(month)}`,
    `type=${encodeURIComponent(type)}`,
    region ? `region=${encodeURIComponent(region)}` : null,
  ]
    .filter(Boolean)
    .join("&");
  return apiClient.get(`/discover/calendar?${query}`);
};

// Episodes airing in the month for the user's own shows (tmdb tv ids).
export const getMyShowsCalendar = async (month, ids) =>
  apiClient.post("/discover/calendar/my-shows", { month, ids });
