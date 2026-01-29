-- Create a function to check if user is viewer only (no other roles)
CREATE OR REPLACE FUNCTION public.is_viewer_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'viewer'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('sdr', 'closer', 'admin')
  )
$$;

-- Update leads SELECT policy to include viewers
DROP POLICY IF EXISTS "Users can view assigned leads or admin can view all" ON public.leads;
CREATE POLICY "Users can view assigned leads or admin or viewer" ON public.leads
FOR SELECT USING (
  (assigned_sdr_id = get_current_profile_id()) 
  OR (assigned_closer_id = get_current_profile_id()) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'viewer'::app_role)
  OR ((auth.uid() IS NOT NULL) AND (assigned_sdr_id IS NULL) AND (assigned_closer_id IS NULL))
);

-- Update calendar_events SELECT policy to include viewers
DROP POLICY IF EXISTS "Users can view own events" ON public.calendar_events;
CREATE POLICY "Users can view own events or viewer" ON public.calendar_events
FOR SELECT USING (
  (user_id = get_current_profile_id()) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'viewer'::app_role)
);

-- Update lead_activities SELECT policy to include viewers (already allows all authenticated)
-- No change needed as it already has USING (true)

-- Update profiles SELECT policy to include viewers
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admin or viewer" ON public.profiles
FOR SELECT USING (
  (user_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'viewer'::app_role)
);