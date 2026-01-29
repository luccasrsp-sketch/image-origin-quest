-- Create a function to notify when a lead is assigned
CREATE OR REPLACE FUNCTION public.notify_lead_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_profile_id UUID;
  profile_name TEXT;
  lead_name TEXT;
BEGIN
  -- Check if SDR was just assigned
  IF (OLD.assigned_sdr_id IS NULL AND NEW.assigned_sdr_id IS NOT NULL) THEN
    assigned_profile_id := NEW.assigned_sdr_id;
  -- Check if Closer was just assigned
  ELSIF (OLD.assigned_closer_id IS NULL AND NEW.assigned_closer_id IS NOT NULL) THEN
    assigned_profile_id := NEW.assigned_closer_id;
  -- Check if SDR changed
  ELSIF (OLD.assigned_sdr_id IS DISTINCT FROM NEW.assigned_sdr_id AND NEW.assigned_sdr_id IS NOT NULL) THEN
    assigned_profile_id := NEW.assigned_sdr_id;
  -- Check if Closer changed
  ELSIF (OLD.assigned_closer_id IS DISTINCT FROM NEW.assigned_closer_id AND NEW.assigned_closer_id IS NOT NULL) THEN
    assigned_profile_id := NEW.assigned_closer_id;
  ELSE
    -- No new assignment
    RETURN NEW;
  END IF;

  -- Get lead name
  lead_name := NEW.full_name;

  -- Create in-app notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    assigned_profile_id,
    'Novo Lead Atribuído',
    'O lead ' || lead_name || ' (' || NEW.company_name || ') foi atribuído a você.',
    'lead'
  );

  RETURN NEW;
END;
$$;

-- Create trigger for lead assignments
DROP TRIGGER IF EXISTS trigger_notify_lead_assignment ON public.leads;
CREATE TRIGGER trigger_notify_lead_assignment
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_lead_assignment();

-- Also trigger on insert when a lead comes with assignment
CREATE OR REPLACE FUNCTION public.notify_new_lead_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify SDR if assigned
  IF NEW.assigned_sdr_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.assigned_sdr_id,
      'Novo Lead',
      'O lead ' || NEW.full_name || ' (' || NEW.company_name || ') foi atribuído a você.',
      'lead'
    );
  END IF;

  -- Notify Closer if assigned
  IF NEW.assigned_closer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
      NEW.assigned_closer_id,
      'Novo Lead',
      'O lead ' || NEW.full_name || ' (' || NEW.company_name || ') foi atribuído a você.',
      'lead'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_lead ON public.leads;
CREATE TRIGGER trigger_notify_new_lead
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_lead_assignment();