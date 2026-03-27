
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();

-- Function to mark stale users offline (called by cron or edge function)
CREATE OR REPLACE FUNCTION public.mark_stale_users_offline()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.profiles
  SET is_online = false
  WHERE is_online = true
    AND (last_seen_at IS NULL OR last_seen_at < now() - interval '3 minutes');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
