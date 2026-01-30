-- Enum for payment methods
CREATE TYPE public.payment_method AS ENUM ('pix', 'credit_card', 'debit_card', 'check', 'cash', 'other');

-- Enum for installment status
CREATE TYPE public.installment_status AS ENUM ('pending', 'received', 'overdue');

-- Enum for check status
CREATE TYPE public.check_status AS ENUM ('pending', 'cleared', 'bounced');

-- Financial Sales table
CREATE TABLE public.financial_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  total_amount NUMERIC NOT NULL,
  received_amount NUMERIC DEFAULT 0,
  payment_method public.payment_method NOT NULL,
  installments_count INTEGER NOT NULL DEFAULT 1,
  company public.company NOT NULL DEFAULT 'escola_franchising',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Financial Installments table
CREATE TABLE public.financial_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.financial_sales(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  received_date DATE,
  status public.installment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Financial Checks table
CREATE TABLE public.financial_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  installment_id UUID REFERENCES public.financial_installments(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.financial_sales(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  bank TEXT NOT NULL,
  check_number TEXT NOT NULL,
  issuer TEXT NOT NULL,
  expected_clear_date DATE NOT NULL,
  actual_clear_date DATE,
  status public.check_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  company public.company NOT NULL DEFAULT 'escola_franchising',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cash Entries table (real money received)
CREATE TABLE public.financial_cash_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  installment_id UUID REFERENCES public.financial_installments(id) ON DELETE SET NULL,
  sale_id UUID REFERENCES public.financial_sales(id) ON DELETE SET NULL,
  check_id UUID REFERENCES public.financial_checks(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method public.payment_method NOT NULL,
  description TEXT,
  company public.company NOT NULL DEFAULT 'escola_franchising',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.financial_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_cash_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for financial_sales
CREATE POLICY "Users can view sales for their company" ON public.financial_sales
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'viewer'::app_role) OR
  has_role(auth.uid(), 'closer'::app_role) OR
  has_role(auth.uid(), 'sdr'::app_role)
);

CREATE POLICY "Admins and closers can insert sales" ON public.financial_sales
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'closer'::app_role)
);

CREATE POLICY "Admins can update sales" ON public.financial_sales
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sales" ON public.financial_sales
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for financial_installments
CREATE POLICY "Users can view installments" ON public.financial_installments
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'viewer'::app_role) OR
  has_role(auth.uid(), 'closer'::app_role) OR
  has_role(auth.uid(), 'sdr'::app_role)
);

CREATE POLICY "Admins and closers can insert installments" ON public.financial_installments
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'closer'::app_role)
);

CREATE POLICY "Admins can update installments" ON public.financial_installments
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete installments" ON public.financial_installments
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for financial_checks
CREATE POLICY "Users can view checks" ON public.financial_checks
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'viewer'::app_role) OR
  has_role(auth.uid(), 'closer'::app_role)
);

CREATE POLICY "Admins and closers can insert checks" ON public.financial_checks
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'closer'::app_role)
);

CREATE POLICY "Admins can update checks" ON public.financial_checks
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete checks" ON public.financial_checks
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for financial_cash_entries
CREATE POLICY "Users can view cash entries" ON public.financial_cash_entries
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'viewer'::app_role) OR
  has_role(auth.uid(), 'closer'::app_role)
);

CREATE POLICY "Admins and closers can insert cash entries" ON public.financial_cash_entries
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'closer'::app_role)
);

CREATE POLICY "Admins can update cash entries" ON public.financial_cash_entries
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cash entries" ON public.financial_cash_entries
FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_financial_sales_updated_at
BEFORE UPDATE ON public.financial_sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_installments_updated_at
BEFORE UPDATE ON public.financial_installments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_checks_updated_at
BEFORE UPDATE ON public.financial_checks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_financial_sales_company ON public.financial_sales(company);
CREATE INDEX idx_financial_sales_lead_id ON public.financial_sales(lead_id);
CREATE INDEX idx_financial_installments_sale_id ON public.financial_installments(sale_id);
CREATE INDEX idx_financial_installments_due_date ON public.financial_installments(due_date);
CREATE INDEX idx_financial_installments_status ON public.financial_installments(status);
CREATE INDEX idx_financial_checks_status ON public.financial_checks(status);
CREATE INDEX idx_financial_checks_expected_clear_date ON public.financial_checks(expected_clear_date);
CREATE INDEX idx_financial_cash_entries_entry_date ON public.financial_cash_entries(entry_date);
CREATE INDEX idx_financial_cash_entries_company ON public.financial_cash_entries(company);

-- Enable realtime for financial tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_installments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_cash_entries;