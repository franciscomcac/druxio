-- Create a security definer function to check if user has quoted on a job
CREATE OR REPLACE FUNCTION public.has_quoted_on_same_job(_job_id uuid, _user_id uuid)
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

-- Drop and recreate the policy using the function
DROP POLICY "View quotes" ON public.quotes;

CREATE POLICY "View quotes" ON public.quotes
FOR SELECT
USING (
  (expert_id = auth.uid())
  OR (job_id IN (SELECT id FROM jobs WHERE buyer_id = auth.uid()))
  OR (has_quoted_on_same_job(job_id, auth.uid()))
);