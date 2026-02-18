
CREATE TABLE public.feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  rating integer NOT NULL,
  category text NOT NULL,
  message text NOT NULL,
  user_type text,
  email text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT feedback_rating_check CHECK (rating >= 1 AND rating <= 5)
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
  ON public.feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read feedback"
  ON public.feedback FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete feedback"
  ON public.feedback FOR DELETE
  USING (is_admin(auth.uid()));
