import { Banknote, Calendar, CalendarDays, CalendarRange, Wallet, TrendingUp, AlertCircle } from 'lucide-react';
import { getCurrentMonthGoals, getRemainingWorkingDays, calculateDailyGoal } from '@/config/goals';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GoalProgressBarProps {
  currentBilling: number;    // Faturamento atual (contratos fechados)
  currentCash: number;       // Dinheiro em caixa (recebido)
  moneyOnTable: number;      // Propostas em aberto
  dailyBilling?: number;     // Faturamento do dia
  dailyCash?: number;        // Recebimento do dia
}

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
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium text-white truncate">{label}</span>
                {isDynamic && (
                  <TrendingUp className="h-3 w-3 text-yellow-400 shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={isGoalMet ? "text-green-400 font-semibold" : "text-white"}>
                  {formatCurrency(current)}
                </span>
                <span className="text-muted-foreground hidden sm:inline">
                  / {formatCurrency(goal)}
                </span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="relative h-3 w-full rounded-full overflow-hidden bg-red-500/80 shadow-inner">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
              {/* Percentage marker */}
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-md">
                {percentage.toFixed(0)}%
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1 text-xs">
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

export function GoalProgressBar({ 
  currentBilling, 
  currentCash,
  moneyOnTable,
  dailyBilling = 0,
  dailyCash = 0,
}: GoalProgressBarProps) {
  const goals = getCurrentMonthGoals();
  const remainingDays = getRemainingWorkingDays();
  
  // Dynamic daily goals - redistribute remaining across remaining days
  const dynamicDailyBillingGoal = calculateDailyGoal(goals.billingGoal, currentBilling, remainingDays);
  const dynamicDailyCashGoal = calculateDailyGoal(goals.cashGoal, currentCash, remainingDays);
  
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
    <div className="bg-card border-b px-3 md:px-4 py-2 md:py-3">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header with remaining days */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">{goals.label}</span>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span className="text-white font-medium">{remainingDays} dias úteis restantes</span>
          </div>
        </div>

        {/* Billing section (Faturamento) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-medium">Faturamento (Contratos Fechados)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            <MiniProgressBar 
              current={dailyBilling} 
              goal={dynamicDailyBillingGoal}
              label="Meta Diária"
              icon={Calendar}
              isDynamic={true}
              showRemaining={true}
            />
            <MiniProgressBar 
              current={currentBilling} 
              goal={goals.billingGoal}
              label="Meta Mensal"
              icon={CalendarRange}
              showRemaining={true}
            />
          </div>
        </div>

        {/* Cash section (Dinheiro em Caixa) */}
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 text-green-400" />
            <span className="font-medium">Dinheiro em Caixa (Recebido)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
            <MiniProgressBar 
              current={dailyCash} 
              goal={dynamicDailyCashGoal}
              label="Meta Diária"
              icon={Calendar}
              isDynamic={true}
              showRemaining={true}
            />
            <MiniProgressBar 
              current={currentCash} 
              goal={goals.cashGoal}
              label="Meta Mensal"
              icon={CalendarRange}
              showRemaining={true}
            />
          </div>
        </div>

        {/* Money on table */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Banknote className="h-4 w-4 text-yellow-500 shrink-0" />
          <span className="text-xs md:text-sm text-muted-foreground">Dinheiro na Mesa:</span>
          <span className="text-xs md:text-sm font-bold text-yellow-500">
            {formatCurrency(moneyOnTable)}
          </span>
          <span className="hidden sm:inline text-xs text-muted-foreground">(propostas em aberto)</span>
        </div>
      </div>
    </div>
  );
}
