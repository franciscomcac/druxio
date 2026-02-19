
-- Allow session participants to mark messages as read (only messages they didn't send)
CREATE POLICY "Participants can mark messages as read"
ON public.messages
FOR UPDATE
USING (
  is_session_participant(session_id, auth.uid())
  AND sender_id != auth.uid()
)
WITH CHECK (
  is_session_participant(session_id, auth.uid())
  AND sender_id != auth.uid()
);
