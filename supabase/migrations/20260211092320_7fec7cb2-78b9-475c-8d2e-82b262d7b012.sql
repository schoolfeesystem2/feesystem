CREATE POLICY "Anyone can read app settings"
ON public.app_settings
FOR SELECT
USING (true);