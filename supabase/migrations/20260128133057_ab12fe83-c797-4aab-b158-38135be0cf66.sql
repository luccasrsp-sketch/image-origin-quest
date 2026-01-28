-- Add sale data fields to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS sale_company_cnpj text,
ADD COLUMN IF NOT EXISTS sale_admin_email text,
ADD COLUMN IF NOT EXISTS sale_payment_method text,
ADD COLUMN IF NOT EXISTS sale_entry_value numeric,
ADD COLUMN IF NOT EXISTS sale_remaining_value numeric,
ADD COLUMN IF NOT EXISTS sale_installments integer,
ADD COLUMN IF NOT EXISTS sale_first_check_date date,
ADD COLUMN IF NOT EXISTS sale_observations text,
ADD COLUMN IF NOT EXISTS sale_confirmed_at timestamp with time zone;