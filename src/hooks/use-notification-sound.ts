import { useCallback, useRef } from "react";

const NOTIFICATION_FREQUENCY = 880; // A5 note
const NOTIFICATION_DURATION = 0.15;

export function useNotificationSound() {
  const contextRef = useRef<AudioContext | null>(null);

  const play = useCallback(() => {
    try {
      if (!contextRef.current) {
        contextRef.current = new AudioContext();
      }
      const ctx = contextRef.current;

      // Two-tone chime: high then higher
      const now = ctx.currentTime;

      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(NOTIFICATION_FREQUENCY, now, NOTIFICATION_DURATION);
      playTone(NOTIFICATION_FREQUENCY * 1.5, now + 0.12, NOTIFICATION_DURATION);
    } catch {
      // Audio not available — silently ignore
    }
  }, []);

  return play;
}
