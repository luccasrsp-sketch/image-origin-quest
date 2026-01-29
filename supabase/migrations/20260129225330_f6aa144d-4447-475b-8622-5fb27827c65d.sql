-- Fix 1: Restrict distribution_config UPDATE to admins only
-- Currently any authenticated user can modify system configuration
DROP POLICY IF EXISTS "Authenticated users can update config" ON public.distribution_config;

CREATE POLICY "Only admins can update config"
ON public.distribution_config
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Restrict lead_activities SELECT to users who have access to the lead
-- Currently any authenticated user can see all activities
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.lead_activities;

CREATE POLICY "Users can view activities for accessible leads"
ON public.lead_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = lead_activities.lead_id
    AND (
      leads.assigned_sdr_id = get_current_profile_id() OR
      leads.assigned_closer_id = get_current_profile_id() OR
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'viewer'::app_role) OR
      (leads.assigned_sdr_id IS NULL AND leads.assigned_closer_id IS NULL)
    )
  )
);

-- Fix 3: Restrict push_subscriptions SELECT to users and service role
-- Remove overly permissive "true" condition
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;