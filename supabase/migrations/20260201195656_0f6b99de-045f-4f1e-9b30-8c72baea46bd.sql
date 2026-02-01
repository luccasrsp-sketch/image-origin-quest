-- Fix 1: Make email nullable to stop fake email generation
ALTER TABLE public.leads ALTER COLUMN email DROP NOT NULL;

-- Fix 2: Add authorization check to get_next_closer function
CREATE OR REPLACE FUNCTION public.get_next_closer()
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
BEGIN
  -- Authorization check: only admins and SDRs can use this function
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sdr')) THEN
    RAISE EXCEPTION 'Unauthorized: only admins and SDRs can assign leads to closers';
  END IF;

  -- Buscar todos os closers (profile_id)
  SELECT ARRAY_AGG(p.id ORDER BY p.full_name)
  INTO closers_array
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role = 'closer';
  
  -- Se não há closers, retorna null
  IF closers_array IS NULL OR array_length(closers_array, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  
  closers_count := array_length(closers_array, 1);
  
  -- Buscar índice atual
  SELECT config_value INTO current_index
  FROM distribution_config
  WHERE config_key = 'next_closer_index';
  
  -- Garantir que o índice está dentro do range
  current_index := current_index % closers_count;
  
  -- Pegar o closer atual
  next_closer_id := closers_array[current_index + 1]; -- PostgreSQL arrays são 1-indexed
  
  -- Incrementar o índice para o próximo
  UPDATE distribution_config
  SET config_value = (current_index + 1) % closers_count,
      updated_at = now()
  WHERE config_key = 'next_closer_index';
  
  RETURN next_closer_id;
END;
$function$;