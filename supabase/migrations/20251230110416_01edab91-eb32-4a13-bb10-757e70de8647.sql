-- Add policies to user_roles table to prevent privilege escalation
-- Only super_admins can insert new roles
CREATE POLICY "Super admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Only super_admins can update roles
CREATE POLICY "Super admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'));

-- Only super_admins can delete roles (but not their own super_admin role to prevent lockout)
CREATE POLICY "Super admins can delete roles"
ON public.user_roles
FOR DELETE
USING (
  public.has_role(auth.uid(), 'super_admin') 
  AND NOT (user_id = auth.uid() AND role = 'super_admin')
);

-- Add policy so super_admins can view all roles (needed for management)
CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));