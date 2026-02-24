-- Recria policy de UPDATE em leads para validação direta de papéis
-- e garantir transferência entre closers/SDRs/admins em qualquer etapa do funil.
DROP POLICY IF EXISTS "Leads update policy" ON public.leads;

CREATE POLICY "Leads update policy"
ON public.leads
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('sdr'::public.app_role, 'closer'::public.app_role, 'admin'::public.app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('sdr'::public.app_role, 'closer'::public.app_role, 'admin'::public.app_role)
  )
);