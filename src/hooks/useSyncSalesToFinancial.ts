import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { PaymentMethod } from '@/types/financial';

interface SyncResult {
  synced: number;
  skipped: number;
  errors: string[];
}

export function useSyncSalesToFinancial() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  const syncSales = async (): Promise<SyncResult> => {
    setIsSyncing(true);
    const result: SyncResult = { synced: 0, skipped: 0, errors: [] };

    try {
      // 1. Get all sold leads that DON'T have a financial_sale record
      const { data: soldLeads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'vendido')
        .not('sale_confirmed_at', 'is', null);

      if (leadsError) {
        throw new Error(`Erro ao buscar leads vendidos: ${leadsError.message}`);
      }

      if (!soldLeads || soldLeads.length === 0) {
        toast({
          title: 'Nenhuma venda para sincronizar',
          description: 'Não há leads vendidos pendentes de sincronização.',
        });
        setIsSyncing(false);
        setSyncResult(result);
        return result;
      }

      // 2. Get existing financial_sales lead_ids to avoid duplicates
      const { data: existingSales } = await supabase
        .from('financial_sales')
        .select('lead_id')
        .not('lead_id', 'is', null);

      const existingLeadIds = new Set((existingSales || []).map(s => s.lead_id));

      // 3. Filter leads that don't have financial records yet
      const leadsToSync = soldLeads.filter(lead => !existingLeadIds.has(lead.id));

      if (leadsToSync.length === 0) {
        result.skipped = soldLeads.length;
        toast({
          title: 'Vendas já sincronizadas',
          description: 'Todas as vendas já possuem registros financeiros.',
        });
        setIsSyncing(false);
        setSyncResult(result);
        return result;
      }

      // 4. Process each lead
      for (const lead of leadsToSync) {
        try {
          // Calculate total amount
          const entryValue = lead.sale_entry_value || 0;
          const remainingValue = lead.sale_remaining_value || 0;
          const totalAmount = entryValue + remainingValue;

          // Skip if no value
          if (totalAmount <= 0) {
            result.skipped++;
            continue;
          }

          // Map payment method
          const paymentMethodMap: Record<string, PaymentMethod> = {
            'Cartão': 'credit_card',
            'Pix': 'pix',
            'pix': 'pix',
            'credit_card': 'credit_card',
            'Entrada pix + cartão': 'credit_card',
            'Entrada cartão + cheque': 'check',
            'Entrada pix + cheque': 'check',
            'cheque': 'check',
            'Cheque': 'check',
          };
          const paymentMethod: PaymentMethod = paymentMethodMap[lead.sale_payment_method || ''] || 'other';

          // Create financial sale
          const { data: financialSale, error: saleError } = await supabase
            .from('financial_sales')
            .insert({
              lead_id: lead.id,
              description: `Venda ${lead.proposal_product || 'Produto'} - ${lead.company_name}`,
              total_amount: totalAmount,
              received_amount: lead.sale_payment_received ? totalAmount : 0,
              payment_method: paymentMethod,
              installments_count: lead.sale_installments || 1,
              company: lead.company,
              created_by: profile?.id || null,
              created_at: lead.sale_confirmed_at || lead.created_at,
            })
            .select()
            .single();

          if (saleError) {
            result.errors.push(`Lead ${lead.full_name}: ${saleError.message}`);
            continue;
          }

          // Generate installments
          const installmentsCount = lead.sale_installments || 1;
          const installmentAmount = totalAmount / installmentsCount;
          const firstDueDate = lead.sale_first_check_date 
            ? new Date(lead.sale_first_check_date)
            : new Date(lead.sale_confirmed_at || lead.created_at);

          const installmentsToCreate = Array.from({ length: installmentsCount }, (_, i) => {
            const dueDate = new Date(firstDueDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            
            return {
              sale_id: financialSale.id,
              installment_number: i + 1,
              amount: installmentAmount,
              due_date: dueDate.toISOString().split('T')[0],
              status: lead.sale_payment_received ? 'received' as const : 'pending' as const,
              received_date: lead.sale_payment_received 
                ? new Date(lead.sale_confirmed_at || new Date()).toISOString().split('T')[0] 
                : null,
            };
          });

          const { error: installmentsError } = await supabase
            .from('financial_installments')
            .insert(installmentsToCreate);

          if (installmentsError) {
            result.errors.push(`Parcelas ${lead.full_name}: ${installmentsError.message}`);
          }

          // If payment received, create cash entry
          if (lead.sale_payment_received && totalAmount > 0) {
            await supabase
              .from('financial_cash_entries')
              .insert({
                sale_id: financialSale.id,
                amount: totalAmount,
                entry_date: new Date(lead.sale_confirmed_at || new Date()).toISOString().split('T')[0],
                payment_method: paymentMethod,
                description: `Venda ${lead.proposal_product || 'Produto'} - ${lead.full_name}`,
                company: lead.company,
                created_by: profile?.id || null,
              });
          }

          result.synced++;
        } catch (err) {
          result.errors.push(`Lead ${lead.full_name}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        }
      }

      result.skipped = soldLeads.length - leadsToSync.length;

      toast({
        title: 'Sincronização concluída',
        description: `${result.synced} venda(s) sincronizada(s), ${result.skipped} já existente(s).`,
        variant: result.errors.length > 0 ? 'destructive' : 'default',
      });

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Erro desconhecido');
      toast({
        title: 'Erro na sincronização',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }

    setIsSyncing(false);
    setSyncResult(result);
    return result;
  };

  return {
    syncSales,
    isSyncing,
    syncResult,
  };
}
