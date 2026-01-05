-- Drop the old payment_type check constraint first
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_type_check;