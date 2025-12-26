-- Create a security definer function to check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND subscription_status = 'active'
  )
$$;

-- Drop the old permissive policy
DROP POLICY IF EXISTS "Authenticated users can read broadcast messages" ON public.broadcast_messages;

-- Create new policy that only allows active subscribers to read broadcast messages
CREATE POLICY "Active subscribers can read broadcast messages"
ON public.broadcast_messages
FOR SELECT
TO authenticated
USING (public.has_active_subscription(auth.uid()));