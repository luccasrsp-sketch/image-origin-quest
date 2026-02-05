
-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert events" ON public.calendar_events;

-- Create a security definer function to check if user_id belongs to a closer
-- This bypasses RLS and allows checking during INSERT
CREATE OR REPLACE FUNCTION public.is_closer_profile(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    INNER JOIN user_roles ur ON ur.user_id = p.user_id
    WHERE p.id = profile_id
    AND ur.role = 'closer'::app_role
  )
$$;

-- Create new INSERT policy using the security definer function
CREATE POLICY "Users can insert events" 
ON public.calendar_events 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User can create their own events
  (user_id = get_current_profile_id()) 
  OR 
  -- Admins can create events for anyone
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- SDRs can create events for closers (scheduling meetings)
  (has_role(auth.uid(), 'sdr'::app_role) AND is_closer_profile(user_id))
  OR
  -- Closers can create events for other closers
  (has_role(auth.uid(), 'closer'::app_role) AND is_closer_profile(user_id))
);
