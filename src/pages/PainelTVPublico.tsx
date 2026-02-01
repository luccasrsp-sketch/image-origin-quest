import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/currency';

interface TVDashboardData {
  vendas: {
    dia: { valor_realizado: number; meta: number; quantidade: number };
    semana: { valor_realizado: number; meta: number; quantidade: number };
    mes: { valor_realizado: number; meta: number; quantidade: number };
  };
  funil_diario: {
    recebidos: number;
    atendidos: number;
    reunioes_marcadas: number;
    reunioes_realizadas: number;
    negociacao_andamento: number;
    vendas: number;
  };
  metas_diarias: {
    leads_received: number;
    leads_attended: number;
    meetings_marked: number;
    meetings_done: number;
    negotiations: number;
    sales: number;
  };
  taxas_conversao: {
    atendidos_recebidos: number;
    reunioes_atendidos: number;
    realizadas_marcadas: number;
    negociacao_realizadas: number;
    vendas_negociacao: number;
  };
  timestamp: string;
}

export default function PainelTVPublico() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const company = searchParams.get('company') || 'escola_franchising';
  
  const [data, setData] = useState<TVDashboardData | null>(null);
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
        body: { token, company },
      });

      if (funcError) {
        console.error('Error fetching TV dashboard:', funcError);
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
  }, [token, company]);

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
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-red-400 text-4xl">Token de acesso não fornecido</p>
      </div>
    );
  }

  if (error && !authorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-red-400 text-4xl">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-4xl animate-pulse">Carregando...</div>
      </div>
    );
  }

  const funnelItems = [
    { label: 'Leads Recebidos', value: data.funil_diario.recebidos, goal: data.metas_diarias.leads_received, rate: null },
    { label: 'Leads Atendidos', value: data.funil_diario.atendidos, goal: data.metas_diarias.leads_attended, rate: data.taxas_conversao.atendidos_recebidos },
    { label: 'Reuniões Marcadas', value: data.funil_diario.reunioes_marcadas, goal: data.metas_diarias.meetings_marked, rate: data.taxas_conversao.reunioes_atendidos },
    { label: 'Reuniões Realizadas', value: data.funil_diario.reunioes_realizadas, goal: data.metas_diarias.meetings_done, rate: data.taxas_conversao.realizadas_marcadas },
    { label: 'Em Negociação', value: data.funil_diario.negociacao_andamento, goal: data.metas_diarias.negotiations, rate: data.taxas_conversao.negociacao_realizadas },
    { label: 'Vendas Realizadas', value: data.funil_diario.vendas, goal: data.metas_diarias.sales, rate: data.taxas_conversao.vendas_negociacao },
  ];

  const companyName = company === 'escola_franchising' ? 'Escola de Franchising' : 'Evidia';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">{companyName}</h1>
          <p className="text-2xl text-slate-400 mt-2 capitalize">{formatDate(currentTime)}</p>
        </div>
        <div className="text-right">
          <p className="text-7xl font-bold tabular-nums">{formatTime(currentTime)}</p>
          <p className="text-lg text-slate-400 mt-1">
            Última atualização: {lastUpdate ? formatTime(lastUpdate) : '--:--'}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-8 h-[calc(100vh-200px)]">
        {/* Block 1: Sales Progress */}
        <div className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700">
          <h2 className="text-3xl font-semibold mb-8 text-blue-400">📈 Vendas</h2>
          
          <div className="space-y-8">
            <SalesProgressBar
              label="Meta Diária"
              value={data.vendas.dia.valor_realizado}
              goal={data.vendas.dia.meta}
              quantity={data.vendas.dia.quantidade}
            />

            <SalesProgressBar
              label="Meta Semanal"
              value={data.vendas.semana.valor_realizado}
              goal={data.vendas.semana.meta}
              quantity={data.vendas.semana.quantidade}
            />

            <SalesProgressBar
              label="Meta Mensal"
              value={data.vendas.mes.valor_realizado}
              goal={data.vendas.mes.meta}
              quantity={data.vendas.mes.quantidade}
            />
          </div>
        </div>

        {/* Block 2: Daily Funnel */}
        <div className="bg-slate-800/50 rounded-3xl p-8 border border-slate-700">
          <h2 className="text-3xl font-semibold mb-6 text-emerald-400">🎯 Funil Comercial (Hoje)</h2>
          
          <div className="grid grid-cols-2 gap-4">
            {funnelItems.map((item, index) => (
              <FunnelCard
                key={item.label}
                label={item.label}
                value={item.value}
                goal={item.goal}
                rate={item.rate}
                isLast={index === funnelItems.length - 1}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SalesProgressBar({ 
  label, 
  value, 
  goal, 
  quantity 
}: { 
  label: string; 
  value: number; 
  goal: number; 
  quantity: number;
}) {
  const percent = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  
  const getBarColor = () => {
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 70) return 'bg-yellow-500';
    if (percent >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex justify-between items-baseline mb-3">
        <span className="text-2xl font-medium text-slate-300">{label}</span>
        <div className="text-right">
          <span className="text-4xl font-bold">{formatCurrency(value)}</span>
          {goal > 0 && (
            <span className="text-xl text-slate-400 ml-3">
              / {formatCurrency(goal)}
            </span>
          )}
        </div>
      </div>
      
      <div className="relative h-10 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`absolute left-0 top-0 h-full transition-all duration-500 ${getBarColor()}`}
          style={{ width: `${percent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold drop-shadow-lg">
            {percent}%
          </span>
        </div>
      </div>
      
      <div className="flex justify-between mt-2 text-lg text-slate-400">
        <span>{quantity} venda{quantity !== 1 ? 's' : ''}</span>
        {goal > 0 && (
          <span>Faltam {formatCurrency(Math.max(0, goal - value))}</span>
        )}
      </div>
    </div>
  );
}

function FunnelCard({ 
  label, 
  value, 
  goal, 
  rate,
  isLast 
}: { 
  label: string; 
  value: number; 
  goal: number;
  rate: number | null;
  isLast: boolean;
}) {
  const percent = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  const hasGoal = goal > 0;
  
  const getStatusColor = () => {
    if (!hasGoal) return 'border-slate-600';
    if (percent >= 100) return 'border-green-500 bg-green-500/10';
    if (percent >= 70) return 'border-yellow-500 bg-yellow-500/10';
    if (percent >= 40) return 'border-orange-500 bg-orange-500/10';
    return 'border-red-500 bg-red-500/10';
  };

  return (
    <div className={`rounded-2xl p-5 border-2 ${getStatusColor()} ${isLast ? 'col-span-2' : ''}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-lg text-slate-400">{label}</span>
        {rate !== null && (
          <span className="text-sm bg-slate-700 px-2 py-1 rounded-lg">
            {rate}% conv.
          </span>
        )}
      </div>
      
      <div className="flex items-baseline gap-3">
        <span className={`font-bold ${isLast ? 'text-6xl text-emerald-400' : 'text-5xl'}`}>
          {value}
        </span>
        {hasGoal && (
          <span className="text-2xl text-slate-500">/ {goal}</span>
        )}
      </div>
      
      {hasGoal && (
        <div className="mt-3">
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                percent >= 100 ? 'bg-green-500' : 
                percent >= 70 ? 'bg-yellow-500' : 
                percent >= 40 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-sm text-slate-500 mt-1">{percent}% da meta</p>
        </div>
      )}
    </div>
  );
}
