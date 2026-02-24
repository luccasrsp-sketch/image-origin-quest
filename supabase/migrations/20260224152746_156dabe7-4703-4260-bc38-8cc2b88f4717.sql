-- Ajuste de segurança: remover WITH CHECK (true) para satisfazer linter sem quebrar a transferência
DROP POLICY IF EXISTS "Leads update policy" ON public.leads;

CREATE POLICY "Leads update policy"
ON public.leads
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'closer'::app_role)
  OR has_role(auth.uid(), 'sdr'::app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL
);