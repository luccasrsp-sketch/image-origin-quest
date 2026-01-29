import { ReactNode, useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { GoalProgressBar } from './GoalProgressBar';
import { supabase } from '@/integrations/supabase/client';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

// Meta de janeiro: R$ 2.000.000
const MONTHLY_GOAL = 2000000;

export function AppLayout({ children, title }: AppLayoutProps) {
  const [salesTotal, setSalesTotal] = useState(0);
  const [moneyOnTable, setMoneyOnTable] = useState(0);

  useEffect(() => {
    fetchSalesData();

    // Subscribe to realtime changes on leads
    const channel = supabase
      .channel('goal_progress')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => fetchSalesData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSalesData = async () => {
    // Get current month date range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Total de vendas do mês (soma de entry_value + remaining_value)
    const { data: salesData } = await supabase
      .from('leads')
      .select('sale_entry_value, sale_remaining_value')
      .eq('status', 'vendido')
      .gte('sale_confirmed_at', startOfMonth.toISOString())
      .lte('sale_confirmed_at', endOfMonth.toISOString());

    const total = salesData?.reduce((sum, lead) => {
      return sum + (lead.sale_entry_value || 0) + (lead.sale_remaining_value || 0);
    }, 0) || 0;

    setSalesTotal(total);

    // Dinheiro na mesa: soma de todas as propostas em aberto
    const { data: proposalsData } = await supabase
      .from('leads')
      .select('proposal_value')
      .eq('status', 'envio_proposta');

    const proposalsTotal = proposalsData?.reduce((sum, lead) => {
      return sum + (lead.proposal_value || 0);
    }, 0) || 0;

    setMoneyOnTable(proposalsTotal);
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <GoalProgressBar 
            currentValue={salesTotal} 
            goalValue={MONTHLY_GOAL} 
            moneyOnTable={moneyOnTable}
            label="Meta Janeiro"
          />
          <AppHeader title={title} />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}