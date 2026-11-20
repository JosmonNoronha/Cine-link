import { apiClient } from "./core";

/**
 * One page of news, newest first.
 * -> { items: [{ id, title, excerpt, url, image, source, sourceName, region, category, publishedAt, buzz }],
 *      nextCursor: string|null, updatedAt }
 * Throws on failure so the News screen can offer a retry; the Home row catches it and hides itself.
 */
export const getNews = async ({ sort, region, limit = 20, before } = {}) => {
  const params = { limit };
  if (sort && sort !== "latest") params.sort = sort; // latest | trending | today | week
  if (region && region !== "all") params.region = region;
  if (before) params.before = before;
  const data = await apiClient.get("/news", { params });
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    nextCursor: data?.nextCursor || null,
  };
};
