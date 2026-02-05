
-- Drop the existing update policy
DROP POLICY IF EXISTS "Leads update policy" ON public.leads;

-- Create new update policy that allows all authenticated team members to update leads
CREATE POLICY "Leads update policy" 
ON public.leads 
FOR UPDATE 
TO authenticated
USING (
  -- SDRs can update any lead (not just assigned)
  has_role(auth.uid(), 'sdr'::app_role)
  OR
  -- Closers can update any lead
  has_role(auth.uid(), 'closer'::app_role)
  OR
  -- Admins can update any lead
  has_role(auth.uid(), 'admin'::app_role)
);
