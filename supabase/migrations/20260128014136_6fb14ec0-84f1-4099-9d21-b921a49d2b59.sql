-- Add field to track if lead needs to schedule a call
ALTER TABLE public.leads ADD COLUMN needs_scheduling BOOLEAN DEFAULT false;

-- Add field to store the reason why scheduling wasn't possible
ALTER TABLE public.leads ADD COLUMN scheduling_pending_reason TEXT;