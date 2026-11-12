import { useEffect, useState } from "react";
import { getFreeShows } from "../services/api/streaming";
import { deviceRegion } from "../utils/streamingHelpers";

/**
 * For a TV title (tmdbInfo = { id, type }), returns the free-streaming show entry
 * ({ tmdbId, title, season, count, latest }) when CineLink streams it to this viewer's
 * region, otherwise null. A show with several seasons has one list entry per season: the first
 * season is returned, with `count` covering all of them. Uses the same 5-minute cache as the Free tab.
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
        if (cancelled) return;
        const mine = list.filter((s) => Number(s.tmdbId) === id);
        setShow(
          mine.length
            ? { ...mine[0], count: mine.reduce((sum, s) => sum + Number(s.count || 0), 0) }
            : null,
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  return show;
}
