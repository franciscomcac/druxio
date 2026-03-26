import { useState, useEffect, useCallback, useRef } from "react";

const DRAFT_KEY = "druxio_post_request_draft";

export interface DraftData {
  broadCategory?: string;
  category?: string;
  title?: string;
  description?: string;
  deadlineValue?: number;
  deadlineUnit?: string;
  templateData?: Record<string, string>;
  savedAt?: number;
}

export function useDraft() {
  const [hasDraft, setHasDraft] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DraftData;
        // Only show draft if it has meaningful content and is less than 7 days old
        if (
          (parsed.title || parsed.description) &&
          parsed.savedAt &&
          Date.now() - parsed.savedAt < 7 * 24 * 60 * 60 * 1000
        ) {
          setHasDraft(true);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []);

  const saveDraft = useCallback((data: Omit<DraftData, "savedAt">) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
    }, 3000);
  }, []);

  const loadDraft = useCallback((): DraftData | null => {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }, []);

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    localStorage.removeItem(DRAFT_KEY);
    setHasDraft(false);
  }, []);

  return { hasDraft, saveDraft, loadDraft, clearDraft };
}
