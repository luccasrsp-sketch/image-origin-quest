CREATE OR REPLACE FUNCTION public.transfer_lead_assignment(
  _lead_id uuid,
  _new_profile_id uuid,
  _assignment_type text,
  _new_user_name text DEFAULT NULL,
  _old_user_name text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _current_profile_id uuid;
  _role_label text;
  _note_text text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  IF NOT (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'sdr')
    OR has_role(auth.uid(), 'closer')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: insufficient role to transfer leads';
  END IF;

  IF _assignment_type NOT IN ('sdr', 'closer') THEN
    RAISE EXCEPTION 'Invalid assignment type: %', _assignment_type;
  END IF;

  IF _new_profile_id IS NULL THEN
    RAISE EXCEPTION 'New assignee is required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _new_profile_id) THEN
    RAISE EXCEPTION 'Assignee profile not found';
  END IF;

  IF _assignment_type = 'sdr' AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE p.id = _new_profile_id
      AND ur.role IN ('sdr', 'admin')
  ) THEN
    RAISE EXCEPTION 'Selected profile is not allowed as SDR';
  END IF;

  IF _assignment_type = 'closer' AND NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.user_id
    WHERE p.id = _new_profile_id
      AND ur.role IN ('closer', 'admin')
  ) THEN
    RAISE EXCEPTION 'Selected profile is not allowed as Closer';
  END IF;

  _current_profile_id := public.get_current_profile_id();

  IF NOT has_role(auth.uid(), 'admin') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.id = _lead_id
        AND (
          l.assigned_sdr_id = _current_profile_id
          OR l.assigned_closer_id = _current_profile_id
          OR (l.assigned_sdr_id IS NULL AND l.assigned_closer_id IS NULL)
          OR l.status IN ('sem_atendimento', 'nao_atendeu')
        )
    ) THEN
      RAISE EXCEPTION 'Unauthorized: lead not accessible for transfer';
    END IF;
  END IF;

  IF _assignment_type = 'sdr' THEN
    UPDATE public.leads
    SET assigned_sdr_id = _new_profile_id
    WHERE id = _lead_id;
    _role_label := 'SDR';
  ELSE
    UPDATE public.leads
    SET assigned_closer_id = _new_profile_id
    WHERE id = _lead_id;
    _role_label := 'Closer';
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  IF _current_profile_id IS NOT NULL THEN
    _note_text := CASE
      WHEN _old_user_name IS NOT NULL AND length(trim(_old_user_name)) > 0
        THEN _role_label || ' alterado de "' || _old_user_name || '" para "' || COALESCE(_new_user_name, '') || '"'
      ELSE _role_label || ' atribuído: ' || COALESCE(_new_user_name, '')
    END;

    INSERT INTO public.lead_activities (lead_id, user_id, action, notes)
    VALUES (_lead_id, _current_profile_id, 'note_added', _note_text);
  END IF;

  RETURN TRUE;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.transfer_lead_assignment(uuid, uuid, text, text, text) TO authenticated;