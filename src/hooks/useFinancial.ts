import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  FinancialSale, 
  FinancialInstallment, 
  FinancialCheck, 
  FinancialCashEntry,
  PaymentMethod 
} from '@/types/financial';
import { addMonths, format } from 'date-fns';

export function useFinancial() {
  const { selectedCompany } = useCompany();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [sales, setSales] = useState<FinancialSale[]>([]);
  const [installments, setInstallments] = useState<FinancialInstallment[]>([]);
  const [checks, setChecks] = useState<FinancialCheck[]>([]);
  const [cashEntries, setCashEntries] = useState<FinancialCashEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSales = useCallback(async () => {
    const { data, error } = await supabase
      .from('financial_sales')
      .select(`
        *,
        lead:leads(full_name, company_name)
      `)
      .eq('company', selectedCompany)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching sales:', error);
      return;
    }
    
    setSales((data || []) as unknown as FinancialSale[]);
  }, [selectedCompany]);

  const fetchInstallments = useCallback(async () => {
    // First fetch sales IDs for the selected company
    const { data: salesData } = await supabase
      .from('financial_sales')
      .select('id')
      .eq('company', selectedCompany);
    
    const saleIds = (salesData || []).map(s => s.id);
    
    if (saleIds.length === 0) {
      setInstallments([]);
      return;
    }
    
    const { data, error } = await supabase
      .from('financial_installments')
      .select('*')
      .in('sale_id', saleIds)
      .order('due_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching installments:', error);
      return;
    }
    
    setInstallments((data || []) as unknown as FinancialInstallment[]);
  }, [selectedCompany]);

  const fetchChecks = useCallback(async () => {
    const { data, error } = await supabase
      .from('financial_checks')
      .select('*')
      .eq('company', selectedCompany)
      .order('expected_clear_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching checks:', error);
      return;
    }
    
    setChecks((data || []) as unknown as FinancialCheck[]);
  }, [selectedCompany]);

  const fetchCashEntries = useCallback(async () => {
    const { data, error } = await supabase
      .from('financial_cash_entries')
      .select('*')
      .eq('company', selectedCompany)
      .order('entry_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching cash entries:', error);
      return;
    }
    
    setCashEntries((data || []) as unknown as FinancialCashEntry[]);
  }, [selectedCompany]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchSales(),
      fetchInstallments(),
      fetchChecks(),
      fetchCashEntries(),
    ]);
    setLoading(false);
  }, [fetchSales, fetchInstallments, fetchChecks, fetchCashEntries]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Create a new sale with installments
  const createSale = async (data: {
    description: string;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    installmentsCount: number;
    leadId?: string;
    firstDueDate?: Date;
  }): Promise<FinancialSale | null> => {
    try {
      // Create the sale
      const { data: sale, error: saleError } = await supabase
        .from('financial_sales')
        .insert({
          description: data.description,
          total_amount: data.totalAmount,
          payment_method: data.paymentMethod,
          installments_count: data.installmentsCount,
          lead_id: data.leadId || null,
          company: selectedCompany,
          created_by: profile?.id || null,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Generate installments
      const installmentAmount = data.totalAmount / data.installmentsCount;
      const firstDueDate = data.firstDueDate || new Date();
      
      const installmentsToCreate = Array.from({ length: data.installmentsCount }, (_, i) => ({
        sale_id: sale.id,
        installment_number: i + 1,
        amount: installmentAmount,
        due_date: format(addMonths(firstDueDate, i), 'yyyy-MM-dd'),
        status: 'pending' as const,
      }));

      const { error: installmentsError } = await supabase
        .from('financial_installments')
        .insert(installmentsToCreate);

      if (installmentsError) throw installmentsError;

      toast({
        title: 'Venda registrada',
        description: `${data.installmentsCount} parcela(s) gerada(s) com sucesso.`,
      });

      await fetchAll();
      return sale as unknown as FinancialSale;
    } catch (error) {
      console.error('Error creating sale:', error);
      toast({
        title: 'Erro ao registrar venda',
        description: 'Ocorreu um erro ao salvar a venda.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Create a check
  const createCheck = async (data: {
    amount: number;
    bank: string;
    checkNumber: string;
    issuer: string;
    expectedClearDate: Date;
    saleId?: string;
    installmentId?: string;
    notes?: string;
  }): Promise<FinancialCheck | null> => {
    try {
      const { data: check, error } = await supabase
        .from('financial_checks')
        .insert({
          amount: data.amount,
          bank: data.bank,
          check_number: data.checkNumber,
          issuer: data.issuer,
          expected_clear_date: format(data.expectedClearDate, 'yyyy-MM-dd'),
          sale_id: data.saleId || null,
          installment_id: data.installmentId || null,
          notes: data.notes || null,
          company: selectedCompany,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Cheque registrado',
        description: 'O cheque foi cadastrado com sucesso.',
      });

      await fetchChecks();
      return check as unknown as FinancialCheck;
    } catch (error) {
      console.error('Error creating check:', error);
      toast({
        title: 'Erro ao registrar cheque',
        description: 'Ocorreu um erro ao salvar o cheque.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update check status
  const updateCheckStatus = async (
    checkId: string, 
    status: 'pending' | 'cleared' | 'bounced'
  ): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'cleared') {
        updateData.actual_clear_date = format(new Date(), 'yyyy-MM-dd');
      }

      const { error } = await supabase
        .from('financial_checks')
        .update(updateData)
        .eq('id', checkId);

      if (error) throw error;

      // If cleared, create a cash entry
      if (status === 'cleared') {
        const check = checks.find(c => c.id === checkId);
        if (check) {
          await supabase
            .from('financial_cash_entries')
            .insert({
              check_id: checkId,
              sale_id: check.sale_id,
              installment_id: check.installment_id,
              amount: check.amount,
              entry_date: format(new Date(), 'yyyy-MM-dd'),
              payment_method: 'check' as const,
              description: `Cheque ${check.check_number} compensado`,
              company: selectedCompany,
              created_by: profile?.id || null,
            });
        }
      }

      toast({
        title: 'Status atualizado',
        description: `Cheque marcado como ${status === 'cleared' ? 'compensado' : status === 'bounced' ? 'devolvido' : 'pendente'}.`,
      });

      await fetchAll();
      return true;
    } catch (error) {
      console.error('Error updating check:', error);
      toast({
        title: 'Erro ao atualizar cheque',
        description: 'Ocorreu um erro ao atualizar o status.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Mark installment as received
  const markInstallmentReceived = async (
    installmentId: string,
    paymentMethod?: PaymentMethod
  ): Promise<boolean> => {
    try {
      const installment = installments.find(i => i.id === installmentId);
      if (!installment) return false;

      const { error: updateError } = await supabase
        .from('financial_installments')
        .update({
          status: 'received',
          received_date: format(new Date(), 'yyyy-MM-dd'),
        })
        .eq('id', installmentId);

      if (updateError) throw updateError;

      // Create cash entry
      await supabase
        .from('financial_cash_entries')
        .insert({
          installment_id: installmentId,
          sale_id: installment.sale_id,
          amount: installment.amount,
          entry_date: format(new Date(), 'yyyy-MM-dd'),
          payment_method: paymentMethod || 'other',
          description: `Parcela ${installment.installment_number} recebida`,
          company: selectedCompany,
          created_by: profile?.id || null,
        });

      // Update sale received_amount
      const sale = sales.find(s => s.id === installment.sale_id);
      if (sale) {
        await supabase
          .from('financial_sales')
          .update({
            received_amount: sale.received_amount + installment.amount,
          })
          .eq('id', sale.id);
      }

      toast({
        title: 'Parcela recebida',
        description: 'O pagamento foi registrado com sucesso.',
      });

      await fetchAll();
      return true;
    } catch (error) {
      console.error('Error marking installment received:', error);
      toast({
        title: 'Erro ao registrar pagamento',
        description: 'Ocorreu um erro ao processar o recebimento.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    sales,
    installments,
    checks,
    cashEntries,
    loading,
    createSale,
    createCheck,
    updateCheckStatus,
    markInstallmentReceived,
    refetch: fetchAll,
  };
}
