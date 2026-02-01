-- Fix: Financial Records Could Reveal Confidential Business Deals
-- Restrict financial_sales SELECT to admins only (as per business requirement)

-- Drop existing SELECT policies on financial_sales
DROP POLICY IF EXISTS "Users can view financial sales" ON public.financial_sales;
DROP POLICY IF EXISTS "Authenticated users can view financial sales" ON public.financial_sales;
DROP POLICY IF EXISTS "Team members can view financial sales" ON public.financial_sales;

-- Create new policy: Only admins can view financial sales
CREATE POLICY "Admins can view all financial sales"
ON public.financial_sales
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Also fix related tables for consistency

-- financial_installments
DROP POLICY IF EXISTS "Users can view financial installments" ON public.financial_installments;
DROP POLICY IF EXISTS "Authenticated users can view financial installments" ON public.financial_installments;
DROP POLICY IF EXISTS "Team members can view financial installments" ON public.financial_installments;

CREATE POLICY "Admins can view all financial installments"
ON public.financial_installments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- financial_cash_entries
DROP POLICY IF EXISTS "Users can view financial cash entries" ON public.financial_cash_entries;
DROP POLICY IF EXISTS "Authenticated users can view financial cash entries" ON public.financial_cash_entries;
DROP POLICY IF EXISTS "Team members can view financial cash entries" ON public.financial_cash_entries;

CREATE POLICY "Admins can view all financial cash entries"
ON public.financial_cash_entries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- financial_checks
DROP POLICY IF EXISTS "Users can view financial checks" ON public.financial_checks;
DROP POLICY IF EXISTS "Authenticated users can view financial checks" ON public.financial_checks;
DROP POLICY IF EXISTS "Team members can view financial checks" ON public.financial_checks;

CREATE POLICY "Admins can view all financial checks"
ON public.financial_checks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));