-- Fix: INSERT policies' WITH CHECK is also evaluated during UPDATE for the new row.
-- Closers and SDRs need INSERT permission so that UPDATE operations don't fail.
CREATE POLICY "Closers and SDRs can manage leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'closer'::app_role) OR has_role(auth.uid(), 'sdr'::app_role)
);