-- Drop the existing policies (both possible names due to truncation)
DROP POLICY IF EXISTS "Users can update assigned leads or admin or closer can update a" ON public.leads;
DROP POLICY IF EXISTS "Users can update assigned leads or admin or closer can update all" ON public.leads;
DROP POLICY IF EXISTS "Users can update assigned leads or admin can update all" ON public.leads;

-- Create a new update policy with shorter name that allows closers to update any lead
CREATE POLICY "Leads update policy" 
ON public.leads 
FOR UPDATE
USING (
  (assigned_sdr_id = get_current_profile_id()) OR 
  (assigned_closer_id = get_current_profile_id()) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'closer'::app_role)
);