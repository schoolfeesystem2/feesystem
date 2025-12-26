-- Add subscription fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_start_date timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_end_date timestamp with time zone DEFAULT (now() + interval '7 days'),
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT null,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone DEFAULT null;

-- Update existing users to have trial status with 7 days from now
UPDATE public.profiles 
SET trial_start_date = now(),
    trial_end_date = now() + interval '7 days',
    subscription_status = 'trial'
WHERE subscription_status IS NULL OR subscription_status = 'trial';

-- Update the handle_new_user function to set trial dates for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, trial_start_date, trial_end_date, subscription_status)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name', 
    NEW.email,
    now(),
    now() + interval '7 days',
    'trial'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;