import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCompany } from '@/contexts/CompanyContext';

export function useFinancialRealtimeNotifications() {
  const { selectedCompany } = useCompany();
  const processedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase
      .channel('financial-sales-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'financial_sales',
        },
        (payload) => {
          const newSale = payload.new as {
            id: string;
            description: string;
            total_amount: number;
            company: string;
          };

          // Avoid duplicate notifications
          if (processedIdsRef.current.has(newSale.id)) {
            return;
          }
          processedIdsRef.current.add(newSale.id);

          // Only show notification for the selected company
          if (newSale.company !== selectedCompany) {
            return;
          }

          const formattedAmount = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(newSale.total_amount);

          toast.success('Nova venda sincronizada!', {
            description: `${newSale.description} - ${formattedAmount}`,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedCompany]);
}
