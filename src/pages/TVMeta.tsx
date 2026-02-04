import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/currency';
import { FEBRUARY_2026_GOALS, getRemainingWorkingDays, calculateDailyGoal } from '@/config/goals';

interface TVMetaData {
  meta_faturamento: number;
  meta_caixa: number;
  timestamp: string;
}

export default function TVMeta() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [data, setData] = useState<TVMetaData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) {
      setError('Token não fornecido');
      return;
    }

    try {
      const { data: responseData, error: funcError } = await supabase.functions.invoke('tv-dashboard-public', {
        body: { token, company: 'escola_franchising', includeGoals: true },
      });

      if (funcError) {
        console.error('Error fetching TV meta data:', funcError);
        setError('Erro ao carregar dados');
        return;
      }

      if (responseData.error) {
        setError(responseData.error);
        return;
      }

      setData(responseData);
      setLastUpdate(new Date());
      setAuthorized(true);
      setError(null);
    } catch (err) {
      console.error('Error:', err);
      setError('Erro de conexão');
    }
  }, [token]);

  // Fetch data on mount and every 30 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <p className="text-red-500 text-4xl">Token de acesso não fornecido</p>
        <p className="text-zinc-500 text-xl mt-4">Solicite o token de acesso ao administrador</p>
      </div>
    );
  }

  if (error && !authorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-red-500 text-4xl">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-[#c4ae6b] text-4xl animate-pulse">Carregando...</div>
      </div>
    );
  }

  const { cashGoal } = FEBRUARY_2026_GOALS;
  const remainingDays = getRemainingWorkingDays();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      {/* Header */}
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-[#c4ae6b] mb-2">Dashboard da Meta</h1>
        <p className="text-xl text-zinc-400 capitalize">{formatDate(currentTime)}</p>
        <p className="text-6xl font-bold text-[#c4ae6b] mt-4 tabular-nums">{formatTime(currentTime)}</p>
        <p className="text-sm text-zinc-600 mt-2">
          Atualização: {lastUpdate ? formatTime(lastUpdate) : '--:--'}
        </p>
      </header>

      {/* Goals */}
      <div className="w-full max-w-3xl space-y-8">
        <GoalProgressBar
          icon="💰"
          label="Faturamento"
          current={data.meta_faturamento}
          goal={cashGoal}
          remainingDays={remainingDays}
        />
        
        <GoalProgressBar
          icon="🏦"
          label="Caixa"
          current={data.meta_caixa}
          goal={cashGoal}
          remainingDays={remainingDays}
        />
      </div>
    </div>
  );
}

function GoalProgressBar({
  icon,
  label,
  current,
  goal,
  remainingDays,
}: {
  icon: string;
  label: string;
  current: number;
  goal: number;
  remainingDays: number;
}) {
  const percent = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  const remaining = Math.max(0, goal - current);
  const dailyGoal = calculateDailyGoal(goal, current, remainingDays);

  const getBarColor = () => {
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 70) return 'bg-[#c4ae6b]';
    if (percent >= 40) return 'bg-amber-600';
    return 'bg-red-600';
  };

  return (
    <div className="bg-zinc-900/80 rounded-2xl p-8 border-2 border-[#c4ae6b]/30">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <span className="text-2xl font-semibold text-zinc-300">{label}</span>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-[#c4ae6b]">{formatCurrency(current)}</p>
          <p className="text-lg text-zinc-500">Meta: {formatCurrency(goal)}</p>
        </div>
      </div>

      <div className="relative h-12 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
        <div 
          className={`absolute left-0 top-0 h-full transition-all duration-700 ${getBarColor()}`}
          style={{ width: `${percent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold drop-shadow-lg">{percent}%</span>
        </div>
      </div>

      <div className="flex justify-between mt-4 text-base text-zinc-500">
        <span>Meta diária: {formatCurrency(dailyGoal)} ({remainingDays} dias úteis)</span>
        <span className="text-[#c4ae6b]">Faltam: {formatCurrency(remaining)}</span>
      </div>
    </div>
  );
}
