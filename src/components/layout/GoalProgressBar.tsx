import { TrendingUp } from 'lucide-react';

interface GoalProgressBarProps {
  currentValue: number;
  goalValue: number;
  label?: string;
}

export function GoalProgressBar({ 
  currentValue, 
  goalValue, 
  label = "Meta Mensal" 
}: GoalProgressBarProps) {
  const percentage = Math.min((currentValue / goalValue) * 100, 100);
  const remaining = goalValue - currentValue;
  const isGoalMet = currentValue >= goalValue;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
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
            <span className="text-sm font-medium">{label}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-500 font-semibold">
              {formatCurrency(currentValue)} ({percentage.toFixed(0)}%)
            </span>
            {!isGoalMet && (
              <span className="text-red-500">
                Faltam {formatCurrency(remaining)}
              </span>
            )}
            <span className="text-muted-foreground">
              Meta: {formatCurrency(goalValue)}
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="relative h-4 w-full rounded-full overflow-hidden bg-red-500/80">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
          {/* Percentage marker */}
          <div 
            className="absolute inset-y-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md"
            style={{ 
              left: `${Math.max(percentage / 2, 5)}%`,
              transform: 'translateX(-50%)'
            }}
          >
            {percentage >= 10 && `${percentage.toFixed(0)}%`}
          </div>
          {!isGoalMet && percentage < 90 && (
            <div 
              className="absolute inset-y-0 right-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md pr-2"
            >
              {(100 - percentage).toFixed(0)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
