
-- Portfolio items table for expert work samples
CREATE TABLE public.portfolio_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  link_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view portfolio items"
ON public.portfolio_items FOR SELECT
USING (true);

CREATE POLICY "Users can manage own portfolio items"
ON public.portfolio_items FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own portfolio items"
ON public.portfolio_items FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own portfolio items"
ON public.portfolio_items FOR DELETE
USING (user_id = auth.uid());

-- Favorites table for repeat-hire system
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  expert_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, expert_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
ON public.favorites FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can add favorites"
ON public.favorites FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove favorites"
ON public.favorites FOR DELETE
USING (user_id = auth.uid());

-- Add response_time_minutes to profiles for availability signals
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER DEFAULT NULL;
