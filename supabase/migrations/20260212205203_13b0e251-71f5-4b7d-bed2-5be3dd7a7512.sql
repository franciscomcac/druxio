-- Drop the existing restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles"
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Fix other tables with the same restrictive issue
DROP POLICY IF EXISTS "View open jobs or own" ON public.jobs;
DROP POLICY IF EXISTS "Create jobs" ON public.jobs;
DROP POLICY IF EXISTS "Update own jobs" ON public.jobs;

CREATE POLICY "View open jobs or own"
ON public.jobs FOR SELECT
USING (status = 'open' OR buyer_id = auth.uid());

CREATE POLICY "Create jobs"
ON public.jobs FOR INSERT
WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Update own jobs"
ON public.jobs FOR UPDATE
USING (buyer_id = auth.uid());

-- Fix user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own non-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can insert own non-admin roles"
ON public.user_roles FOR INSERT
WITH CHECK (user_id = auth.uid() AND role <> 'admin');

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
USING (is_admin(auth.uid()));

-- Fix expert_categories
DROP POLICY IF EXISTS "Users can view all expert categories" ON public.expert_categories;
DROP POLICY IF EXISTS "Users can manage own categories" ON public.expert_categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.expert_categories;

CREATE POLICY "Users can view all expert categories"
ON public.expert_categories FOR SELECT
USING (true);

CREATE POLICY "Users can manage own categories"
ON public.expert_categories FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own categories"
ON public.expert_categories FOR DELETE
USING (user_id = auth.uid());

-- Fix quotes
DROP POLICY IF EXISTS "View quotes" ON public.quotes;
DROP POLICY IF EXISTS "Create quotes" ON public.quotes;
DROP POLICY IF EXISTS "Update quotes" ON public.quotes;

CREATE POLICY "View quotes"
ON public.quotes FOR SELECT
USING (expert_id = auth.uid() OR job_id IN (SELECT id FROM jobs WHERE buyer_id = auth.uid()));

CREATE POLICY "Create quotes"
ON public.quotes FOR INSERT
WITH CHECK (expert_id = auth.uid());

CREATE POLICY "Update quotes"
ON public.quotes FOR UPDATE
USING (expert_id = auth.uid() OR EXISTS (SELECT 1 FROM jobs WHERE jobs.id = quotes.job_id AND jobs.buyer_id = auth.uid()));

-- Fix notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users or system create notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Users or system create notifications"
ON public.notifications FOR INSERT
WITH CHECK (user_id = auth.uid() OR is_admin(auth.uid()));