-- Fix infinite recursion between jobs and quotes RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "View open jobs or own" ON public.jobs;
DROP POLICY IF EXISTS "View quotes" ON public.quotes;

-- Recreate jobs SELECT policy without referencing quotes
CREATE POLICY "View open jobs or own" 
ON public.jobs 
FOR SELECT 
USING (
  status = 'open' 
  OR buyer_id = auth.uid()
);

-- Recreate quotes SELECT policy without referencing jobs
CREATE POLICY "View quotes" 
ON public.quotes 
FOR SELECT 
USING (
  expert_id = auth.uid()
  OR job_id IN (SELECT id FROM public.jobs WHERE buyer_id = auth.uid())
);