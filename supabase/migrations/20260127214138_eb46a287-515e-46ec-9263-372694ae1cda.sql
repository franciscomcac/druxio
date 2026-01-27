-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'mentor', 'mentee');

-- Create session_status enum
CREATE TYPE public.session_status AS ENUM ('pending', 'accepted', 'live', 'completed', 'cancelled');

-- Create transaction_type enum
CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdrawal', 'session_payment', 'session_earning', 'refund');

-- Create transaction_status enum
CREATE TYPE public.transaction_status AS ENUM ('pending', 'completed', 'failed');

-- Create match_status enum  
CREATE TYPE public.match_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- =============================================================================
-- PROFILES TABLE
-- =============================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    location TEXT DEFAULT 'Global',
    timezone TEXT DEFAULT 'UTC',
    skills TEXT[] DEFAULT '{}',
    goals JSONB DEFAULT '[]',
    rating_avg DECIMAL(3,2) DEFAULT 0.00,
    total_sessions INTEGER DEFAULT 0,
    wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    is_online BOOLEAN DEFAULT false,
    hourly_rate DECIMAL(10,2) DEFAULT 2.50,
    stripe_customer_id TEXT,
    stripe_connect_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================================================
-- USER ROLES TABLE (Security-critical: separate from profiles)
-- =============================================================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- =============================================================================
-- CATEGORIES TABLE
-- =============================================================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    parent_category_id UUID REFERENCES public.categories(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================================================
-- AVAILABILITY TABLE
-- =============================================================================
CREATE TABLE public.availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, day_of_week, start_time, end_time)
);

-- =============================================================================
-- SESSIONS TABLE
-- =============================================================================
CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    categories TEXT[] DEFAULT '{}',
    issue_description TEXT,
    status public.session_status DEFAULT 'pending',
    session_type TEXT DEFAULT 'chat' CHECK (session_type IN ('chat', 'video')),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    price DECIMAL(10,2),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,
    recording_url TEXT,
    twilio_room_sid TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================================================
-- MESSAGES TABLE
-- =============================================================================
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_urls TEXT[] DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================================================
-- MATCHES TABLE (AI matching results)
-- =============================================================================
CREATE TABLE public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    status public.match_status DEFAULT 'pending',
    query_categories TEXT[] DEFAULT '{}',
    query_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================================================
-- REVIEWS TABLE
-- =============================================================================
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(session_id, reviewer_id)
);

-- =============================================================================
-- TRANSACTIONS TABLE
-- =============================================================================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type public.transaction_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    session_id UUID REFERENCES public.sessions(id),
    stripe_payment_id TEXT,
    status public.transaction_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================================================
-- NOTIFICATIONS TABLE
-- =============================================================================
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'admin')
$$;

-- Check if user is mentor
CREATE OR REPLACE FUNCTION public.is_mentor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'mentor')
$$;

-- Check if user is session participant
CREATE OR REPLACE FUNCTION public.is_session_participant(_session_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.sessions
        WHERE id = _session_id 
        AND (mentee_id = _user_id OR mentor_id = _user_id)
    )
$$;

-- =============================================================================
-- RLS POLICIES - PROFILES
-- =============================================================================
CREATE POLICY "Anyone can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- =============================================================================
-- RLS POLICIES - USER_ROLES
-- =============================================================================
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own non-admin roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() 
    AND role != 'admin'
);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- =============================================================================
-- RLS POLICIES - CATEGORIES
-- =============================================================================
CREATE POLICY "Anyone can view categories"
ON public.categories FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- =============================================================================
-- RLS POLICIES - AVAILABILITY
-- =============================================================================
CREATE POLICY "Anyone can view availability"
ON public.availability FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage own availability"
ON public.availability FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- RLS POLICIES - SESSIONS
-- =============================================================================
CREATE POLICY "Participants can view their sessions"
ON public.sessions FOR SELECT
TO authenticated
USING (mentee_id = auth.uid() OR mentor_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Mentees can create sessions"
ON public.sessions FOR INSERT
TO authenticated
WITH CHECK (mentee_id = auth.uid());

CREATE POLICY "Participants can update their sessions"
ON public.sessions FOR UPDATE
TO authenticated
USING (mentee_id = auth.uid() OR mentor_id = auth.uid())
WITH CHECK (mentee_id = auth.uid() OR mentor_id = auth.uid());

-- =============================================================================
-- RLS POLICIES - MESSAGES
-- =============================================================================
CREATE POLICY "Participants can view session messages"
ON public.messages FOR SELECT
TO authenticated
USING (public.is_session_participant(session_id, auth.uid()));

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = auth.uid() 
    AND public.is_session_participant(session_id, auth.uid())
);

-- =============================================================================
-- RLS POLICIES - MATCHES
-- =============================================================================
CREATE POLICY "Users can view matches involving them"
ON public.matches FOR SELECT
TO authenticated
USING (mentee_id = auth.uid() OR mentor_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create match requests"
ON public.matches FOR INSERT
TO authenticated
WITH CHECK (mentee_id = auth.uid());

CREATE POLICY "Participants can update match status"
ON public.matches FOR UPDATE
TO authenticated
USING (mentee_id = auth.uid() OR mentor_id = auth.uid());

-- =============================================================================
-- RLS POLICIES - REVIEWS
-- =============================================================================
CREATE POLICY "Anyone can view reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Session participants can create reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (
    reviewer_id = auth.uid()
    AND public.is_session_participant(session_id, auth.uid())
);

CREATE POLICY "Reviewers can update own reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid());

-- =============================================================================
-- RLS POLICIES - TRANSACTIONS
-- =============================================================================
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "System creates transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- RLS POLICIES - NOTIFICATIONS
-- =============================================================================
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =============================================================================
-- TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    
    -- Auto-assign mentee role by default
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'mentee');
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update mentor rating after review
CREATE OR REPLACE FUNCTION public.update_mentor_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET rating_avg = (
        SELECT COALESCE(AVG(rating), 0)
        FROM public.reviews
        WHERE reviewee_id = NEW.reviewee_id
    )
    WHERE id = NEW.reviewee_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_created
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_mentor_rating();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;