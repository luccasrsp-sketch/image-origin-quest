-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert events" ON public.calendar_events;

-- Create new INSERT policy that allows SDRs, Closers, and Admins to create events
CREATE POLICY "Users can insert events"
ON public.calendar_events
FOR INSERT
TO authenticated
WITH CHECK (
  -- User creating event for themselves
  user_id = get_current_profile_id()
  OR
  -- Admins can create events for anyone
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- SDRs can create events for any closer (scheduling meetings)
  (has_role(auth.uid(), 'sdr'::app_role) AND is_closer_profile(user_id))
  OR
  -- Closers can create events for any closer
  (has_role(auth.uid(), 'closer'::app_role))
);