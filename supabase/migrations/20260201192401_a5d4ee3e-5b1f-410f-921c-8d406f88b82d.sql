-- Remove old SELECT policies that still allow non-admin access
DROP POLICY IF EXISTS "Users can view sales for their company" ON public.financial_sales;
DROP POLICY IF EXISTS "Users can view installments" ON public.financial_installments;
DROP POLICY IF EXISTS "Users can view cash entries" ON public.financial_cash_entries;
DROP POLICY IF EXISTS "Users can view checks" ON public.financial_checks;