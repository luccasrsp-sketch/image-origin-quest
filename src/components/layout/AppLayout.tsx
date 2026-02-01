import { ReactNode, useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { GoalProgressBar } from './GoalProgressBar';
import { MobileHeader } from './MobileHeader';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { startOfDay, startOfMonth, endOfMonth, format } from 'date-fns';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [billingTotal, setBillingTotal] = useState(0);
  const [cashTotal, setCashTotal] = useState(0);
  const [moneyOnTable, setMoneyOnTable] = useState(0);
  const [dailyBilling, setDailyBilling] = useState(0);
  const [dailyCash, setDailyCash] = useState(0);
  const { selectedCompany } = useCompany();

  useEffect(() => {
    fetchSalesData();
    fetchCashData();

    // Subscribe to realtime changes on leads and financial tables
    const leadsChannel = supabase
      .channel('goal_progress_leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => fetchSalesData()
      )
      .subscribe();

    const cashChannel = supabase
      .channel('goal_progress_cash')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'financial_cash_entries' },
        () => fetchCashData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(cashChannel);
    };
  }, [selectedCompany]);

  const fetchSalesData = async () => {
    // Use the security definer function with company filter
    const { data, error } = await supabase.rpc('get_team_sales_totals_by_company', {
      target_company: selectedCompany
    });

    if (!error && data && data.length > 0) {
      setBillingTotal(Number(data[0].sales_total) || 0);
      setMoneyOnTable(Number(data[0].money_on_table) || 0);
      setDailyBilling(Number(data[0].daily_sales) || 0);
    }
  };

  const fetchCashData = async () => {
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    // Fetch total cash received this month
    const { data: monthlyData, error: monthlyError } = await supabase
      .from('financial_cash_entries')
      .select('amount')
      .eq('company', selectedCompany)
      .gte('entry_date', format(monthStart, 'yyyy-MM-dd'))
      .lte('entry_date', format(monthEnd, 'yyyy-MM-dd'));

    if (!monthlyError && monthlyData) {
      const total = monthlyData.reduce((sum, entry) => sum + Number(entry.amount), 0);
      setCashTotal(total);
    }

    // Fetch cash received today
    const { data: dailyData, error: dailyError } = await supabase
      .from('financial_cash_entries')
      .select('amount')
      .eq('company', selectedCompany)
      .eq('entry_date', format(today, 'yyyy-MM-dd'));

    if (!dailyError && dailyData) {
      const total = dailyData.reduce((sum, entry) => sum + Number(entry.amount), 0);
      setDailyCash(total);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <MobileHeader />
          <GoalProgressBar
            currentBilling={billingTotal}
            currentCash={cashTotal}
            moneyOnTable={moneyOnTable}
            dailyBilling={dailyBilling}
            dailyCash={dailyCash}
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
