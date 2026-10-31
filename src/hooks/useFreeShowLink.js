import { useEffect, useState } from "react";
import { getFreeShows } from "../services/api/streaming";
import { deviceRegion } from "../utils/streamingHelpers";

/**
 * For a TV title (tmdbInfo = { id, type }), returns the free-streaming show entry
 * ({ tmdbId, title, season, count, latest }) when CineLink streams it to this viewer's
 * region, otherwise null. Uses the same 5-minute cache as the Free tab.
 */
export default function useFreeShowLink(tmdbInfo) {
  const [show, setShow] = useState(null);
  const id = tmdbInfo?.type === "tv" ? Number(tmdbInfo.id) : null;

  useEffect(() => {
    let cancelled = false;
    setShow(null);
    if (!id) return undefined;
    getFreeShows(deviceRegion())
      .then((list) => {
        if (!cancelled) setShow(list.find((s) => Number(s.tmdbId) === id) || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  return show;
}
