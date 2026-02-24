
-- Create user_reports table for the report system
CREATE TABLE public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports (authenticated)
CREATE POLICY "Users can create reports"
ON public.user_reports
FOR INSERT
WITH CHECK (reporter_id = auth.uid());

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.user_reports
FOR SELECT
USING (reporter_id = auth.uid() OR is_admin(auth.uid()));

-- Only admins can update reports (status, notes)
CREATE POLICY "Admins can update reports"
ON public.user_reports
FOR UPDATE
USING (is_admin(auth.uid()));

-- Only admins can delete reports
CREATE POLICY "Admins can delete reports"
ON public.user_reports
FOR DELETE
USING (is_admin(auth.uid()));

-- Auto-update timestamp trigger
CREATE TRIGGER update_user_reports_updated_at
BEFORE UPDATE ON public.user_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for admin notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_reports;
