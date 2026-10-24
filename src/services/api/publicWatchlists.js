import { apiClient } from "./core";

const BASE = "/public-watchlists";
const enc = encodeURIComponent;

// The response interceptor in core.js already unwraps `{ success, data }`.

export const discoverPublicLists = ({ sort = "popular", tag, limit = 20, cursor } = {}) =>
  apiClient.get(BASE, { params: { sort, tag: tag || undefined, limit, cursor: cursor || undefined } });

export const getMyPublicLists = ({ limit = 20, cursor } = {}) =>
  apiClient.get(`${BASE}/me`, { params: { limit, cursor: cursor || undefined } });

export const getFollowedPublicLists = ({ limit = 20, cursor } = {}) =>
  apiClient.get(`${BASE}/followed`, { params: { limit, cursor: cursor || undefined } });

export const getPublicList = (id) => apiClient.get(`${BASE}/${enc(id)}`);

export const getPublicListItems = (id, { limit = 30, cursor } = {}) =>
  apiClient.get(`${BASE}/${enc(id)}/items`, { params: { limit, cursor: cursor || undefined } });

export const createPublicList = ({ name, description = "", tags = [] }) =>
  apiClient.post(BASE, { name, description, tags });

export const updatePublicList = (id, patch) => apiClient.patch(`${BASE}/${enc(id)}`, patch);

export const deletePublicList = (id) => apiClient.delete(`${BASE}/${enc(id)}`);

export const addPublicListItem = (id, { tmdb_id, media_type }) =>
  apiClient.post(`${BASE}/${enc(id)}/items`, { tmdb_id, media_type });

export const removePublicListItem = (id, itemKey) =>
  apiClient.delete(`${BASE}/${enc(id)}/items/${enc(itemKey)}`);

export const toggleLikePublicList = (id) => apiClient.post(`${BASE}/${enc(id)}/like`);

export const toggleFollowPublicList = (id) => apiClient.post(`${BASE}/${enc(id)}/follow`);

export const reportPublicList = (id, { reason, note = "" }) =>
  apiClient.post(`${BASE}/${enc(id)}/report`, { reason, note });

// Which of the caller's own public lists already contain this title.
// key: "movie:123" | "tv:456"  →  { listIds: string[] }
export const getPublicMembership = (key) =>
  apiClient.get(`${BASE}/membership`, { params: { key } });
// ── Blocking (App Store guideline 1.2) ──────────────────────────────────────
export const blockUser = (userId, name = "") =>
  apiClient.post(`${BASE}/blocked-users`, { userId, name });

export const unblockUser = (userId) => apiClient.delete(`${BASE}/blocked-users/${enc(userId)}`);

// → { users: [{ userId, name, blockedAt }] }
export const getBlockedUsers = () => apiClient.get(`${BASE}/blocked-users`);
