-- Update the handle_new_user function to save school information from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    school_name,
    school_address,
    school_phone,
    trial_start_date, 
    trial_end_date, 
    subscription_status
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name', 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'school_name', 'My School'),
    NEW.raw_user_meta_data ->> 'school_address',
    NEW.raw_user_meta_data ->> 'school_phone',
    now(),
    now() + interval '7 days',
    'trial'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;