
-- Drop and recreate get_next_closer to accept an optional exclude_profile_id parameter
-- This prevents assigning the same person as both SDR and Closer
CREATE OR REPLACE FUNCTION public.get_next_closer(_exclude_profile_id uuid DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  closers_array uuid[];
  current_index integer;
  closers_count integer;
  next_closer_id uuid;
  attempts integer := 0;
BEGIN
  -- Authorization check
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sdr')) THEN
    RAISE EXCEPTION 'Unauthorized: only admins and SDRs can assign leads to closers';
  END IF;

  -- Get all closers (profile_id), excluding the specified profile if provided
  SELECT ARRAY_AGG(p.id ORDER BY p.full_name)
  INTO closers_array
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role = 'closer'
    AND (_exclude_profile_id IS NULL OR p.id != _exclude_profile_id);
  
  -- If no closers available after exclusion, return null
  IF closers_array IS NULL OR array_length(closers_array, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  
  closers_count := array_length(closers_array, 1);
  
  -- Get current index
  SELECT config_value INTO current_index
  FROM distribution_config
  WHERE config_key = 'next_closer_index';
  
  -- Ensure index is within range
  current_index := current_index % closers_count;
  
  -- Get the closer
  next_closer_id := closers_array[current_index + 1];
  
  -- Increment index for next call
  UPDATE distribution_config
  SET config_value = (current_index + 1) % closers_count,
      updated_at = now()
  WHERE config_key = 'next_closer_index';
  
  RETURN next_closer_id;
END;
$function$;
