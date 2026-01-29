import { TrendingUp, Banknote, Calendar, CalendarDays, CalendarRange } from 'lucide-react';

interface GoalProgressBarProps {
  currentValue: number;
  goalValue: number;
  moneyOnTable: number;
  label?: string;
}

function MiniProgressBar({ 
  current, 
  goal, 
  label, 
  icon: Icon 
}: { 
  current: number; 
  goal: number; 
  label: string; 
  icon: React.ElementType;
}) {
  const percentage = Math.min((current / goal) * 100, 100);
  const isGoalMet = current >= goal;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(2).replace('.', ',')}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-white truncate">{label}</span>
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
  );
}

export function GoalProgressBar({ 
  currentValue, 
  goalValue, 
  moneyOnTable,
}: GoalProgressBarProps) {
  // Calculate goals based on monthly
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const weeksInMonth = Math.ceil(daysInMonth / 7);
  
  const dailyGoal = goalValue / daysInMonth;
  const weeklyGoal = goalValue / weeksInMonth;
  
  // Calculate current day and week of month for proportional target
  const currentDay = now.getDate();
  const currentWeek = Math.ceil(currentDay / 7);
  
  // Expected values based on time elapsed
  const expectedDaily = dailyGoal; // Today's target
  const expectedWeekly = weeklyGoal; // This week's target
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(2).replace('.', ',')}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="bg-card border-b px-3 md:px-4 py-2 md:py-3">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Three progress bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
          <MiniProgressBar 
            current={currentValue / daysInMonth * Math.min(currentDay, 1)} 
            goal={dailyGoal}
            label="Meta Diária"
            icon={Calendar}
          />
          <MiniProgressBar 
            current={currentValue / weeksInMonth * Math.min(currentWeek, 1)} 
            goal={weeklyGoal}
            label="Meta Semanal"
            icon={CalendarDays}
          />
          <MiniProgressBar 
            current={currentValue} 
            goal={goalValue}
            label="Meta Mensal"
            icon={CalendarRange}
          />
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
