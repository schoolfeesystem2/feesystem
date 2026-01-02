-- Add payment_month and payment_year columns to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_month integer,
ADD COLUMN IF NOT EXISTS payment_year integer;

-- Set default values for existing records based on payment_date
UPDATE public.payments 
SET payment_month = EXTRACT(MONTH FROM payment_date)::integer,
    payment_year = EXTRACT(YEAR FROM payment_date)::integer
WHERE payment_month IS NULL OR payment_year IS NULL;

-- Add NOT NULL constraints after populating existing data
ALTER TABLE public.payments 
ALTER COLUMN payment_month SET DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::integer,
ALTER COLUMN payment_year SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer;

-- Create fee_targets table for monthly and yearly targets
CREATE TABLE IF NOT EXISTS public.fee_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  target_type text NOT NULL DEFAULT 'monthly', -- 'monthly' or 'yearly'
  target_month integer, -- NULL for yearly targets
  target_year integer NOT NULL,
  target_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type, target_month, target_year)
);

-- Enable RLS on fee_targets
ALTER TABLE public.fee_targets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for fee_targets
CREATE POLICY "Users can view own fee targets" 
ON public.fee_targets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fee targets" 
ON public.fee_targets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fee targets" 
ON public.fee_targets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fee targets" 
ON public.fee_targets 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates on fee_targets
CREATE TRIGGER update_fee_targets_updated_at
BEFORE UPDATE ON public.fee_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_month_year ON public.payments (payment_year, payment_month);
CREATE INDEX IF NOT EXISTS idx_fee_targets_user_year ON public.fee_targets (user_id, target_year);