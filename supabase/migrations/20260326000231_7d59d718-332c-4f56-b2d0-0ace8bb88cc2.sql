
-- 1. review_votes table
CREATE TABLE public.review_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);
ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view review votes" ON public.review_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can vote on reviews" ON public.review_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove own votes" ON public.review_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 2. Add reply columns to reviews
ALTER TABLE public.reviews ADD COLUMN reply text;
ALTER TABLE public.reviews ADD COLUMN replied_at timestamptz;

-- 3. referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_email text,
  referred_user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  reward_amount numeric NOT NULL DEFAULT 2.00,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT TO authenticated USING (referrer_id = auth.uid());
CREATE POLICY "Users can create referrals" ON public.referrals FOR INSERT TO authenticated WITH CHECK (referrer_id = auth.uid());
CREATE POLICY "System can update referrals" ON public.referrals FOR UPDATE TO authenticated USING (referrer_id = auth.uid() OR is_admin(auth.uid()));

-- 4. Add referred_by to profiles
ALTER TABLE public.profiles ADD COLUMN referred_by uuid;
