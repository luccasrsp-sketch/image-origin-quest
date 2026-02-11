
-- Drop restrictive SELECT policy that blocks SDRs from seeing closer events
DROP POLICY IF EXISTS "Users can view own events or viewer" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_require_auth_for_select" ON public.calendar_events;

-- New SELECT policy: authenticated users with roles can see all events
CREATE POLICY "Authenticated users can view events"
ON public.calendar_events FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'viewer'::app_role)
  OR has_role(auth.uid(), 'sdr'::app_role)
  OR has_role(auth.uid(), 'closer'::app_role)
);

-- Fix UPDATE policy to include WITH CHECK and allow SDRs/Closers
DROP POLICY IF EXISTS "Users can update own events" ON public.calendar_events;

CREATE POLICY "Users can update events"
ON public.calendar_events FOR UPDATE
TO authenticated
USING (
  user_id = get_current_profile_id()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sdr'::app_role)
  OR has_role(auth.uid(), 'closer'::app_role)
)
WITH CHECK (
  user_id = get_current_profile_id()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'sdr'::app_role)
  OR has_role(auth.uid(), 'closer'::app_role)
);
