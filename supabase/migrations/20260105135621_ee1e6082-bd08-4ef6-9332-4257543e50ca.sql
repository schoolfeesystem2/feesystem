-- Update existing payment_type values from old format to new format  
UPDATE public.payments SET payment_type = 'school_fee' WHERE payment_type NOT IN ('school_fee', 'bus', 'both') OR payment_type IS NULL;

-- Add new check constraint with correct values
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_type_check 
CHECK (payment_type = ANY (ARRAY['school_fee'::text, 'bus'::text, 'both'::text]));