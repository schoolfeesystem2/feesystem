-- Create app_settings table for storing app configuration
CREATE TABLE public.app_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings
CREATE POLICY "Anyone can read app settings"
ON public.app_settings
FOR SELECT
USING (true);

-- Only super admins can update settings
CREATE POLICY "Super admins can update app settings"
ON public.app_settings
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Only super admins can insert settings
CREATE POLICY "Super admins can insert app settings"
ON public.app_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('android_apk_url', NULL),
  ('demo_video_url', NULL);

-- Create storage bucket for app files (APK, etc.)
INSERT INTO storage.buckets (id, name, public) VALUES ('app-files', 'app-files', true);

-- Allow anyone to read files from app-files bucket
CREATE POLICY "Anyone can read app files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'app-files');

-- Only super admins can upload to app-files bucket
CREATE POLICY "Super admins can upload app files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'app-files' AND has_role(auth.uid(), 'super_admin'::app_role));

-- Only super admins can update app files
CREATE POLICY "Super admins can update app files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'app-files' AND has_role(auth.uid(), 'super_admin'::app_role));

-- Only super admins can delete app files
CREATE POLICY "Super admins can delete app files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'app-files' AND has_role(auth.uid(), 'super_admin'::app_role));