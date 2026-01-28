-- 1. FIX: Profiles table - restringir visualização apenas ao próprio perfil ou admin
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile or admin can view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Criar view pública para exibir apenas dados não sensíveis (nome e avatar) para listagem de equipe
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  full_name,
  avatar_url,
  created_at
FROM public.profiles;

-- Política para a view - todos autenticados podem ver dados públicos
DROP POLICY IF EXISTS "Authenticated can view public profiles" ON public.profiles_public;

-- 2. FIX: Leads table - restringir updates apenas para SDR/Closer atribuído ou admin
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;

CREATE POLICY "Users can update assigned leads or admin can update all"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  assigned_sdr_id = get_current_profile_id()
  OR assigned_closer_id = get_current_profile_id()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. FIX: Restringir visualização de leads apenas para usuários atribuídos ou admin
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;

CREATE POLICY "Users can view assigned leads or admin can view all"
ON public.leads
FOR SELECT
TO authenticated
USING (
  assigned_sdr_id = get_current_profile_id()
  OR assigned_closer_id = get_current_profile_id()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (assigned_sdr_id IS NULL AND assigned_closer_id IS NULL) -- Leads não atribuídos são visíveis para todos
);

-- 4. FIX: Restringir insert de leads autenticados
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;

CREATE POLICY "Admins can insert leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Manter política anônima para formulário público, mas adicionar validações
-- A política de anon INSERT já existe, vamos manter mas o ideal é migrar para edge function