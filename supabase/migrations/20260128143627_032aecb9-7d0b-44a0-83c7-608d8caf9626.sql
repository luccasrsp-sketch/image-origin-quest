-- Criar tabela de convites pendentes
CREATE TABLE public.user_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role app_role NOT NULL,
  invited_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar convites
CREATE POLICY "Admins can manage invites"
ON public.user_invites
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Função para atribuir papel quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_user_invite()
RETURNS TRIGGER AS $$
DECLARE
  invite_record RECORD;
BEGIN
  -- Verificar se existe convite para este email
  SELECT * INTO invite_record 
  FROM public.user_invites 
  WHERE email = NEW.email AND accepted_at IS NULL;
  
  IF invite_record.id IS NOT NULL THEN
    -- Atribuir o papel do convite
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, invite_record.role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Marcar convite como aceito
    UPDATE public.user_invites 
    SET accepted_at = now() 
    WHERE id = invite_record.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para executar após criação de usuário
CREATE TRIGGER on_auth_user_created_invite
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_invite();