import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { startOfDay, startOfMonth, endOfMonth, format } from 'date-fns';
import { Banknote, Calendar, CalendarDays, CalendarRange, Wallet, TrendingUp, Menu } from 'lucide-react';
import { getCurrentMonthGoals, getRemainingWorkingDays, calculateDailyGoal } from '@/config/goals';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function MiniProgressBar({ 
  current, 
  goal, 
  label, 
  icon: Icon,
  showRemaining = false,
  isDynamic = false,
}: { 
  current: number; 
  goal: number; 
  label: string; 
  icon: React.ElementType;
  showRemaining?: boolean;
  isDynamic?: boolean;
}) {
  const percentage = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const isGoalMet = current >= goal;
  const remaining = Math.max(0, goal - current);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(2).replace('.', ',')}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}K`;
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex-1 min-w-0 cursor-help">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <span className="text-base font-medium text-white">{label}</span>
                {isDynamic && (
                  <TrendingUp className="h-4 w-4 text-yellow-400 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-3 text-base">
                <span className={isGoalMet ? "text-green-400 font-semibold" : "text-white"}>
                  {formatCurrency(current)}
                </span>
                <span className="text-muted-foreground">
                  / {formatCurrency(goal)}
                </span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="relative h-6 w-full rounded-full overflow-hidden bg-red-500/80 shadow-inner">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
              {/* Percentage marker */}
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow-md">
                {percentage.toFixed(0)}%
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-sm">
            <p><strong>Meta:</strong> {formatCurrency(goal)}</p>
            <p><strong>Atual:</strong> {formatCurrency(current)}</p>
            {showRemaining && !isGoalMet && (
              <p className="text-yellow-400"><strong>Falta:</strong> {formatCurrency(remaining)}</p>
            )}
            {isDynamic && (
              <p className="text-muted-foreground italic">
                Meta recalculada dinamicamente
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function DashboardMeta() {
  const navigate = useNavigate();
  const [billingTotal, setBillingTotal] = useState(0);
  const [cashTotal, setCashTotal] = useState(0);
  const [moneyOnTable, setMoneyOnTable] = useState(0);
  const [dailyBilling, setDailyBilling] = useState(0);
  const [dailyCash, setDailyCash] = useState(0);
  const { selectedCompany } = useCompany();

  const goals = getCurrentMonthGoals();
  const remainingDays = getRemainingWorkingDays();
  
  const dynamicDailyBillingGoal = calculateDailyGoal(goals.billingGoal, billingTotal, remainingDays);
  const dynamicDailyCashGoal = calculateDailyGoal(goals.cashGoal, cashTotal, remainingDays);

  useEffect(() => {
    fetchSalesData();
    fetchCashData();

    const leadsChannel = supabase
      .channel('dashboard_meta_leads')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => fetchSalesData()
      )
      .subscribe();

    const cashChannel = supabase
      .channel('dashboard_meta_cash')
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

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(2).replace('.', ',')}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}K`;
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Menu button */}
      <div className="absolute top-4 left-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="border-primary/50 hover:bg-primary/10">
              <Menu className="h-5 w-5 text-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => navigate('/dashboard')}>
              Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/kanban')}>
              CRM
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/agenda')}>
              Agenda
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/leads')}>
              Leads
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/financeiro')}>
              Financeiro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/relatorios')}>
              Relatórios
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
              Configurações
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full max-w-4xl bg-card border rounded-xl p-6 md:p-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between text-sm md:text-base">
          <span className="text-muted-foreground font-medium text-lg">{goals.label}</span>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <span className="text-white font-medium">{remainingDays} dias úteis restantes</span>
          </div>
        </div>

        {/* Billing section (Faturamento) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            <span className="font-medium text-base">Faturamento (Contratos Fechados)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <MiniProgressBar 
              current={dailyBilling} 
              goal={dynamicDailyBillingGoal}
              label="Meta Diária"
              icon={Calendar}
              isDynamic={true}
              showRemaining={true}
            />
            <MiniProgressBar 
              current={billingTotal} 
              goal={goals.billingGoal}
              label="Meta Mensal"
              icon={CalendarRange}
              showRemaining={true}
            />
          </div>
        </div>

        {/* Cash section (Dinheiro em Caixa) */}
        <div className="space-y-4 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-5 w-5 text-green-400" />
            <span className="font-medium text-base">Dinheiro em Caixa (Recebido)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
            <MiniProgressBar 
              current={dailyCash} 
              goal={dynamicDailyCashGoal}
              label="Meta Diária"
              icon={Calendar}
              isDynamic={true}
              showRemaining={true}
            />
            <MiniProgressBar 
              current={cashTotal} 
              goal={goals.cashGoal}
              label="Meta Mensal"
              icon={CalendarRange}
              showRemaining={true}
            />
          </div>
        </div>

        {/* Money on table */}
        <div className="flex items-center justify-center gap-3 pt-4 border-t border-border/50">
          <Banknote className="h-6 w-6 text-yellow-500 shrink-0" />
          <span className="text-base text-muted-foreground">Dinheiro na Mesa:</span>
          <span className="text-lg font-bold text-yellow-500">
            {formatCurrency(moneyOnTable)}
          </span>
          <span className="text-sm text-muted-foreground">(propostas em aberto)</span>
        </div>
      </div>
    </div>
  );
}
