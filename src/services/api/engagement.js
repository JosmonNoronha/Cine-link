import { auth } from "../../../firebaseConfig";
import logger from "../logger";
import { apiClient, createIdempotencyKey } from "./core";

export const getUserSubscriptions = async () => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      logger.warn("⚠️ No auth token available for subscriptions");
      return [];
    }

    const data = await apiClient.get("/user/subscriptions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    logger.info("✅ User subscriptions fetched:", data);
    return data?.subscriptions || [];
  } catch (error) {
    logger.error("❌ Error fetching user subscriptions:", error);
    return [];
  }
};

export const updateUserSubscriptions = async (subscriptions) => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Not authenticated");
    }

    const data = await apiClient.put(
      "/user/subscriptions",
      { subscriptions },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    logger.info("✅ User subscriptions updated:", data);
    return data;
  } catch (error) {
    logger.error("❌ Error updating user subscriptions:", error);
    throw error;
  }
};

export const getGamificationData = async () => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return null;
    const data = await apiClient.get("/user/gamification", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data?.gamification || null;
  } catch (error) {
    logger.warn("⚠️ Could not fetch gamification from cloud:", error.message);
    return null;
  }
};

export const syncGamificationData = async (state) => {
  try {
    void state;
  } catch (error) {
    logger.warn("⚠️ Legacy gamification sync ignored:", error.message);
  }
};

export const recordGamificationWatch = async (movieId, listName) => {
  const idempotencyKey = createIdempotencyKey("watch");
  const data = await apiClient.post(
    "/user/gamification/actions/watch",
    {
      movieId,
      listName,
    },
    {
      headers: {
        "X-Idempotency-Key": idempotencyKey,
      },
    },
  );
  return data || null;
};

export const recordGamificationListCreated = async (listName) => {
  const idempotencyKey = createIdempotencyKey("list-created");
  const data = await apiClient.post(
    "/user/gamification/actions/list-created",
    {
      listName,
    },
    {
      headers: {
        "X-Idempotency-Key": idempotencyKey,
      },
    },
  );
  return data || null;
};

export const recordGamificationListCompleted = async (listName) => {
  const idempotencyKey = createIdempotencyKey("list-completed");
  const data = await apiClient.post(
    "/user/gamification/actions/list-completed",
    {
      listName,
    },
    {
      headers: {
        "X-Idempotency-Key": idempotencyKey,
      },
    },
  );
  return data || null;
};

export const getWatchedEpisodes = async (contentId) => {
  try {
    const safeContentId = encodeURIComponent(contentId);
    const data = await apiClient.get(`/user/watched/${safeContentId}`);
    return data?.episodes || {};
  } catch (error) {
    logger.warn("⚠️ Could not fetch watched episodes:", error.message);
    return {};
  }
};

export const setEpisodeWatched = async (
  contentId,
  season,
  episode,
  watched,
) => {
  const safeContentId = encodeURIComponent(contentId);
  const data = await apiClient.patch(
    `/user/watched/${safeContentId}/episodes`,
    {
      season,
      episode,
      watched,
    },
  );
  return data?.episodes || {};
};
