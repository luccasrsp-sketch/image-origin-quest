-- Fix: Tighten lead_activities RLS policy to prevent unauthorized staff from viewing activities
-- Remove the overly permissive policy that allows SDRs/closers to see unassigned lead activities

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view activities for accessible leads" ON public.lead_activities;

-- Create a stricter policy: users can only view activities for leads they are assigned to
CREATE POLICY "Users can view activities for assigned leads only"
ON public.lead_activities
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM leads
    WHERE leads.id = lead_activities.lead_id
    AND (
      -- User is assigned as SDR
      leads.assigned_sdr_id = get_current_profile_id()
      -- Or user is assigned as closer
      OR leads.assigned_closer_id = get_current_profile_id()
      -- Or user is admin (can see all)
      OR has_role(auth.uid(), 'admin'::app_role)
      -- Or user is viewer (read-only access to all)
      OR has_role(auth.uid(), 'viewer'::app_role)
    )
  )
);