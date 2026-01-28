-- Add proposal fields to leads table
ALTER TABLE public.leads ADD COLUMN proposal_product TEXT;
ALTER TABLE public.leads ADD COLUMN proposal_value NUMERIC;
ALTER TABLE public.leads ADD COLUMN proposal_payment_method TEXT;
ALTER TABLE public.leads ADD COLUMN proposal_follow_up_at TIMESTAMP WITH TIME ZONE;