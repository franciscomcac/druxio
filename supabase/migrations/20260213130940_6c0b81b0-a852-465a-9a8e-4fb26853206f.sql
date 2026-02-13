-- Allow sellers with quotes on a job to view it even after status changes
DROP POLICY IF EXISTS "View open jobs or own" ON public.jobs;
CREATE POLICY "View open jobs or own or quoted" ON public.jobs
  FOR SELECT USING (
    (status = 'open')
    OR (buyer_id = auth.uid())
    OR (EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.job_id = jobs.id
      AND quotes.expert_id = auth.uid()
    ))
  );