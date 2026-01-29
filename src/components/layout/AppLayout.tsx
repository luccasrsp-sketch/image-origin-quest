import { ReactNode, useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { GoalProgressBar } from './GoalProgressBar';
import { MobileHeader } from './MobileHeader';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

// Meta de janeiro: R$ 2.000.000
const MONTHLY_GOAL = 2000000;

export function AppLayout({ children, title }: AppLayoutProps) {
  const [salesTotal, setSalesTotal] = useState(0);
  const [moneyOnTable, setMoneyOnTable] = useState(0);
  const [dailySales, setDailySales] = useState(0);
  const [weeklySales, setWeeklySales] = useState(0);
  const { selectedCompany } = useCompany();

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
  }, [selectedCompany]); // Refetch when company changes

  const fetchSalesData = async () => {
    // Use the security definer function with company filter
    const { data, error } = await supabase.rpc('get_team_sales_totals_by_company', {
      target_company: selectedCompany
    });

    if (!error && data && data.length > 0) {
      setSalesTotal(Number(data[0].sales_total) || 0);
      setMoneyOnTable(Number(data[0].money_on_table) || 0);
      setDailySales(Number(data[0].daily_sales) || 0);
      setWeeklySales(Number(data[0].weekly_sales) || 0);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <MobileHeader />
          <GoalProgressBar
            currentValue={salesTotal} 
            goalValue={MONTHLY_GOAL} 
            moneyOnTable={moneyOnTable}
            dailySales={dailySales}
            weeklySales={weeklySales}
            label="Meta Janeiro"
          />
          <AppHeader title={title} />
          <main className="flex-1 overflow-auto p-3 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}