-- Add bus_fee column to classes table
ALTER TABLE public.classes ADD COLUMN bus_fee numeric NOT NULL DEFAULT 0;