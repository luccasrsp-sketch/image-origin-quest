-- Create a function to get team sales totals (bypasses RLS for aggregation)
CREATE OR REPLACE FUNCTION public.get_team_sales_totals()
RETURNS TABLE (
  sales_total numeric,
  money_on_table numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_of_month timestamp with time zone;
  end_of_month timestamp with time zone;
BEGIN
  -- Calculate current month boundaries
  start_of_month := date_trunc('month', now());
  end_of_month := date_trunc('month', now()) + interval '1 month' - interval '1 millisecond';
  
  RETURN QUERY
  SELECT 
    COALESCE((
      SELECT SUM(COALESCE(sale_entry_value, 0) + COALESCE(sale_remaining_value, 0))
      FROM leads
      WHERE status = 'vendido'
        AND sale_confirmed_at >= start_of_month
        AND sale_confirmed_at <= end_of_month
    ), 0) AS sales_total,
    COALESCE((
      SELECT SUM(COALESCE(proposal_value, 0))
      FROM leads
      WHERE status = 'envio_proposta'
    ), 0) AS money_on_table;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_team_sales_totals() TO authenticated;