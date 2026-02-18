import { useCallback, useEffect, useRef } from "react";

const NOTIFICATION_FREQUENCY = 830; // ~Ab5
const NOTIFICATION_DURATION = 0.25;

export function useNotificationSound() {
  const contextRef = useRef<AudioContext | null>(null);

  // Unlock AudioContext on the very first user interaction anywhere on the page
  useEffect(() => {
    const unlock = () => {
      if (!contextRef.current) {
        contextRef.current = new AudioContext();
      }
      if (contextRef.current.state === "suspended" || (contextRef.current.state as string) === "interrupted") {
        contextRef.current.resume().catch(() => {});
      }
    };

    window.addEventListener("click", unlock, { once: true, capture: true });
    window.addEventListener("keydown", unlock, { once: true, capture: true });
    window.addEventListener("touchstart", unlock, { once: true, capture: true });

    return () => {
      window.removeEventListener("click", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
      window.removeEventListener("touchstart", unlock, { capture: true });
    };
  }, []);

  const play = useCallback(async () => {
    try {
      // Create context lazily (requires a prior user gesture to unlock)
      if (!contextRef.current) {
        contextRef.current = new AudioContext();
      }
      const ctx = contextRef.current;

      // Always await resume — this is essential for background tabs.
      // Browsers suspend AudioContext when the tab is backgrounded;
      // resume() re-activates it even from a non-visible tab.
      if (ctx.state === "suspended" || ctx.state === "interrupted") {
        await ctx.resume();
      }

      // Schedule slightly in the future so the tones survive any brief
      // suspension that happens between resume() and actual playback.
      const now = ctx.currentTime + 0.05;

      const playTone = (freq: number, start: number, duration: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.01);
      };

      // Three-tone ascending chime
      playTone(NOTIFICATION_FREQUENCY, now, NOTIFICATION_DURATION, 0.5);
      playTone(NOTIFICATION_FREQUENCY * 1.25, now + 0.15, NOTIFICATION_DURATION, 0.45);
      playTone(NOTIFICATION_FREQUENCY * 1.5, now + 0.30, NOTIFICATION_DURATION * 1.4, 0.4);
    } catch {
      // Audio not available — silently ignore
    }
  }, []);

  return play;
}
