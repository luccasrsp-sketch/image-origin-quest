-- Add contract and payment tracking fields to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS sale_contract_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sale_payment_received boolean DEFAULT false;