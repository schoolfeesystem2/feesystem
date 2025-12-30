-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;

-- Create a new policy that only allows authenticated users to read app settings
CREATE POLICY "Authenticated users can read app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);