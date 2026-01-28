-- Add meeting completion tracking fields to calendar_events
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS meeting_completed boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS meeting_not_completed_reason text;

-- Add comment for documentation
COMMENT ON COLUMN public.calendar_events.meeting_completed IS 'Whether the meeting was actually held (true=yes, false=no, null=not answered yet)';
COMMENT ON COLUMN public.calendar_events.meeting_not_completed_reason IS 'Reason why the meeting was not completed (only when meeting_completed=false)';