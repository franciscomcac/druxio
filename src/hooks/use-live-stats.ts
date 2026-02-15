import { useEffect, useState } from "react";

const initialStats = {
  expertsOnline: 312,
  requestsToday: 1842,
  paidOut: 24000,
  avgResponse: 87,
};

let sharedStats = { ...initialStats };
let listeners: Set<() => void> = new Set();
let intervalId: ReturnType<typeof setInterval> | null = null;

function tick() {
  sharedStats = {
    expertsOnline: Math.max(200, sharedStats.expertsOnline + Math.floor(Math.random() * 3) - 1),
    requestsToday: sharedStats.requestsToday + Math.floor(Math.random() * 3),
    paidOut: sharedStats.paidOut + Math.floor(Math.random() * 50),
    avgResponse: Math.max(60, Math.min(120, sharedStats.avgResponse + Math.floor(Math.random() * 5) - 2)),
  };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    intervalId = setInterval(tick, 5000);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

export function useLiveStats() {
  const [stats, setStats] = useState(() => ({ ...sharedStats }));

  useEffect(() => {
    return subscribe(() => setStats({ ...sharedStats }));
  }, []);

  return stats;
}
