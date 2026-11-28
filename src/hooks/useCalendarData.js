import { useCallback, useEffect, useRef, useState } from "react";
import { getCalendarMonth, getMyShowsCalendar } from "../services/api/discover";
import logger from "../services/logger";

// Release dates for one month, grouped by day: { "2026-12-05": [item, ...] }.
// mode: "movie" | "tv" (premieres) | "my-shows" (episodes of the user's shows).
// Months already loaded are kept, so paging back and forth is instant.
export default function useCalendarData({ month, mode, region, showIds, enabled = true }) {
  const [state, setState] = useState({ status: "loading", byDate: {} });
  const cache = useRef(new Map());
  const reqId = useRef(0);

  const key = `${mode}:${mode === "movie" ? region : "-"}:${month}:${mode === "my-shows" ? (showIds || []).join(",") : ""}`;

  const load = useCallback(
    async (force) => {
      if (!enabled) return;
      if (!force && cache.current.has(key)) {
        setState({ status: "ready", byDate: cache.current.get(key) });
        return;
      }
      const id = ++reqId.current;
      setState((s) => ({ status: "loading", byDate: s.byDate }));
      try {
        const d =
          mode === "my-shows"
            ? showIds?.length
              ? await getMyShowsCalendar(month, showIds)
              : { items: [] }
            : await getCalendarMonth(month, { type: mode, region });
        if (id !== reqId.current) return;
        const byDate = {};
        for (const item of d.items || []) {
          const day = String(item.releaseDate || "").slice(0, 10);
          if (day) (byDate[day] = byDate[day] || []).push(item);
        }
        cache.current.set(key, byDate);
        setState({ status: "ready", byDate });
      } catch (e) {
        if (id !== reqId.current) return;
        logger.warn("Calendar load failed", e?.message);
        setState((s) => ({ status: "error", byDate: s.byDate }));
      }
    },
    [key, enabled, month, mode, region, showIds],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const retry = useCallback(() => load(true), [load]);
  return { ...state, retry };
}
