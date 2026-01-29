-- First drop the existing function
DROP FUNCTION IF EXISTS public.get_team_sales_totals();

-- Then create with new signature including daily and weekly sales
CREATE OR REPLACE FUNCTION public.get_team_sales_totals()
RETURNS TABLE(
  sales_total numeric, 
  money_on_table numeric,
  daily_sales numeric,
  weekly_sales numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  start_of_month timestamp with time zone;
  end_of_month timestamp with time zone;
  start_of_week timestamp with time zone;
  start_of_day timestamp with time zone;
BEGIN
  -- Calculate boundaries
  start_of_month := date_trunc('month', now());
  end_of_month := date_trunc('month', now()) + interval '1 month' - interval '1 millisecond';
  start_of_week := date_trunc('week', now()); -- Monday of current week
  start_of_day := date_trunc('day', now());
  
  RETURN QUERY
  SELECT 
    -- Monthly total
    COALESCE((
      SELECT SUM(COALESCE(l.sale_entry_value, 0) + COALESCE(l.sale_remaining_value, 0))
      FROM leads l
      WHERE l.status = 'vendido'
        AND l.sale_confirmed_at >= start_of_month
        AND l.sale_confirmed_at <= end_of_month
    ), 0) AS sales_total,
    
    -- Money on table (proposals)
    COALESCE((
      SELECT SUM(COALESCE(l.proposal_value, 0))
      FROM leads l
      WHERE l.status = 'envio_proposta'
    ), 0) AS money_on_table,
    
    -- Daily sales (today)
    COALESCE((
      SELECT SUM(COALESCE(l.sale_entry_value, 0) + COALESCE(l.sale_remaining_value, 0))
      FROM leads l
      WHERE l.status = 'vendido'
        AND l.sale_confirmed_at >= start_of_day
    ), 0) AS daily_sales,
    
    -- Weekly sales (this week - Monday to now)
    COALESCE((
      SELECT SUM(COALESCE(l.sale_entry_value, 0) + COALESCE(l.sale_remaining_value, 0))
      FROM leads l
      WHERE l.status = 'vendido'
        AND l.sale_confirmed_at >= start_of_week
    ), 0) AS weekly_sales;
END;
$function$;