-- Update the RLS policy to allow city_state and specialty fields in the public form
DROP POLICY IF EXISTS "Anonymous can submit leads via public form" ON public.leads;

CREATE POLICY "Anonymous can submit leads via public form"
ON public.leads
FOR INSERT
WITH CHECK (
  -- Required fields validation
  full_name IS NOT NULL 
  AND length(TRIM(BOTH FROM full_name)) >= 2 
  AND length(full_name) <= 200
  AND email IS NOT NULL 
  AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND length(email) <= 255
  AND phone IS NOT NULL 
  AND length(TRIM(BOTH FROM phone)) >= 8 
  AND length(phone) <= 30
  AND company_name IS NOT NULL 
  AND length(TRIM(BOTH FROM company_name)) >= 2 
  AND length(company_name) <= 200
  -- Initial status restrictions
  AND status = 'sem_atendimento'
  AND assigned_sdr_id IS NULL
  AND assigned_closer_id IS NULL
  AND sale_confirmed_at IS NULL
  AND sale_contract_sent IS NULL
  AND sale_payment_received IS NULL
  -- Optional field limits
  AND (notes IS NULL OR length(notes) <= 2000)
  AND (utm_source IS NULL OR length(utm_source) <= 100)
  AND (utm_medium IS NULL OR length(utm_medium) <= 100)
  AND (utm_campaign IS NULL OR length(utm_campaign) <= 100)
  AND (utm_content IS NULL OR length(utm_content) <= 100)
  AND (utm_term IS NULL OR length(utm_term) <= 100)
  -- New Evidia fields validation
  AND (city_state IS NULL OR length(city_state) <= 100)
  AND (specialty IS NULL OR length(specialty) <= 200)
  -- Company restriction
  AND company IN ('escola_franchising', 'evidia')
);