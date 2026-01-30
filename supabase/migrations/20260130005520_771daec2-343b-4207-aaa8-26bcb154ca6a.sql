-- Function to automatically create financial records when a lead is sold
CREATE OR REPLACE FUNCTION public.sync_sale_to_financial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_amount numeric;
  payment_method_mapped payment_method;
  new_sale_id uuid;
  installments_count integer;
  installment_amount numeric;
  first_due_date date;
  i integer;
BEGIN
  -- Only trigger when status changes TO 'vendido' and sale is confirmed
  IF NEW.status = 'vendido' AND NEW.sale_confirmed_at IS NOT NULL THEN
    -- Check if financial record already exists for this lead
    IF EXISTS (SELECT 1 FROM financial_sales WHERE lead_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Calculate total amount
    total_amount := COALESCE(NEW.sale_entry_value, 0) + COALESCE(NEW.sale_remaining_value, 0);
    
    -- Skip if no value
    IF total_amount <= 0 THEN
      RETURN NEW;
    END IF;
    
    -- Map payment method
    payment_method_mapped := CASE 
      WHEN NEW.sale_payment_method ILIKE '%pix%' THEN 'pix'::payment_method
      WHEN NEW.sale_payment_method ILIKE '%cartão%' OR NEW.sale_payment_method ILIKE '%cartao%' OR NEW.sale_payment_method ILIKE '%card%' THEN 'credit_card'::payment_method
      WHEN NEW.sale_payment_method ILIKE '%cheque%' OR NEW.sale_payment_method ILIKE '%check%' THEN 'check'::payment_method
      WHEN NEW.sale_payment_method ILIKE '%dinheiro%' OR NEW.sale_payment_method ILIKE '%cash%' THEN 'cash'::payment_method
      ELSE 'other'::payment_method
    END;
    
    -- Create financial sale
    INSERT INTO financial_sales (
      lead_id,
      description,
      total_amount,
      received_amount,
      payment_method,
      installments_count,
      company,
      created_by,
      created_at
    ) VALUES (
      NEW.id,
      'Venda ' || COALESCE(NEW.proposal_product, 'Produto') || ' - ' || NEW.company_name,
      total_amount,
      CASE WHEN NEW.sale_payment_received = true THEN total_amount ELSE 0 END,
      payment_method_mapped,
      COALESCE(NEW.sale_installments, 1),
      NEW.company,
      NEW.assigned_closer_id,
      COALESCE(NEW.sale_confirmed_at, now())
    )
    RETURNING id INTO new_sale_id;
    
    -- Generate installments
    installments_count := COALESCE(NEW.sale_installments, 1);
    installment_amount := total_amount / installments_count;
    first_due_date := COALESCE(NEW.sale_first_check_date, CURRENT_DATE);
    
    FOR i IN 1..installments_count LOOP
      INSERT INTO financial_installments (
        sale_id,
        installment_number,
        amount,
        due_date,
        status,
        received_date
      ) VALUES (
        new_sale_id,
        i,
        installment_amount,
        first_due_date + ((i - 1) * INTERVAL '1 month'),
        CASE WHEN NEW.sale_payment_received = true THEN 'received'::installment_status ELSE 'pending'::installment_status END,
        CASE WHEN NEW.sale_payment_received = true THEN CURRENT_DATE ELSE NULL END
      );
    END LOOP;
    
    -- Create cash entry if payment received
    IF NEW.sale_payment_received = true AND total_amount > 0 THEN
      INSERT INTO financial_cash_entries (
        sale_id,
        amount,
        entry_date,
        payment_method,
        description,
        company,
        created_by
      ) VALUES (
        new_sale_id,
        total_amount,
        COALESCE(NEW.sale_confirmed_at::date, CURRENT_DATE),
        payment_method_mapped,
        'Venda ' || COALESCE(NEW.proposal_product, 'Produto') || ' - ' || NEW.full_name,
        NEW.company,
        NEW.assigned_closer_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on leads table for automatic sync
DROP TRIGGER IF EXISTS trigger_sync_sale_to_financial ON leads;
CREATE TRIGGER trigger_sync_sale_to_financial
  AFTER INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION sync_sale_to_financial();

-- Also create function to sync payment received updates
CREATE OR REPLACE FUNCTION public.sync_payment_received_to_financial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  sale_record RECORD;
  total_amount numeric;
  payment_method_mapped payment_method;
BEGIN
  -- Only trigger when sale_payment_received changes from false to true
  IF NEW.sale_payment_received = true AND (OLD.sale_payment_received IS NULL OR OLD.sale_payment_received = false) THEN
    -- Find the financial sale for this lead
    SELECT * INTO sale_record FROM financial_sales WHERE lead_id = NEW.id;
    
    IF sale_record.id IS NOT NULL THEN
      total_amount := COALESCE(NEW.sale_entry_value, 0) + COALESCE(NEW.sale_remaining_value, 0);
      
      -- Map payment method
      payment_method_mapped := CASE 
        WHEN NEW.sale_payment_method ILIKE '%pix%' THEN 'pix'::payment_method
        WHEN NEW.sale_payment_method ILIKE '%cartão%' OR NEW.sale_payment_method ILIKE '%cartao%' THEN 'credit_card'::payment_method
        WHEN NEW.sale_payment_method ILIKE '%cheque%' THEN 'check'::payment_method
        WHEN NEW.sale_payment_method ILIKE '%dinheiro%' THEN 'cash'::payment_method
        ELSE 'other'::payment_method
      END;
      
      -- Update received amount on sale
      UPDATE financial_sales 
      SET received_amount = total_amount
      WHERE id = sale_record.id;
      
      -- Mark all installments as received
      UPDATE financial_installments
      SET status = 'received', received_date = CURRENT_DATE
      WHERE sale_id = sale_record.id AND status = 'pending';
      
      -- Create cash entry if not exists
      IF NOT EXISTS (SELECT 1 FROM financial_cash_entries WHERE sale_id = sale_record.id) THEN
        INSERT INTO financial_cash_entries (
          sale_id,
          amount,
          entry_date,
          payment_method,
          description,
          company,
          created_by
        ) VALUES (
          sale_record.id,
          total_amount,
          CURRENT_DATE,
          payment_method_mapped,
          'Pagamento recebido - ' || NEW.full_name,
          NEW.company,
          NEW.assigned_closer_id
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for payment received sync
DROP TRIGGER IF EXISTS trigger_sync_payment_received ON leads;
CREATE TRIGGER trigger_sync_payment_received
  AFTER UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.sale_payment_received IS DISTINCT FROM NEW.sale_payment_received)
  EXECUTE FUNCTION sync_payment_received_to_financial();