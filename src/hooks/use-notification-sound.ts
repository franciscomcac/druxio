import { useCallback, useRef } from "react";

const NOTIFICATION_FREQUENCY = 830; // ~Ab5
const NOTIFICATION_DURATION = 0.25;

export function useNotificationSound() {
  const contextRef = useRef<AudioContext | null>(null);

  const play = useCallback(() => {
    try {
      if (!contextRef.current) {
        contextRef.current = new AudioContext();
      }
      const ctx = contextRef.current;

      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;

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
        osc.stop(start + duration);
      };

      // Three-tone ascending chime — louder and more noticeable
      playTone(NOTIFICATION_FREQUENCY, now, NOTIFICATION_DURATION, 0.5);
      playTone(NOTIFICATION_FREQUENCY * 1.25, now + 0.15, NOTIFICATION_DURATION, 0.45);
      playTone(NOTIFICATION_FREQUENCY * 1.5, now + 0.30, NOTIFICATION_DURATION * 1.4, 0.4);
    } catch {
      // Audio not available — silently ignore
    }
  }, []);

  return play;
}
