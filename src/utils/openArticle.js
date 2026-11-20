import { Linking } from "react-native";
import logger from "../services/logger";

/** Opens an article in the phone's browser. https links only. */
export default async function openArticle(url) {
  if (typeof url !== "string" || !url.startsWith("https://")) return;
  try {
    await Linking.openURL(url);
  } catch (e) {
    logger.warn("Could not open article:", e.message);
  }
}

export function timeAgo(ms, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
