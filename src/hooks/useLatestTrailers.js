import { useEffect, useState } from "react";
import { getLatestTrailers } from "../services/api/trailers";

const TTL = 10 * 60 * 1000;
let cache = { data: null, at: 0 };

/** Latest trailers for the home screen. Fails quietly: an empty list just hides the row. */
export default function useLatestTrailers() {
  const [trailers, setTrailers] = useState(cache.data || []);

  useEffect(() => {
    if (cache.data && Date.now() - cache.at < TTL) {
      setTrailers(cache.data);
      return undefined;
    }
    let cancelled = false;
    getLatestTrailers(12).then((list) => {
      if (list.length) cache = { data: list, at: Date.now() };
      if (!cancelled) setTrailers(list.length ? list : cache.data || []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return trailers;
}
