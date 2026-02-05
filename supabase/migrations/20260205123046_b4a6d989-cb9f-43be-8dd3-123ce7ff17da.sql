-- Drop the existing insert policy on lead_activities
DROP POLICY IF EXISTS "Users can insert activities for accessible leads" ON public.lead_activities;

-- Create a new insert policy that also allows closers to insert activities for any lead
CREATE POLICY "Users can insert activities for accessible leads" 
ON public.lead_activities 
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = lead_activities.lead_id
    AND (
      leads.assigned_sdr_id = get_current_profile_id() OR 
      leads.assigned_closer_id = get_current_profile_id() OR 
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'closer'::app_role) OR
      (leads.assigned_sdr_id IS NULL AND leads.assigned_closer_id IS NULL)
    )
  )
);