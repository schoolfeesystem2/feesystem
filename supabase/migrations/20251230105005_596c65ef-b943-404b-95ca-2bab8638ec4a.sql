-- Create function to check subscription status
CREATE OR REPLACE FUNCTION public.subscription_status_check(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT subscription_status FROM public.profiles WHERE id = _user_id
$$;