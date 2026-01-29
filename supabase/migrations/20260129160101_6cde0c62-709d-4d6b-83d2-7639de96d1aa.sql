-- Add new columns for Evidia leads
ALTER TABLE public.leads
ADD COLUMN city_state TEXT,
ADD COLUMN specialty TEXT;