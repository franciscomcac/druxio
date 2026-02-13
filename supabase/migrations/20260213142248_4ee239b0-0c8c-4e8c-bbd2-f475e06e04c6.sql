-- Drop existing SELECT policy for quotes
DROP POLICY "View quotes" ON public.quotes;

-- Recreate: allow viewing all quotes on a job if you are the buyer, or if you also quoted on the same job
CREATE POLICY "View quotes" ON public.quotes
FOR SELECT
USING (
  (expert_id = auth.uid())
  OR (job_id IN (SELECT id FROM jobs WHERE buyer_id = auth.uid()))
  OR (job_id IN (SELECT job_id FROM quotes WHERE expert_id = auth.uid()))
);