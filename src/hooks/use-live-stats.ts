import { useEffect, useState } from "react";

// Deterministic seed based on date so stats reset daily but are consistent per day
function daysSinceEpoch() {
  return Math.floor(Date.now() / 86400000);
}

function hourOfDay() {
  return new Date().getHours();
}

function minuteOfDay() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// Paid out grows indefinitely — base grows each day
function basePaidOut() {
  // Anchor: March 20, 2026 = day 20533 → starts at $100, grows ~$420/day
  const anchorDay = 20533;
  const dayNum = daysSinceEpoch() - anchorDay;
  return 100 + Math.max(0, dayNum * 420);
}

// Requests today: resets daily, grows through the day toward ~1600
function baseRequestsToday() {
  const min = minuteOfDay(); // 0-1439
  const dayProgress = min / 1440; // 0-1
  // S-curve: slow start, fast middle, plateau at end
  const curve = 1 / (1 + Math.exp(-10 * (dayProgress - 0.45)));
  return Math.floor(curve * 1620 + dayProgress * 30);
}

// Experts online: fluctuates by hour, peak during 14-22 UTC
function baseExpertsOnline() {
  const h = hourOfDay();
  // Peak hours 14-22, low hours 3-8
  const hourCurve: Record<number, number> = {
    0: 180, 1: 150, 2: 130, 3: 110, 4: 105, 5: 110, 6: 130, 7: 160,
    8: 200, 9: 240, 10: 280, 11: 310, 12: 330, 13: 345, 14: 360,
    15: 380, 16: 390, 17: 400, 18: 395, 19: 385, 20: 360, 21: 330,
    22: 280, 23: 230,
  };
  return hourCurve[h] ?? 250;
}

function computeStats() {
  const min = minuteOfDay();
  const dayProgress = min / 1440;

  // Paid out: base + intraday progress (adds ~€350-500 through the day)
  const paidToday = Math.floor(dayProgress * (380 + (min % 7) * 8));
  const paidOut = basePaidOut() + paidToday;

  // Requests today with small jitter
  const requests = baseRequestsToday();

  // Experts online with jitter
  const experts = baseExpertsOnline();

  // Avg response: 45-95s, fluctuates
  const avgResponse = 55 + Math.floor(Math.sin(min * 0.07) * 18 + Math.cos(min * 0.13) * 12);

  return {
    expertsOnline: experts,
    requestsToday: requests,
    paidOut,
    avgResponse: Math.max(38, Math.min(97, avgResponse)),
  };
}

let lastPaidOut = computeStats().paidOut;
let lastRequests = computeStats().requestsToday;
let lastPaidUpdate = Date.now();
let sharedStats = computeStats();
let listeners: Set<() => void> = new Set();
let intervalId: ReturnType<typeof setInterval> | null = null;

function tick() {
  const base = computeStats();
  const now = Date.now();
  // Only bump paidOut and requests every ~5 minutes
  if (now - lastPaidUpdate >= 300_000) {
    lastPaidOut = lastPaidOut + Math.floor(Math.random() * 15) + 3;
    lastRequests = lastRequests + 1;
    lastPaidUpdate = now;
  }
  sharedStats = {
    expertsOnline: base.expertsOnline + Math.floor(Math.random() * 11) - 5,
    requestsToday: lastRequests,
    paidOut: lastPaidOut,
    avgResponse: Math.max(35, Math.min(99, base.avgResponse + Math.floor(Math.random() * 7) - 3)),
  };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    intervalId = setInterval(tick, 8000);
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
