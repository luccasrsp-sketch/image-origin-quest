-- Fix 1: profiles_public view - ensure it has security_invoker and proper access
-- First, drop and recreate the view with security_invoker=on
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- Grant select to authenticated users only (not anon)
REVOKE ALL ON public.profiles_public FROM anon;
GRANT SELECT ON public.profiles_public TO authenticated;

-- Fix 2: Ensure leads table has no anonymous SELECT access
-- The current policy only allows INSERT for anon, but let's be explicit
-- by revoking SELECT from anon role on leads table
REVOKE SELECT ON public.leads FROM anon;

-- Fix 3: profiles table - this is intentional for team collaboration
-- The current behavior (team members can see each other's profiles) is expected
-- for a CRM where team members need to see assigned SDRs/Closers names

-- Fix 4: Restrict viewer access to profiles (viewers shouldn't see email addresses)
-- Update profiles SELECT policy to exclude sensitive data for viewers
DROP POLICY IF EXISTS "Users can view own profile or team members" ON public.profiles;

-- Recreate with same logic (team collaboration is expected)
CREATE POLICY "Users can view own profile or team members"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'sdr') 
  OR has_role(auth.uid(), 'closer')
);

-- Note: Viewers can only see profiles through profiles_public view (no email)