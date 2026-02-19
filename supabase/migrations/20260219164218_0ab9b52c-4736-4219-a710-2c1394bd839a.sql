-- Allow sellers (users with an accepted quote on a job) to update delivery-related fields
-- Drop the existing restrictive UPDATE policy
DROP POLICY IF EXISTS "Update own jobs" ON public.jobs;

-- Recreate with buyer OR seller (has accepted quote) allowed to update
CREATE POLICY "Update own jobs or deliver as seller"
ON public.jobs
FOR UPDATE
USING (
  (buyer_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.job_id = jobs.id
      AND quotes.expert_id = auth.uid()
      AND quotes.status = 'accepted'
  )
);
