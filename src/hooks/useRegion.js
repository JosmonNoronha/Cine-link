import { useCallback, useEffect, useState } from "react";
import { loadRegion, saveRegion } from "../utils/region";

// The region used by Discover lists: the user's saved choice, else the phone's region.
// `region` is null for a moment while the saved choice loads, so callers wait for it before fetching.
export default function useRegion() {
  const [region, setRegionState] = useState(null);

  useEffect(() => {
    let alive = true;
    loadRegion().then((r) => alive && setRegionState(r));
    return () => {
      alive = false;
    };
  }, []);

  const setRegion = useCallback((code) => {
    setRegionState(code);
    saveRegion(code);
  }, []);

  return [region, setRegion];
}
