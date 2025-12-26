-- Insert super_admin role for the user with email Muadhaji24@gmail.com
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'super_admin'::app_role
FROM public.profiles p
WHERE LOWER(p.email) = LOWER('Muadhaji24@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Add last_active column to profiles if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_active timestamp with time zone DEFAULT now();

-- Create broadcast_messages table for super admin messages
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything on broadcast_messages
CREATE POLICY "Super admins can manage broadcast messages"
ON public.broadcast_messages
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- All authenticated users can read broadcast messages
CREATE POLICY "Authenticated users can read broadcast messages"
ON public.broadcast_messages
FOR SELECT
TO authenticated
USING (true);

-- Create policy for super_admin to view all profiles
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create policy for super_admin to update all profiles
CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));