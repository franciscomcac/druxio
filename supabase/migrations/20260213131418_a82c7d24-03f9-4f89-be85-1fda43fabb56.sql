
-- Allow mentors (experts) to also create sessions
DROP POLICY IF EXISTS "Mentees can create sessions" ON public.sessions;

CREATE POLICY "Participants can create sessions"
ON public.sessions
FOR INSERT
WITH CHECK (mentee_id = auth.uid() OR mentor_id = auth.uid());
