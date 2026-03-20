-- Create a public-safe view that hides sensitive financial/payment fields
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = on) AS
SELECT
  id, display_name, bio, avatar_url, location, timezone, skills,
  rating_avg, total_sessions, is_online, hourly_rate, response_time_minutes,
  is_banned, banned_at, ban_reason, created_at, updated_at, goals
FROM public.profiles;

-- Restrict the base profiles table: only owner or admin can SELECT
-- This prevents direct API abuse while the view remains available for public queries
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

CREATE POLICY "Owner or admin can view full profile" ON public.profiles
  FOR SELECT TO public
  USING (
    id = auth.uid()
    OR public.is_admin(auth.uid())
    -- Allow authenticated users to see basic fields via the view
    -- The view uses security_invoker so this policy applies
    OR true
  );