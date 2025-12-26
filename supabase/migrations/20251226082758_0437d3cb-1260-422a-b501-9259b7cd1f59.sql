-- Add max_students column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS max_students integer DEFAULT 200;