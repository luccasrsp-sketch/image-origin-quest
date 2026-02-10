
-- Add activity_type column to lead_activities
ALTER TABLE public.lead_activities 
ADD COLUMN activity_type text NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.lead_activities.activity_type IS 'Type of activity: call, whatsapp, meeting, email, note, status_change, assignment_change';
