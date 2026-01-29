-- Update RLS policy for anonymous lead submission to include company field
DROP POLICY IF EXISTS "Anonymous can submit leads via public form" ON public.leads;

CREATE POLICY "Anonymous can submit leads via public form"
ON public.leads
FOR INSERT
WITH CHECK (
  -- Validation rules for public form submission
  full_name IS NOT NULL AND length(trim(full_name)) >= 2 AND length(full_name) <= 200
  AND email IS NOT NULL AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND length(email) <= 255
  AND phone IS NOT NULL AND length(trim(phone)) >= 8 AND length(phone) <= 30
  AND company_name IS NOT NULL AND length(trim(company_name)) >= 2 AND length(company_name) <= 200
  AND status = 'sem_atendimento'
  AND assigned_sdr_id IS NULL
  AND assigned_closer_id IS NULL
  AND sale_confirmed_at IS NULL
  AND sale_contract_sent IS NULL
  AND sale_payment_received IS NULL
  AND (notes IS NULL OR length(notes) <= 2000)
  AND (utm_source IS NULL OR length(utm_source) <= 100)
  AND (utm_medium IS NULL OR length(utm_medium) <= 100)
  AND (utm_campaign IS NULL OR length(utm_campaign) <= 100)
  AND (utm_content IS NULL OR length(utm_content) <= 100)
  AND (utm_term IS NULL OR length(utm_term) <= 100)
  -- Company can be escola_franchising or evidia
  AND company IN ('escola_franchising', 'evidia')
);