
CREATE OR REPLACE FUNCTION public.get_team_sales_totals_by_company(target_company text DEFAULT 'escola_franchising'::text)
 RETURNS TABLE(sales_total numeric, money_on_table numeric, daily_sales numeric, weekly_sales numeric)
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
  -- Authorization: only authenticated users with a known role can access
  IF NOT (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'viewer') OR has_role(auth.uid(), 'closer') OR has_role(auth.uid(), 'sdr')) THEN
    RAISE EXCEPTION 'Unauthorized: insufficient permissions to access financial aggregations';
  END IF;

  start_of_month := date_trunc('month', now());
  end_of_month := date_trunc('month', now()) + interval '1 month' - interval '1 millisecond';
  start_of_week := date_trunc('week', now());
  start_of_day := date_trunc('day', now());
  
  RETURN QUERY
  SELECT 
    COALESCE((
      SELECT SUM(COALESCE(l.sale_entry_value, 0) + COALESCE(l.sale_remaining_value, 0))
      FROM leads l
      WHERE l.status = 'vendido'
        AND l.sale_confirmed_at >= start_of_month
        AND l.sale_confirmed_at <= end_of_month
        AND l.company::text = target_company
    ), 0) AS sales_total,
    
    COALESCE((
      SELECT SUM(COALESCE(l.proposal_value, 0))
      FROM leads l
      WHERE l.status = 'envio_proposta'
        AND l.company::text = target_company
    ), 0) AS money_on_table,
    
    COALESCE((
      SELECT SUM(COALESCE(l.sale_entry_value, 0) + COALESCE(l.sale_remaining_value, 0))
      FROM leads l
      WHERE l.status = 'vendido'
        AND l.sale_confirmed_at >= start_of_day
        AND l.company::text = target_company
    ), 0) AS daily_sales,
    
    COALESCE((
      SELECT SUM(COALESCE(l.sale_entry_value, 0) + COALESCE(l.sale_remaining_value, 0))
      FROM leads l
      WHERE l.status = 'vendido'
        AND l.sale_confirmed_at >= start_of_week
        AND l.company::text = target_company
    ), 0) AS weekly_sales;
END;
$function$;
