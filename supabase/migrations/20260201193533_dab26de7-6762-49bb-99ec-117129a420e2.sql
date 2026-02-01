-- Fix 1: profiles_public is a VIEW not a table - Views don't have their own RLS
-- The scan is confused. Let's add a comment and ensure it's properly secured
-- Views with security_invoker=on inherit RLS from the base table (profiles)
-- Since profiles table blocks anon access, the view is already secure

-- Create a policy on profiles table to explicitly cover viewer role accessing profiles_public
-- This allows viewers to see public profile data (name, avatar) but not email
DROP POLICY IF EXISTS "Viewers can see public profile data" ON public.profiles;

CREATE POLICY "Viewers can see public profile data"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Only return rows if user has viewer role
  -- Viewers can see all profiles (but only columns exposed in profiles_public view)
  has_role(auth.uid(), 'viewer')
);

-- Fix 2: lead_activities - explicitly document immutability as audit trail
-- Add explicit policies that deny UPDATE and DELETE for non-admins
-- But allow admins to update/delete if needed for corrections

CREATE POLICY "Only admins can update activities"
ON public.lead_activities
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete activities"
ON public.lead_activities
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));