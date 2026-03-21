DROP POLICY "View open jobs or own or quoted" ON public.jobs;
CREATE POLICY "View open jobs or own or quoted or admin" ON public.jobs FOR SELECT USING (
  (status = 'open'::text) OR (buyer_id = auth.uid()) OR has_quoted_on_job(id, auth.uid()) OR is_admin(auth.uid())
);