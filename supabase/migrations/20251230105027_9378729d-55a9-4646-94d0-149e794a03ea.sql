-- Drop the old policy if exists
DROP POLICY IF EXISTS "Subscribed users can read broadcast messages" ON public.broadcast_messages;
DROP POLICY IF EXISTS "Active subscribers can read broadcast messages" ON public.broadcast_messages;

-- Create new policy: users with active subscriptions can read broadcasts meant for everyone OR targeted to them
CREATE POLICY "Subscribed users can read broadcast messages"
ON public.broadcast_messages
FOR SELECT
USING (
  (
    subscription_status_check(auth.uid()) = 'active'
    AND (target_user_id IS NULL OR target_user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'super_admin')
);