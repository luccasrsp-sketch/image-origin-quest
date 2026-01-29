import { TrendingUp, Banknote } from 'lucide-react';

interface GoalProgressBarProps {
  currentValue: number;
  goalValue: number;
  moneyOnTable: number;
  label?: string;
}

export function GoalProgressBar({ 
  currentValue, 
  goalValue, 
  moneyOnTable,
  label = "Meta Mensal" 
}: GoalProgressBarProps) {
  const percentage = Math.min((currentValue / goalValue) * 100, 100);
  const remaining = goalValue - currentValue;
  const isGoalMet = currentValue >= goalValue;

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
    <div className="bg-card border-b px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-white">{label}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-400 font-semibold">
              {formatCurrency(currentValue)} ({percentage.toFixed(0)}%)
            </span>
            {!isGoalMet && (
              <span className="text-red-400">
                Faltam {formatCurrency(remaining)}
              </span>
            )}
            <span className="text-white">
              Meta: {formatCurrency(goalValue)}
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-5 w-full rounded-full overflow-hidden bg-red-500/80 shadow-inner">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
          {/* Percentage marker */}
          {percentage >= 15 && (
            <div 
              className="absolute inset-y-0 left-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md"
              style={{ width: `${percentage}%` }}
            >
              {percentage.toFixed(0)}%
            </div>
          )}
          {!isGoalMet && percentage < 85 && (
            <div 
              className="absolute inset-y-0 right-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-md"
              style={{ width: `${100 - percentage}%` }}
            >
              {(100 - percentage).toFixed(0)}%
            </div>
          )}
        </div>

        {/* Money on table */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
          <Banknote className="h-4 w-4 text-yellow-500" />
          <span className="text-sm text-muted-foreground">Dinheiro na Mesa:</span>
          <span className="text-sm font-bold text-yellow-500">
            {formatCurrency(moneyOnTable)}
          </span>
          <span className="text-xs text-muted-foreground">(propostas em aberto)</span>
        </div>
      </div>
    </div>
  );
}
