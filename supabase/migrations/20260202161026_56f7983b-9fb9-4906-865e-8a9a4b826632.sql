-- Allow anonymous users to insert leads via embed form
CREATE POLICY "Allow anonymous lead submissions" 
ON public.leads 
FOR INSERT 
TO anon
WITH CHECK (true);