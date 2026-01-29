-- Tabela para configuração de distribuição round-robin
CREATE TABLE public.distribution_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key text NOT NULL UNIQUE,
  config_value integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Inserir configuração inicial para closers (índice começa em 0)
INSERT INTO public.distribution_config (config_key, config_value) 
VALUES ('next_closer_index', 0);

-- Enable RLS
ALTER TABLE public.distribution_config ENABLE ROW LEVEL SECURITY;

-- Apenas autenticados podem ler
CREATE POLICY "Authenticated users can view config" 
ON public.distribution_config 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Apenas autenticados podem atualizar (para incrementar o índice)
CREATE POLICY "Authenticated users can update config" 
ON public.distribution_config 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Função para obter o próximo closer em round-robin
-- Retorna o profile_id do próximo closer e incrementa o índice
CREATE OR REPLACE FUNCTION public.get_next_closer()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  closers_array uuid[];
  current_index integer;
  closers_count integer;
  next_closer_id uuid;
BEGIN
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
$$;