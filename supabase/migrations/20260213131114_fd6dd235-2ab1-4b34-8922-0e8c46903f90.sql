
-- Create a security definer function to check if user has quoted on a job
CREATE OR REPLACE FUNCTION public.has_quoted_on_job(_job_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.quotes
    WHERE job_id = _job_id AND expert_id = _user_id
  )
$$;

-- Drop the old policy
DROP POLICY IF EXISTS "View open jobs or own or quoted" ON public.jobs;

-- Recreate without subquery on quotes
CREATE POLICY "View open jobs or own or quoted"
ON public.jobs
FOR SELECT
USING (
  status = 'open'
  OR buyer_id = auth.uid()
  OR public.has_quoted_on_job(id, auth.uid())
);
