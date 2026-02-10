-- Drop and recreate the leads update policy with explicit WITH CHECK
DROP POLICY IF EXISTS "Leads update policy" ON public.leads;

CREATE POLICY "Leads update policy" 
ON public.leads FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'sdr'::app_role) OR 
  has_role(auth.uid(), 'closer'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'sdr'::app_role) OR 
  has_role(auth.uid(), 'closer'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);