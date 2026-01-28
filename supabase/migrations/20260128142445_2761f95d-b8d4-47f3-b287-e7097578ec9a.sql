-- Fix remaining "always true" INSERT policies

-- 1. lead_activities: Restringir insert apenas para usuários autenticados que têm acesso ao lead
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.lead_activities;

CREATE POLICY "Users can insert activities for accessible leads"
ON public.lead_activities
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_id 
    AND (
      leads.assigned_sdr_id = get_current_profile_id()
      OR leads.assigned_closer_id = get_current_profile_id()
      OR has_role(auth.uid(), 'admin'::app_role)
      OR (leads.assigned_sdr_id IS NULL AND leads.assigned_closer_id IS NULL)
    )
  )
);

-- 2. calendar_events: Restringir insert para o próprio usuário
DROP POLICY IF EXISTS "Users can insert events" ON public.calendar_events;

CREATE POLICY "Users can insert own events"
ON public.calendar_events
FOR INSERT
TO authenticated
WITH CHECK (user_id = get_current_profile_id() OR has_role(auth.uid(), 'admin'::app_role));

-- 3. notifications: Restringir insert para sistema/admin (notifications são criadas pelo sistema)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Admins can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));