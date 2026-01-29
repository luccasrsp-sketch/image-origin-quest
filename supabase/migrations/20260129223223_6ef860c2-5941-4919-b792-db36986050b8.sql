-- Fix 1: Drop the insecure get_user_push_subscriptions function
-- The edge function queries push_subscriptions directly with service_role, so this function is not needed
REVOKE EXECUTE ON FUNCTION public.get_user_push_subscriptions(UUID) FROM authenticated;
DROP FUNCTION IF EXISTS public.get_user_push_subscriptions(UUID);

-- Fix 2: Update profiles SELECT policy to be more restrictive
-- Viewers should only see their own profile, not all profiles
-- Admins and SDRs/Closers need to see team profiles for lead assignment
DROP POLICY IF EXISTS "Users can view own profile or admin or viewer" ON public.profiles;

CREATE POLICY "Users can view own profile or team members"
ON public.profiles
FOR SELECT
USING (
  -- Users can always see their own profile
  user_id = auth.uid() OR
  -- Admins can see all profiles
  has_role(auth.uid(), 'admin'::app_role) OR
  -- SDRs and Closers can see all profiles (needed for team collaboration)
  has_role(auth.uid(), 'sdr'::app_role) OR
  has_role(auth.uid(), 'closer'::app_role)
  -- Viewers can ONLY see their own profile (removed from this policy)
);