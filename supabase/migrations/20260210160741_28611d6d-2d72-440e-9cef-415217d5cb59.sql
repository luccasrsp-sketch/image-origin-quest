
-- Drop existing SELECT policies on leads (except the require_auth one)
DROP POLICY IF EXISTS "Users can view assigned leads or admin or viewer" ON public.leads;

-- Recreate with visibility for sem_atendimento and nao_atendeu for all authenticated users
CREATE POLICY "Users can view assigned leads or admin or viewer"
ON public.leads
FOR SELECT
USING (
  (assigned_sdr_id = get_current_profile_id())
  OR (assigned_closer_id = get_current_profile_id())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'viewer'::app_role)
  OR ((assigned_sdr_id IS NULL) AND (assigned_closer_id IS NULL) AND (has_role(auth.uid(), 'sdr'::app_role) OR has_role(auth.uid(), 'closer'::app_role)))
  OR (status IN ('sem_atendimento'::lead_status, 'nao_atendeu'::lead_status))
);
