-- Remove the overly permissive policy and keep the validated one
DROP POLICY IF EXISTS "Allow anonymous lead submissions" ON public.leads;