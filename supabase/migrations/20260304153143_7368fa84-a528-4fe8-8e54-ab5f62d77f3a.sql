
-- Jobs: speed up dashboard queries (buyer's orders, open jobs browse, status filters)
CREATE INDEX IF NOT EXISTS idx_jobs_buyer_id ON public.jobs (buyer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON public.jobs (category);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs (created_at DESC);

-- Quotes: speed up order page & expert dashboard
CREATE INDEX IF NOT EXISTS idx_quotes_job_id ON public.quotes (job_id);
CREATE INDEX IF NOT EXISTS idx_quotes_expert_id ON public.quotes (expert_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes (status);

-- Messages: speed up inbox / chat loading
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages (session_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages (is_read) WHERE is_read = false;

-- Sessions: speed up inbox & session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_mentee_id ON public.sessions (mentee_id);
CREATE INDEX IF NOT EXISTS idx_sessions_mentor_id ON public.sessions (mentor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions (status);

-- Notifications: speed up notification dropdown & badge count
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

-- Transactions: speed up wallet page
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions (created_at DESC);

-- Favorites: speed up profile page favorite checks
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_expert_id ON public.favorites (expert_id);

-- Expert categories: speed up category matching & browse
CREATE INDEX IF NOT EXISTS idx_expert_categories_user_id ON public.expert_categories (user_id);
CREATE INDEX IF NOT EXISTS idx_expert_categories_category ON public.expert_categories (category);

-- Reviews: speed up profile rating display
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews (reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_session_id ON public.reviews (session_id);

-- User roles: speed up role checks (has_role, is_admin, is_mentor)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles (user_id, role);
