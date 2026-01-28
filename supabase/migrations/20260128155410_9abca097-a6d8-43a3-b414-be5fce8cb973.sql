-- 1. Fix profiles_public view - add RLS
-- First, we need to drop and recreate the view with security_invoker
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- Grant access to authenticated users only
GRANT SELECT ON public.profiles_public TO authenticated;
REVOKE SELECT ON public.profiles_public FROM anon;

-- 2. Fix leads SELECT policy - require authentication to view unassigned leads
DROP POLICY IF EXISTS "Users can view assigned leads or admin can view all" ON public.leads;

CREATE POLICY "Users can view assigned leads or admin can view all" 
ON public.leads 
FOR SELECT 
USING (
  (assigned_sdr_id = get_current_profile_id()) OR 
  (assigned_closer_id = get_current_profile_id()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  (auth.uid() IS NOT NULL AND assigned_sdr_id IS NULL AND assigned_closer_id IS NULL)
);

-- 3. Tighten the anonymous INSERT policy for leads with additional validation
DROP POLICY IF EXISTS "Anonymous can submit leads via public form" ON public.leads;

CREATE POLICY "Anonymous can submit leads via public form" 
ON public.leads 
FOR INSERT 
WITH CHECK (
  -- Required fields validation
  full_name IS NOT NULL AND 
  length(trim(full_name)) >= 2 AND
  length(full_name) <= 200 AND
  email IS NOT NULL AND 
  email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' AND
  length(email) <= 255 AND
  phone IS NOT NULL AND 
  length(trim(phone)) >= 8 AND
  length(phone) <= 30 AND
  company_name IS NOT NULL AND 
  length(trim(company_name)) >= 2 AND
  length(company_name) <= 200 AND
  -- Security: Force safe defaults
  status = 'sem_atendimento'::lead_status AND
  assigned_sdr_id IS NULL AND
  assigned_closer_id IS NULL AND
  sale_confirmed_at IS NULL AND
  sale_contract_sent IS NULL AND
  sale_payment_received IS NULL AND
  -- Block potential injection in optional fields
  (notes IS NULL OR length(notes) <= 2000) AND
  (utm_source IS NULL OR length(utm_source) <= 100) AND
  (utm_medium IS NULL OR length(utm_medium) <= 100) AND
  (utm_campaign IS NULL OR length(utm_campaign) <= 100) AND
  (utm_content IS NULL OR length(utm_content) <= 100) AND
  (utm_term IS NULL OR length(utm_term) <= 100)
);