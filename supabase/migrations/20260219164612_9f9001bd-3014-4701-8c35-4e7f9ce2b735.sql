-- Fix: Add WITH CHECK to the jobs UPDATE policy so writes are actually permitted
DROP POLICY IF EXISTS "Update own jobs or deliver as seller" ON public.jobs;

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
)
WITH CHECK (
  (buyer_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.job_id = jobs.id
      AND quotes.expert_id = auth.uid()
      AND quotes.status = 'accepted'
  )
);
