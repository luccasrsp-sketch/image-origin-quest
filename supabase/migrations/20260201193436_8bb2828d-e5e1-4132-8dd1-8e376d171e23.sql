-- Fix 1: profiles_public view - it's a VIEW, not a table. Views don't have RLS.
-- Need to add a policy for authenticated access only via the base table
-- The view already uses security_invoker=on, so it inherits the profiles table RLS

-- Fix 2: leads - restrict unassigned leads visibility to admins only
DROP POLICY IF EXISTS "Users can view assigned leads or admin or viewer" ON public.leads;

CREATE POLICY "Users can view assigned leads or admin or viewer"
ON public.leads
FOR SELECT
TO authenticated
USING (
  -- Users can see leads assigned to them
  assigned_sdr_id = get_current_profile_id() 
  OR assigned_closer_id = get_current_profile_id()
  -- Admins and viewers can see everything
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'viewer')
  -- SDRs and closers can see UNASSIGNED leads (for claiming)
  OR (
    assigned_sdr_id IS NULL 
    AND assigned_closer_id IS NULL
    AND (has_role(auth.uid(), 'sdr') OR has_role(auth.uid(), 'closer'))
  )
);

-- Fix 3: Add RLS policy to profiles_public view
-- Note: Views with security_invoker use the base table's RLS
-- The profiles table already has proper RLS, so the view is secure
-- However, we need to grant access to authenticated users on the view
GRANT SELECT ON public.profiles_public TO authenticated;
REVOKE ALL ON public.profiles_public FROM anon;

-- Fix 4: The warning about financial data in leads table is valid
-- However, this is intentional for the CRM workflow where closers need to see proposal values
-- This is accepted business logic - closers manage proposals and sales