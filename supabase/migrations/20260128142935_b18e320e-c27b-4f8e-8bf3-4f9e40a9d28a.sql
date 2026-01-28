-- A política de INSERT anônimo para leads é intencional (formulário público de cadastro)
-- Vamos adicionar validações mínimas para evitar abuso

DROP POLICY IF EXISTS "Anyone can submit leads via form" ON public.leads;

-- Permitir INSERT anônimo mas apenas com campos obrigatórios preenchidos
-- e status inicial correto
CREATE POLICY "Anonymous can submit leads via public form"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (
  -- Garantir que campos obrigatórios estão preenchidos
  full_name IS NOT NULL 
  AND full_name <> ''
  AND email IS NOT NULL 
  AND email <> ''
  AND phone IS NOT NULL 
  AND phone <> ''
  AND company_name IS NOT NULL 
  AND company_name <> ''
  -- Garantir status inicial correto
  AND status = 'sem_atendimento'
  -- Garantir que não está tentando se atribuir a ninguém
  AND assigned_sdr_id IS NULL
  AND assigned_closer_id IS NULL
  -- Garantir que não está tentando definir campos de venda
  AND sale_confirmed_at IS NULL
  AND sale_contract_sent IS NULL
  AND sale_payment_received IS NULL
);