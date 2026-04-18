-- Allow admins to view all messages for moderation
CREATE POLICY "Admins can view all messages"
ON public.messages
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));