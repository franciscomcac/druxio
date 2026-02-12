
-- Create expert_categories table
CREATE TABLE public.expert_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category)
);
ALTER TABLE public.expert_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all expert categories" ON public.expert_categories FOR SELECT USING (true);
CREATE POLICY "Users can manage own categories" ON public.expert_categories FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own categories" ON public.expert_categories FOR DELETE USING (user_id = auth.uid());

-- Create jobs table
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  subcategory text,
  budget_min numeric NOT NULL DEFAULT 5,
  budget_max numeric NOT NULL DEFAULT 50,
  deadline_minutes integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'open',
  accepted_quote_id uuid,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create quotes table (references jobs)
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  expert_id uuid NOT NULL,
  price numeric NOT NULL,
  estimated_minutes integer NOT NULL DEFAULT 20,
  message text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(job_id, expert_id)
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- Now add all RLS policies (both tables exist)
CREATE POLICY "View open jobs or own" ON public.jobs FOR SELECT USING (
  status = 'open' OR buyer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.quotes WHERE quotes.job_id = jobs.id AND quotes.expert_id = auth.uid()
  )
);
CREATE POLICY "Create jobs" ON public.jobs FOR INSERT WITH CHECK (buyer_id = auth.uid());
CREATE POLICY "Update own jobs" ON public.jobs FOR UPDATE USING (buyer_id = auth.uid());

CREATE POLICY "View quotes" ON public.quotes FOR SELECT USING (
  expert_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.jobs WHERE jobs.id = quotes.job_id AND jobs.buyer_id = auth.uid()
  )
);
CREATE POLICY "Create quotes" ON public.quotes FOR INSERT WITH CHECK (expert_id = auth.uid());
CREATE POLICY "Update quotes" ON public.quotes FOR UPDATE USING (
  expert_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.jobs WHERE jobs.id = quotes.job_id AND jobs.buyer_id = auth.uid()
  )
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;

-- Trigger
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
