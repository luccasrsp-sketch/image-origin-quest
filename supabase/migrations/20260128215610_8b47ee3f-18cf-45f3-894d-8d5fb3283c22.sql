-- Add 'perdido' status to the lead_status enum
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'perdido';

-- Add loss_reason column to store why the lead was lost
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS loss_reason text;

-- Add lost_at timestamp to track when lead was marked as lost
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lost_at timestamp with time zone;