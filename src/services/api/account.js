import { apiClient } from "./core";

/**
 * Permanently deletes the signed-in user's account and data on the server.
 * The server requires a sign-in from the last 5 minutes (see accountDeletion.js).
 *
 * - Long timeout: removing a big account can take a while.
 * - __retryCount is set high so the shared client never re-sends this request on a
 *   timeout (a second request could start while the first is still running).
 *   The server can safely be asked again by the user if it fails.
 */
export const deleteAccount = () =>
  apiClient.delete("/user/account", {
    data: { confirm: "DELETE" },
    timeout: 120000,
    __retryCount: 99,
  });
