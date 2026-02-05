-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own events" ON public.calendar_events;

-- Create new INSERT policy that allows SDRs to create events for closers
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
  (has_role(auth.uid(), 'sdr'::app_role) AND EXISTS (
    SELECT 1 FROM user_roles ur 
    INNER JOIN profiles p ON p.user_id = ur.user_id 
    WHERE p.id = calendar_events.user_id 
    AND ur.role = 'closer'
  ))
  OR
  -- Closers can create events for other closers
  (has_role(auth.uid(), 'closer'::app_role) AND EXISTS (
    SELECT 1 FROM user_roles ur 
    INNER JOIN profiles p ON p.user_id = ur.user_id 
    WHERE p.id = calendar_events.user_id 
    AND ur.role = 'closer'
  ))
);