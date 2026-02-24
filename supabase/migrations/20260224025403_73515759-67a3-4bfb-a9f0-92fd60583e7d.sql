
-- Add image_urls column to user_reports
ALTER TABLE public.user_reports ADD COLUMN image_urls text[] DEFAULT '{}'::text[];

-- Add ban fields to profiles
ALTER TABLE public.profiles ADD COLUMN is_banned boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN ban_reason text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN banned_at timestamp with time zone DEFAULT NULL;

-- Create storage bucket for report evidence images
INSERT INTO storage.buckets (id, name, public) VALUES ('report-images', 'report-images', false);

-- Only reporters can upload to their own folder
CREATE POLICY "Users can upload report images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'report-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view report images
CREATE POLICY "Admins can view report images"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-images' AND public.is_admin(auth.uid()));

-- The reporter who uploaded can also view
CREATE POLICY "Reporters can view own report images"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-images' AND auth.uid()::text = (storage.foldername(name))[1]);
