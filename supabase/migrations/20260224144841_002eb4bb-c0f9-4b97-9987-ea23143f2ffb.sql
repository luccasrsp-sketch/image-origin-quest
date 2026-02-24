
-- Drop and recreate UPDATE policy with explicit WITH CHECK
DROP POLICY IF EXISTS "Leads update policy" ON public.leads;

CREATE POLICY "Leads update policy" ON public.leads
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('sdr', 'closer', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('sdr', 'closer', 'admin')
  )
);

-- Also fix: the INSERT policies use has_role() which is SECURITY DEFINER.
-- But there are TWO restrictive INSERT policies that BOTH must pass.
-- "Admins can insert leads" requires admin role
-- "Closers and SDRs can manage leads" requires closer OR sdr
-- Since both are RESTRICTIVE (not permissive), PostgreSQL requires ALL to pass.
-- This means a closer must pass BOTH the admin check AND the closer check = impossible!
-- Fix: make the policies PERMISSIVE so only ONE needs to pass.

DROP POLICY IF EXISTS "Admins can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Closers and SDRs can manage leads" ON public.leads;

-- Recreate as PERMISSIVE policies (any ONE can grant access)
CREATE POLICY "Admins can insert leads" ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Closers and SDRs can manage leads" ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'closer'::app_role) OR has_role(auth.uid(), 'sdr'::app_role)
);
