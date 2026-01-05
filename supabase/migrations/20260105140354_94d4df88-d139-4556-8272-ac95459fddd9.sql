-- Add bus_charge column to profiles table for user-specific bus charges
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bus_charge numeric DEFAULT 0;