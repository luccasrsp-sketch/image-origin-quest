-- Create enum for companies
CREATE TYPE public.company AS ENUM ('escola_franchising', 'evidia');

-- Add company column to leads table with default to escola_franchising (existing leads)
ALTER TABLE public.leads 
ADD COLUMN company public.company NOT NULL DEFAULT 'escola_franchising';