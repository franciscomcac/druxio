import { useRef, useCallback } from "react";

/**
 * Returns a boolean `canProceed()` that returns true at most once per `intervalMs`.
 * Usage:
 *   const throttle = useThrottle(5000);
 *   const onSubmit = () => { if (!throttle()) return; ... }
 */
export function useThrottle(intervalMs = 5000) {
  const lastRef = useRef(0);

  return useCallback(() => {
    const now = Date.now();
    if (now - lastRef.current < intervalMs) return false;
    lastRef.current = now;
    return true;
  }, [intervalMs]);
}
