-- Drop the existing policy and recreate it for the anon role
DROP POLICY IF EXISTS "Anonymous can submit leads via public form" ON public.leads;

CREATE POLICY "Anonymous can submit leads via public form" 
ON public.leads 
FOR INSERT 
TO anon
WITH CHECK (
  -- Basic required fields validation
  (full_name IS NOT NULL) AND (length(TRIM(BOTH FROM full_name)) >= 2) AND (length(full_name) <= 200) AND 
  (phone IS NOT NULL) AND (length(TRIM(BOTH FROM phone)) >= 8) AND (length(phone) <= 30) AND 
  (company_name IS NOT NULL) AND (length(TRIM(BOTH FROM company_name)) >= 2) AND (length(company_name) <= 200) AND 
  -- Email is optional for embed form but validated if present
  ((email IS NULL) OR (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND length(email) <= 255)) AND
  -- Status must be sem_atendimento (no manipulation)
  (status = 'sem_atendimento'::lead_status) AND 
  -- No assignment allowed
  (assigned_sdr_id IS NULL) AND (assigned_closer_id IS NULL) AND 
  -- No sale data allowed
  (sale_confirmed_at IS NULL) AND (sale_contract_sent IS NULL) AND (sale_payment_received IS NULL) AND 
  -- UTM and notes length limits
  ((notes IS NULL) OR (length(notes) <= 2000)) AND 
  ((utm_source IS NULL) OR (length(utm_source) <= 100)) AND 
  ((utm_medium IS NULL) OR (length(utm_medium) <= 100)) AND 
  ((utm_campaign IS NULL) OR (length(utm_campaign) <= 100)) AND 
  ((utm_content IS NULL) OR (length(utm_content) <= 100)) AND 
  ((utm_term IS NULL) OR (length(utm_term) <= 100)) AND 
  ((city_state IS NULL) OR (length(city_state) <= 100)) AND 
  ((specialty IS NULL) OR (length(specialty) <= 200)) AND 
  -- Company must be valid
  (company = ANY (ARRAY['escola_franchising'::company, 'evidia'::company]))
);